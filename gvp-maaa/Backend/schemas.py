from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


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

    class Config:
        orm_mode = True


# 🔹 Timetable List Response
class TimetableListResponse(BaseModel):
    timetables: List[TimetableResponse]


# =========================
# STUDENT PROMOTION SCHEMAS
# =========================
class StudentPromotionRequest(BaseModel):
    student_ids: list[int]
    new_year: int
    new_semester: int
    new_section: str | None = None
