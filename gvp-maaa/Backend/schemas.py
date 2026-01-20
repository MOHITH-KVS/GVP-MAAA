from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class StudentSignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    department_id: int


class TeacherSignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    department_id: int


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str
    access_key: str
