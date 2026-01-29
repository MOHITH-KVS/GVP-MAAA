from pydantic import BaseModel, EmailStr
from typing import List, Optional


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




class StudentProfileUpdate(BaseModel):
    name: str
    year: int
    semester: int

    skills: list[str] = []
    certificates: list[str] = []   # ✅ ADD THIS

    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None


class CertificateUpload(BaseModel):
    certificates: list[str]



class TeacherSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    employee_id: str
    department_id: int




class AdminLoginRequest(BaseModel):
    email: str
    password: str
    access_key: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str