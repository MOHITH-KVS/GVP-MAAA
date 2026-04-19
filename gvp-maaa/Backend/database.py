from sqlalchemy import create_engine
from sqlalchemy import event
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "postgresql://postgres:31012025@127.0.0.1:5432/gvp_ maaa"


engine = create_engine(DATABASE_URL, echo=True)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def _collect_cache_invalidation_targets(session):
    payload = session.info.setdefault(
        "cache_invalidation",
        {
            "student_ids": set(),
            "teacher_ids": set(),
            "invalidate_admin": False,
            "invalidate_all_responses": False,
        },
    )

    touched = list(session.new) + list(session.dirty) + list(session.deleted)
    for obj in touched:
        try:
            name = obj.__class__.__name__

            student_id = getattr(obj, "student_id", None)
            if student_id is not None:
                payload["student_ids"].add(str(student_id))

            teacher_id = getattr(obj, "faculty_id", None)
            if teacher_id is not None:
                payload["teacher_ids"].add(str(teacher_id))

            if name == "User":
                uid = getattr(obj, "user_id", None)
                role = str(getattr(obj, "role", "")).lower()
                if uid is not None and role == "student":
                    payload["student_ids"].add(str(uid))
                if uid is not None and role in {"faculty", "teacher"}:
                    payload["teacher_ids"].add(str(uid))

            if name in {
                "Student", "Faculty", "Attendance", "Mark", "Assignment",
                "AssignmentSubmission", "Alert", "Event", "Resource",
                "PlacementDrive", "Department", "User", "Subject",
                "FacultySubject", "Class"
            }:
                payload["invalidate_admin"] = True

            # Global/aggregate changes can impact many users; safer to clear response cache.
            if name in {
                "Assignment", "AssignmentSubmission", "Alert", "Event",
                "Resource", "PlacementDrive", "Department", "User",
                "Subject", "FacultySubject", "Class"
            }:
                payload["invalidate_all_responses"] = True
        except Exception:
            continue


@event.listens_for(SessionLocal, "after_flush")
def _after_flush_collect_invalidation(session, flush_context):
    _collect_cache_invalidation_targets(session)


@event.listens_for(SessionLocal, "after_commit")
def _after_commit_invalidate(session):
    payload = session.info.pop("cache_invalidation", None)
    if not payload:
        return

    try:
        from rag.cache_invalidation import (
            invalidate_cache,
            invalidate_response_cache,
        )

        for sid in payload.get("student_ids", set()):
            invalidate_cache(f"retrieve_student_data:{sid}")
            invalidate_response_cache(f"{sid}:")

        for tid in payload.get("teacher_ids", set()):
            invalidate_cache(f"retrieve_teacher_data:{tid}")
            invalidate_response_cache(f"{tid}:")

        if payload.get("invalidate_admin"):
            invalidate_cache("retrieve_admin_data")

        if payload.get("invalidate_all_responses"):
            invalidate_response_cache("")

        print("[CACHE] Invalidated due to data update")
    except Exception as exc:
        print(f"[CACHE] Invalidation hook failed: {exc}")


@event.listens_for(SessionLocal, "after_rollback")
def _after_rollback_clear_pending(session):
    session.info.pop("cache_invalidation", None)


# ✅ DB session dependency (VERY IMPORTANT)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
