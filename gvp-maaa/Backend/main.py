from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text,extract
from security import hash_password, verify_password
from mail import send_reset_email
from schemas import  AlertCreate, AssignSubjectRequest, AttendanceCreate, ResetPasswordRequest, StudentPromotionRequest, TeacherAdminUpdate, TeacherDeleteRequest,TimetableCreate, TimetableResponse,StudentDeleteRequest,SubjectCreate
from datetime import datetime
from models import Alert, AlertRecipient, StudentAlert, Timetable, Subject,FacultySubject,Attendance


from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Table, TableStyle
from fastapi.responses import FileResponse
from reportlab.platypus import Table, TableStyle, Paragraph, Spacer, Image
from reportlab.platypus import SimpleDocTemplate
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from fastapi.responses import FileResponse
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from datetime import date, timedelta



import pandas as pd
import os
import json
import shutil
import uuid

DEPARTMENT_MAP = {
    11: "CSE",
    12: "CSM",
    14: "ECE",
    15: "MECH",
    1: "CIVIL"
}


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
    allow_origins=["http://localhost:5173"],
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
        "role": user.role,
        "department_id": user.department_id   # ✅ ADD THIS
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
    joining_year = int(data.roll_no[2:4])
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
    joining_year=joining_year,   # ✅ ADD THIS
    year=1,
    semester=1,
    section=None,
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
# FACULTY – MARK ATTENDANCE
# -------------------------    
@app.post("/faculty/attendance")
def mark_attendance(
    payload: AttendanceCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    # 🔒 Check faculty assignment
    subject_check = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == payload.subject_id,
        FacultySubject.year == payload.year,
        FacultySubject.section == payload.section,
        FacultySubject.is_active == True
    ).first()

    if not subject_check:
        raise HTTPException(status_code=403, detail="Not assigned to this class")

    updated_students = []

    # -----------------------------------
    # UPDATE / CREATE ATTENDANCE RECORDS
    # -----------------------------------
    for record in payload.records:

        existing = db.query(Attendance).filter(
            Attendance.student_id == record.student_id,
            Attendance.subject_id == payload.subject_id,
            Attendance.attendance_date == payload.date
        ).first()

        if existing:
            if existing.status != record.status:
                existing.status = record.status
                updated_students.append(record.student_id)

        else:
            new_attendance = Attendance(
                student_id=record.student_id,
                subject_id=payload.subject_id,
                faculty_id=current_user["user_id"],
                attendance_date=payload.date,
                status=record.status
            )
            db.add(new_attendance)
            updated_students.append(record.student_id)

    # ✅ Commit once after processing all students
    db.commit()

    # -----------------------------------
    # FETCH SUBJECT & FACULTY INFO
    # -----------------------------------
    subject = db.query(Subject).filter(
        Subject.subject_id == payload.subject_id
    ).first()

    

    faculty_user = db.query(User).filter(
        User.user_id == current_user["user_id"]
    ).first()

    # -----------------------------------
    # CREATE ALERTS (ONLY IF UPDATED)
    # -----------------------------------
    for student_id in updated_students:

        # Delete old attendance alerts for this student
        old_alerts = db.query(Alert).filter(
            Alert.type == "attendance",
            Alert.student_id == student_id
        ).all()

        for old in old_alerts:
            db.query(AlertRecipient).filter(
                AlertRecipient.alert_id == old.id
            ).delete()
            db.delete(old)

        db.commit()

        # Create new alert
        new_alert = Alert(
            title="Attendance Updated",
            message=f"{faculty_user.name} updated your attendance for {subject.subject_name} on {payload.date}.",
            type="attendance",
            target_role="student",
            target_type="individual",
            student_id=student_id
        )

        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        recipient = AlertRecipient(
            alert_id=new_alert.id,
            user_id=student_id,
            is_read=False
        )

        db.add(recipient)
        db.commit()

    return {"message": "Attendance saved successfully"}




# -------------------------
# FACULTY – GET STUDENTS FOR ATTENDANCE
# -------------------------
@app.get("/faculty/attendance/students")
def get_students_for_attendance(
    year: int,
    section: str,
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    # 🔒 Check faculty assignment
    assignment = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == subject_id,
        FacultySubject.year == year,
        FacultySubject.section == section,
        FacultySubject.is_active == True
    ).first()

    print("USER:", current_user["user_id"])
    print("SUBJECT:", subject_id)
    print("YEAR:", year)
    print("SECTION:", section)
    print("ASSIGNMENT:", assignment)

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned to this class")

    # Get subject department properly
    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    department_id = subject.department_id
    print("Subject Department:", department_id)

    test_students = db.query(Student).filter(
        Student.year == year,
        Student.section == section
    ).all()

    print("Students matching year & section:", len(test_students))

    for s in test_students:
        user_obj = db.query(User).filter(
            User.user_id == s.student_id
        ).first()
        print("Student Roll:", s.roll_no, "Dept:", user_obj.department_id)

    students = (
    db.query(Student, User)
    .join(User, Student.student_id == User.user_id)
    .filter(
        User.department_id == department_id,
        Student.year == year,
        Student.section == section,
        User.is_deleted == False
    )
    .order_by(Student.roll_no.asc())   # ✅ SORT BY ROLL
    .all()
 )

    result = []

    for student, user in students:

        # 🔥 Generate last 5 calendar dates (including missing ones)
        today = date.today()

        last_5_status = []

        for i in range(4, -1, -1):  # oldest → newest
            check_date = today - timedelta(days=i)

            record = db.query(Attendance).filter(
                Attendance.student_id == student.student_id,
                Attendance.subject_id == subject_id,
                Attendance.attendance_date == check_date
            ).first()

            if record:
                last_5_status.append({
                    "status": record.status,
                    "date": check_date
                })
            else:
                last_5_status.append({
                    "status": None,   # 👈 important for grey dot
                    "date": check_date
                })
        
        total = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id
        ).count()

        present = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id,
            Attendance.status == True
        ).count()

        percentage = round((present / total) * 100, 2) if total > 0 else 0

        result.append({
            "id": student.student_id,
            "roll": student.roll_no,
            "name": user.name,
            "last_5": last_5_status,
            "percentage": percentage,
            "present": present,
            "total": total
        })

    return result

# -------------------------
# FACULTY – GET LAST 5 ATTENDANCE RECORDS FOR A STUDENT
# -------------------------
@app.get("/faculty/attendance/last5")
def get_last_5_classes(
    subject_id: int,
    student_id: int,
    db: Session = Depends(get_db)
):
    records = db.query(Attendance).filter(
        Attendance.subject_id == subject_id,
        Attendance.student_id == student_id
    ).order_by(Attendance.attendance_date.desc()).limit(5).all()

    return records


# -------------------------
# FACULTY – CHECK IF ATTENDANCE ALREADY EXISTS
# -------------------------
@app.get("/faculty/attendance/check")
def check_attendance_exists(
    subject_id: int,
    date: date,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    existing = db.query(Attendance).filter(
        Attendance.subject_id == subject_id,
        Attendance.attendance_date == date,
        Attendance.faculty_id == current_user["user_id"]
    ).first()

    return {
        "already_marked": True if existing else False
    }


# -------------------------
# FACULTY – GET ATTENDANCE BY DATE (FOR EDITING)
# -------------------------
@app.get("/faculty/attendance/by-date")
def get_attendance_by_date(
    subject_id: int,
    date: date,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    records = db.query(Attendance).filter(
        Attendance.subject_id == subject_id,
        Attendance.attendance_date == date,
        Attendance.faculty_id == current_user["user_id"]
    ).all()

    return [
        {
            "student_id": r.student_id,
            "status": r.status
        }
        for r in records
    ]

# -------------------------
# FACULTY – GET SEMESTER ATTENDANCE PERCENTAGE FOR ALL STUDENTS
# -------------------------
@app.get("/faculty/attendance/semester/{subject_id}")
def get_semester_attendance(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    students = (
        db.query(Student)
        .join(FacultySubject, FacultySubject.year == Student.year)
        .filter(
            FacultySubject.faculty_id == current_user["user_id"],
            FacultySubject.subject_id == subject_id,
            FacultySubject.is_active == True
        )
        .all()
    )

    result = []

    for student in students:
        total = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id
        ).count()

        present = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id,
            Attendance.status == True
        ).count()

        percentage = round((present / total) * 100, 2) if total > 0 else 0

        result.append({
            "student_id": student.student_id,
            "percentage": percentage
        })

    return result


# =========================
# FACULTY – UNIVERSAL ATTENDANCE REPORT
# =========================
@app.get("/faculty/attendance/report/{subject_id}")
def attendance_report(
    subject_id: int,
    start_date: date = None,
    end_date: date = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    # 🔒 Validate assignment
    assignment = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == subject_id,
        FacultySubject.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned to this subject")

    # ✅ Default to current week if no dates given
    if not start_date or not end_date:
        today = date.today()
        start_date = today - timedelta(days=today.weekday())
        end_date = today

    # Get subject department properly
    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    department_id = subject.department_id

    students = (
        db.query(Student, User)
        .join(User, Student.student_id == User.user_id)
        .filter(
            Student.year == assignment.year,
            Student.section == assignment.section,
            User.department_id == department_id,
            User.is_deleted == False
        )
        .all()
    )

    

    student_data = []
    total_records = 0
    total_present = 0
    total_absent = 0

    unique_classes = db.query(Attendance.attendance_date).filter(
        Attendance.subject_id == subject_id,
        Attendance.attendance_date >= start_date,
        Attendance.attendance_date <= end_date
    ).distinct().count()

    for student, user in students:

        records = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id,
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date
        ).all()

        total = unique_classes
        present = len([r for r in records if r.status])
        absent = total - present
        percent = round((present / total) * 100, 2) if total > 0 else 0

        total_records += total
        total_present += present
        total_absent += absent

        student_data.append({
            "roll": student.roll_no,
            "name": user.name,
            "total_classes": total,
            "present": present,
            "absent": absent,
            "percentage": percent
        })

    student_data.sort(key=lambda x: x["percentage"], reverse=True)

    
    total_entries = total_present + total_absent

    class_average = round(
        (total_present / total_entries) * 100, 2
    ) if total_entries > 0 else 0

    present_percentage = round(
        (total_present / total_entries) * 100, 2
    ) if total_entries > 0 else 0

    absent_percentage = round(
        (total_absent / total_entries) * 100, 2
    ) if total_entries > 0 else 0

    class_average = present_percentage
    

    return {
    "start_date": start_date,
    "end_date": end_date,
    "total_records": unique_classes,
    "present_percentage": present_percentage,
    "absent_percentage": absent_percentage
 }


# =========================
# FACULTY – DOWNLOAD REPORT PDF
# =========================
@app.get("/faculty/attendance/report/{subject_id}/download")
def download_report_pdf(
    subject_id: int,
    start_date: date = None,
    end_date: date = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    from datetime import timedelta

    if not start_date or not end_date:
        today = date.today()
        start_date = today - timedelta(days=today.weekday())
        end_date = today

    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    faculty = db.query(User).filter(
        User.user_id == current_user["user_id"]
    ).first()

    # ✅ Get assignment details
    assignment = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == subject_id,
        FacultySubject.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned")

    # ✅ Count unique class dates
    unique_classes = db.query(Attendance.attendance_date).filter(
        Attendance.subject_id == subject_id,
        Attendance.attendance_date >= start_date,
        Attendance.attendance_date <= end_date
    ).distinct().count()

    # ✅ Get students
    students = (
        db.query(Student, User)
        .join(User, Student.student_id == User.user_id)
        .filter(
            Student.year == assignment.year,
            Student.section == assignment.section,
            User.department_id == subject.department_id,
            User.is_deleted == False
        )
        .all()
    )

    student_rows = []
    total_present = 0
    total_absent = 0

    for student, user in students:

        records = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id,
            Attendance.attendance_date >= start_date,
            Attendance.attendance_date <= end_date
        ).all()

        total = len(records)
        present = len([r for r in records if r.status])
        absent = total - present
        percent = round((present / total) * 100, 2) if total > 0 else 0

        total_present += present
        total_absent += absent

        student_rows.append({
            "roll": student.roll_no,
            "name": user.name,
            "total_classes": total,
            "present": present,
            "absent": absent,
            "percentage": percent
        })

    # ✅ Sort by percentage descending
    student_rows.sort(key=lambda x: x["percentage"], reverse=True)

    # ✅ Calculate class average
    total_entries = total_present + total_absent
    class_average = round(
        (total_present / total_entries) * 100, 2
    ) if total_entries > 0 else 0

   # ================= PDF GENERATION =================

    file_path = f"attendance_report_{subject_id}.pdf"
    doc = SimpleDocTemplate(file_path, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()

    # ================= HEADER WITH LOGO =================
    logo = Image("assests\gvp logo.jpg", width=1.2*inch, height=1.2*inch)

    header_table = Table([[logo, Paragraph("<b>GAYATRI VIDYA PARISHAD</b><br/>Attendance Performance Report", styles["Title"])]])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE")
    ]))

    elements.append(header_table)
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph(f"<b>Faculty:</b> {faculty.name}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Subject:</b> {subject.subject_name}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Period:</b> {start_date} to {end_date}", styles["Normal"]))
    elements.append(Paragraph(f"<b>Total Classes:</b> {unique_classes}", styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    # ================= RANK CALCULATION =================
    student_rows.sort(key=lambda x: x["percentage"], reverse=True)

    rank = 1
    for i, s in enumerate(student_rows):
        if i > 0 and s["percentage"] < student_rows[i-1]["percentage"]:
            rank = i + 1
        s["rank"] = rank

    highest = student_rows[0]
    lowest = student_rows[-1]

    elements.append(Paragraph(f"<b>Highest Attendance:</b> {highest['name']} ({highest['percentage']}%)", styles["Normal"]))
    elements.append(Paragraph(f"<b>Lowest Attendance:</b> {lowest['name']} ({lowest['percentage']}%)", styles["Normal"]))
    elements.append(Spacer(1, 0.3 * inch))

    # ================= SORT BY ROLL =================
    student_rows.sort(key=lambda x: x["roll"])

    # ================= TABLE =================
    table_data = [["Rank", "Roll No", "Name", "Total", "Present", "Absent", "%"]]

    for s in student_rows:
        table_data.append([
            s["rank"],
            s["roll"],
            s["name"],
            s["total_classes"],
            s["present"],
            s["absent"],
            f"{s['percentage']}%"
        ])

    table = Table(table_data, repeatRows=1)

    style = TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#DDDDDD")),
        ("GRID", (0,0), (-1,-1), 0.5, colors.grey),
        ("ALIGN", (3,1), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ])

    # ================= COLOR RULES =================
    for i, s in enumerate(student_rows, start=1):
        if s["percentage"] >= 75:
            bg = colors.HexColor("#D4EDDA")  # Green
        elif s["percentage"] >= 60:
            bg = colors.HexColor("#FFF3CD")  # Yellow
        else:
            bg = colors.HexColor("#F8D7DA")  # Red

        style.add("BACKGROUND", (0,i), (-1,i), bg)

    table.setStyle(style)
    elements.append(table)
    elements.append(Spacer(1, 0.4 * inch))

    # ================= CLASS AVERAGE =================
    elements.append(Paragraph(f"<b>Class Average:</b> {class_average}%", styles["Heading3"]))
    elements.append(Spacer(1, 0.3 * inch))

    # ================= LEGEND =================
    elements.append(Paragraph("<b>Legend:</b>", styles["Normal"]))
    elements.append(Paragraph("Green  → ≥ 75%", styles["Normal"]))
    elements.append(Paragraph("Yellow → 60% – 74.99%", styles["Normal"]))
    elements.append(Paragraph("Red    → < 60%", styles["Normal"]))
    elements.append(Spacer(1, 0.5 * inch))

    # ================= WATERMARK + PAGE NUMBER =================
    def add_watermark_and_footer(canvas_obj, doc_obj):
        canvas_obj.saveState()

        # Watermark
        canvas_obj.setFont("Helvetica-Bold", 60)
        canvas_obj.setFillColorRGB(0.9, 0.9, 0.9)
        canvas_obj.translate(300, 400)
        canvas_obj.rotate(45)
        canvas_obj.drawCentredString(0, 0, "GVP-MAAA")
        canvas_obj.restoreState()

        # Footer
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.drawString(40, 20, f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M')}")
        canvas_obj.drawRightString(550, 20, f"Page {doc_obj.page}")

    doc.build(elements, onFirstPage=add_watermark_and_footer, onLaterPages=add_watermark_and_footer)
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=file_path
    )


# =========================
# FACULTY – CLASS ATTENDANCE SUMMARY
# =========================
@app.get("/faculty/attendance/class-summary")
def get_class_attendance_summary(
    subject_id: int,
    department: str,
    year: int,
    section: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    # convert department to id
    department_id = None
    for key, value in DEPARTMENT_MAP.items():
        if value == department:
            department_id = key

    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    department_id = subject.department_id

    # 🔒 Validate assignment first
    assignment = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == subject_id,
        FacultySubject.year == year,
        FacultySubject.section == section,
        FacultySubject.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned")

    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    department_id = subject.department_id

    students = (
        db.query(Student, User)
        .join(User, Student.student_id == User.user_id)
        .filter(
            Student.year == year,
            Student.section == section,
            User.department_id == department_id,
            User.is_deleted == False
        )
        .all()
    )

    results = []

    for student, user in students:

        total = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id
        ).count()

        present = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id,
            Attendance.status == True
        ).count()

        percentage = (present / total * 100) if total > 0 else 0

        results.append({
            "student_id": student.student_id,
            "name": user.name,
            "percentage": round(percentage, 2)
        })

    return results



# -------------------------
# ADMIN LOGIN (JWT BASED)
# -------------------------
@app.post("/login/admin")
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):

    # 1️⃣ Validate admin access key
    if data.access_key != os.getenv("ADMIN_ACCESS_KEY"):
        raise HTTPException(status_code=403, detail="Invalid admin access key")

    # 2️⃣ Get admin user
    admin = db.query(User).filter(
        User.email == data.email,
        User.role == "admin"
    ).first()

    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    # 3️⃣ Verify bcrypt password ✅
    if not verify_password(data.password, admin.password):
        raise HTTPException(status_code=401, detail="Invalid password")

    # 4️⃣ Create JWT
    access_token = create_access_token(
    data={
        "user_id": admin.user_id,
        "role": admin.role,
        "department_id": admin.department_id  # ✅ ADD THIS
    }
   )


    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": admin.user_id,
        "name": admin.name,
        "role": admin.role
    }

# =========================
# ADMIN – PROMOTE STUDENTS
# =========================
@app.put("/admin/students/promote")
def promote_students(
    current_year: int,
    new_year: int,
    section: str | None = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 🔐 Admin only
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    query = db.query(Student).filter(Student.year == current_year)

    if section:
        query = query.filter(Student.section == section)

    students = query.all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found")

    for s in students:
        s.year = new_year
        s.semester = new_year * 2 - 1  # semester logic

    db.commit()

    return {
        "message": f"{len(students)} students promoted successfully"
    }

# =========================
# ADMIN – GET ALL STUDENTS
# =========================
@app.get("/admin/students")
def get_all_students(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    students = (
    db.query(Student, User)
    .join(User, Student.student_id == User.user_id)
    .filter(Student.is_deleted == False)
    .all()
   )


    return [
        {
            "id": student.student_id,
            "roll": student.roll_no,
            "name": user.name,
            "year": student.year,
            "semester": student.semester,
            "section": student.section,
            "department": DEPARTMENT_MAP.get(user.department_id, "UNKNOWN"),
            "attendance": 0,
            "cgpa": float(student.cgpa),
            "backlogs": 0
        }
        for student, user in students
    ]

# =========================
# ADMIN – BULK PROMOTE STUDENTS
# =========================
@app.put("/admin/students/bulk-promote")
def bulk_promote_students(
    payload: StudentPromotionRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    students = db.query(Student).filter(
        Student.student_id.in_(payload.student_ids)
    ).all()

    if not students:
        raise HTTPException(status_code=404, detail="No students found")

    for student in students:

        # ✅ Update semester if provided
        if payload.new_semester is not None:
            student.semester = payload.new_semester
            student.year = (payload.new_semester + 1) // 2

        # ✅ Update section if provided
        if payload.new_section is not None:
            student.section = payload.new_section

    db.commit()

    return {
        "message": "Students updated successfully",
        "updated_count": len(students)
    }


# =========================
# ADMIN – UPDATE SINGLE STUDENT
# =========================
@app.put("/admin/students/{student_id}")
def update_student(
    student_id: int,
    data: dict,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 🔐 Admin only
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    student = db.query(Student).filter(Student.student_id == student_id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 🔄 Update only provided fields
    for key, value in data.items():
        if hasattr(student, key):
            setattr(student, key, value)

    db.commit()
    db.refresh(student)

    return {
        "message": "Student updated successfully",
        "student": student
    }


# =========================
# ADMIN – DELETE STUDENTS (SINGLE + BULK)
# =========================
@app.delete("/admin/students")
def delete_students(
    payload: StudentDeleteRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    if not payload.student_ids:
        raise HTTPException(status_code=400, detail="No students selected")

    students = db.query(Student).filter(
        Student.student_id.in_(payload.student_ids),
        Student.is_deleted == False
    ).all()

    if not students:
        raise HTTPException(status_code=404, detail="Students not found")

    for student in students:
        student.is_deleted = True
        student.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Students marked as deleted",
        "deleted_count": len(students)
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
    faculty_id: int = Form(None),


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

   

    # 🔥 STEP 2: Create new timetable
    timetable = Timetable(
        title=title,
        timetable_type=timetable_type,
        faculty_id=faculty_id,


        department=department,
        year=year,
        section=section,
        semester=semester,

        file_name=file.filename,
        file_url=f"/uploads/timetables/{filename}",
        file_type=file_type,

        audience=audience,
        uploaded_by=user["user_id"],
        is_active=True
    )

    db.add(timetable)
    db.commit()
    db.refresh(timetable)

    # =========================
    # AUTO CREATE ALERT
    # =========================

    # CASE 1: Specific faculty selected
    if audience == "faculty" and faculty_id:

        new_alert = Alert(
            title="New Timetable Uploaded",
            message=f"{title} has been uploaded. Please check the timetable section.",
           type=timetable_type.lower(),
            target_role="faculty",
            target_type="individual",
            faculty_id=faculty_id
        )

        db.add(new_alert)
        db.commit()
        db.refresh(new_alert)

        recipient = AlertRecipient(
            alert_id=new_alert.id,
            user_id=faculty_id,
            is_read=False
        )

        db.add(recipient)
        db.commit()


    # CASE 2: Broadcast logic
    else:

        if audience == "students":
            roles = ["student"]

        elif audience == "faculty":
            roles = ["faculty"]

        elif audience == "both":
            roles = ["student", "faculty"]

        elif audience == "all":
            roles = ["student", "faculty", "admin"]

        else:
            roles = []

        for role in roles:

            new_alert = Alert(
                title="New Timetable Uploaded",
                message=f"{title} has been uploaded. Please check the timetable section.",
                type="timetable",
                target_role=role,
                target_type="all"
            )

            db.add(new_alert)
            db.commit()
            db.refresh(new_alert)

            query = db.query(User).filter(
                User.role == role,
                User.is_deleted == False
            )

            # 🔥 Filter by department if provided
            if department:
                department_id = None
                for key, value in DEPARTMENT_MAP.items():
                    if value == department:
                        department_id = key

                if department_id:
                    query = query.filter(User.department_id == department_id)

            users = query.all()


            for user_obj in users:
                recipient = AlertRecipient(
                    alert_id=new_alert.id,
                    user_id=user_obj.user_id,
                    is_read=False
                )
                db.add(recipient)

            db.commit()


    return timetable

# =========================
# GET PUBLISHED TIMETABLES
# =========================
@app.get("/timetables", response_model=list[TimetableResponse])
def get_timetables(
    faculty_id: int = None,
    timetable_type: str = None,
    department: str = None,
    year: str = None,
    semester: str = None,
    section: str = None,
    audience: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):


    query = db.query(Timetable).filter(Timetable.is_active == True)

    # =============================
    # ROLE BASED SECURITY FILTER
    # =============================

    user_role = current_user["role"]
    user_department_id = current_user["department_id"]
    user_department = None
    if user_department_id:
        user_department = DEPARTMENT_MAP.get(user_department_id)

    if user_role == "student":
        query = query.filter(
            Timetable.department == user_department
        ).filter(
            Timetable.audience.in_(["students", "both", "all"])
        )

        if timetable_type:
            query = query.filter(
                Timetable.timetable_type.ilike(f"%{timetable_type}%")
            )


    elif user_role == "faculty":
        query = query.filter(
            (Timetable.department == user_department) |
            (Timetable.faculty_id == current_user["user_id"])
        ).filter(
            Timetable.audience.in_(["faculty", "both", "all"])
        )

    elif user_role == "admin":
        # admin can apply filters manually
        if department:
            query = query.filter(Timetable.department == department)
        if year:
            query = query.filter(Timetable.year == year)
        if semester:
            query = query.filter(Timetable.semester == semester)
        if section:
            query = query.filter(Timetable.section == section)
        if audience:
            query = query.filter(Timetable.audience == audience)

        if timetable_type:
            query = query.filter(
               Timetable.timetable_type.ilike(f"%{timetable_type}%")
            )


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


# =========================
# ADMIN – GET ALL TEACHERS
# =========================
@app.get("/admin/teachers")
def get_all_teachers(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    teachers = (
        db.query(Faculty, User)
        .join(User, Faculty.faculty_id == User.user_id)
        .filter(User.is_deleted == False)
        .all()
    )

    result = []

    for faculty, user in teachers:
        assignments = (
            db.query(FacultySubject, Subject)
            .join(Subject, FacultySubject.subject_id == Subject.subject_id)
            .filter(
                FacultySubject.faculty_id == user.user_id,
                FacultySubject.is_active == True
            )
            .all()
        )

        assigned_subjects = [
            {
                "assignment_id": fs.id,
                "subject_name": subject.subject_name,
                "year": fs.year,
                "section": fs.section,
                "semester": subject.semester
            }
            for fs, subject in assignments
        ]
        result.append({
            "id": user.user_id,
            "name": user.name,
            "department": DEPARTMENT_MAP.get(user.department_id, "UNKNOWN"),
            "designation": faculty.designation,
            "experience": faculty.experience,
            "email": user.email,
            "phone": faculty.phone,
            "subjects": faculty.expertise.split(",") if faculty.expertise else [],
            "alertsSent": 0,
            "classes": json.loads(faculty.classes) if faculty.classes else [],
            "assigned_subjects": assigned_subjects 
        })

    return result



# =========================
# ADMIN – UPDATE TEACHER
# =========================
@app.put("/admin/teachers/{teacher_id}")
def update_teacher(
    teacher_id: int,
    data: TeacherAdminUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    faculty = db.query(Faculty).filter(
        Faculty.faculty_id == teacher_id
    ).first()

    user = db.query(User).filter(
        User.user_id == teacher_id
    ).first()

    if not faculty or not user:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Update designation (Faculty table)
    if data.designation is not None:
     faculty.designation = data.designation


    # Update department (User table)
    if data.department_id is not None:
        user.department_id = data.department_id

    db.commit()

    return {"message": "Teacher updated successfully"}

# =========================
# ADMIN – DELETE TEACHERS (BULK + SOFT DELETE)
# =========================
@app.delete("/admin/teachers")
def delete_teachers(
    payload: TeacherDeleteRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    teachers = db.query(User).filter(
        User.user_id.in_(payload.teacher_ids),
        User.role == "faculty",
        User.is_deleted == False
    ).all()

    if not teachers:
        raise HTTPException(status_code=404, detail="Teachers not found")

    for teacher in teachers:
        teacher.is_deleted = True
        teacher.deleted_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Teachers deleted successfully",
        "deleted_count": len(teachers)
    }

# =========================
# ADMIN – CREATE ALERT
# ======================== 
@app.post("/admin/alerts")
def create_alert(
    title: str = Form(...),
    message: str = Form(...),
    type: str = Form(...),
    target_role: str = Form(...),
    target_type: str = Form(...),

    department: str = Form(None),
    faculty_id: int = Form(None),
    student_id: int = Form(None),

    file: UploadFile = File(None),

    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # -------------------------
    # VALIDATION
    # -------------------------
    if target_type == "individual":
        if target_role == "faculty" and not faculty_id:
            raise HTTPException(status_code=400, detail="Faculty ID required")
        if target_role == "student" and not student_id:
            raise HTTPException(status_code=400, detail="Student ID required")

    if target_type == "department" and not department:
        raise HTTPException(status_code=400, detail="Department required")

    # -------------------------
    # FILE HANDLING
    # -------------------------
    file_name = None
    file_path = None
    file_type = None

    if file:
        upload_dir = "uploads/alerts"
        os.makedirs(upload_dir, exist_ok=True)

        unique_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(upload_dir, unique_filename)

        with open(file_path, "wb") as f:
            f.write(file.file.read())

        file_name = file.filename
        file_type = file.filename.split(".")[-1]

    # -------------------------
    # CREATE ALERT
    # -------------------------
    new_alert = Alert(
        title=title,
        message=message,
        type=type.lower(),
        target_role=target_role,
        target_type=target_type,
        department=department,
        faculty_id=faculty_id,
        student_id=student_id,
        file_name=file_name,
        file_path=file_path,
        file_type=file_type
    )

    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    # -------------------------
    # CREATE RECIPIENTS
    # -------------------------
    users = []

    if target_type == "all":
        users = db.query(User).filter(
            User.role == target_role,
            User.is_deleted == False
        ).all()

    elif target_type == "individual":

        if target_role == "faculty" and faculty_id:
            users = db.query(User).filter(
                User.user_id == faculty_id,
                User.role == "faculty",
                User.is_deleted == False
            ).all()

        elif target_role == "student" and student_id:
            users = db.query(User).filter(
                User.user_id == student_id,
                User.role == "student",
                User.is_deleted == False
            ).all()

        else:
            users = []


    elif target_type == "department":
        department_id = None
        for key, value in DEPARTMENT_MAP.items():
            if value == department:
                department_id = key

        users = db.query(User).filter(
            User.role == target_role,
            User.department_id == department_id,
            User.is_deleted == False
        ).all()

    for user in users:
        recipient = AlertRecipient(
            alert_id=new_alert.id,
            user_id=user.user_id,
            is_read=False
        )
        print("TARGET ROLE:", target_role)
        print("TARGET TYPE:", target_type)
        print("STUDENT ID:", student_id)
        print("USERS FOUND:", users)

        db.add(recipient)

    db.commit()

    return {"message": "Alert created successfully"}


# =========================
# ADMIN – GET ALL ALERTS
# =========================
@app.get("/admin/alerts")
def get_all_alerts(
    role: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    query = db.query(Alert)

    # ❌ Exclude timetable auto alerts
    query = query.filter(Alert.type != "timetable")

    # ✅ Filter by role (faculty or student)
    if role:
        query = query.filter(Alert.target_role == role)

    alerts = query.order_by(Alert.created_at.desc()).all()

    return [
        {
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "type": a.type,
            "target_role": a.target_role,
            "target_type": a.target_type,
            "department": a.department,
            "faculty_id": a.faculty_id,
            "student_id": a.student_id,
            "created_at": a.created_at,
        }
        for a in alerts
    ]


# =========================
# ADMIN – DELETE ALERT
# =========================
@app.delete("/admin/alerts/{alert_id}")
def delete_alert(
    alert_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    alert = db.query(Alert).filter(Alert.id == alert_id).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # delete recipients first
    db.query(AlertRecipient).filter(
        AlertRecipient.alert_id == alert_id
    ).delete()

    # delete alert
    db.delete(alert)
    db.commit()

    return {"message": "Alert deleted successfully"}


# =========================
# FACULTY – GET ALERTS
# =========================
@app.get("/faculty/alerts")
def get_faculty_alerts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    alerts = (
        db.query(Alert, AlertRecipient)
        .join(AlertRecipient, Alert.id == AlertRecipient.alert_id)
        .filter(AlertRecipient.user_id == current_user["user_id"])
        .order_by(Alert.created_at.desc())
        .all()
    )

    result = []

    for alert, recipient in alerts:
        result.append({
            "id": alert.id,
            "title": alert.title,
            "message": alert.message,
            "type": alert.type,
            "created_at": alert.created_at,
            "is_read": recipient.is_read,
            "file_name": alert.file_name,
            "file_path": alert.file_path,
            "file_type": alert.file_type
        })


    return result


# =========================
# FACULTY – GET MY ASSIGNED SUBJECTS
# =========================
@app.get("/faculty/my-subjects")
def get_my_subjects(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    assignments = (
        db.query(FacultySubject, Subject)
        .join(Subject, FacultySubject.subject_id == Subject.subject_id)
        .filter(
            FacultySubject.faculty_id == current_user["user_id"],
            FacultySubject.is_active == True
        )
        .all()
    )

    return [
    {
        "subject_id": s.subject_id,
        "subject_name": s.subject_name,
        "year": fs.year,
        "section": fs.section,
        "semester": s.semester,
        "department": DEPARTMENT_MAP.get(
            db.query(User)
            .filter(User.user_id == current_user["user_id"])
            .first()
            .department_id
        )
    }
    for fs, s in assignments
 ]


# =========================
# STUDENT – GET ALERTS
# =========================
@app.get("/student/alerts")
def get_student_alerts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")

    alerts = (
        db.query(Alert, AlertRecipient)
        .join(AlertRecipient, Alert.id == AlertRecipient.alert_id)
        .filter(AlertRecipient.user_id == current_user["user_id"])
        .order_by(Alert.created_at.desc())
        .all()
    )

    result = []

    for alert, recipient in alerts:
        result.append({
            "id": alert.id,
            "title": alert.title,
            "message": alert.message,
            "type": alert.type,
            "created_at": alert.created_at,
            "is_read": recipient.is_read
        })

    return result


# =========================
# MARK ALERT AS READ
# =========================
@app.put("/alerts/{alert_id}/read")
def mark_read(alert_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    recipient = db.query(AlertRecipient).filter(
        AlertRecipient.alert_id == alert_id,
        AlertRecipient.user_id == current_user["user_id"]
    ).first()

    if not recipient:
        raise HTTPException(status_code=404, detail="Not found")

    recipient.is_read = True
    db.commit()

    return {"message": "Marked as read"}


# =========================
# ADMIN – GET ALL SUBJECTS
# =========================
@app.get("/admin/subjects")
def get_all_subjects(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    subjects = db.query(Subject).all()

    return [
        {
            "subject_id": s.subject_id,
            "subject_name": s.subject_name,
            "semester": s.semester,
            "department_id": s.department_id
        }
        for s in subjects
    ]


# =========================
# ADMIN – CREATE SUBJECT
# =========================
@app.post("/admin/subjects")
def create_subject(
    subject: SubjectCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    new_subject = Subject(
        subject_code=subject.subject_code,
        subject_name=subject.subject_name,
        semester=subject.semester,
        credits=subject.credits,
        department_id=subject.department_id
    )

    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)

    return {"message": "Subject created successfully"}


# =========================
# ADMIN – DELETE SUBJECT
# =========================
@app.delete("/admin/subjects/{subject_id}")
def delete_subject(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    if not subject:
        raise HTTPException(status_code=404, detail="Not found")

    db.delete(subject)
    db.commit()

    return {"message": "Deleted successfully"}



# =========================
# ADMIN – ASSIGN SUBJECT TO FACULTY
# =========================
@app.post("/admin/assign-subject")
def assign_subject(
    data: AssignSubjectRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    existing = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == data.faculty_id,
        FacultySubject.subject_id == data.subject_id,
        FacultySubject.year == data.year,
        FacultySubject.section == data.section,
        FacultySubject.is_active == True
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Already assigned")

    new_assignment = FacultySubject(
        faculty_id=data.faculty_id,
        subject_id=data.subject_id,
        year=data.year,
        section=data.section
    )

    db.add(new_assignment)
    db.commit()

    return {"message": "Subject assigned successfully"}


# =========================
# ADMIN – GET SUBJECTS ASSIGNED TO A FACULTY
# =========================
@app.get("/admin/faculty/{faculty_id}/subjects")
def get_faculty_subjects(
    faculty_id: int,
    db: Session = Depends(get_db)
):
    assignments = (
        db.query(FacultySubject, Subject)
        .join(Subject, FacultySubject.subject_id == Subject.subject_id)
        .filter(
            FacultySubject.faculty_id == faculty_id,
            FacultySubject.is_active == True
        )
        .all()
    )

    return [
    {
        "id": fs.id,
        "subject_name": s.subject_name,
        "semester": s.semester,   # ✅ from Subject table
        "year": fs.year,
        "section": fs.section,
        "assigned_at": fs.assigned_at
    }
    for fs, s in assignments
    ]




# =========================
# ADMIN – GET FACULTY-SUBJECT ASSIGNMENT HISTORY
# =========================
@app.get("/admin/faculty/{faculty_id}/subjects/history")
def get_faculty_subject_history(
    faculty_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    assignments = (
        db.query(FacultySubject, Subject)
        .join(Subject, FacultySubject.subject_id == Subject.subject_id)
        .filter(FacultySubject.faculty_id == faculty_id)
        .order_by(FacultySubject.assigned_at.desc())
        .all()
    )

    return [
        {
            "assignment_id": fs.id,
            "subject_name": subject.subject_name,
            "year": fs.year,
            "section": fs.section,
            "is_active": fs.is_active,
            "assigned_at": fs.assigned_at
        }
        for fs, subject in assignments
    ]


# =========================
# ADMIN – DELETE FACULTY-SUBJECT ASSIGNMENT
# =========================
@app.delete("/admin/remove-assignment/{assignment_id}")
def remove_assignment(
    assignment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    assignment = db.query(FacultySubject).filter(
        FacultySubject.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Not found")

    assignment.is_active = False
    db.commit()

    return {"message": "Assignment removed (soft delete)"}

# =========================
# ADMIN – UPDATE FACULTY-SUBJECT ASSIGNMENT
# =========================
@app.put("/admin/update-assignment/{assignment_id}")
def update_assignment(
    assignment_id: int,
    year: int,
    section: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    assignment = db.query(FacultySubject).filter(
        FacultySubject.id == assignment_id
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    assignment.year = year
    assignment.section = section

    db.commit()

    return {"message": "Assignment updated successfully"}

# =========================
# FACULTY – DOWNLOAD WEEKLY PDF (RANK + DEFAULTER)
# =========================
@app.get("/faculty/attendance/weekly/{subject_id}/download")
def download_weekly_pdf(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    from datetime import date, timedelta

    today = date.today()
    start_week = today - timedelta(days=today.weekday())

    # 🔒 Validate assignment
    assignment = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == subject_id,
        FacultySubject.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned to this subject")

    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    unique_classes = db.query(Attendance.attendance_date).filter(
        Attendance.subject_id == subject_id,
        Attendance.attendance_date >= start_week,
        Attendance.attendance_date <= today
    ).distinct().count()

   
    # Get subject department
    department_id = subject.department_id

    students = (
        db.query(Student, User)
        .join(User, Student.student_id == User.user_id)
        .filter(
            Student.year == assignment.year,
            Student.section == assignment.section,
            User.department_id == department_id,
            User.is_deleted == False
        )
        .all()
    )

    # -----------------------------
    # Collect student performance
    # -----------------------------
    student_rows = []
    total_records = 0
    total_present = 0

    for student, user in students:

        records = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id,
            Attendance.attendance_date >= start_week,
            Attendance.attendance_date <= today
        ).all()

        total = len(records)
        present = len([r for r in records if r.status])
        absent = total - present
        percent = round((present / total) * 100, 2) if total > 0 else 0

        total_records += total
        total_present += present

        student_rows.append({
            "roll": student.roll_no,
            "name": user.name,
            "total": total,
            "present": present,
            "absent": absent,
            "percentage": percent
        })

    # -----------------------------
    # Sort by percentage (DESC)
    # -----------------------------
    student_rows.sort(key=lambda x: x["percentage"], reverse=True)

    # -----------------------------
    # PDF Setup
    # -----------------------------
    file_path = f"weekly_report_{subject_id}.pdf"
    doc = SimpleDocTemplate(file_path)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("GVP-MAAA College", styles["Title"]))
    elements.append(Paragraph("Weekly Attendance Report", styles["Heading2"]))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph(f"Subject: {subject.subject_name}", styles["Normal"]))
    elements.append(Paragraph(f"Week Starting: {start_week}", styles["Normal"]))
    elements.append(Paragraph(f"Total Class Sessions: {unique_classes}", styles["Normal"]))
    elements.append(Paragraph(f"Total Students: {len(students)}", styles["Normal"]))
    elements.append(Spacer(1, 0.2 * inch))

    # Add Rank column
    table_data = [
        ["Rank", "Roll No", "Name", "Total", "Present", "Absent", "Percentage"]
    ]

    for index, row in enumerate(student_rows, start=1):
        table_data.append([
            index,
            row["roll"],
            row["name"],
            row["total"],
            row["present"],
            row["absent"],
            f'{row["percentage"]}%'
        ])

    
    total_students = len(students)

    class_average = round(
        (total_present / (unique_classes * total_students)) * 100, 2
    ) if unique_classes > 0 and total_students > 0 else 0

    table = Table(table_data, repeatRows=1)

    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
        ("ALIGN", (3, 1), (-1, -1), "CENTER"),
    ])

    # -----------------------------
    # Highlight Defaulters (<75%)
    # -----------------------------
    for i, row in enumerate(student_rows, start=1):
        if row["percentage"] < 75:
            style.add(
                "BACKGROUND",
                (0, i),      # from Rank column
                (-1, i),     # entire row
                colors.lightcoral
            )

    table.setStyle(style)

    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph(f"Class Average: {class_average}%", styles["Heading3"]))

    doc.build(elements)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=file_path
    )


# =========================
# FACULTY – DOWNLOAD MONTHLY PDF (RANK + DEFAULTER)
# =========================
@app.get("/faculty/attendance/monthly/{subject_id}/download")
def download_monthly_pdf(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    from datetime import date

    today = date.today()
    month = today.month
    year = today.year

    # 🔒 Validate assignment
    assignment = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == subject_id,
        FacultySubject.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned to this subject")

    subject = db.query(Subject).filter(
        Subject.subject_id == subject_id
    ).first()

    unique_classes = db.query(Attendance.attendance_date).filter(
        Attendance.subject_id == subject_id,
        extract('month', Attendance.attendance_date) == month,
        extract('year', Attendance.attendance_date) == year
    ).distinct().count()

    # Get subject department
    department_id = subject.department_id

    students = (
        db.query(Student, User)
        .join(User, Student.student_id == User.user_id)
        .filter(
            Student.year == assignment.year,
            Student.section == assignment.section,
            User.department_id == department_id,
            User.is_deleted == False
        )
        .all()
    )

    # -----------------------------
    # Collect student performance
    # -----------------------------
    student_rows = []
    total_present = 0

    for student, user in students:

        records = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject_id,
            extract('month', Attendance.attendance_date) == month,
            extract('year', Attendance.attendance_date) == year
        ).all()

        total = len(records)
        present = len([r for r in records if r.status])
        absent = total - present
        percent = round((present / total) * 100, 2) if total > 0 else 0

        total_present += present

        student_rows.append({
            "roll": student.roll_no,
            "name": user.name,
            "total": total,
            "present": present,
            "absent": absent,
            "percentage": percent
        })

    # -----------------------------
    # Sort by percentage (DESC)
    # -----------------------------
    student_rows.sort(key=lambda x: x["percentage"], reverse=True)

    # -----------------------------
    # PDF Setup
    # -----------------------------
    file_path = f"monthly_report_{subject_id}.pdf"
    doc = SimpleDocTemplate(file_path)
    elements = []
    styles = getSampleStyleSheet()

    elements.append(Paragraph("GVP-MAAA College", styles["Title"]))
    elements.append(Paragraph("Monthly Attendance Report", styles["Heading2"]))
    elements.append(Spacer(1, 0.3 * inch))

    elements.append(Paragraph(f"Subject: {subject.subject_name}", styles["Normal"]))
    elements.append(Paragraph(f"Month: {month} / {year}", styles["Normal"]))
    elements.append(Spacer(1, 0.2 * inch))

    # Add Rank column
    table_data = [
        ["Rank", "Roll No", "Name", "Total", "Present", "Absent", "Percentage"]
    ]

    for index, row in enumerate(student_rows, start=1):
        table_data.append([
            index,
            row["roll"],
            row["name"],
            row["total"],
            row["present"],
            row["absent"],
            f'{row["percentage"]}%'
        ])

    total_students = len(students)

    class_average = round(
        (total_present / (unique_classes * total_students)) * 100, 2
    ) if unique_classes > 0 and total_students > 0 else 0

    table = Table(
        table_data,
        colWidths=[0.7*inch, 1*inch, 1.5*inch, 0.7*inch, 0.7*inch, 0.7*inch, 0.8*inch],
        repeatRows=1
    )

    style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
        ("ALIGN", (3, 1), (-1, -1), "CENTER"),
    ])

    # -----------------------------
    # Highlight Defaulters (<75%)
    # -----------------------------
    for i, row in enumerate(student_rows, start=1):
        if row["percentage"] < 75:
            style.add(
                "BACKGROUND",
                (0, i),
                (-1, i),
                colors.lightcoral
            )

    table.setStyle(style)

    elements.append(table)
    elements.append(Spacer(1, 0.3 * inch))
    elements.append(Paragraph(f"Class Average: {class_average}%", styles["Heading3"]))

    doc.build(elements)

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=file_path
    )


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
