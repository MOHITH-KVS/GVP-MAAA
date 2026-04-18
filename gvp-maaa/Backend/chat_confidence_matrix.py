from collections import defaultdict
from datetime import datetime
import logging

from database import SessionLocal, engine
from models import User
from rag.graph_pipeline import run_rag_pipeline


GENERIC_FAILURE_PATTERNS = [
    "i couldn't find specific data",
    "please check your dashboard",
    "i'm having trouble accessing your data",
    "i had trouble processing",
    "try again",
]

QUERY_MATRIX = {
    "student": [
        "What is my current attendance percentage?",
        "Show my weak subjects based on marks.",
        "How many assignments are pending for me?",
        "What is my risk level?",
        "What will be my attendance if I miss next 5 classes?",
    ],
    "faculty": [
        "What is my class average attendance?",
        "How many students are at risk in my class?",
        "Which subject has the lowest class marks?",
        "How many assignment submissions are pending?",
        "Show summary of my uploaded resources.",
    ],
    "admin": [
        "How many students are at risk institution-wide?",
        "Which department has the lowest attendance?",
        "How many placement drives are currently open?",
        "Give me institution summary.",
        "Show department-wise attendance breakdown.",
    ],
}


def pick_user_for_role(db, role_name):
    q = db.query(User).filter(User.role == role_name)
    if hasattr(User, "is_deleted"):
        q = q.filter(User.is_deleted == False)
    return q.order_by(User.user_id.asc()).first()


def classify_answer(answer):
    text = (answer or "").strip().lower()
    if not text:
        return "fallback"
    for pattern in GENERIC_FAILURE_PATTERNS:
        if pattern in text:
            return "fallback"
    return "answered"


def run_matrix():
    # Keep output readable: SQL echo is enabled globally in database.py.
    engine.echo = False
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    db = SessionLocal()
    rows = []
    summary = defaultdict(lambda: {"total": 0, "answered": 0, "fallback": 0})

    try:
        users = {
            "student": pick_user_for_role(db, "student"),
            "faculty": pick_user_for_role(db, "faculty"),
            "admin": pick_user_for_role(db, "admin"),
        }

        print("=" * 90)
        print(f"CHAT CONFIDENCE MATRIX - {datetime.now().isoformat(timespec='seconds')}")
        print("=" * 90)

        for role, user in users.items():
            if not user:
                print(f"[WARN] No user found for role={role}. Skipping this role.")
                continue

            print(f"\n[ROLE] {role.upper()} user_id={user.user_id}")
            for query in QUERY_MATRIX[role]:
                answer = run_rag_pipeline(
                    user_id=int(user.user_id),
                    role=role,
                    question=query,
                    history=[],
                    db=db,
                )

                status = classify_answer(answer)
                summary[role]["total"] += 1
                summary[role][status] += 1

                rows.append((role, user.user_id, query, status, answer))
                preview = (answer or "").replace("\n", " ").strip()
                if len(preview) > 140:
                    preview = preview[:137] + "..."

                print(f"  - [{status.upper()}] {query}")
                print(f"    -> {preview}")

        print("\n" + "=" * 90)
        print("SUMMARY")
        print("=" * 90)

        total_all = 0
        answered_all = 0

        for role in ("student", "faculty", "admin"):
            if role not in summary:
                continue
            total = summary[role]["total"]
            answered = summary[role]["answered"]
            fallback = summary[role]["fallback"]
            rate = round((answered / total) * 100, 1) if total else 0.0
            total_all += total
            answered_all += answered
            print(
                f"{role:8} total={total:2d} answered={answered:2d} "
                f"fallback={fallback:2d} answer_rate={rate:5.1f}%"
            )

        overall = round((answered_all / total_all) * 100, 1) if total_all else 0.0
        print("-" * 90)
        print(f"OVERALL answered={answered_all}/{total_all} ({overall}%)")

    finally:
        db.close()


if __name__ == "__main__":
    run_matrix()
