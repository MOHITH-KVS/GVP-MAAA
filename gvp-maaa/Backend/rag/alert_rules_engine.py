"""Persistent alert rules + notifications for proactive chatbot alerts."""

from __future__ import annotations

import json
from pathlib import Path
from datetime import datetime

# Format: {user_id: [{id, role, type, condition, threshold, message, active, created_at, last_triggered_at}]}
ALERT_RULES_STORE = {}
# Format: {user_id: [{id, title, message, type, created_at, is_read, source}]}
ALERT_NOTIFICATIONS_STORE = {}
_STORE_PATH = Path(__file__).resolve().parent.parent / "tmp" / "alert_rules_store.json"


def _load_store() -> dict:
    try:
        if not _STORE_PATH.exists():
            return {}
        raw = json.loads(_STORE_PATH.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            return {"rules": {}, "notifications": {}}

        # Backward compatibility: old file stored only {user_id: [rules]}.
        if "rules" not in raw and "notifications" not in raw:
            converted_rules = {}
            for user_key, rules in raw.items():
                try:
                    uid = int(user_key)
                except (TypeError, ValueError):
                    continue
                if isinstance(rules, list):
                    converted_rules[uid] = [r for r in rules if isinstance(r, dict)]
            return {"rules": converted_rules, "notifications": {}}

        def _decode_store_map(store_obj):
            result = {}
            if not isinstance(store_obj, dict):
                return result
            for user_key, items in store_obj.items():
                try:
                    uid = int(user_key)
                except (TypeError, ValueError):
                    continue
                if isinstance(items, list):
                    result[uid] = [item for item in items if isinstance(item, dict)]
            return result

        return {
            "rules": _decode_store_map(raw.get("rules", {})),
            "notifications": _decode_store_map(raw.get("notifications", {})),
        }
    except Exception:
        return {"rules": {}, "notifications": {}}


def _save_store() -> None:
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    serializable = {
        "rules": {str(uid): rules for uid, rules in ALERT_RULES_STORE.items()},
        "notifications": {
            str(uid): notes for uid, notes in ALERT_NOTIFICATIONS_STORE.items()
        },
    }
    _STORE_PATH.write_text(
        json.dumps(serializable, ensure_ascii=True, indent=2),
        encoding="utf-8",
    )


_loaded = _load_store()
ALERT_RULES_STORE = _loaded.get("rules", {})
ALERT_NOTIFICATIONS_STORE = _loaded.get("notifications", {})


def _now_iso() -> str:
    return datetime.utcnow().isoformat(timespec="seconds") + "Z"


def _compare(current: float, threshold: float, condition: str) -> bool:
    op = str(condition or "lt").strip().lower()
    if op == "gt":
        return current > threshold
    if op == "eq":
        return abs(current - threshold) < 1e-9
    return current < threshold


def _build_rule(rule: dict) -> dict:
    return {
        "id": str(rule.get("id") or f"rule-{int(datetime.utcnow().timestamp() * 1000)}"),
        "role": str(rule.get("role") or "student").strip().lower(),
        "type": str(rule.get("type") or "attendance").strip().lower(),
        "condition": str(rule.get("condition") or "lt").strip().lower(),
        "threshold": float(rule.get("threshold", 0) or 0),
        "message": str(rule.get("message") or ""),
        "active": bool(rule.get("active", True)),
        "created_at": str(rule.get("created_at") or _now_iso()),
        "last_triggered_at": str(rule.get("last_triggered_at") or ""),
    }


def list_alert_rules(user_id: int) -> list:
    return [dict(r) for r in ALERT_RULES_STORE.get(int(user_id), [])]


def add_alert_rule(user_id: int, rule: dict):
    user_id = int(user_id)
    if user_id not in ALERT_RULES_STORE:
        ALERT_RULES_STORE[user_id] = []

    normalized = _build_rule(rule)

    # Prevent duplicate active rules with same type/threshold.
    incoming_type = str(normalized.get("type") or "").strip().lower()
    incoming_threshold = float(normalized.get("threshold", 0) or 0)
    incoming_condition = str(normalized.get("condition") or "lt").strip().lower()
    for existing in ALERT_RULES_STORE[user_id]:
        if (
            str(existing.get("type") or "").strip().lower() == incoming_type
            and float(existing.get("threshold", 0) or 0) == incoming_threshold
            and str(existing.get("condition") or "lt").strip().lower() == incoming_condition
            and bool(existing.get("active", True))
        ):
            return True

    ALERT_RULES_STORE[user_id].append(normalized)
    _save_store()
    return True


def update_alert_rule(user_id: int, rule_id: str, updates: dict) -> bool:
    user_id = int(user_id)
    rid = str(rule_id or "").strip()
    if not rid:
        return False

    rules = ALERT_RULES_STORE.get(user_id, [])
    for rule in rules:
        if str(rule.get("id") or "").strip() != rid:
            continue

        if "type" in updates and updates.get("type") is not None:
            rule["type"] = str(updates.get("type") or "").strip().lower()
        if "condition" in updates and updates.get("condition") is not None:
            rule["condition"] = str(updates.get("condition") or "lt").strip().lower()
        if "threshold" in updates and updates.get("threshold") is not None:
            rule["threshold"] = float(updates.get("threshold") or 0)
        if "message" in updates and updates.get("message") is not None:
            rule["message"] = str(updates.get("message") or "").strip()
        if "active" in updates and updates.get("active") is not None:
            rule["active"] = bool(updates.get("active"))

        _save_store()
        return True
    return False


def delete_alert_rule(user_id: int, rule_id: str) -> bool:
    user_id = int(user_id)
    rid = str(rule_id or "").strip()
    if not rid:
        return False

    rules = ALERT_RULES_STORE.get(user_id, [])
    kept = [r for r in rules if str(r.get("id") or "").strip() != rid]
    if len(kept) == len(rules):
        return False

    ALERT_RULES_STORE[user_id] = kept
    _save_store()
    return True


def _add_notification(user_id: int, payload: dict) -> None:
    user_id = int(user_id)
    if user_id not in ALERT_NOTIFICATIONS_STORE:
        ALERT_NOTIFICATIONS_STORE[user_id] = []
    ALERT_NOTIFICATIONS_STORE[user_id].append(payload)


def get_alert_notifications(user_id: int) -> list:
    user_id = int(user_id)
    notes = ALERT_NOTIFICATIONS_STORE.get(user_id, [])
    notes_sorted = sorted(
        (dict(n) for n in notes),
        key=lambda n: str(n.get("created_at") or ""),
        reverse=True,
    )
    return notes_sorted


def mark_all_notifications_read(user_id: int) -> int:
    user_id = int(user_id)
    updated = 0
    for note in ALERT_NOTIFICATIONS_STORE.get(user_id, []):
        if not bool(note.get("is_read", False)):
            note["is_read"] = True
            updated += 1
    if updated:
        _save_store()
    return updated


def evaluate_alert_rules(user_id: int, role: str, metrics: dict) -> list:
    user_id = int(user_id)
    role = str(role or "").strip().lower()
    rules = ALERT_RULES_STORE.get(user_id, [])
    triggered_messages = []
    changed = False

    for rule in rules:
        if not bool(rule.get("active", True)):
            continue
        rule_role = str(rule.get("role") or "student").strip().lower()
        if rule_role and rule_role != role:
            continue

        metric_key = str(rule.get("type") or "").strip().lower()
        if metric_key not in metrics:
            continue

        current = float(metrics.get(metric_key, 0) or 0)
        threshold = float(rule.get("threshold", 0) or 0)
        condition = str(rule.get("condition") or "lt").strip().lower()

        if not _compare(current, threshold, condition):
            continue

        last_triggered_at = str(rule.get("last_triggered_at") or "")
        today_prefix = datetime.utcnow().strftime("%Y-%m-%d")
        if last_triggered_at.startswith(today_prefix):
            continue

        message = str(rule.get("message") or "").strip()
        if not message:
            op_text = {"lt": "below", "gt": "above", "eq": "equal to"}.get(condition, "below")
            message = f"{metric_key.replace('_', ' ').title()} is {current:.2f}, which is {op_text} {threshold:.2f}."

        created_at = _now_iso()
        notification = {
            "id": f"note-{int(datetime.utcnow().timestamp() * 1000)}",
            "title": "Proactive Alert",
            "message": message,
            "type": "proactive",
            "created_at": created_at,
            "is_read": False,
            "source": "chatbot_rule",
        }
        _add_notification(user_id, notification)
        rule["last_triggered_at"] = created_at
        changed = True
        triggered_messages.append(f"ALERT: {message}")

    if changed:
        _save_store()

    return triggered_messages


def check_alert_rules(user_id: int, data: dict) -> list:
    current_attendance = data.get("attendance", {}).get("overall_percentage", 100)
    metrics = {"attendance": float(current_attendance or 0)}
    return evaluate_alert_rules(user_id=user_id, role="student", metrics=metrics)
