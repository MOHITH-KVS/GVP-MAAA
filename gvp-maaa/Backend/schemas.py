from __future__ import annotations

from pydantic import BaseModel
from typing import List, Optional, Any, Union
from datetime import datetime, date

DateType = date


class LoginRequest(BaseModel):
    email: str
    password: str


class StudentSignupRequest(BaseModel):
    name: str
    roll_no: str
    email: str
    password: str

class StudentProfileResponse(BaseModel):
    name: str
    email: str
    roll_no: str | None
    year: int
    semester: int

    skills: list[str] = []
    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None
    bio: str | None = None


class Certificate(BaseModel):
    title: str
    link: str


class StudentProfileUpdate(BaseModel):
    year: int
    semester: int
    skills: list[str]
    certificates: list[Certificate]

    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None



class TeacherSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    employee_id: str
    department_id: int


class FacultyCertificate(BaseModel):
    title: str
    link: str


class FacultyProfileResponse(BaseModel):
    name: str
    email: str
    employee_id: str

    designation: str | None = None
    qualifications: str | None = None
    experience: int | None = None

    phone: str | None = None
    bio: str | None = None

    expertise: list[str] = []
    certifications: list[FacultyCertificate] = []

    linkedin: str | None = None
    website: str | None = None

class NameLink(BaseModel):
    name: str
    link: str

class ClassItem(BaseModel):
    year: str
    section: str
    subject: str
    students: str
    attendance: Optional[float] = None  # auto later

class FacultyProfileUpdate(BaseModel):
    name: Optional[str] = None

    phone: Optional[str] = None
    bio: Optional[str] = None

    qualifications: Optional[str] = None
    experience: Optional[str] = None

    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

    expertise: Optional[List[str]] = None
    certifications: Optional[List[NameLink]] = None
    publications: Optional[List[NameLink]] = None
    classes: Optional[List[ClassItem]] = None



class AdminLoginRequest(BaseModel):
    email: str
    password: str
    access_key: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class SettingsUpdateRequest(BaseModel):
    attendance_threshold: Optional[float] = None
    cgpa_threshold: Optional[float] = None
    attendance_alert_enabled: Optional[bool] = None
    cgpa_alert_enabled: Optional[bool] = None
    alert_frequency: Optional[str] = None
    report_retention_days: Optional[int] = None
    analytics_refresh_interval: Optional[str] = None
    session_timeout: Optional[int] = None
    report_format: Optional[str] = None
    marks_format: Optional[str] = None
    attendance_format: Optional[str] = None
    assignment_format: Optional[str] = None
    resources_format: Optional[str] = None

    class Config:
        extra = "forbid"

class SettingsPreviewRequest(BaseModel):
    attendance_threshold: float
    cgpa_threshold: float

class AdminOverviewMetrics(BaseModel):
    at_risk_students: int
    attendance_risk_percent: float
    data_completeness: float
    active_alerts: int
    total_students: int
    total_teachers: int
    active_events: int
    events_today: int
    events_this_week: int

class AdminAcademicHealth(BaseModel):
    avg_attendance: float
    avg_cgpa: float
    at_risk_students: int

class AdminFacultyHealth(BaseModel):
    avg_classes: float
    overloaded: int
    underutilized: int

class AdminSystemHealth(BaseModel):
    active_users: int
    last_sync: str
    data_completeness: float

class AdminOverviewAlert(BaseModel):
    title: str
    type: str
    severity: str
    timestamp: str
    action: str

class AdminOverviewTrendPoint(BaseModel):
    date: str
    attendance: float

class AdminOverviewResponse(BaseModel):
    metrics: AdminOverviewMetrics
    academic_health: AdminAcademicHealth
    faculty_health: AdminFacultyHealth
    system_health: AdminSystemHealth
    alerts: List[AdminOverviewAlert]
    trend: List[AdminOverviewTrendPoint]

# =========================
# TIMETABLE SCHEMAS
# =========================

# 🔹 Admin Upload (metadata only, file handled separately)
class TimetableCreate(BaseModel):
    title: str                         # "III Year Class Timetable"
    timetable_type: str               # class / exam / fest / event

    department: Optional[str] = None
    year: Optional[str] = None
    section: Optional[str] = None
    semester: Optional[str] = None

    audience: str = "students"        # students / faculty / both / all


# 🔹 Timetable Response (single item)
class TimetableResponse(BaseModel):
    id: int

    title: str
    timetable_type: str

    faculty_id: Optional[int] = None   # ✅ ADD THIS

    department: Optional[str]
    year: Optional[str]
    section: Optional[str]
    semester: Optional[str]

    file_name: Optional[str]
    file_url: str
    file_type: str

    audience: str
    uploaded_at: datetime
    is_active: bool


# 🔹 Timetable List Response
class TimetableListResponse(BaseModel):
    timetables: List[TimetableResponse]


# =========================
# STUDENT PROMOTION SCHEMAS
# =========================
class StudentPromotionRequest(BaseModel):
    student_ids: list[int]
    new_semester: int | None = None
    new_section: str | None = None


class DriveCreate(BaseModel):
    title: str
    company_name: str
    role: str
    package: float
    min_cgpa: float
    max_backlogs: int
    date: DateType
    location: str
    registration_deadline: DateType
    eligible_years: List[int]
    branches: List[str]
    mode: str
    status: str
    selection_process: Optional[List[str]] = None


class AssignFacultyRequest(BaseModel):
    faculty_ids: List[int]


class DriveStudentUpdateRequest(BaseModel):
    current_round: Optional[int] = None
    final_status: Optional[str] = None


class DriveNotifyFilteredRequest(BaseModel):
    branch: Optional[List[str]] = None
    year: Optional[List[int]] = None
    status: Optional[List[str]] = None
    title: Optional[str] = None
    message: Optional[str] = None


class StudentNotifyRequest(BaseModel):
    title: str
    message: str
    drive_id: Optional[int] = None





#class BulkPromoteRequest(BaseModel):
#    year: str
#    department: str
#    section: Optional[str] = None
#    new_year: str
#    new_section: Optional[str] = None

# =========================
# STUDENT DELETE SCHEMA
# =========================
class StudentDeleteRequest(BaseModel):
    student_ids: list[int]


# =========================
# TEACHER UPDATE (ADMIN)
# =========================
class TeacherAdminUpdate(BaseModel):
    designation: Optional[str] = None
    department_id: Optional[int] = None

# =========================
# TEACHER DELETE SCHEMA (ADMIN)
# =========================
class TeacherDeleteRequest(BaseModel):
    teacher_ids: List[int]

# =========================
# ALERT SCHEMA
# =========================
class AlertCreate(BaseModel):
    title: str
    message: str
    type: str
    target_role: str
    target_type: str
    department: Optional[str] = None
    faculty_id: Optional[int] = None
    student_id: Optional[int] = None

class AlertSendRequest(BaseModel):
    type: str # Emergency | Announcement | Info | Reminder
    message: str
    target: str # class | multiple_classes | students
    subject_id: Optional[int] = None 
    subject_ids: Optional[List[int]] = None
    student_ids: Optional[List[int]] = None

class StudentSearchResponse(BaseModel):
    student_id: int
    name: str
    roll_no: Optional[str] = None

# =========================
# ATTENDANCE SCHEMAS
# =========================
class AttendanceItem(BaseModel):
    student_id: int
    status: bool   # TRUE = present, FALSE = absent


class AttendanceCreate(BaseModel):
    subject_id: int
    date: date
    year: int
    section: str
    records: List[AttendanceItem]


class AssignSubjectRequest(BaseModel):
    faculty_id: int
    subject_id: int
    year: int
    section: str


class SubjectCreate(BaseModel):
    subject_code: str
    subject_name: str
    semester: int
    credits: int
    department_id: int



# ===============================
# STUDENT ATTENDANCE TREND SCHEMAS
# ===============================
class AttendanceTrendItem(BaseModel):
    date: date
    percentage: float

class SubjectComparisonItem(BaseModel):
    subject: str
    percentage: float

class AttendancePrediction(BaseModel):
    projected_percentage: float
    confidence: str

class AttendanceAnalyticsResponse(BaseModel):
    trend: List[AttendanceTrendItem]
    subject_comparison: List[SubjectComparisonItem]
    prediction: AttendancePrediction


# =========================
# ASSIGNMENT SCHEMAS
# =========================
class AssignmentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_id: int
    year: int
    section: str
    due_date: datetime
    file_path: Optional[str] = None


class AssignmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    subject_id: int
    year: int
    section: str
    due_date: datetime
    created_at: datetime
    is_active: bool
    faculty_id: int
    file_path: Optional[str] = None

    class Config:
        from_attributes = True


class AssignmentSubmissionCreate(BaseModel):
    assignment_id: int
    submission_text: Optional[str] = None


class AssignmentSubmissionResponse(BaseModel):
    id: int
    assignment_id: int
    student_id: int
    file_path: Optional[str] = None
    submission_text: Optional[str] = None
    submitted_at: datetime
    is_late: bool
    is_submitted: bool
    status: str

    class Config:
        from_attributes = True

class StatusUpdateRequest(BaseModel):
    status: str

class AssignmentStatusDot(BaseModel):
    assignment_id: int
    title: str
    status: str # "approved", "rejected", "pending", "not_submitted", "future"

class StudentAssignmentSummary(BaseModel):
    student_id: int
    name: str
    roll: str
    year: int
    section: str
    recent_assignments: List[AssignmentStatusDot]

class StudentAssignmentSummaryResponse(BaseModel):
    status: str
    students: List[StudentAssignmentSummary]


class AssignmentDetailResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    subject_id: int
    year: int
    section: str
    due_date: datetime
    created_at: datetime
    is_active: bool
    faculty_id: int

    total_students: int
    submitted_count: int
    pending_count: int

    pending: List[dict] = []
    submitted: List[dict] = []

    class Config:
        from_attributes = True


class FacultySubjectResponse(BaseModel):
    subject_id: int
    subject_name: str
    year: int
    section: str
    department: str
    

class StudentAssignmentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    subject_name: str
    due_date: datetime
    file_path: Optional[str]
    is_submitted: bool

class ResourceResponse(BaseModel):
    id: int
    title: str
    type: str
    subject: str
    created_at: datetime
    accessed: int
    total_students: int

    class Config:
        orm_mode = True

class ResourceAccessRequest(BaseModel):
    action_type: str


class StudentResourceResponse(BaseModel):
    id: int
    title: str
    description: str
    type: str
    file_url: str
    created_at: datetime

    class Config:
        orm_mode = True


# =========================
# EVENTS SCHEMAS
# =========================
from typing import Optional, List, Union, Any

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str
    organizer: Optional[str] = None
    venue: Optional[str] = None
    event_date: date
    max_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    external_registration_link: Optional[str] = None
    year: str
    section: str
    
class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    event_type: str
    
    organizer: Optional[str] = None
    venue: Optional[str] = None
    event_date: date
    max_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    external_registration_link: Optional[str] = None
    location: Optional[str] = None
    
    year: Any
    section: Any
    created_by: int
    status: str
    created_at: datetime
    
    total_students: int = 0
    present_count: int = 0
    absent_count: int = 0

    class Config:
        from_attributes = True

class EventAttendanceItem(BaseModel):
    student_id: int
    status: str

class EventAttendanceUpdate(BaseModel):
    student_id: int
    status: str

class BulkEventAttendanceUpdate(BaseModel):
    students: List[EventAttendanceItem]

class EventStudentDetail(BaseModel):
    student_id: int
    name: str
    roll_no: Optional[str] = None
    attendance_status: str
    result: Optional[str] = None

class EventAttendanceResponse(BaseModel):
    event_id: int
    title: str
    date: date
    location: Optional[str] = None
    students: List[EventStudentDetail]
    message: Optional[str] = None

class EventAlertRequest(BaseModel):
    type: str
    message: str
    target: str # "all", "present", "absent"

class EventResultUpdate(BaseModel):
    student_id: int
    result: Optional[str] = None

class EventRegistrationRequest(BaseModel):
    event_id: int

class StudentEventResponse(BaseModel):
    id: int
    title: str
    event_type: str
    
    organizer: Optional[str] = None
    venue: Optional[str] = None
    event_date: date
    max_participants: Optional[int] = None
    registration_deadline: Optional[datetime] = None
    external_registration_link: Optional[str] = None
    
    location: Optional[str] = None
    description: Optional[str] = None
    status: str
    
    is_registered: bool = False
    attendance_status: Optional[str] = None
    result: Optional[str] = None

    class Config:
        from_attributes = True

class ExternalEventSubmissionCreate(BaseModel):
    event_name: str
    organizer: Optional[str] = None
    event_date: date
    achievement_type: Optional[str] = None # New field
    position: Optional[str] = None

class ExternalEventSubmissionResponse(BaseModel):
    id: int
    student_id: int
    event_name: str
    organizer: Optional[str] = None
    event_date: date
    achievement_type: Optional[str] = None # New field
    position: Optional[str] = None
    certificate_file: Optional[str] = None
    proof_file: Optional[str] = None
    status: str
    submitted_at: datetime
    faculty_reviewed_by: Optional[int] = None

    class Config:
        from_attributes = True

class FacultyExternalSubmissionDetail(ExternalEventSubmissionResponse):
    student_name: str
    student_roll_no: Optional[str] = None


# =========================
# MARKS SCHEMAS
# =========================

class MarkCreate(BaseModel):
    student_id: int
    marks: int

class MarksUpload(BaseModel):
    year: str
    section: str
    subject: str
    exam: str
    marks: List[MarkCreate]

class FacultyMarkResponse(BaseModel):
    id: int
    student_id: int
    student_name: str
    roll_no: Optional[str]
    assignment_total: float
    mid1: float
    mid2: float
    semester: float
    total: float
    sgpa: float
    cgpa: float

class StudentMarkResponse(BaseModel):
    subject: str
    exam: str
    assignment_total: float
    mid1: float
    mid2: float
    semester: float
    total: float
    sgpa: float
    cgpa: float


class TaskCompleteRequest(BaseModel):
    type: str
    priority: str
    verificationType: str


class StudentXpResponse(BaseModel):
    total_xp: int


class StudentStreakResponse(BaseModel):
    streak_days: int


class LeaderboardItem(BaseModel):
    student_id: int
    name: str
    xp: int
    rank: int