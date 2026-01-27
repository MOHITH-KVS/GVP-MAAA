from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class StudentSignupRequest(BaseModel):
    name: str
    roll_no: str
    email: str
    password: str


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