"""
check_gemini_keys.py

Tests all configured Gemini API keys against multiple candidate models and
prints clear per-key, per-model status so quota and model availability issues
are easy to diagnose.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

TEST_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
]

ALL_KEYS = [
    ("GEMINI_API_KEY", os.environ.get("GEMINI_API_KEY", "").strip()),
    ("GEMINI_API_KEY_2", os.environ.get("GEMINI_API_KEY_2", "").strip()),
    ("GEMINI_API_KEY_3", os.environ.get("GEMINI_API_KEY_3", "").strip()),
]


def classify_error(message: str) -> str:
    msg = message.lower()
    if "429" in msg or "quota" in msg or "rate limit" in msg:
        return "quota exhausted"
    if "404" in msg or "not found" in msg:
        return "model not available"
    if "401" in msg or "403" in msg or "permission" in msg or "api key" in msg:
        return "auth/permission error"
    return "other error"


def main() -> None:
    try:
        from google import genai
    except Exception as exc:
        print(f"[ERROR] google-genai import failed: {exc}")
        return

    print("[CHECK] Testing Gemini keys and model access")

    for idx, (name, key) in enumerate(ALL_KEYS, start=1):
        if not key or len(key) < 20:
            print(f"\n[KEY {idx}] {name}: missing or invalid")
            continue

        print(f"\n[KEY {idx}] {name}: present ({key[:12]}...)")
        client = genai.Client(api_key=key)
        any_success = False

        for model in TEST_MODELS:
            try:
                response = client.models.generate_content(
                    model=model,
                    contents="Say OK",
                )
                text = (response.text or "").strip() if response else ""
                if text:
                    print(f"  [OK]   {model}: {text[:40]}")
                    any_success = True
                    break
                print(f"  [FAIL] {model}: empty response")
            except Exception as exc:
                err = str(exc)
                print(f"  [FAIL] {model}: {classify_error(err)} | {err[:120]}")

        if any_success:
            print("  => This key can generate content.")
        else:
            print("  => No tested model worked for this key.")


if __name__ == "__main__":
    main()
