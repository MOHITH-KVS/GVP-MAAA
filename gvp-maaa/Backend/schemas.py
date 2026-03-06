from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime ,date


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


class TeacherSubjectResponse(BaseModel):
    subject_id: int
    subject_name: str
    year: int
    section: str


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
    created_at: datetime
    accessed: int
    total_students: int

    class Config:
        orm_mode = True


class StudentResourceResponse(BaseModel):
    id: int
    title: str
    description: str
    type: str
    file_url: str
    created_at: datetime

    class Config:
        orm_mode = True