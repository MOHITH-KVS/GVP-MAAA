"""
Documentation-only reduced blueprint of Backend/main.py.

This file is intentionally non-runtime and is meant for documentation,
architecture reviews, and onboarding. It summarizes the major flow,
route groups, and background jobs from the monolithic main.py.
"""

from typing import Dict, List


# Snapshot metadata from the current monolith.
MAIN_FILE = "Backend/main.py"
MAIN_LINE_COUNT = 15221
TOTAL_ROUTE_DECORATORS = 184


ROUTE_COUNTS_BY_PREFIX: Dict[str, int] = {
    "/api": 62,
    "/faculty": 48,
    "/admin": 27,
    "/student": 19,
    "/other": 15,
    "/teacher": 6,
    "/placement": 6,
}


APP_BOOT_SEQUENCE: List[str] = [
    "Create FastAPI app and base metadata",
    "Configure CORS for frontend origins",
    "Mount /uploads static files",
    "Load and cache system settings",
    "Run schema safety migrations (student insights, placement, faculty profile relationships)",
    "Start background scheduler jobs",
    "Include external routers (agent, stream, chat, analytics)",
]


SCHEDULER_JOBS: List[str] = [
    "process_event_reminders (daily)",
    "check_attendance_thresholds (cron)",
    "check_cgpa_thresholds (cron)",
    "check_monthly_faculty_attendance (monthly cron)",
    "check_assignment_deadlines (daily cron)",
]


INCLUDED_ROUTERS: List[str] = [
    "orchestrator.router -> agent_router",
    "stream_router.router -> stream_router",
    "chat_router.router -> chat_router",
    "analytics_router.router -> analytics_router",
]


# Core helper responsibilities extracted from main.py.
CORE_HELPERS: Dict[str, List[str]] = {
    "Caching": [
        "refresh_settings_cache",
        "_invalidate_departments_cache",
        "_load_departments",
    ],
    "Authorization & user context": [
        "get_optional_current_user",
        "authorize",
        "_normalized_role",
    ],
    "Placement utilities": [
        "_placement_drive_payload",
        "_collect_drive_changes",
        "_log_drive_audit",
        "_is_student_eligible_for_drive",
        "_auto_assign_students_for_drive",
    ],
    "Analytics utilities": [
        "_compute_attendance_percentage",
        "_compute_marks_score",
        "_sync_student_progress",
        "build_attendance_trend",
    ],
}


# Reduced endpoint catalog (grouped, non-exhaustive but representative).
ENDPOINT_CATALOG: Dict[str, List[str]] = {
    "System & settings": [
        "GET /",
        "GET /api/settings",
        "PUT /api/settings",
        "GET /api/settings/logs",
    ],
    "Auth & accounts": [
        "POST /login",
        "POST /login/admin",
        "POST /signup/student",
        "POST /signup/teacher",
        "POST /forgot-password",
        "POST /reset-password",
        "GET /api/auth/me",
        "GET /api/user/role",
    ],
    "Student core": [
        "GET /student/profile",
        "PUT /student/profile",
        "GET /student/attendance",
        "GET /student/attendance/monthly",
        "GET /student/my-marks",
        "GET /student/insights",
        "GET /student/alerts",
    ],
    "Placement": [
        "GET /placement/readiness/{student_id}",
        "GET /placement/eligibility/{student_id}",
        "GET /placement/skills/{student_id}",
        "GET /placement/interviews/{student_id}",
        "GET /placement/prediction/{student_id}",
        "GET /placement/action-plan/{student_id}",
        "POST /api/companies",
        "GET /api/companies",
        "POST /api/drives",
        "GET /api/drives",
        "PATCH /api/drives/{drive_id}",
        "GET /api/drives/{drive_id}/students",
        "PATCH /api/drives/{drive_id}/students/{student_id}",
        "POST /api/student/apply/{drive_id}",
        "GET /api/student/placement-intelligence",
    ],
    "Faculty profile & classes": [
        "GET /faculty/profile",
        "PUT /faculty/profile",
        "GET /faculty/classes",
        "GET /faculty/my-subjects",
        "GET /faculty/subjects",
    ],
    "Faculty attendance": [
        "POST /faculty/attendance",
        "GET /faculty/attendance/students",
        "GET /faculty/attendance/by-date",
        "GET /faculty/attendance/class-summary",
        "GET /faculty/attendance/report/{subject_id}",
        "GET /faculty/attendance/report/{subject_id}/download",
    ],
    "Teacher assignments": [
        "GET /teacher/my-subjects",
        "POST /teacher/create-assignment",
        "GET /teacher/assignments/{year}/{section}",
        "GET /teacher/assignment-details/{assignment_id}",
        "PUT /teacher/assignment-submissions/{submission_id}/status",
        "GET /student/assignments",
        "POST /student/submit-assignment/{assignment_id}",
    ],
    "Resources & events": [
        "POST /faculty/upload-resource",
        "GET /student/resources",
        "POST /student/resource-access/{resource_id}",
        "POST /faculty/events",
        "GET /faculty/events",
        "PATCH /faculty/events/{event_id}/attendance",
        "GET /student/events",
        "POST /student/events/register",
    ],
    "Marks & scaling": [
        "GET /faculty/marks",
        "POST /faculty/upload-marks",
        "POST /faculty/marks/upload",
        "POST /faculty/marks/upload-excel",
        "GET /faculty/marks/template",
        "POST /faculty/apply-scaling",
        "POST /faculty/undo-scaling",
        "GET /faculty/scaling-logs",
    ],
    "Admin management": [
        "GET /admin/students",
        "PUT /admin/students/promote",
        "PUT /admin/students/bulk-promote",
        "DELETE /admin/students",
        "GET /admin/teachers",
        "PUT /admin/teachers/{teacher_id}",
        "DELETE /admin/teachers",
        "POST /admin/subjects",
        "DELETE /admin/subjects/{subject_id}",
        "POST /admin/assign-subject",
        "GET /admin/subject-performance",
    ],
    "Alerting & insights": [
        "POST /admin/alerts",
        "GET /admin/alerts",
        "DELETE /admin/alerts/{alert_id}",
        "POST /faculty/send-alert",
        "POST /faculty/send-resource-reminder/{resource_id}",
        "PATCH /alerts/{alert_id}/read",
        "GET /api/admin/overview",
        "GET /api/admin/risk-summary",
        "GET /api/admin/insights",
    ],
}


ARCHITECTURE_NOTES: List[str] = [
    "main.py currently mixes app bootstrapping, migrations, background jobs, and all domain routes.",
    "Two startup hooks exist: one for migrations/cache + scheduler, another for scheduler jobs.",
    "Placement, faculty analytics, and alerts contain most business logic concentration.",
    "External routers are included at file end, extending chat, orchestration, and analytics APIs.",
]


def to_markdown() -> str:
    """Render a compact markdown summary suitable for technical documentation."""
    lines: List[str] = []
    lines.append("# Backend main.py Reduced Summary")
    lines.append("")
    lines.append(f"- Source file: {MAIN_FILE}")
    lines.append(f"- Total lines: {MAIN_LINE_COUNT}")
    lines.append(f"- Total route decorators: {TOTAL_ROUTE_DECORATORS}")
    lines.append("")

    lines.append("## Route Distribution")
    for prefix, count in ROUTE_COUNTS_BY_PREFIX.items():
        lines.append(f"- {prefix}: {count}")
    lines.append("")

    lines.append("## App Boot Sequence")
    for step in APP_BOOT_SEQUENCE:
        lines.append(f"- {step}")
    lines.append("")

    lines.append("## Background Jobs")
    for job in SCHEDULER_JOBS:
        lines.append(f"- {job}")
    lines.append("")

    lines.append("## Included Routers")
    for router in INCLUDED_ROUTERS:
        lines.append(f"- {router}")
    lines.append("")

    lines.append("## Core Helpers")
    for group, helpers in CORE_HELPERS.items():
        lines.append(f"### {group}")
        for helper in helpers:
            lines.append(f"- {helper}")
    lines.append("")

    lines.append("## Endpoint Catalog")
    for group, endpoints in ENDPOINT_CATALOG.items():
        lines.append(f"### {group}")
        for endpoint in endpoints:
            lines.append(f"- {endpoint}")
    lines.append("")

    lines.append("## Architecture Notes")
    for note in ARCHITECTURE_NOTES:
        lines.append(f"- {note}")

    return "\n".join(lines)


if __name__ == "__main__":
    print(to_markdown())
