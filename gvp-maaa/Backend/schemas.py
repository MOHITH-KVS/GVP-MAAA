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


class FacultyProfileUpdate(BaseModel):
    phone: str | None = None
    bio: str | None = None

    expertise: list[str] = []
    certifications: list[FacultyCertificate] = []

    linkedin: str | None = None
    website: str | None = None




class AdminLoginRequest(BaseModel):
    email: str
    password: str
    access_key: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str