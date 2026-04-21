"""
rag/generator.py  —  G in RAG
Takes retrieved DB data, formats it as context, calls Gemini.

SDK: google.genai (new SDK)
Fallback: 3 API keys × 4 models — cycles until one works.
"""
import os
import time
import concurrent.futures
import json
import traceback
import re
import urllib.error
import urllib.request
from pathlib import Path
from dotenv import load_dotenv
from rag.alert_rules_engine import add_alert_rule, check_alert_rules

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

# ── ALL KEYS ─────────────────────────────────────────────────────
ALL_KEYS = [
    k.strip() for k in [
        os.environ.get("GEMINI_API_KEY",   ""),
        os.environ.get("GEMINI_API_KEY_2", ""),
        os.environ.get("GEMINI_API_KEY_3", ""),
    ] if k and len(k.strip()) > 20
]

print(f"[GENERATOR] Found {len(ALL_KEYS)} API key(s)")

ALL_GROK_KEYS = [
    k.strip() for k in [
        os.environ.get("GROK_API_KEY",   ""),
        os.environ.get("GROK_API_KEY_2", ""),
        os.environ.get("GROK_API_KEY_3", ""),
    ] if k and len(k.strip()) > 20
]

print(f"[GENERATOR] Found {len(ALL_GROK_KEYS)} Grok API key(s)")

ALL_OPENROUTER_KEYS = [
    k.strip() for k in [
        os.environ.get("OPENROUTER_API_KEY", ""),
        os.environ.get("OPENROUTER_API_KEY_2", ""),
        os.environ.get("OPENROUTER_API_KEY_3", ""),
    ] if k and len(k.strip()) > 20
]

print(f"[GENERATOR] Found {len(ALL_OPENROUTER_KEYS)} OpenRouter API key(s)")

SKIP_FALLBACK_MODELS = {
    # These models frequently hit free-tier quota exhaustion and add long retries.
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
}

FALLBACK_MODELS = [
    # Prefer models currently most likely to succeed on free-tier keys.
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
]

GEMINI_AVAILABLE = False
GEMINI_CLIENT    = None
GEMINI_MODEL     = None
ACTIVE_KEY_INDEX = 0
KEY_MODEL_CACHE  = {}
GEMINI_LAST_CONNECT_ATTEMPT = 0.0
GEMINI_RECONNECT_COOLDOWN_SECONDS = 8
KEY_MODEL_BACKOFF_UNTIL = {}
KEY_DISCOVERED_MODELS = {}
KEY_DISCOVERY_TS = {}
MODEL_DISCOVERY_TTL_SECONDS = 900

# Quota-saver guardrails to avoid burning free-tier limits on retries/fallback loops.
MAX_KEYS_PER_REQUEST = int(os.environ.get("GEMINI_MAX_KEYS_PER_REQUEST", "3"))
MAX_MODELS_PER_KEY = int(os.environ.get("GEMINI_MAX_MODELS_PER_KEY", "3"))
MAX_TOTAL_ATTEMPTS_PER_REQUEST = int(os.environ.get("GEMINI_MAX_TOTAL_ATTEMPTS", "8"))
GEMINI_CALL_RETRY_ATTEMPTS = int(os.environ.get("GEMINI_CALL_RETRY_ATTEMPTS", "1"))
MIN_QUOTA_BACKOFF_SECONDS = int(os.environ.get("GEMINI_MIN_QUOTA_BACKOFF_SECONDS", "20"))

GROK_MAX_KEYS_PER_REQUEST = int(os.environ.get("GROK_MAX_KEYS_PER_REQUEST", "3"))
GROK_MAX_MODELS_PER_KEY = int(os.environ.get("GROK_MAX_MODELS_PER_KEY", "3"))
GROK_REQUEST_TIMEOUT_SECONDS = int(os.environ.get("GROK_REQUEST_TIMEOUT_SECONDS", "22"))
GROK_MODELS = []
for model_name in [
    os.environ.get("GROK_MODEL", "grok-2-latest"),
    "grok-3-mini",
    "grok-3-beta",
    "grok-beta",
]:
    model_name = str(model_name or "").strip()
    if model_name and model_name not in GROK_MODELS:
        GROK_MODELS.append(model_name)

OPENROUTER_MAX_KEYS_PER_REQUEST = int(os.environ.get("OPENROUTER_MAX_KEYS_PER_REQUEST", "3"))
OPENROUTER_MAX_MODELS_PER_KEY = int(os.environ.get("OPENROUTER_MAX_MODELS_PER_KEY", "3"))
OPENROUTER_REQUEST_TIMEOUT_SECONDS = int(os.environ.get("OPENROUTER_REQUEST_TIMEOUT_SECONDS", "22"))
OPENROUTER_MODELS = []
for model_name in [
    os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
]:
    model_name = str(model_name or "").strip()
    if model_name and model_name not in OPENROUTER_MODELS:
        OPENROUTER_MODELS.append(model_name)

_RESPONSE_CACHE = {}
RESPONSE_TTL = 120  # 2 minutes (short to ensure freshness)
SAFE_FALLBACK_RESPONSE = "I'm unable to fetch the latest data right now. Please try again in a few seconds."


def _is_quota_error(err_msg: str) -> bool:
    lower = str(err_msg).lower()
    return "429" in lower or "quota" in lower or "resource_exhausted" in lower


def _is_non_retryable_error(err_msg: str) -> bool:
    lower = str(err_msg).lower()
    return any(token in lower for token in ["401", "403", "permission", "invalid api key", "not found", "404"])


def _extract_retry_delay_seconds(err_msg: str, default: int = 8) -> int:
    msg = str(err_msg)
    patterns = [
        r"retry in\s+([0-9]+(?:\.[0-9]+)?)s",
        r"'retryDelay':\s*'([0-9]+)s'",
        r'"retryDelay":\s*"([0-9]+)s"',
    ]
    for pattern in patterns:
        match = re.search(pattern, msg, flags=re.IGNORECASE)
        if match:
            try:
                return max(1, int(float(match.group(1))))
            except Exception:
                continue
    return default


def _compose_prompt(base_prompt: str, message: str | None = None, history: list | None = None) -> str:
    """Builds a single prompt string from the current context and optional chat history."""
    parts = [str(base_prompt or "").strip()]
    if history:
        parts.append("\n\nConversation history:\n")
        for item in history[-6:]:
            role = "User" if str(item.get("role", "user")).lower() == "user" else "Assistant"
            content = str(item.get("content") or item.get("text") or "").strip()
            if content:
                parts.append(f"{role}: {content}")
    if message:
        parts.append(f"\nUser: {message}\nAssistant:")
    return "\n".join(part for part in parts if part).strip()


def _extract_user_query_hint(prompt: str, message: str | None = None) -> str:
    if message and str(message).strip():
        return str(message).strip()

    prompt_text = str(prompt or "")
    match = re.search(r"current question:\s*(.+)", prompt_text, flags=re.IGNORECASE)
    if match:
        return match.group(1).strip()

    lines = [line.strip() for line in prompt_text.splitlines() if line.strip()]
    if lines:
        return lines[-1]
    return ""


def _classify_query_complexity(prompt: str, message: str | None = None, history: list | None = None) -> str:
    query_text = _extract_user_query_hint(prompt, message=message)
    lower = query_text.lower()
    words = [w for w in re.split(r"\s+", query_text) if w]

    complex_keywords = [
        "analyze", "analysis", "compare", "explain", "why", "how", "step by step",
        "documentation", "document", "report", "architecture", "design", "debug",
        "root cause", "implement", "optimize", "generate", "code", "strategy",
        "plan", "workflow", "detailed", "in depth", "summarize",
    ]

    has_complex_keyword = any(keyword in lower for keyword in complex_keywords)
    has_multiline = "\n" in query_text
    has_history_depth = bool(history and len(history) >= 4)

    if has_complex_keyword or has_multiline or len(words) > 22 or has_history_depth:
        return "complex"

    return "simple"


def _is_smalltalk_query(query_text: str) -> bool:
    text = str(query_text or "").strip().lower()
    if not text:
        return False

    normalized = re.sub(r"[^a-z\s]", " ", text)
    normalized = re.sub(r"\s+", " ", normalized).strip()

    smalltalk_patterns = {
        "hi",
        "hello",
        "hey",
        "hii",
        "hiii",
        "good morning",
        "good afternoon",
        "good evening",
        "good night",
        "yo",
        "sup",
        "how are you",
        "thanks",
        "thank you",
        "ok",
        "okay",
        "bye",
        "goodbye",
        "see you",
    }

    if normalized in smalltalk_patterns:
        return True

    return len(normalized.split()) <= 3 and normalized in {"hi there", "hello there", "hey there"}


def _fast_smalltalk_response(query_text: str) -> str | None:
    text = str(query_text or "").strip().lower()
    normalized = re.sub(r"[^a-z\s]", " ", text)
    normalized = re.sub(r"\s+", " ", normalized).strip()

    if normalized in {"good morning", "good afternoon", "good evening", "good night"}:
        return "Hello! How can I help you today with your academic questions?"

    if normalized in {"how are you"}:
        return "I am doing well. How can I help you today?"

    if normalized in {"thanks", "thank you"}:
        return "You are welcome. I am here if you need anything else."

    if normalized in {"ok", "okay"}:
        return "Great. Tell me what you want to do next."

    if normalized in {"bye", "goodbye", "see you"}:
        return "Goodbye. Have a great day."

    if normalized in {
        "hi", "hello", "hey", "hii", "hiii", "yo", "sup", "hi there", "hello there", "hey there"
    }:
        return "Hi! How can I help you today?"

    return None


def _is_grok_quota_error(err_msg: str) -> bool:
    lower = str(err_msg).lower()
    return any(token in lower for token in ["429", "quota", "rate limit", "too many requests", "resource_exhausted"])


def _is_openrouter_quota_error(err_msg: str) -> bool:
    lower = str(err_msg).lower()
    return any(token in lower for token in ["429", "quota", "rate limit", "too many requests", "resource_exhausted"])


def _call_grok_completion(prompt_text: str, db_session=None) -> str | None:
    if not ALL_GROK_KEYS:
        return None

    endpoint = "https://api.x.ai/v1/chat/completions"
    for key_idx, api_key in enumerate(ALL_GROK_KEYS[:GROK_MAX_KEYS_PER_REQUEST]):
        for model in GROK_MODELS[:GROK_MAX_MODELS_PER_KEY]:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful academic assistant that answers using the provided data.",
                        },
                        {
                            "role": "user",
                            "content": prompt_text,
                        },
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500,
                }
                request = urllib.request.Request(
                    endpoint,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    method="POST",
                )
                print(f"[GROK_CALL] Trying key {key_idx+1} model {model}")
                with urllib.request.urlopen(request, timeout=GROK_REQUEST_TIMEOUT_SECONDS) as response:
                    body = json.loads(response.read().decode("utf-8", errors="ignore"))
                text = ""
                choices = body.get("choices") or []
                if choices:
                    first_choice = choices[0] or {}
                    message = first_choice.get("message") or {}
                    text = str(message.get("content") or "").strip()
                if text:
                    print(f"[GROK_CALL] SUCCESS: {text[:80]}")
                    if db_session:
                        try:
                            log_gemini_attempt(db_session, api_key_id=key_idx + 4, model=model, status="success")
                        except Exception as log_err:
                            print(f"[ERROR] Failed to log Grok success: {log_err}")
                    return text
                print("[GROK_CALL] Empty Grok response")
            except urllib.error.HTTPError as e:
                error_body = ""
                try:
                    error_body = e.read().decode("utf-8", errors="ignore")
                except Exception:
                    pass
                err_text = f"{e.code} {error_body}".strip()
                print(f"[GROK_CALL] HTTP error key {key_idx+1} {model}: {err_text[:120]}")
                if e.code == 429 or _is_grok_quota_error(err_text):
                    if db_session:
                        try:
                            log_gemini_attempt(db_session, api_key_id=key_idx + 4, model=model, status="429_quota", error_msg=err_text[:200])
                        except Exception as log_err:
                            print(f"[ERROR] Failed to log Grok quota error: {log_err}")
                    continue
                if db_session:
                    try:
                        log_gemini_attempt(db_session, api_key_id=key_idx + 4, model=model, status="http_error", error_msg=err_text[:200])
                    except Exception as log_err:
                        print(f"[ERROR] Failed to log Grok HTTP error: {log_err}")
                continue
            except Exception as e:
                err_text = str(e)
                print(f"[GROK_CALL] Error key {key_idx+1} {model}: {err_text[:120]}")
                if db_session:
                    try:
                        status = "timeout" if "timeout" in err_text.lower() else "error"
                        log_gemini_attempt(db_session, api_key_id=key_idx + 4, model=model, status=status, error_msg=err_text[:200])
                    except Exception as log_err:
                        print(f"[ERROR] Failed to log Grok error: {log_err}")
                if _is_grok_quota_error(err_text):
                    continue
                continue

    return None


def _call_openrouter_completion(prompt_text: str, db_session=None) -> str | None:
    if not ALL_OPENROUTER_KEYS:
        return None

    endpoint = "https://openrouter.ai/api/v1/chat/completions"
    for key_idx, api_key in enumerate(ALL_OPENROUTER_KEYS[:OPENROUTER_MAX_KEYS_PER_REQUEST]):
        for model in OPENROUTER_MODELS[:OPENROUTER_MAX_MODELS_PER_KEY]:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a helpful academic assistant that answers using the provided data.",
                        },
                        {
                            "role": "user",
                            "content": prompt_text,
                        },
                    ],
                    "temperature": 0.1,
                    "max_tokens": 500,
                }
                request = urllib.request.Request(
                    endpoint,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    method="POST",
                )
                print(f"[OPENROUTER_CALL] Trying key {key_idx+1} model {model}")
                with urllib.request.urlopen(request, timeout=OPENROUTER_REQUEST_TIMEOUT_SECONDS) as response:
                    body = json.loads(response.read().decode("utf-8", errors="ignore"))
                text = ""
                choices = body.get("choices") or []
                if choices:
                    first_choice = choices[0] or {}
                    message = first_choice.get("message") or {}
                    text = str(message.get("content") or "").strip()
                if text:
                    print(f"[OPENROUTER_CALL] SUCCESS: {text[:80]}")
                    if db_session:
                        try:
                            log_gemini_attempt(db_session, api_key_id=key_idx + 7, model=model, status="success")
                        except Exception as log_err:
                            print(f"[ERROR] Failed to log OpenRouter success: {log_err}")
                    return text
                print("[OPENROUTER_CALL] Empty OpenRouter response")
            except urllib.error.HTTPError as e:
                error_body = ""
                try:
                    error_body = e.read().decode("utf-8", errors="ignore")
                except Exception:
                    pass
                err_text = f"{e.code} {error_body}".strip()
                print(f"[OPENROUTER_CALL] HTTP error key {key_idx+1} {model}: {err_text[:120]}")
                if e.code == 429 or _is_openrouter_quota_error(err_text):
                    if db_session:
                        try:
                            log_gemini_attempt(db_session, api_key_id=key_idx + 7, model=model, status="429_quota", error_msg=err_text[:200])
                        except Exception as log_err:
                            print(f"[ERROR] Failed to log OpenRouter quota error: {log_err}")
                    continue
                if db_session:
                    try:
                        log_gemini_attempt(db_session, api_key_id=key_idx + 7, model=model, status="http_error", error_msg=err_text[:200])
                    except Exception as log_err:
                        print(f"[ERROR] Failed to log OpenRouter HTTP error: {log_err}")
                continue
            except Exception as e:
                err_text = str(e)
                print(f"[OPENROUTER_CALL] Error key {key_idx+1} {model}: {err_text[:120]}")
                if db_session:
                    try:
                        status = "timeout" if "timeout" in err_text.lower() else "error"
                        log_gemini_attempt(db_session, api_key_id=key_idx + 7, model=model, status=status, error_msg=err_text[:200])
                    except Exception as log_err:
                        print(f"[ERROR] Failed to log OpenRouter error: {log_err}")
                if _is_openrouter_quota_error(err_text):
                    continue
                continue

    return None


def _mark_backoff(key_idx: int, model: str, seconds: int):
    KEY_MODEL_BACKOFF_UNTIL[(key_idx, model)] = time.time() + max(MIN_QUOTA_BACKOFF_SECONDS, seconds)


def _is_in_backoff(key_idx: int, model: str) -> bool:
    until = KEY_MODEL_BACKOFF_UNTIL.get((key_idx, model), 0)
    return time.time() < until


def _normalize_model_name(name: str) -> str:
    model = str(name or "").strip()
    if model.startswith("models/"):
        model = model.split("/", 1)[1]
    return model


def _supported_generate_action(model_obj) -> bool:
    actions = getattr(model_obj, "supported_actions", None)
    if not actions:
        return True
    action_text = " ".join(str(a).lower() for a in actions)
    return "generatecontent" in action_text


def _model_priority(model: str) -> tuple:
    normalized = _normalize_model_name(model)
    if normalized in FALLBACK_MODELS:
        return (0, FALLBACK_MODELS.index(normalized), normalized)
    if "flash-lite" in normalized:
        return (1, 0, normalized)
    if "flash" in normalized:
        return (1, 1, normalized)
    return (2, 0, normalized)


def _discover_models_for_key(client, key_idx: int, force: bool = False):
    now = time.time()
    cached = KEY_DISCOVERED_MODELS.get(key_idx)
    last_ts = KEY_DISCOVERY_TS.get(key_idx, 0)

    if not force and cached and (now - last_ts) < MODEL_DISCOVERY_TTL_SECONDS:
        return list(cached)

    discovered = []
    try:
        for model_obj in client.models.list():
            name = _normalize_model_name(getattr(model_obj, "name", ""))
            if not name:
                continue
            lower = name.lower()
            if "gemini" not in lower:
                continue
            if not _supported_generate_action(model_obj):
                continue
            discovered.append(name)
    except Exception as e:
        print(f"[GENERATOR] Model discovery failed for key {key_idx+1}: {str(e)[:80]}")

    # Always keep static fallback models as safety net.
    pool = list(dict.fromkeys(discovered + FALLBACK_MODELS))
    pool = [m for m in pool if _normalize_model_name(m) not in SKIP_FALLBACK_MODELS]
    pool.sort(key=_model_priority)

    if not pool:
        pool = list(FALLBACK_MODELS)

    KEY_DISCOVERED_MODELS[key_idx] = list(pool)
    KEY_DISCOVERY_TS[key_idx] = now
    print(f"[GENERATOR] Key {key_idx+1} model pool size: {len(pool)}")
    return list(pool)


def get_models_for_key(client, key_idx: int):
    return _discover_models_for_key(client, key_idx, force=False)


def get_active_keys():
    if MAX_KEYS_PER_REQUEST <= 0:
        return []
    return ALL_KEYS[:MAX_KEYS_PER_REQUEST]


def get_request_models_for_key(client, key_idx: int):
    base_models = get_models_for_key(client, key_idx)
    cached_model = KEY_MODEL_CACHE.get(key_idx)

    ordered = []
    if cached_model:
        ordered.append(cached_model)
    ordered.extend([m for m in base_models if m != cached_model])

    if MAX_MODELS_PER_KEY > 0:
        return ordered[:MAX_MODELS_PER_KEY]
    return ordered


def ensure_gemini_connection(force: bool = False) -> bool:
    """Reconnects Gemini after cooldown if currently unavailable."""
    global GEMINI_LAST_CONNECT_ATTEMPT
    if GEMINI_AVAILABLE and GEMINI_CLIENT and not force:
        return True

    now = time.time()
    if not force and (now - GEMINI_LAST_CONNECT_ATTEMPT) < GEMINI_RECONNECT_COOLDOWN_SECONDS:
        return False

    GEMINI_LAST_CONNECT_ATTEMPT = now
    return try_connect()


def get_response_cache(key):
    if key in _RESPONSE_CACHE:
        data, ts = _RESPONSE_CACHE[key]
        if time.time() - ts < RESPONSE_TTL:
            print(f"[RESPONSE CACHE HIT] {key}")
            return data
    return None


def set_response_cache(key, data):
    _RESPONSE_CACHE[key] = (data, time.time())


def build_response_cache_key(user_id, query: str):
    user_key = str(user_id) if user_id is not None else None
    if not user_key:
        return None
    normalized_query = query.strip().lower()
    return f"{user_key}:{normalized_query}"


def should_skip_response_cache(query: str) -> bool:
    lowered = query.lower()
    return any(word in lowered for word in ["marks", "attendance", "today", "latest"])


def should_force_structured_fallback(question: str) -> bool:
    lowered = question.lower()
    return any(
        key in lowered for key in [
            "list",
            "all students",
            "student list",
            "at risk",
            "which students",
            "from csm",
            "from cse",
            "from ece",
            "from civil",
            "from mech",
            "from it",
            "department",
        ]
    )


def is_response_incomplete(text: str) -> bool:
    if not text:
        return True
    stripped = text.strip()
    if len(stripped) < 20:
        return True
    if stripped.endswith(("...", "…", ",", ";", ":", "-", "—")):
        return True
    lower = stripped.lower()
    if lower.endswith(("includes", "include", "and", "or", "with", "from", "such as", "like")):
        return True
    if not stripped.endswith((".", "!", "?")) and "\n" not in stripped:
        return True
    return False


def _extract_alert_rule_and_clean(answer_text: str) -> tuple[str, dict | None]:
    """Extracts ALERT_RULE metadata from model output and removes it from user-facing text."""
    if not answer_text:
        return "", None

    pattern = re.compile(
        r"ALERT_RULE:\s*type\s*=\s*([a-zA-Z_]+)\s+threshold\s*=\s*([0-9]+)",
        flags=re.IGNORECASE,
    )
    match = pattern.search(answer_text)
    if not match:
        return answer_text, None

    rule_type = str(match.group(1) or "").strip().lower()
    threshold = int(match.group(2))
    cleaned = pattern.sub("", answer_text, count=1)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()

    rule = {
        "type": rule_type,
        "threshold": threshold,
        "message": f"Alert me if {rule_type} drops below {threshold}",
        "active": True,
    }
    return cleaned, rule


def _prepend_triggered_alerts(answer_text: str, triggered_alerts: list[str]) -> str:
    if not triggered_alerts:
        return answer_text
    alert_msg = "\n".join(triggered_alerts).strip()
    if not answer_text:
        return alert_msg
    return f"{alert_msg}\n\n{answer_text}"


def safe_gemini_call(call_fn):
    attempts = max(1, GEMINI_CALL_RETRY_ATTEMPTS)
    for attempt in range(attempts):
        try:
            return call_fn()
        except Exception as e:
            err = str(e)
            print(f"[RETRY] Gemini attempt {attempt+1} failed: {err}")
            print(f"[ERROR] {err}")
            if _is_quota_error(err) or _is_non_retryable_error(err):
                return None
    return None


def call_with_timeout(call_fn, timeout=22):
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
    future = executor.submit(safe_gemini_call, call_fn)
    try:
        return future.result(timeout=timeout)
    except concurrent.futures.TimeoutError:
        print("[TIMEOUT] Gemini call exceeded limit")
        return None
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return None
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

def try_connect():
    global GEMINI_CLIENT, GEMINI_MODEL, GEMINI_AVAILABLE, ACTIVE_KEY_INDEX, KEY_MODEL_CACHE
    try:
        from google import genai as _genai
    except ImportError:
        print("[GENERATOR] google-genai not installed")
        return False

    for key_idx, key in enumerate(get_active_keys()):
        try:
            client = _genai.Client(api_key=key)
            models_for_key = get_request_models_for_key(client, key_idx)
            model = models_for_key[0] if models_for_key else FALLBACK_MODELS[0]

            GEMINI_CLIENT = client
            GEMINI_MODEL = model
            ACTIVE_KEY_INDEX = key_idx
            GEMINI_AVAILABLE = True
            KEY_MODEL_CACHE[key_idx] = model
            print(f"[GENERATOR] Prepared: key {key_idx+1}, model {model}")
            return True
        except Exception as e:
            print(f"[GENERATOR] Key {key_idx+1} init failed: {str(e)[:80]}")
            continue
    GEMINI_AVAILABLE = False
    return False

# Initial connection attempt
try_connect()


def call_gemini(
    prompt: str,
    message: str | None = None,
    history: list | None = None,
    db_session=None,
    max_output_tokens: int = 500,
    provider_sequence: list[str] | None = None,
) -> str:
    """
    Routes by query complexity and executes provider failover.
    Simple queries prefer Grok; complex queries prefer Gemini/OpenRouter.
    """
    global GEMINI_CLIENT, GEMINI_MODEL, GEMINI_AVAILABLE, ACTIVE_KEY_INDEX, ALL_KEYS, KEY_MODEL_CACHE

    effective_prompt = _compose_prompt(prompt, message=message, history=history)
    query_class = _classify_query_complexity(prompt, message=message, history=history)
    query_hint = _extract_user_query_hint(prompt, message=message)

    if _is_smalltalk_query(query_hint):
        quick_reply = _fast_smalltalk_response(query_hint)
        if quick_reply:
            print("[GEMINI_CALL] Fast local small-talk response")
            return quick_reply

    provider_sequence = provider_sequence or (
        ["grok", "gemini", "openrouter"]
        if query_class == "simple"
        else ["gemini", "openrouter", "grok"]
    )

    print(
        f"[GEMINI_CALL] client={GEMINI_CLIENT is not None} "
        f"model={GEMINI_MODEL} "
        f"keys={len(ALL_KEYS)} "
        f"query_class={query_class} "
        f"provider_sequence={provider_sequence}"
    )

    def _call_gemini_completion() -> str | None:
        if not ALL_KEYS:
            return None

        try:
            from google import genai as _genai
        except ImportError:
            _genai = None

        if _genai is None:
            return None

        gemini_reply = None
        total_attempts = 0
        for key_idx, key in enumerate(get_active_keys()):
            if total_attempts >= MAX_TOTAL_ATTEMPTS_PER_REQUEST:
                break
            client = _genai.Client(api_key=key)
            preferred_models = get_request_models_for_key(client, key_idx)

            for model in preferred_models:
                if total_attempts >= MAX_TOTAL_ATTEMPTS_PER_REQUEST:
                    break
                try:
                    if _is_in_backoff(key_idx, model):
                        print(f"[GEMINI_CALL] Skipping key {key_idx+1} model {model} (cooldown)")
                        continue

                    total_attempts += 1

                    print(f"[GEMINI_CALL] Trying key {key_idx+1} model {model}")
                    print("[LLM] Calling Gemini...")
                    response = call_with_timeout(
                        lambda: client.models.generate_content(
                            model=model,
                            contents=effective_prompt,
                            config={
                                "temperature": 0.1,
                                "max_output_tokens": max_output_tokens,
                            }
                        ),
                        timeout=22,
                    )
                    print(f"[GEMINI_CALL] Response: {str(response)[:100]}")

                    if response and response.text:
                        text = response.text.strip()
                        print(f"[GEMINI_CALL] SUCCESS: {text[:80]}")
                        print("[LLM] Success")

                        if db_session:
                            try:
                                log_gemini_attempt(db_session, api_key_id=key_idx + 1, model=model, status="success")
                            except Exception as log_err:
                                print(f"[ERROR] Failed to log success: {log_err}")

                        if key_idx != ACTIVE_KEY_INDEX or model != GEMINI_MODEL:
                            print(f"[GENERATOR] Failover to key {key_idx+1}, model {model}")
                            ACTIVE_KEY_INDEX = key_idx
                            GEMINI_MODEL     = model
                            GEMINI_CLIENT    = client
                            GEMINI_AVAILABLE = True
                        KEY_MODEL_CACHE[key_idx] = model
                        gemini_reply = text
                        break
                    else:
                        print("[GEMINI_CALL] Empty response.text")
                except Exception as e:
                    err = str(e)
                    print(f"[GEMINI_CALL] Error key {key_idx+1} {model}: {err[:100]}")
                    if _is_quota_error(err):
                        delay = _extract_retry_delay_seconds(err, default=8)
                        _mark_backoff(key_idx, model, delay)
                        if db_session:
                            try:
                                log_gemini_attempt(db_session, api_key_id=key_idx + 1, model=model, status="429_quota", error_msg=err[:200])
                            except Exception as log_err:
                                print(f"[ERROR] Failed to log quota error: {log_err}")
                        continue
                    status = "timeout" if "timeout" in err.lower() else "404_model" if "404" in err or "not found" in err.lower() else "error"
                    if db_session:
                        try:
                            log_gemini_attempt(db_session, api_key_id=key_idx + 1, model=model, status=status, error_msg=err[:200])
                        except Exception as log_err:
                            print(f"[ERROR] Failed to log error: {log_err}")
                    continue

            if gemini_reply:
                return gemini_reply

        return None

    provider_calls = {
        "grok": lambda: _call_grok_completion(effective_prompt, db_session=db_session),
        "gemini": _call_gemini_completion,
        "openrouter": lambda: _call_openrouter_completion(effective_prompt, db_session=db_session),
    }

    for provider in provider_sequence:
        print(f"[GEMINI_CALL] Trying provider={provider}")
        reply = provider_calls[provider]()
        if not reply:
            continue

        if is_response_incomplete(reply):
            print(f"[GEMINI_CALL] Provider={provider} returned incomplete response, escalating")
            continue

        return reply

    print("[GEMINI_CALL] All attempts failed")
    GEMINI_AVAILABLE = bool(GEMINI_CLIENT and GEMINI_MODEL)
    return None

def call_gemini_with_memory(
    system_context: str,
    user_question: str,
    history: list,
    role: str,
    db_session=None
) -> str:
    """Calls the shared AI provider flow with conversation memory preserved."""
    history_text = ""
    if history:
        history_text = "\n\nPREVIOUS CONVERSATION:\n"
        for h in history[-6:]:
            r = "User" if h.get("role") == "user" else "Assistant"
            content = h.get("content", "")
            if content:
                history_text += f"{r}: {content}\n"

    full_prompt = f"""{system_context}
{history_text}
Current question: {user_question}

Answer the current question. If the user refers to
something from the conversation history (like "yes",
"tell me more", "what about that"), use the history
to understand what they mean.


Provide a COMPLETE answer. Do not cut off mid-sentence.
Write complete paragraphs. Maximum 6 sentences."""

    return call_gemini(full_prompt, db_session=db_session)

# ── Context formatter (A in RAG) ─────────────────────────────────

def format_data_for_gemini(data: dict, role: str) -> str:
    """Converts structured DB data into clear readable text for Gemini."""
    lines = [f"=== {role.upper()} ACADEMIC DATA ===\n"]

    if role == "student":
        # Profile
        profile = data.get("profile", {})
        if profile:
            lines.append(
                f"Student Profile: Year {profile.get('year')}, "
                f"Section {profile.get('section')}, "
                f"Semester {profile.get('semester')}, "
                f"CGPA: {profile.get('cgpa', 'N/A')}"
            )

        # Attendance
        att = data.get("attendance", {})
        if att:
            lines.append(
                f"\nATTENDANCE:\n"
                f"Overall: {att.get('overall_percentage')}% "
                f"({att.get('present')}/{att.get('total_classes')} classes) "
                f"— {att.get('status')}"
            )
            per_subj = att.get("per_subject", [])
            if per_subj:
                lines.append("Per Subject:")
                for s in per_subj:
                    lines.append(
                        f"  {s['subject_name']}: "
                        f"{s['percentage']}% "
                        f"({s['present']}/{s['total_classes']} classes) "
                        f"[{s['status']}]"
                    )

        # Marks
        marks = data.get("marks", [])
        if marks:
            lines.append("\nMARKS / EXAM SCORES:")
            for m in marks:
                subj = m.get("subject", "Unknown")
                exam = m.get("exam_type", "")
                faculty = m.get("faculty_name", "")
                score = m.get("score", 0)
                out_of = m.get("out_of", m.get("total", 0))
                pct = m.get("pct", m.get("percentage", 0))

                label = f"{subj}"
                if exam:
                    label += f" [{exam}]"

                line = f"  {label}: {score}/{out_of} ({pct}%)"
                if faculty and faculty != "Unknown":
                    line += f" - Faculty: {faculty}"
                lines.append(line)
                if m.get("mid1") is not None:
                    lines.append(f"    Mid-1: {m['mid1']}")
                if m.get("mid2") is not None:
                    lines.append(f"    Mid-2: {m['mid2']}")
                if m.get("cgpa") is not None:
                    lines.append(f"    CGPA: {m['cgpa']}")

        # Assignments
        assg = data.get("assignments", {})
        if assg:
            lines.append(
                f"\nASSIGNMENTS:\n"
                f"Total: {assg.get('total', 0)}, "
                f"Pending: {assg.get('pending_count', 0)}, "
                f"Submitted: {assg.get('submitted_count', 0)}"
            )
            for p in assg.get("pending_list", []):
                lines.append(f"  PENDING: {p['title']} (due: {p['due_date']})")

        # Risk
        risk = data.get("risk", {})
        if risk:
            lines.append(
                f"\nACADEMIC RISK:\n"
                f"Level: {risk.get('level')}, Score: {risk.get('score')}"
            )
            for r in risk.get("reasons", []):
                lines.append(f"  Reason: {r}")
            for a in risk.get("actions", []):
                lines.append(f"  Action: {a}")

        # Alerts
        alerts = data.get("alerts", [])
        lines.append(f"\nALERTS: {len(alerts)} active")
        for a in alerts[:3]:
            lines.append(f"  - {a.get('title')}: {a.get('message')}")

        # Events
        events = data.get("events", [])
        if events:
            lines.append(f"\nEVENTS ({len(events)} available):")
            for e in events[:5]:
                lines.append(f"  - {e['name']} on {e['date']} ({e['type']})")

        # Resources
        resources = data.get("resources", [])
        if resources:
            lines.append(f"\nSTUDY MATERIALS ({len(resources)} available):")
            for r in resources[:5]:
                lines.append(f"  - {r['title']} [{r['subject']}] ({r['type']})")

        # Placement
        placement = data.get("placement", {})
        drives = placement.get("drives", [])
        if drives:
            lines.append(f"\nPLACEMENT DRIVES ({len(drives)} open):")
            for d in drives:
                eligible_text = (
                    "You are eligible"
                    if d.get("eligible")
                    else "Not eligible (CGPA too low)"
                )
                lines.append(
                    f"  - {d['company']} | {d['role']} | "
                    f"{d['package']} LPA | CGPA req: {d['min_cgpa']} | "
                    f"{eligible_text} | Deadline: {d['deadline']}"
                )
        else:
            lines.append("\nPLACEMENT: No open drives currently")

    elif role in ("teacher", "faculty"):
        faculty_name = data.get("faculty_name", "Unknown")
        lines.append(f"Faculty Name: {faculty_name}")

        subjects = data.get("subjects", [])
        names    = [s["name"] for s in subjects] if subjects else []
        lines.append(
            f"Your Subjects: {', '.join(names) if names else 'Not mapped in system'}"
        )

        att = data.get("class_attendance", {})
        if att:
            lines.append(
                f"\nCLASS ATTENDANCE:\n"
                f"Average: {att.get('average_percentage')}% "
                f"— {att.get('status')}\n"
                f"Total students: {att.get('total_students')}\n"
                f"Students below 75%: {att.get('students_below_75')}"
            )

        risk = data.get("at_risk_students", {})
        if risk:
            lines.append(
                f"\nAT-RISK STUDENTS:\n"
                f"{risk.get('count')} out of {risk.get('total')} students "
                f"({risk.get('percentage')}%) are at risk"
            )

        marks = data.get("class_marks", {})
        if marks:
            lines.append(
                f"\nCLASS MARKS:\n"
                f"Average: {marks.get('average_percentage')}%"
            )
            subject_marks = marks.get("subject_marks", [])
            if subject_marks:
                lines.append("Subject-wise breakdown:")
                for subject in subject_marks[:8]:
                    lines.append(
                        f"  - {subject.get('subject')}: {subject.get('average_percentage')}% "
                        f"across {subject.get('records')} records"
                    )

        assg = data.get("assignments", {})
        pending_total = assg.get("pending_submissions", 0)
        details = assg.get("assignment_details", [])
        pending_flat = assg.get("pending_students_flat", [])

        lines.append(f"\nASSIGNMENTS:")
        lines.append(f"Total pending submissions: {pending_total}")

        if details:
            lines.append("Breakdown by assignment:")
            for d in details:
                lines.append(
                    f"  - {d['title']} (Year {d.get('year','?')} "
                    f"Sec {d.get('section','?')}): "
                    f"{d['pending']} students pending, "
                    f"{d['submitted']} submitted"
                )

                pending_students = d.get("pending_students", [])
                if pending_students:
                    lines.append("    Pending students:")
                    for ps in pending_students[:12]:
                        lines.append(
                            f"      - {ps.get('name', 'Unknown')} "
                            f"(Roll: {ps.get('roll_no', 'N/A')})"
                        )

        if pending_flat:
            lines.append(
                f"\nALL STUDENTS WITH PENDING ASSIGNMENTS ({len(pending_flat)}):"
            )
            for ps in pending_flat[:30]:
                lines.append(
                    f"  - {ps.get('name', 'Unknown')} "
                    f"(Roll: {ps.get('roll_no', 'N/A')})"
                )

        resources = data.get("resources", [])
        if resources:
            lines.append(f"\nRESOURCES YOU UPLOADED ({len(resources)}):")
            for r in resources:
                lines.append(
                    f"  - {r['title']} [{r['subject']}] ({r['type']})"
                )
        else:
            lines.append("\nRESOURCES: None uploaded yet")

        class_students = data.get("class_students", [])
        at_risk_detail = data.get("at_risk_students_detail", [])

        if class_students:
            lines.append(
                f"\nYOUR CLASS STUDENTS ({len(class_students)}):"
            )
            for s in class_students[:21]:
                risk = " [AT RISK]" if s.get("at_risk") else ""
                lines.append(
                    f"  - {s['name']} | Roll: {s['roll_no']} | "
                    f"Att: {s['attendance_pct']}%{risk}"
                )

        if at_risk_detail:
            lines.append(f"\nAT-RISK IN YOUR CLASS ({len(at_risk_detail)}):")
            for s in at_risk_detail[:10]:
                lines.append(
                    f"  - {s['name']} (Roll: {s['roll_no']}): "
                    f"{s['attendance_pct']}% attendance"
                )

    else:  # admin
        inst = data.get("institution", {})
        lines.append(
            f"INSTITUTION OVERVIEW:\n"
            f"Total Students: {inst.get('total_students')}\n"
            f"Total Faculty: {inst.get('total_faculty')}\n"
            f"Overall Attendance: {inst.get('overall_attendance')}%\n"
            f"At-Risk Students: {inst.get('at_risk_count')}"
        )

        depts = data.get("departments", [])
        if depts:
            lines.append("\nDEPARTMENT BREAKDOWN (sorted by attendance):")
            for d in depts:
                faculty_names = d.get("faculty_names", [])
                faculty_text = (
                    f" | Faculty: {', '.join(faculty_names[:6])}"
                    if faculty_names else ""
                )
                lines.append(
                    f"  {d['department']}: "
                    f"{d['attendance_percentage']}% attendance, "
                    f"{d['at_risk_count']} at-risk / {d['total_students']} students "
                    f"[{d['status']}]"
                    f"{faculty_text}"
                )

        alerts    = data.get("alerts",    {})
        placement = data.get("placement", {})
        lines.append(f"\nActive System Alerts: {alerts.get('total_active', 0)}")
        lines.append(f"Open Placement Drives: {placement.get('open_drives', 0)}")

        students_list = data.get("students_list", [])
        at_risk_list = data.get("at_risk_students_list", [])
        by_dept = data.get("students_by_department", {})
        faculty_list = data.get("faculty_list", [])
        faculty_by_department = data.get("faculty_by_department", {})

        if students_list:
            lines.append(
                f"\nSTUDENT ROSTER (Total: {len(students_list)}):"
            )
            for s in students_list[:15]:
                risk = " [AT RISK]" if s.get("at_risk") else ""
                lines.append(
                    f"  - {s['name']} | Roll: {s['roll_no']} | "
                    f"Dept: {s.get('department', 'Unknown')} | "
                    f"Year {s['year']}-{s['section']} | "
                    f"Att: {s['attendance_pct']}%{risk}"
                )

        if by_dept:
            lines.append("\nSTUDENTS BY DEPARTMENT:")
            for dept_name, dept_students in by_dept.items():
                lines.append(
                    f"  {dept_name} ({len(dept_students)} students):"
                )
                for s in dept_students[:8]:
                    risk = " [AT RISK]" if s.get("at_risk") else ""
                    lines.append(
                        f"    - {s['name']} (Roll: {s['roll_no']}) "
                        f"Year {s['year']}-{s['section']} "
                        f"Att: {s['attendance_pct']}%{risk}"
                    )

        if at_risk_list:
            lines.append(
                f"\nAT-RISK STUDENTS ({len(at_risk_list)} total):"
            )
            for s in at_risk_list[:10]:
                lines.append(
                    f"  - {s['name']} | Dept: {s.get('department', 'Unknown')} | "
                    f"Roll: {s['roll_no']} | "
                    f"Att: {s['attendance_pct']}%"
                )

        if faculty_list:
            lines.append(
                f"\nFACULTY ROSTER (Total: {len(faculty_list)}):"
            )
            for f in faculty_list[:30]:
                lines.append(
                    f"  - {f['name']} | Emp ID: {f.get('employee_id', 'N/A')} | "
                    f"Dept: {f.get('department', 'Unknown')} | "
                    f"Designation: {f.get('designation', 'N/A')}"
                )

        if faculty_by_department:
            lines.append("\nFACULTY BY DEPARTMENT:")
            for dept_name, dept_faculty in faculty_by_department.items():
                lines.append(
                    f"  {dept_name} ({len(dept_faculty)} faculty):"
                )
                for f in dept_faculty[:10]:
                    lines.append(
                        f"    - {f['name']} (Emp ID: {f.get('employee_id', 'N/A')})"
                    )

    return "\n".join(lines)


# ── Main generation function ─────────────────────────────────────

def generate_answer(
    role: str,
    retrieved_data: dict,
    user_question: str,
    conversation_history: list,
    user_id: int | None = None,
    db_session=None
) -> str:
    """
    Core RAG generation: formats context → builds prompt → calls Gemini.
    Analytical / complex queries are first routed to the LangChain chain;
    simple queries go directly to Gemini; rule-based fallback if all fail.
    Logs all API attempts to database if db_session provided.
    """
    total_start = time.time()
    cache_key = None
    skip_cache = False
    try:
        print(f"[REQUEST] user={user_id} query='{user_question}'")

        profile = retrieved_data.get("profile", {}) if isinstance(retrieved_data, dict) else {}
        rule_user_id = int(profile.get("student_id") or user_id or 0)
        triggered_alerts = check_alert_rules(rule_user_id, retrieved_data) if rule_user_id > 0 else []

        cache_key = build_response_cache_key(user_id, user_question)
        skip_cache = should_skip_response_cache(user_question)
        if cache_key and not skip_cache:
            cached = get_response_cache(cache_key)
            if cached:
                print("[CACHE] Response cache hit")
                print("[CACHE] Hit -> instant response")
                return _prepend_triggered_alerts(cached, triggered_alerts)
            print("[CACHE] Miss -> calling Gemini")

        # ── 1. Try LangChain for analytical/complex queries ────────────
        try:
            from rag.analytical_chain import (
                is_analytical_query,
                run_analytical_chain,
            )
            print(f"[GENERATOR] Answering: {user_question[:50]}")
            if is_analytical_query(user_question):
                print("[GENERATOR] Routing to analytical chain")
                chain_answer = run_analytical_chain(
                    role, retrieved_data, user_question
                )
                if chain_answer and len(chain_answer) > 10:
                    if cache_key and not skip_cache and not is_response_incomplete(chain_answer):
                        set_response_cache(cache_key, chain_answer)
                    return _prepend_triggered_alerts(chain_answer, triggered_alerts)
                print("[GENERATOR] Chain returned nothing — falling through to Gemini")
        except Exception as _ce:
            print(f"[GENERATOR] Chain import/run error: {_ce}")

        # ── 2. Direct Gemini for simple queries ────────────────────────
        context = format_data_for_gemini(retrieved_data, role)

        personas = {
            "student": "helpful AI academic assistant for a student",
            "teacher": "helpful AI assistant for a faculty member",
            "faculty": "helpful AI assistant for a faculty member",
            "admin":   "institutional AI assistant for admin"
        }
        persona = personas.get(role.lower(), "academic assistant")

        access_rules = {
            "student": (
                "You are an AI assistant for a student. "
                "The MARKS section includes faculty names for each subject. "
                "When asked about faculty/teacher name for a subject, "
                "provide it from the marks data. "
                "Only discuss this student's own data. "
                "If asked about other students, say: 'You can only view your own data.'"
            ),
            "teacher": (
                "You are an AI assistant for a faculty member. "
                "You have access to YOUR CLASS STUDENTS list with names. "
                "You also have pending assignment student details with names and roll numbers. "
                "When asked for student names or at-risk students, "
                "list them from YOUR CLASS STUDENTS section. "
                "When asked for pending assignment students, use the assignment pending student lists. "
                "When asked about alerts or attendance-related students, "
                "provide names and roll numbers from class/alert data when available. "
                "You can share student names, roll numbers, and attendance "
                "for students in YOUR class only. "
                "Do NOT provide sensitive personal info like phone numbers or addresses. "
                "If asked for admin data, say: 'That is outside my access.'"
            ),
            "faculty": "Discuss class-level data only.",
            "admin": (
                "You are an institutional AI assistant for admin. "
                "You have FULL ACCESS to all data including: "
                "individual student names, roll numbers, departments, "
                "department-wise student lists, at-risk student names, faculty lists, "
                "and faculty names grouped by department. "
                "When asked for students from a specific department, "
                "look at STUDENTS BY DEPARTMENT section and list them. "
                "When asked for faculty in a department, use FACULTY BY DEPARTMENT or FACULTY ROSTER. "
                "When asked for at-risk students, list from "
                "AT-RISK STUDENTS section with their names. "
                "Use exact names from the data and never say "
                "'individual names not available'."
            )
        }
        access = access_rules.get(role.lower(), "")

        # Extract attendance numbers for what-if calculations in prompt
        att_block   = retrieved_data.get("attendance", {})
        att_present = att_block.get("present", 0)
        att_total   = att_block.get("total_classes", 0)

        prompt = f"""You are a {persona} at GVP college.
{access}

REAL DATA RETRIEVED FROM DATABASE:
{context}

USER QUESTION: "{user_question}"

INSTRUCTIONS FOR YOUR ANSWER:
1. Answer ONLY using the DATABASE DATA section above
2. Be specific — use actual numbers from the data
3. If the data does not contain what is asked, say:
   "I don't have that specific data. Please check the relevant page in your dashboard."
4. Never make up or estimate numbers not in the data
5. Write in natural conversational sentences (2-4 sentences max)
6. If a value is 0 or null, say so honestly
7. For "what if I miss N more classes" questions:
   Use these ACTUAL numbers from the data above:
   Current present classes = {att_present}
   Current total classes   = {att_total}
   If student misses N more: new_total = {att_total} + N
   New percentage = ({att_present} / ({att_total} + N)) * 100
   Show the calculated result clearly.
8. For resource/event questions, list actual items from the data
9. For subject-specific questions (e.g. "ML attendance"),
   find that subject in the per-subject data above and answer specifically
10. If user says "alert me when X" or "remind me if Y", extract the rule and include exactly one line:
    ALERT_RULE: type=attendance threshold=75
    The system will store this rule.

ANSWER:"""

        ensure_gemini_connection()
        if not ALL_KEYS:
            print("[GENERATOR] Gemini keys unavailable, using fallback")
            fallback_answer = build_fallback(role, retrieved_data, user_question)
            return fallback_answer or SAFE_FALLBACK_RESPONSE

        print(f"[GENERATOR] Calling Gemini for: {user_question[:60]}")
        print("[LLM] Calling Gemini...")
        answer = call_gemini_with_memory(
            system_context=prompt,
            user_question=user_question,
            history=conversation_history,
            role=role,
            db_session=db_session,
        )

        if answer:
            answer, parsed_rule = _extract_alert_rule_and_clean(answer)
            if parsed_rule and rule_user_id > 0:
                add_alert_rule(rule_user_id, parsed_rule)
                print(f"[ALERT_RULE] Stored rule for user {rule_user_id}: {parsed_rule}")
            print(f"[GENERATOR] Gemini LIVE — replied: {answer}")
            print("[LLM] Success")
            if is_response_incomplete(answer):
                print("[GENERATOR] Incomplete Gemini response detected — using fallback")
                answer = None
            elif cache_key and not skip_cache:
                set_response_cache(cache_key, answer)
            if answer:
                return _prepend_triggered_alerts(answer, triggered_alerts)

        print("[GENERATOR] No Gemini response, using fallback")
        if cache_key and not skip_cache:
            cached = get_response_cache(cache_key)
            if cached:
                print("[CACHE] Response cache hit")
                return _prepend_triggered_alerts(cached, triggered_alerts)
        fallback_answer = build_fallback(role, retrieved_data, user_question)
        if not fallback_answer:
            fallback_answer = SAFE_FALLBACK_RESPONSE
        if cache_key and not skip_cache:
            set_response_cache(cache_key, fallback_answer)
        return _prepend_triggered_alerts(fallback_answer, triggered_alerts)

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        print(f"[CRITICAL ERROR] {e}")
        traceback.print_exc()
        fallback_answer = build_fallback(role, retrieved_data, user_question)
        if not fallback_answer:
            fallback_answer = SAFE_FALLBACK_RESPONSE
        if cache_key and not skip_cache:
            set_response_cache(cache_key, fallback_answer)
        return _prepend_triggered_alerts(fallback_answer, triggered_alerts)
    finally:
        print(f"[TOTAL TIME] {time.time() - total_start:.2f}s")


# ── Fallback (Gemini unavailable) ────────────────────────────────

def build_fallback(role: str, data: dict, question: str) -> str:
    """Honest, data-driven fallback when Gemini is unavailable."""
    notice = (
        "AI-generated wording is temporarily unavailable. "
        "Showing verified dashboard data now. "
        "Use Retry AI in about 1 minute to try again."
    )

    def with_notice(body: str) -> str:
        return f"{notice}\n{body}"

    q = question.lower()
    try:
        if role == "student":
            if any(w in q for w in ["attendance", "present", "absent", "class", "bunk"]):
                att = data.get("attendance", {})
                pct = att.get("overall_percentage", "N/A")
                p   = att.get("present", 0)
                t   = att.get("total_classes", 0)
                per_subj = att.get("per_subject", [])
                reply = f"Your overall attendance is {pct}% ({p}/{t} classes)."
                if per_subj:
                    low = [s for s in per_subj if s["status"] == "LOW"]
                    if low:
                        names = ", ".join(s["subject_name"] for s in low[:3])
                        reply += f" Subjects below 75%: {names}."
                return with_notice(reply)

            if any(w in q for w in ["mark", "score", "mid", "exam", "result", "cgpa", "sgpa"]):
                marks = data.get("marks", [])
                if not marks:
                    return with_notice("No marks data found in the system.")
                lines = [
                    f"{m['subject']}: {m['score']}/{m['total']} ({m['percentage']}%)"
                    for m in marks[:4]
                ]
                return with_notice("Your marks: " + " | ".join(lines))

            if any(w in q for w in ["assignment", "pending", "submit", "homework"]):
                assg    = data.get("assignments", {})
                pending = assg.get("pending_count", 0)
                total   = assg.get("total", 0)
                if pending == 0:
                    return with_notice(
                        f"All {total} assignment(s) submitted — nothing pending!"
                    )
                pending_list = assg.get("pending_list", [])
                titles = ", ".join(p["title"] for p in pending_list[:3])
                return with_notice(
                    f"You have {pending} pending assignment(s) out of {total} total. "
                    + (f"Pending: {titles}." if titles else "")
                )

            if any(w in q for w in ["event", "happening", "workshop", "fest"]):
                events = data.get("events", [])
                if not events:
                    return with_notice(
                        "No events found. Check the Events page in your dashboard."
                    )
                names = [e["name"] for e in events[:4]]
                return with_notice(f"Upcoming events: {', '.join(names)}.")

            if any(w in q for w in ["resource", "material", "note", "upload", "study"]):
                resources = data.get("resources", [])
                if not resources:
                    return with_notice(
                        "No study materials found. Check the Resources page."
                    )
                names = [r["title"] for r in resources[:4]]
                return with_notice(
                    f"Available study materials: {', '.join(names)}."
                )

            if any(w in q for w in ["risk", "fail", "danger", "warning"]):
                risk  = data.get("risk", {})
                level = risk.get("level", "N/A")
                reasons = risk.get("reasons", [])
                r_text  = "; ".join(reasons[:2]) if reasons else "No specific reasons flagged"
                return with_notice(
                    f"Your academic risk level is {level}. Reasons: {r_text}."
                )

            # Generic summary
            att  = data.get("attendance", {}).get("overall_percentage", "N/A")
            risk = data.get("risk", {}).get("level", "N/A")
            assg = data.get("assignments", {}).get("pending_count", 0)
            return with_notice(
                f"Your overview: Attendance {att}%, "
                f"Risk level {risk}, "
                f"Pending assignments: {assg}."
            )

        elif role in ("teacher", "faculty"):
            att  = data.get("class_attendance", {})
            risk = data.get("at_risk_students", {})
            return with_notice(
                f"Class average attendance: {att.get('average_percentage', 'N/A')}%. "
                f"At-risk students: {risk.get('count', 'N/A')} "
                f"out of {risk.get('total', 'N/A')} total."
            )

        else:  # admin
            dept_keywords = {
                "csm": "CSM", "cse": "CSE",
                "ece": "ECE", "civil": "CIVIL",
                "mech": "MECH", "it": "IT"
            }
            asked_dept = None
            for kw, dept in dept_keywords.items():
                if kw in q:
                    asked_dept = dept
                    break

            if asked_dept:
                by_dept = data.get("students_by_department", {})
                dept_students = by_dept.get(asked_dept, [])
                if dept_students:
                    names = [
                        f"{s['name']} (Roll: {s['roll_no']}, "
                        f"Att: {s['attendance_pct']}%)"
                        for s in dept_students[:10]
                    ]
                    return with_notice(
                        f"{asked_dept} Department has "
                        f"{len(dept_students)} students:\n" +
                        "\n".join(names)
                    )
                return with_notice(f"No students found for {asked_dept} department.")

            if any(w in q for w in ["at risk", "risk", "below 75"]):
                at_risk = data.get("at_risk_students_list", [])
                if at_risk:
                    names = [
                        f"{s['name']} ({s['department']}, "
                        f"Att: {s['attendance_pct']}%)"
                        for s in at_risk[:10]
                    ]
                    return with_notice(
                        f"{len(at_risk)} students at risk:\n" +
                        "\n".join(names)
                    )
                return with_notice("No students currently at risk.")

            if any(w in q for w in ["list", "students", "all students"]):
                students = data.get("students_list", [])
                if students:
                    names = [
                        f"{s['name']} ({s['department']}, "
                        f"Year {s['year']}-{s['section']})"
                        for s in students[:10]
                    ]
                    return with_notice(
                        f"Total {len(students)} students:\n" +
                        "\n".join(names)
                    )

            inst = data.get("institution", {})
            return with_notice(
                f"Institution: {inst.get('total_students')} students, "
                f"{inst.get('total_faculty')} faculty, "
                f"{inst.get('overall_attendance')}% attendance."
            )

    except Exception:
        return with_notice("Please check your dashboard for the latest information.")


# ── API Key Pool Logging Helper ──────────────────────────────────

def log_gemini_attempt(db_session, api_key_id: int, model: str, status: str, error_msg: str = None):
    """
    Logs a Gemini API call attempt to the database for monitoring quota/key health.
    
    Args:
        db_session: SQLAlchemy session
        api_key_id: Key number (1, 2, or 3)
        model: Model name (e.g. "gemini-2.5-flash")
        status: Outcome ('success', '429_quota', '404_model', 'timeout')
        error_msg: Optional error message
    """
    try:
        from models import GeminiKeyUsage
        
        usage = GeminiKeyUsage(
            api_key_id=api_key_id,
            model=model,
            status=status,
            error_message=error_msg
        )
        db_session.add(usage)
        db_session.commit()
        print(f"[LOG] Gemini key_id={api_key_id} model={model} status={status}")
    except Exception as e:
        print(f"[ERROR] Failed to log Gemini attempt: {str(e)}")


def get_gemini_key_status_snapshot(db_session) -> dict:
    """
    Returns current Gemini API key pool health status.
    
    Returns:
        dict: Key status by key_id with working models, quota info, etc.
    """
    try:
        from rag.key_pool_manager import KeyPoolManager
        
        manager = KeyPoolManager(db_session)
        return manager.get_key_status()
    except Exception as e:
        print(f"[ERROR] Failed to get key status: {str(e)}")
        return {}
