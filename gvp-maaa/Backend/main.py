from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from security import hash_password, verify_password
from mail import send_reset_email
from schemas import ResetPasswordRequest,TimetableCreate, TimetableResponse
from datetime import datetime
from models import Timetable

import pandas as pd


import os
import json
import shutil
import uuid


from dotenv import load_dotenv
load_dotenv()
from database import SessionLocal
from schemas import (
    LoginRequest,
    StudentSignupRequest,
    TeacherSignupRequest,
    AdminLoginRequest,
    StudentProfileUpdate,
    FacultyProfileUpdate,   
)
from models import User, Student, Faculty,Timetable
from auth import (
    create_access_token,
    create_reset_token,
    verify_reset_token,
    get_current_user   # ✅ ADD THIS
)





app = FastAPI(title="GVP Academic Analytics Backend")

from fastapi.staticfiles import StaticFiles

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)


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
# STUDENT PROFILE GET
# -------------------------
@app.get("/student/profile")
def get_student_profile(
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Not authorized")

    student = (
        db.query(Student, User)
        .join(User, Student.student_id == User.user_id)
        .filter(User.user_id == user["user_id"])
        .first()
    )

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student_data, user_data = student

    return {
    "name": user_data.name,
    "email": user_data.email,
    "roll_no": student_data.roll_no,
    "year": student_data.year,
    "semester": student_data.semester,
    "skills": student_data.skills.split(",") if student_data.skills else [],
    "certificates": json.loads(student_data.certificates)
        if student_data.certificates else [],
    "linkedin": student_data.linkedin,
    "github": student_data.github,
    "portfolio": student_data.portfolio,
 }

# -------------------------
# STUDENT PROFILE PUT
# -------------------------
@app.put("/student/profile")
def update_student_profile(
    data: StudentProfileUpdate,
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Not authorized")

    student = db.query(Student).filter(
        Student.student_id == user["user_id"]
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # BASIC INFO
    student.year = data.year
    student.semester = data.semester
    student.linkedin = data.linkedin
    student.github = data.github
    student.portfolio = data.portfolio

    # SKILLS (list → string)
    student.skills = ",".join(data.skills)

    # ✅ CERTIFICATES (list of objects → JSON string)
    student.certificates = json.dumps(
    [c.dict() for c in data.certificates]
 )


    db.commit()

    return {"message": "Profile updated successfully"}


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
# FACULTY PROFILE GET
# -------------------------
@app.get("/faculty/profile")
def get_faculty_profile(
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")

    faculty = (
        db.query(Faculty, User)
        .join(User, Faculty.faculty_id == User.user_id)
        .filter(User.user_id == user["user_id"])
        .first()
    )

    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")

    faculty_data, user_data = faculty

    return {
    # ---------- USER ----------
    "name": user_data.name,
    "email": user_data.email,

    # ---------- FACULTY ----------
    "employee_id": faculty_data.employee_id,
    "designation": faculty_data.designation,
    #"department": user_data.department_id,#
    "qualifications": faculty_data.qualifications,
    "experience": faculty_data.experience,

    "phone": faculty_data.phone,
    "bio": faculty_data.bio,

    "linkedin": faculty_data.linkedin,
    "github": faculty_data.github,
    "portfolio": faculty_data.portfolio,

    # ---------- LIST / JSON ----------
    "expertise": faculty_data.expertise.split(",")
        if faculty_data.expertise else [],

    "certifications": json.loads(faculty_data.certifications)
        if faculty_data.certifications else [],

    "publications": json.loads(faculty_data.publications)
        if faculty_data.publications else [],

    "classes": json.loads(faculty_data.classes)
        if faculty_data.classes else []
 }


# -------------------------
# FACULTY PROFILE PUT
# -------------------------
@app.put("/faculty/profile")
def update_faculty_profile(
    data: FacultyProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == current_user["user_id"]
    ).first()

    user = db.query(User).filter(
        User.user_id == current_user["user_id"]
    ).first()

    if not faculty or not user:
        raise HTTPException(status_code=404, detail="Faculty not found")

    # ----- USERS TABLE -----
    if data.name is not None:
        user.name = data.name

    # ----- FACULTY TABLE -----
    if data.phone is not None:
        faculty.phone = data.phone

    if data.bio is not None:
        faculty.bio = data.bio

    if data.linkedin is not None:
        faculty.linkedin = data.linkedin

    if data.github is not None:
        faculty.github = data.github

    if data.portfolio is not None:
        faculty.portfolio = data.portfolio

    if data.qualifications is not None:
        faculty.qualifications = data.qualifications

    if data.experience is not None:
        faculty.experience = data.experience

    # ----- JSON FIELDS -----
    if data.expertise is not None:
        faculty.expertise = ",".join(data.expertise)

    if data.certifications:
     faculty.certifications = json.dumps(
        [c.dict() for c in data.certifications]
    )

    if data.publications is not None:
        faculty.publications = json.dumps(
            [p.dict() for p in data.publications]
        )

    if data.classes is not None:
        faculty.classes = json.dumps(
            [c.dict() for c in data.classes]
        )

    db.commit()
    return {"message": "Profile updated successfully"}


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


# =========================
# ADMIN – UPLOAD TIMETABLE
# =========================
@app.post("/admin/timetable/upload", response_model=TimetableResponse)
def upload_timetable(
    title: str = Form(...),
    timetable_type: str = Form(...),

    department: str = Form(None),
    year: str = Form(None),
    section: str = Form(None),
    semester: str = Form(None),

    audience: str = Form("students"),
    file: UploadFile = File(...),

    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 🔐 Only admin
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # 📁 Ensure directory exists
    upload_dir = "uploads/timetables"
    os.makedirs(upload_dir, exist_ok=True)

    # 🔹 Unique filename
    timestamp = int(datetime.utcnow().timestamp())
    filename = f"{timestamp}_{file.filename}"
    file_path = os.path.join(upload_dir, filename)

    # 💾 Save file
    with open(file_path, "wb") as f:
        f.write(file.file.read())

    # 📄 File type
    file_type = file.filename.split(".")[-1].lower()

    # 🗄️ Save DB record
    timetable = Timetable(
        title=title,
        timetable_type=timetable_type,

        department=department,
        year=year,
        section=section,
        semester=semester,

        file_name=file.filename,
        file_path=file_path,
        file_type=file_type,

        audience=audience,
        uploaded_at=datetime.utcnow(),
        is_active=True
    )

    db.add(timetable)
    db.commit()
    db.refresh(timetable)

    return timetable



# =========================
# GET PUBLISHED TIMETABLES
# =========================
@app.get("/timetables", response_model=list[TimetableResponse])
def get_timetables(
    department: str = None,
    year: str = None,
    section: str = None,
    audience: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Timetable).filter(Timetable.is_active == True)

    if department:
        query = query.filter(Timetable.department == department)
    if year:
        query = query.filter(Timetable.year == year)
    if section:
        query = query.filter(Timetable.section == section)
    if audience:
        query = query.filter(Timetable.audience.in_([audience, "all"]))

    return query.order_by(Timetable.uploaded_at.desc()).all()


# =========================
# DELETE TIMETABLES
# =========================
@app.delete("/admin/timetables/{timetable_id}")
def delete_timetable(
    timetable_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    timetable = db.query(Timetable).filter(
        Timetable.id == timetable_id
    ).first()

    if not timetable:
        raise HTTPException(status_code=404, detail="Timetable not found")

    timetable.is_active = False
    db.commit()

    return {"message": "Timetable deleted successfully"}



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
