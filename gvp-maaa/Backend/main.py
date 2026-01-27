from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from security import hash_password, verify_password
from mail import send_reset_email
from schemas import ResetPasswordRequest


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
from auth import (
    create_access_token,
    create_reset_token,
    verify_reset_token,
    get_current_user   # ✅ ADD THIS
)





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

    if not verify_password(data.password, user.password):
       raise HTTPException(status_code=401, detail="Invalid password")


    # 🔐 CREATE JWT TOKEN
    access_token = create_access_token(
        data={
            "user_id": user.user_id,
            "role": user.role
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
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
    
    # 🔐 PASSWORD LENGTH CHECK (bcrypt safety)
    if len(data.password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password must be 72 characters or less"
        )


    # 1️⃣ Create user
    new_user = User(
    name=data.name,
    email=data.email,
    password=hash_password(data.password),
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
    
    # 🔐 PASSWORD LENGTH CHECK
    if len(data.password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password must be 72 characters or less"
    )

    try:
        # 1️⃣ Create user
        new_user = User(
            name=data.name,
            email=data.email,
            password=hash_password(data.password),
            role="faculty",          # ✅ STANDARDIZE ROLE
            department_id=data.department_id
        )
        db.add(new_user)
        db.flush()  # 🔑 get user_id WITHOUT commit

        # 2️⃣ Create faculty
        faculty = Faculty(
            faculty_id=new_user.user_id,
            employee_id=data.employee_id
        )
        db.add(faculty)

        # 3️⃣ Commit ONCE
        db.commit()

        return {
            "message": "Teacher signup successful",
            "user_id": new_user.user_id
        }

    except Exception as e:
        db.rollback()  # 🔥 THIS SAVES YOU
        raise HTTPException(status_code=400, detail=str(e))



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


# -------------------------
# STUDENT PROTECTED
# -------------------------
@app.get("/student/protected")
def student_protected(user=Depends(get_current_user)):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "message": "JWT works! Student access granted",
        "user": user
    }


# -------------------------
# TEACHER PROTECTED
# -------------------------
@app.get("/teacher/protected")
def teacher_protected(user=Depends(get_current_user)):
    if user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "message": "JWT works! Teacher access granted",
        "user": user
    }


# -------------------------
# ADMIN PROTECTED
# -------------------------
@app.get("/admin/protected")
def admin_protected(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "message": "JWT works! Admin access granted",
        "user": user
    }

# -------------------------
# FORGOT PASSWORD
# -------------------------
@app.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == email).first()

    # Security best practice
    if not user:
        return {"message": "If the email exists, a reset link has been sent"}

    reset_token = create_reset_token(email)
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"

    send_reset_email(email, reset_link)   # ✅ EMAIL SENT HERE

    return {"message": "Password reset link sent"}




# -------------------------
# RESET PASSWORD
# -------------------------
@app.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    # Verify token
    email = verify_reset_token(data.token)

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # bcrypt safety
    if len(data.new_password) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password must be 72 characters or less"
        )

    user.password = hash_password(data.new_password)
    db.commit()

    return {"message": "Password reset successful"}
