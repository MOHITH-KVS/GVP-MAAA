from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
from dotenv import load_dotenv
load_dotenv()
from database import SessionLocal
from schemas import (
    LoginRequest,
    StudentSignupRequest,
    TeacherSignupRequest,
    AdminLoginRequest
)
from models import User, Student, Faculty


app = FastAPI(title="GVP Academic Analytics Backend")

# -------------------------
# CORS
# -------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------
# Database Dependency
# -------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------
# Root Check
# -------------------------
@app.get("/")
def root():
    return {"message": "Backend connected to database successfully"}

# -------------------------
# LOGIN (Student / Teacher / Admin)
# -------------------------
@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.password != data.password:
        raise HTTPException(status_code=401, detail="Invalid password")

    return {
        "user_id": user.user_id,
        "name": user.name,
        "role": user.role,
        "department_id": user.department_id
    }

# -------------------------
# STUDENT SIGNUP
# -------------------------
@app.post("/signup/student")
def student_signup(data: StudentSignupRequest, db: Session = Depends(get_db)):

    if not data.email.endswith("@gvpcdpgc.edu.in"):
        raise HTTPException(status_code=400, detail="Only college email allowed")

    if len(data.roll_no) < 6:
        raise HTTPException(status_code=400, detail="Invalid roll number")

    # extract department id (12 from roll number)
    department_id = int(data.roll_no[5:7])

    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 1️⃣ Create user
    new_user = User(
        name=data.name,
        email=data.email,
        password=data.password,
        role="student",
        department_id=department_id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 2️⃣ Auto-create student profile
    student = Student(
        student_id=new_user.user_id,
        roll_no=data.roll_no,
        year=1,
        semester=1,
        cgpa=0.00
    )

    db.add(student)
    db.commit()

    return {
        "message": "Student signup successful",
        "user_id": new_user.user_id
    }


# -------------------------
# FACULTY SIGNUP
# -------------------------
@app.post("/signup/teacher")
def teacher_signup(data: TeacherSignupRequest, db: Session = Depends(get_db)):

    if not data.email.endswith("@gvpcdpgc.edu.in"):
        raise HTTPException(status_code=400, detail="Only college email allowed")

    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 1️⃣ Create user
    new_user = User(
        name=data.name,
        email=data.email,
        password=data.password,
        role="faculty",
        department_id=data.department_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 2️⃣ Create faculty (MINIMAL)
    faculty = Faculty(
        faculty_id=new_user.user_id,
        employee_id=data.employee_id
    )
    db.add(faculty)
    db.commit()

    return {
        "message": "Faculty signup successful",
        "user_id": new_user.user_id
    }


# -------------------------
# ADMIN LOGIN
# -------------------------
@app.post("/login/admin")
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):

    if data.access_key != os.getenv("ADMIN_ACCESS_KEY"):
        raise HTTPException(status_code=403, detail="Invalid admin access key")

    admin = db.query(User).filter(
        User.email == data.email,
        User.role == "admin"
    ).first()

    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if admin.password != data.password:
        raise HTTPException(status_code=401, detail="Invalid password")

    return {
        "user_id": admin.user_id,
        "name": admin.name,
        "role": admin.role
    }
