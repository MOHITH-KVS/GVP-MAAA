from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body, Query
from fastapi.middleware.cors import CORSMiddleware
from io import BytesIO
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text,extract, func, or_
from typing import Optional, List
from security import hash_password, verify_password
from mail import send_reset_email
from schemas import  AlertCreate, AssignSubjectRequest, AttendanceCreate, ResetPasswordRequest, StudentPromotionRequest, TeacherAdminUpdate, TeacherDeleteRequest,TimetableCreate, TimetableResponse,StudentDeleteRequest,SubjectCreate,AttendanceAnalyticsResponse, MarksUpload
import schemas
from datetime import datetime, timedelta
from database import engine
from models import (
    Base,
    Alert,
    AlertRecipient,
    Timetable,
    Subject,
    FacultySubject,
    Attendance,
    Student,
    User,
    AttendanceWarning,
    FacultyMonthlyAttendanceAlert,
    Assignment,
    AssignmentSubmission,
    Resource,
    ResourceAccess,
    Event,
    EventAttendance,
    EventRegistration,
    ExternalEventSubmission,
    Mark

)



from apscheduler.schedulers.background import BackgroundScheduler


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
    AssignmentCreate,
    AssignmentResponse,
    AssignmentSubmissionCreate,
    AssignmentSubmissionResponse,
    AssignmentDetailResponse,
    StatusUpdateRequest,
    StudentAssignmentSummaryResponse,
    ResourceResponse,
    ResourceAccessRequest,
    EventCreate,
    EventResponse,
    EventAttendanceResponse,
    EventAttendanceUpdate,
    BulkEventAttendanceUpdate,
    EventAlertRequest,
    EventResultUpdate,
    EventRegistrationRequest,
    StudentEventResponse,
    ExternalEventSubmissionCreate,
    ExternalEventSubmissionResponse,
    FacultyExternalSubmissionDetail
)
from models import User, Student, Faculty,Timetable
from auth import (
    create_access_token,
    create_reset_token,
    verify_reset_token,
    get_current_user   # ✅ ADD THIS
)






app = FastAPI(title="GVP Academic Analytics Backend")
Base.metadata.create_all(bind=engine)
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

from fastapi.staticfiles import StaticFiles

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)


def process_event_reminders():
    db = SessionLocal()
    try:
        today = date.today()
        target_date = today + timedelta(days=2)
        
        # Find events exactly 2 days out
        events_to_remind = db.query(Event).filter(Event.event_date == target_date).all()
        
        for event in events_to_remind:
            # Find all students in that year
            student_query = db.query(Student).filter(Student.year == event.year)
            
            # If a specific section is targeted (not 'All')
            if event.section and event.section != "All":
                student_query = student_query.filter(Student.section == event.section)
            
            students = student_query.all()
            
            title = f"Reminder: {event.title}"
            message = f"Reminder: The event '{event.title}' will be held on {event.event_date.strftime('%d %b %Y')} at {event.venue}. Don't miss it!"
            
            for s in students:
                # Check if reminder already sent to avoid duplicates (optional but good)
                # For now, simple create
                new_alert = Alert(
                    title=title,
                    message=message,
                    type="reminder",
                    target_role="student",
                    target_type="individual",
                    student_id=s.student_id,
                    faculty_id=event.created_by
                )
                db.add(new_alert)
                db.flush()
                db.add(AlertRecipient(alert_id=new_alert.id, user_id=s.student_id, is_read=False))
                
        db.commit()
    except Exception as e:
        print(f"Error processing event reminders: {e}")
    finally:
        db.close()


@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    scheduler = BackgroundScheduler()
    scheduler.add_job(process_event_reminders, "interval", hours=24)
    scheduler.start()




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

        if total == 0:
            continue  # no classes yet

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
# FACULTY – DOWNLOAD REPORT PDF (PRO VERSION)
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

    assignment = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.subject_id == subject_id,
        FacultySubject.is_active == True
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="Not assigned")

    unique_classes = db.query(Attendance.attendance_date).filter(
        Attendance.subject_id == subject_id,
        Attendance.attendance_date >= start_date,
        Attendance.attendance_date <= end_date
    ).distinct().count()

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

    student_rows.sort(key=lambda x: x["percentage"], reverse=True)

    rank = 1
    for i, s in enumerate(student_rows):
        if i > 0 and s["percentage"] < student_rows[i-1]["percentage"]:
            rank = i + 1
        s["rank"] = rank

    highest = student_rows[0] if student_rows else None
    lowest = student_rows[-1] if student_rows else None

    total_entries = total_present + total_absent
    class_average = round(
        (total_present / total_entries) * 100, 2
    ) if total_entries > 0 else 0

    # ================= PDF BUILD =================

    file_path = f"attendance_report_{subject_id}.pdf"
    doc = SimpleDocTemplate(
        file_path,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=60,
        bottomMargin=40
    )

    elements = []
    styles = getSampleStyleSheet()

    # ===== HEADER =====

    logo = Image("assests/gvp logo.jpg", width=0.9*inch, height=0.9*inch)

    college_style = ParagraphStyle(
        'CollegeStyle',
        parent=styles['Normal'],
        fontSize=13,
        leading=16
    )

    header = Table([[
        logo,
        Paragraph(
            "<b>GAYATRI VIDYA PARISHAD COLLEGE FOR DEGREE AND PG COURSES (A)</b>",
            college_style
        )
    ]], colWidths=[1*inch, 4.8*inch])

    header.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "MIDDLE")
    ]))

    elements.append(header)
    elements.append(Spacer(1, 15))

    title_style = ParagraphStyle(
        'CenteredTitle',
        parent=styles['Heading2'],
        alignment=1,  # CENTER
        textColor=colors.HexColor("#1F3A8A"),
        spaceAfter=10
    )

    elements.append(Paragraph(
        "<b>ATTENDANCE PERFORMANCE REPORT</b>",
        title_style
    ))

    elements.append(Spacer(1, 20))

    # ===== SUMMARY BOX (ALL IMPORTANT DATA AT TOP) =====

    summary_data = [
        ["Faculty:", faculty.name],
        ["Subject:", subject.subject_name],
        ["Period:", f"{start_date} to {end_date}"],
        ["Total Classes:", unique_classes],
        ["Top Attendance:", f"{highest['name']} ({highest['percentage']}%)" if highest else "-"],
        ["Low Attendance:", f"{lowest['name']} ({lowest['percentage']}%)" if lowest else "-"],
        ["Class Average:", f"{class_average}%"]
    ]

    summary_table = Table(summary_data, colWidths=[2*inch, 3.8*inch])

    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.whitesmoke),
        ("BOX", (0,0), (-1,-1), 1, colors.grey),
        ("INNERGRID", (0,0), (-1,-1), 0.25, colors.grey),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),  # Bold left column
        ("VALIGN", (0,0), (-1,-1), "MIDDLE")
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 25))

    # ===== STUDENT TABLE =====

    # Sort by percentage DESC, then roll ASC
    student_rows.sort(
        key=lambda x: (-x["percentage"], x["roll"])
    )

    # Assign rank properly
    for index, s in enumerate(student_rows, start=1):
        s["rank"] = index

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

    table = Table(
        table_data,
        repeatRows=1,
        colWidths=[0.6*inch, 1.2*inch, 1.8*inch, 0.7*inch, 0.8*inch, 0.8*inch, 0.7*inch]
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1F3A8A")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("GRID", (0,0), (-1,-1), 0.25, colors.grey)
    ]))

    elements.append(table)

    # ===== WATERMARK + BORDER + FOOTER =====

    def add_layout(canvas_obj, doc_obj):

        # Watermark (lighter)
        canvas_obj.saveState()
        canvas_obj.setFont("Helvetica-Bold", 80)
        canvas_obj.setFillColorRGB(0.96, 0.96, 0.96)
        canvas_obj.translate(A4[0]/2, A4[1]/2)
        canvas_obj.rotate(45)
        canvas_obj.drawCentredString(0, 0, "GVP-MAAA")
        canvas_obj.restoreState()

        # Footer (move higher)
        canvas_obj.setFont("Helvetica", 9)
        canvas_obj.drawString(40, 35,
            f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M')}"
        )
        canvas_obj.drawRightString(A4[0]-40, 35,
            f"Page {doc_obj.page}"
        )

        # Border
        canvas_obj.setLineWidth(1)
        canvas_obj.rect(25, 25, A4[0]-50, A4[1]-50)

    doc.build(elements, onFirstPage=add_layout, onLaterPages=add_layout)

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


# =========================
# STUDENT – GET ATTENDANCE (SEMESTER BASED)
# =========================
@app.get("/student/attendance")
def get_student_attendance(
    semester: int,
    subject_id: int = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")

    # Get student record
    student = db.query(Student).filter(
        Student.student_id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get subjects for this semester & department
    subjects = db.query(Subject).filter(
        Subject.semester == semester,
        Subject.department_id == current_user["department_id"]
    ).all()

    result = []

    for subject in subjects:

        # Filter by subject if selected
        if subject_id and subject.subject_id != subject_id:
            continue

        total = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject.subject_id
        ).count()

        present = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject.subject_id,
            Attendance.status == True
        ).count()

        percentage = round((present / total) * 100, 2) if total > 0 else 0

        # Last 5 classes
        last_5_records = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject.subject_id
        ).order_by(Attendance.attendance_date.desc()).limit(5).all()

        last_5 = [
            {
                "date": r.attendance_date,
                "status": r.status
            }
            for r in last_5_records
        ]

        result.append({
            "subject_id": subject.subject_id,
            "subject_name": subject.subject_name,
            "conducted": total,
            "attended": present,
            "percentage": percentage,
            "last_5": last_5
        })

    return result



# =========================
# STUDENT – GET ATTENDANCE ( MONTHLY BASED)
# =========================
@app.get("/student/attendance/monthly")
def get_monthly_attendance(
    semester: int,
    month: int,
    year: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")

    student = db.query(Student).filter(
        Student.student_id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get subjects for this semester
    subjects = db.query(Subject).filter(
        Subject.semester == semester,
        Subject.department_id == current_user["department_id"]
    ).all()

    from calendar import monthrange
    from datetime import date

    total_days = monthrange(year, month)[1]

    response = []

    for day in range(1, total_days + 1):

        current_date = date(year, month, day)

        day_data = {
            "date": current_date,
            "subjects": []
        }

        for subject in subjects:

            # Check if class conducted for this subject on this date
            class_exists = db.query(Attendance).filter(
                Attendance.subject_id == subject.subject_id,
                Attendance.attendance_date == current_date
            ).first()

            if class_exists:

                student_record = db.query(Attendance).filter(
                    Attendance.student_id == student.student_id,
                    Attendance.subject_id == subject.subject_id,
                    Attendance.attendance_date == current_date
                ).first()

                status = student_record.status if student_record else False

                day_data["subjects"].append({
                    "subject": subject.subject_name,
                    "working_day": True,
                    "status": status
                })

            else:
                day_data["subjects"].append({
                    "subject": subject.subject_name,
                    "working_day": False,
                    "status": None
                })

        response.append(day_data)

    return response





# =========================
# STUDENT – ATTENDANCE ANALYTICS
# =========================
@app.get(
    "/student/attendance/analytics",
    response_model=AttendanceAnalyticsResponse
)
def get_attendance_analytics(
    semester: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")

    student = db.query(Student).filter(
        Student.student_id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # 🔹 Get subjects for semester
    subjects = db.query(Subject).filter(
        Subject.semester == semester,
        Subject.department_id == current_user["department_id"]
    ).all()

    trend_data = []
    subject_comparison = []

    all_dates = set()

    # Collect all attendance dates
    for subject in subjects:
        records = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject.subject_id
        ).all()

        for r in records:
            all_dates.add(r.attendance_date)

    sorted_dates = sorted(list(all_dates))

    total_present = 0
    total_count = 0

    # 🔹 Build cumulative trend
    for d in sorted_dates:

        daily_records = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.attendance_date <= d
        ).all()

        present = len([r for r in daily_records if r.status])
        total = len(daily_records)

        percentage = round((present / total) * 100, 2) if total > 0 else 0

        trend_data.append({
            "date": d,
            "percentage": percentage
        })

    # 🔹 Subject comparison
    for subject in subjects:

        total = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject.subject_id
        ).count()

        present = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.subject_id == subject.subject_id,
            Attendance.status == True
        ).count()

        percentage = round((present / total) * 100, 2) if total > 0 else 0

        subject_comparison.append({
            "subject": subject.subject_name,
            "percentage": percentage
        })

        total_present += present
        total_count += total

    # 🔹 Simple Projection (Linear)
    current_percentage = round(
        (total_present / total_count) * 100, 2
    ) if total_count > 0 else 0

    projected_percentage = min(
        round(current_percentage + 2.5, 2),
        100
    )

    confidence = "high" if total_count > 20 else "moderate"

    prediction = {
        "projected_percentage": projected_percentage,
        "confidence": confidence
    }

    return {
        "trend": trend_data,
        "subject_comparison": subject_comparison,
        "prediction": prediction
    }





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
    year: int = None,
    semester: int = None,
    section: str = None,
    department: str = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    query = (
        db.query(Student, User)
        .join(User, Student.student_id == User.user_id)
        .filter(Student.is_deleted == False)
    )

    # -------------------------
    # APPLY FILTERS
    # -------------------------
    if year:
        query = query.filter(Student.year == year)

    if semester:
        query = query.filter(Student.semester == semester)

    if section:
        query = query.filter(Student.section == section)

    if department:
        dept_id = None
        for key, value in DEPARTMENT_MAP.items():
            if value == department:
                dept_id = key

        if dept_id:
            query = query.filter(User.department_id == dept_id)

    students = query.all()

    result = []

    for student, user in students:

        total = db.query(Attendance).filter(
            Attendance.student_id == student.student_id
        ).count()

        present = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.status == True
        ).count()

        percentage = round((present / total) * 100, 2) if total > 0 else 0

        # -------------------------
        # RISK CLASSIFICATION
        # -------------------------
        if percentage < 60:
            risk = "Critical"
        elif percentage < 75:
            risk = "Warning"
        else:
            risk = "Safe"

        result.append({
            "id": student.student_id,
            "roll": student.roll_no,
            "name": user.name,
            "year": student.year,
            "semester": student.semester,
            "section": student.section,
            "department": DEPARTMENT_MAP.get(user.department_id, "UNKNOWN"),
            "attendance": percentage,
            "cgpa": float(student.cgpa),
            "risk": risk
        })

    return result

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


# =========================
# ADMIN – DOWNLOAD RISK REPORT PDF
# =========================
@app.post("/admin/students/risk-report")
def download_risk_report(
    filters: dict = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # 🔒 Admin check
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # 🔽 Extract filters from frontend JSON
    year = filters.get("year")
    section = filters.get("section")
    search = filters.get("search")

    # 🔽 Base query
    query = db.query(Student, User).join(
        User, Student.student_id == User.user_id
    ).filter(
        Student.is_deleted == False,
        User.is_deleted == False
    )

    # 🔽 Apply filters safely
    if year and year != "All":
        query = query.filter(Student.year == int(year))

    if section and section != "All":
        query = query.filter(Student.section == section)

    if search:
        query = query.filter(
            User.name.ilike(f"%{search}%") |
            Student.roll_no.ilike(f"%{search}%")
        )

    students = query.all()

    # =========================
    # PDF GENERATION
    # =========================

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []

    styles = getSampleStyleSheet()
    elements.append(Paragraph("Risk Student Report", styles["Heading1"]))
    elements.append(Spacer(1, 20))

    data = [["Roll No", "Name", "Year", "Section", "Attendance %", "Risk"]]

    for student, user in students:

        total = db.query(Attendance).filter(
            Attendance.student_id == student.student_id
        ).count()

        present = db.query(Attendance).filter(
            Attendance.student_id == student.student_id,
            Attendance.status == True
        ).count()

        percentage = round((present / total) * 100, 2) if total > 0 else 0

        if percentage < 60:
            risk = "Critical"
        elif percentage < 75:
            risk = "Warning"
        else:
            continue  # Only include risk students

        data.append([
            student.roll_no,
            user.name,
            student.year,
            student.section,
            f"{percentage}%",
            risk
        ])

    # If no risk students
    if len(data) == 1:
        data.append(["-", "No Risk Students Found", "-", "-", "-", "-"])

    table = Table(data, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("ALIGN", (4, 1), (-1, -1), "CENTER"),
    ]))

    elements.append(table)

    doc.build(elements)

    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=risk_students.pdf"
        }
    )

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
# FACULTY – CREATE ALERT
# ======================== 
@app.post("/faculty/alerts")
def create_faculty_alert(
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
    if current_user["role"] != "faculty" and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # -------------------------
    # VALIDATION
    # -------------------------
    if target_type == "individual":
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
        faculty_id=current_user["user_id"],
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
        if target_role == "student" and student_id:
            users = db.query(User).filter(
                User.user_id == student_id,
                User.role == "student",
                User.is_deleted == False
            ).all()

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
        db.add(recipient)

    db.commit()

    return {"message": "Alert created successfully"}

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
# STUDENT – GET MY MARKS
# =========================
@app.get("/student/my-marks")
def get_my_marks(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")

    marks = db.query(Mark).filter(Mark.student_id == current_user["user_id"]).all()

    result = []
    for m in marks:
        subject = db.query(Subject).filter(Subject.subject_id == int(m.subject)).first()
        result.append({
            "subject": subject.subject_name if subject else "Unknown",
            "exam": m.exam_type,
            "marks": m.marks
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


# -------------------------
# scheduler to check attendance thresholds and send alerts (students)
# -------------------------
def check_attendance_thresholds():

    db = SessionLocal()

    try:
        students = db.query(Student).all()

        for student in students:

            user = db.query(User).filter(
                User.user_id == student.student_id
            ).first()

            if not user:
                continue

            subjects = db.query(Subject).filter(
                Subject.semester == student.semester,
                Subject.department_id == user.department_id
            ).all()

            for subject in subjects:

                total = db.query(Attendance).filter(
                    Attendance.student_id == student.student_id,
                    Attendance.subject_id == subject.subject_id
                ).count()

                if total < 5:
                    continue  # avoid noise

                present = db.query(Attendance).filter(
                    Attendance.student_id == student.student_id,
                    Attendance.subject_id == subject.subject_id,
                    Attendance.status == True
                ).count()

                percentage = (present / total) * 100

                # Determine current level
                if percentage < 60:
                    current_level = "critical"
                elif percentage < 75:
                    current_level = "warning"
                else:
                    current_level = "safe"

                existing = db.query(AttendanceWarning).filter(
                    AttendanceWarning.student_id == student.student_id,
                    AttendanceWarning.subject_id == subject.subject_id,
                    AttendanceWarning.semester == student.semester
                ).first()

                now = datetime.utcnow()

                # -----------------------------
                # CASE 1: Student is SAFE
                # -----------------------------
                if current_level == "safe":
                    if existing:
                        db.delete(existing)
                        db.commit()
                    continue

                # -----------------------------
                # CASE 2: First time crossing
                # -----------------------------
                if not existing:
                    send_alert = True
                    reminder = False

                # -----------------------------
                # CASE 3: Level Changed Down
                # -----------------------------
                elif existing.level != current_level:
                    send_alert = True
                    reminder = False

                # -----------------------------
                # CASE 4: Still Same Level → Reminder check
                # -----------------------------
                else:
                    days_passed = (now - existing.last_sent).days
                    if days_passed >= 14:
                        send_alert = True
                        reminder = True
                    else:
                        send_alert = False

                if not send_alert:
                    continue

                # -----------------------------
                # Build Alert Message
                # -----------------------------
                if current_level == "warning":
                    title = "⚠ Attendance Warning"
                else:
                    title = "🚨 Critical Attendance Alert"

                if reminder:
                    title = "🔔 Reminder: " + title

                message = (
                    f"Your attendance in {subject.subject_name} "
                    f"is {round(percentage,2)}%. "
                    f"Minimum required is 75%."
                )

                alert = Alert(
                    title=title,
                    message=message,
                    type="attendance-monitor",
                    target_role="student",
                    target_type="individual",
                    student_id=student.student_id
                )

                db.add(alert)
                db.commit()
                db.refresh(alert)

                recipient = AlertRecipient(
                    alert_id=alert.id,
                    user_id=student.student_id,
                    is_read=False
                )

                db.add(recipient)

                # Update tracking record
                if existing:
                    existing.level = current_level
                    existing.last_sent = now
                else:
                    new_warning = AttendanceWarning(
                        student_id=student.student_id,
                        subject_id=subject.subject_id,
                        semester=student.semester,
                        level=current_level,
                        last_sent=now
                    )
                    db.add(new_warning)

                db.commit()

    except Exception as e:
        print("Hybrid Scheduler Error:", e)

    finally:
        db.close()


# -------------------------
# scheduler to check attendance thresholds and send alerts (parents)
# -------------------------
def check_monthly_faculty_attendance():

    db = SessionLocal()

    try:
        today = datetime.utcnow()

        # 👉 Calculate previous month properly
        if today.month == 1:
            target_month = 12
            target_year = today.year - 1
        else:
            target_month = today.month - 1
            target_year = today.year

        assignments = db.query(FacultySubject).filter(
            FacultySubject.is_active == True
        ).all()

        for assignment in assignments:

            faculty_id = assignment.faculty_id
            subject_id = assignment.subject_id
            year_class = assignment.year
            section = assignment.section

            subject = db.query(Subject).filter(
                Subject.subject_id == subject_id
            ).first()

            students = (
                db.query(Student, User)
                .join(User, Student.student_id == User.user_id)
                .filter(
                    Student.year == year_class,
                    Student.section == section,
                    User.department_id == subject.department_id,
                    User.is_deleted == False
                )
                .all()
            )

            below_60_count = 0

            for student, user in students:

                records = db.query(Attendance).filter(
                    Attendance.student_id == student.student_id,
                    Attendance.subject_id == subject_id,
                    extract('month', Attendance.attendance_date) == target_month,
                    extract('year', Attendance.attendance_date) == target_year
                ).all()

                total = len(records)

                if total < 5:
                    continue  # avoid noise

                present = len([r for r in records if r.status])
                percentage = (present / total) * 100 if total > 0 else 0

                if percentage < 60:
                    below_60_count += 1

            if below_60_count == 0:
                continue

            # 🔒 Prevent duplicate monthly alerts
            existing = db.query(FacultyMonthlyAttendanceAlert).filter(
                FacultyMonthlyAttendanceAlert.faculty_id == faculty_id,
                FacultyMonthlyAttendanceAlert.subject_id == subject_id,
                FacultyMonthlyAttendanceAlert.year == year_class,
                FacultyMonthlyAttendanceAlert.section == section,
                FacultyMonthlyAttendanceAlert.month == target_month,
                FacultyMonthlyAttendanceAlert.year_value == target_year
            ).first()

            if existing:
                continue

            # ✅ Create alert
            alert = Alert(
                title="📊 Monthly Attendance Risk Summary",
                message=(
                    f"{below_60_count} students in "
                    f"{year_class}-{section} "
                    f"({subject.subject_name}) "
                    f"were below 60% attendance in "
                    f"{target_month}/{target_year}."
                ),
                type="monthly-attendance-summary",
                target_role="faculty",
                target_type="individual",
                faculty_id=faculty_id
            )

            db.add(alert)
            db.commit()
            db.refresh(alert)

            recipient = AlertRecipient(
                alert_id=alert.id,
                user_id=faculty_id,
                is_read=False
            )

            db.add(recipient)

            tracking = FacultyMonthlyAttendanceAlert(
                faculty_id=faculty_id,
                subject_id=subject_id,
                year=year_class,
                section=section,
                month=target_month,
                year_value=target_year,
                last_sent=datetime.utcnow()
            )

            db.add(tracking)
            db.commit()

    except Exception as e:
        print("Monthly Faculty Scheduler Error:", e)

    finally:
        db.close()


@app.get("/teacher/my-subjects")
def get_teacher_subjects(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Only teachers allowed")

    subjects = db.query(FacultySubject).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.is_active == True
    ).all()

    result = []

    for s in subjects:
        subject = db.query(Subject).filter(
            Subject.subject_id == s.subject_id
        ).first()

        result.append({
            "subject_id": s.subject_id,
            "subject_name": subject.subject_name if subject else "Unknown",
            "year": s.year,
            "section": s.section
        })

    return {"subjects": result}


# ========================
# ASSIGNMENT ENDPOINTS
# ========================

@app.post("/teacher/create-assignment")
def create_assignment(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subject_id: int = Form(...),
    year: int = Form(...),
    section: str = Form(...),
    due_date: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user["role"] != "faculty":
            raise HTTPException(status_code=403, detail="Only teachers can create assignments")

        faculty = db.query(Faculty).filter(
            Faculty.faculty_id == current_user["user_id"]
        ).first()

        if not faculty:
            raise HTTPException(status_code=404, detail="Faculty not found")

        faculty_subject = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == current_user["user_id"],
            FacultySubject.subject_id == subject_id,
            FacultySubject.year == year,
            FacultySubject.section == section
        ).first()

        if not faculty_subject:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to teach this class/subject"
            )

        # Parse due_date
        try:
            due_date_parsed = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        except Exception:
            due_date_parsed = datetime.strptime(due_date[:10], "%Y-%m-%d")

        # Handle optional file upload
        file_name = None
        file_path = None
        if file and file.filename:
            upload_dir = "uploads/assignments"
            os.makedirs(upload_dir, exist_ok=True)
            unique_filename = f"{uuid.uuid4()}_{file.filename}"
            file_path = os.path.join(upload_dir, unique_filename)
            with open(file_path, "wb") as f:
                f.write(file.file.read())
            file_name = file.filename

        new_assignment = Assignment(
            title=title,
            description=description,
            faculty_id=current_user["user_id"],
            subject_id=subject_id,
            year=year,
            section=section,
            due_date=due_date_parsed,
            is_active=True,
            file_name=file_name,
            file_path=file_path
        )

        db.add(new_assignment)
        db.commit()
        db.refresh(new_assignment)

        # =========================
        # CREATE ALERT FOR STUDENTS
        # =========================

        subject = db.query(Subject).filter(
            Subject.subject_id == subject_id
        ).first()

        faculty_user = db.query(User).filter(
            User.user_id == current_user["user_id"]
        ).first()

        students = (
            db.query(Student, User)
            .join(User, Student.student_id == User.user_id)
            .filter(
                Student.year == year,
                Student.section == section,
                User.department_id == subject.department_id,
                User.is_deleted == False
            )
            .all()
        )

        alert = Alert(
            title="📚 New Assignment Posted",
            message=f"{faculty_user.name} posted '{title}' for {subject.subject_name}. Due: {due_date_parsed.date()}",
            type="assignment",
            target_role="student",
            target_type="class"
        )

        db.add(alert)
        db.commit()
        db.refresh(alert)

        for student, user in students:
            recipient = AlertRecipient(
                alert_id=alert.id,
                user_id=user.user_id,
                is_read=False
            )
            db.add(recipient)

        db.commit()

        

        return {
            "status": "success",
            "message": "Assignment created successfully",
            "assignment_id": new_assignment.id
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/teacher/assignments/{year}/{section}")
def get_teacher_assignments(
    year: int,
    section: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    assignments = db.query(Assignment).filter(
        Assignment.faculty_id == current_user["user_id"],
        Assignment.year == year,
        Assignment.section == section
    ).order_by(Assignment.created_at.desc()).all()

    result = []

    for assignment in assignments:

        submissions = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == assignment.id
        ).all()

        submitted_count = len([s for s in submissions if s.is_submitted])
        total_submitted = len(submissions)

        total_students = db.query(Student).filter(
            Student.year == assignment.year,
            Student.section == assignment.section,
            Student.is_deleted == False
        ).count()

        result.append({
            "id": assignment.id,
            "title": assignment.title,
            "description": assignment.description,
            "due_date": assignment.due_date,
            "created_at": assignment.created_at,
            "subject_id": assignment.subject_id,
            "submitted": submitted_count,
            "total_students": total_students,
            "pending": total_students - total_submitted,
            "status": "Active" if assignment.is_active else "Inactive"
        })

    return {"status": "success", "assignments": result}



@app.get("/teacher/assignment-details/{assignment_id}")
def get_assignment_details(
    assignment_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    assignment = db.query(Assignment).filter(
        Assignment.id == assignment_id,
        Assignment.faculty_id == current_user["user_id"]
    ).first()

    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    students = db.query(Student).filter(
        Student.year == assignment.year,
        Student.section == assignment.section,
        Student.is_deleted == False
    ).all()

    submissions = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.assignment_id == assignment_id
    ).all()

    submitted_ids = {s.student_id for s in submissions if s.is_submitted}

    submitted_students = []
    pending_students = []

    for student in students:
        user = db.query(User).filter(User.user_id == student.student_id).first()

        student_info = {
            "name": user.name if user else "Unknown",
            "roll": student.roll_no,
            "student_id": student.student_id
        }

        # Find the specific submission for this student among those submitted
        submission = next((s for s in submissions if s.student_id == student.student_id and s.is_submitted), None)

        if submission:
            submitted_students.append({
                "submission_id": submission.id,
                "student_id": submission.student_id,
                "name": user.name if user else "Unknown",
                "roll": student.roll_no,
                "file_path": submission.file_path,
                "status": submission.status
            })
        else:
            pending_students.append(student_info)

    return {
        "status": "success",
        "assignment": {
            "id": assignment.id,
            "title": assignment.title,
            "description": assignment.description,
            "due_date": assignment.due_date,
            "created_at": assignment.created_at,
            "subject_id": assignment.subject_id,
            "year": assignment.year,
            "section": assignment.section
        },
        "submitted": submitted_students,
        "pending": pending_students
    }

@app.get("/student/assignments")
def get_student_assignments(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all assignments for the logged-in student
    """
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can access this")

        student = db.query(Student).filter(
            Student.student_id == current_user["user_id"]
        ).first()

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Get all assignments for student's class
        assignments = db.query(Assignment).filter(
            Assignment.year == student.year,
            Assignment.section == student.section,
            Assignment.is_active == True
        ).order_by(Assignment.due_date).all()

        # Check which ones are submitted
        submissions = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == current_user["user_id"]
        ).all()

        submitted_ids = {s.assignment_id for s in submissions}

        result = []
        for assignment in assignments:
            subject = db.query(Subject).filter(
                Subject.subject_id == assignment.subject_id
            ).first()

            submission = next((s for s in submissions if s.assignment_id == assignment.id), None)
            is_late = submission.is_late if submission else False
            status = submission.status if submission else "pending"
            
            # If submitted but status is still 'pending' at backend, show as 'submitted' for frontend 
            if submission and status == "pending":
                status = "submitted"

            result.append({
                "id": assignment.id,
                "title": assignment.title,
                "description": assignment.description,
                "subject": subject.subject_name if subject else "Unknown",
                "due_date": assignment.due_date,
                "created_at": assignment.created_at,
                "status": status,
                "is_late": is_late
            })

        return {"status": "success", "assignments": result}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@app.post("/student/submit-assignment/{assignment_id}")
async def submit_assignment(
    assignment_id: int,
    submission_text: Optional[str] = Form(None),
    file: UploadFile = File(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Student submits an assignment
    """
    try:
        if current_user["role"] != "student":
            raise HTTPException(status_code=403, detail="Only students can submit")

        assignment = db.query(Assignment).filter(
            Assignment.id == assignment_id
        ).first()

        if not assignment:
            raise HTTPException(status_code=404, detail="Assignment not found")

        student = db.query(Student).filter(
            Student.student_id == current_user["user_id"]
        ).first()

        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Check if student belongs to this class
        if student.year != assignment.year or student.section != assignment.section:
            raise HTTPException(status_code=403, detail="This assignment is not for your class")

        # Check if already submitted
        existing_submission = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.assignment_id == assignment_id,
            AssignmentSubmission.student_id == current_user["user_id"]
        ).first()

        if existing_submission:
            raise HTTPException(status_code=400, detail="You have already submitted this assignment")

        # Handle file upload
        file_name = None
        file_path = None
        file_type = None

        if file:
            try:
                # Create submissions folder if it doesn't exist
                os.makedirs("uploads/assignments", exist_ok=True)

                file_ext = file.filename.split(".")[-1]
                file_name = f"assignment_{assignment_id}_student_{current_user['user_id']}.{file_ext}"
                file_path = f"uploads/assignments/{file_name}"

                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)

                file_type = file_ext
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"File upload failed: {str(e)}")

        # Check if late
        is_late = datetime.utcnow() > assignment.due_date

        # Create submission
        submission = AssignmentSubmission(
            assignment_id=assignment_id,
            student_id=current_user["user_id"],
            file_name=file_name,
            file_path=file_path,
            file_type=file_type,
            submission_text=submission_text,
            submitted_at=datetime.utcnow(),
            is_late=is_late,
            is_submitted=True,
            status="pending"
        )

        db.add(submission)
        db.commit()
        db.refresh(submission)

        return {
            "status": "success",
            "message": "Assignment submitted successfully",
            "is_late": is_late,
            "submission_id": submission.id
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/teacher/student-assignments-summary/{year}/{section}")
def get_student_assignments_summary(
    year: int,
    section: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user["role"] != "faculty":
            raise HTTPException(status_code=403, detail="Only teachers can access this")

        # Get the 5 most recent assignments for this class
        recent_assignments = db.query(Assignment).filter(
            Assignment.faculty_id == current_user["user_id"],
            Assignment.year == year,
            Assignment.section == section,
            Assignment.is_active == True
        ).order_by(Assignment.created_at.desc()).limit(5).all()

        assignment_ids = [a.id for a in recent_assignments]

        students_query = db.query(Student, User).join(
            User, Student.student_id == User.user_id
        ).filter(
            Student.year == year,
            Student.section == section,
            Student.is_deleted == False
        ).all()

        student_summaries = []

        for student, user in students_query:
            # Avoid SQLAlchemy crash when list is empty
            if assignment_ids:
                submissions = db.query(AssignmentSubmission).filter(
                    AssignmentSubmission.student_id == student.student_id,
                    AssignmentSubmission.assignment_id.in_(assignment_ids)
                ).all()
            else:
                submissions = []

            submission_map = {s.assignment_id: s for s in submissions}

            recent_assignment_dots = []
            for assignment in recent_assignments:
                now = datetime.utcnow()

                if assignment.id in submission_map:
                    sub = submission_map[assignment.id]
                    status = sub.status  # "pending", "approved", "rejected"
                else:
                    # Compare with timezone-naive datetime
                    due = assignment.due_date
                    if hasattr(due, 'tzinfo') and due.tzinfo is not None:
                        due = due.replace(tzinfo=None)
                    status = "future" if due > now else "not_submitted"

                recent_assignment_dots.append({
                    "assignment_id": assignment.id,
                    "title": assignment.title,
                    "status": status,
                    "due_date": assignment.due_date.isoformat() if assignment.due_date else None
                })

            student_summaries.append({
                "student_id": student.student_id,
                "name": user.name if user else "Unknown",
                "roll": student.roll_no if hasattr(student, 'roll_no') else "",
                "year": student.year,
                "section": student.section,
                "recent_assignments": recent_assignment_dots
            })

        return {"status": "success", "students": student_summaries}

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching student summaries: {str(e)}")

@app.put("/teacher/assignment-submissions/{submission_id}/status")
def update_submission_status(
    submission_id: int,
    status_data: StatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Only teachers can access this")

    submission = db.query(AssignmentSubmission).filter(
        AssignmentSubmission.id == submission_id
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Verify teacher owns the assignment
    assignment = db.query(Assignment).filter(
        Assignment.id == submission.assignment_id,
        Assignment.faculty_id == current_user["user_id"]
    ).first()

    if not assignment:
        raise HTTPException(status_code=403, detail="You do not have permission to update this submission")

    if status_data.status not in ["approved", "rejected", "pending"]:
         raise HTTPException(status_code=400, detail="Invalid status. Must be approved, rejected, or pending")

    if submission.status == "approved" and status_data.status == "approved":
        raise HTTPException(
            status_code=400,
            detail="Assignment already approved"
        )

    submission.status = status_data.status
    db.commit()

    return {"status": "success", "message": f"Submission status updated to {status_data.status}"}



def check_assignment_deadlines():

    db = SessionLocal()

    try:
        today = datetime.utcnow().date()

        assignments = db.query(Assignment).filter(
            Assignment.is_active == True
        ).all()

        for assignment in assignments:

            due_date = assignment.due_date.date()
            days_left = (due_date - today).days

            # Send alerts only from 2 days before deadline until deadline day
            if days_left < 0 or days_left > 2:
                continue

            # -----------------------------
            # Determine message for teacher
            # -----------------------------
            if days_left == 2:
                deadline_text = "deadline in 2 days"
            elif days_left == 1:
                deadline_text = "deadline tomorrow"
            else:
                deadline_text = "deadline today"

            # -----------------------------
            # Get students in that class
            # -----------------------------
            students = db.query(Student).filter(
                Student.year == assignment.year,
                Student.section == assignment.section,
                Student.is_deleted == False
            ).all()

            total_students = len(students)

            # -----------------------------
            # Get submissions
            # -----------------------------
            submissions = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == assignment.id,
                AssignmentSubmission.is_submitted == True
            ).all()

            submitted = len(submissions)
            pending = total_students - submitted

            # -----------------------------
            # Get subject info
            # -----------------------------
            subject = db.query(Subject).filter(
                Subject.subject_id == assignment.subject_id
            ).first()

            # -----------------------------
            # Create alert
            # -----------------------------
            alert = Alert(
                title="📌 Assignment Deadline Reminder",
                message=(
                    f"{subject.subject_name} - {assignment.title}\n"
                    f"{deadline_text}\n\n"
                    f"Total Students: {total_students} | "
                    f"Submitted: {submitted} | Pending: {pending}"
                ),
                type="assignment-reminder",
                target_role="faculty",
                target_type="individual",
                faculty_id=assignment.faculty_id
            )

            db.add(alert)
            db.commit()
            db.refresh(alert)

            # -----------------------------
            # Send to teacher alerts page
            # -----------------------------
            recipient = AlertRecipient(
                alert_id=alert.id,
                user_id=assignment.faculty_id,
                is_read=False
            )

            db.add(recipient)
            db.commit()

    except Exception as e:
        print("Assignment Deadline Scheduler Error:", e)

    finally:
        db.close()



scheduler = BackgroundScheduler()

scheduler.add_job(
    check_monthly_faculty_attendance,
    "cron",
    day=1,
    hour=9,
    minute=0
)

scheduler.add_job(
    check_assignment_deadlines,
    "cron",
    hour=18,
    minute=0
)

@app.on_event("startup")
def start_scheduler():
    scheduler.add_job(
        check_attendance_thresholds,
        "cron",
        hour=20,
        minute=0
    )
    scheduler.add_job(
        process_event_reminders,
        "cron",
        hour=8,
        minute=0
    )
    scheduler.start()


# -----------------------------
# Upload resource
# -----------------------------     
@app.post("/faculty/upload-resource")
async def upload_resource(
    title: str = Form(...),
    description: str = Form(...),
    subject_id: int = Form(...),
    type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    try:
        if current_user["role"] != "faculty":
            raise HTTPException(status_code=403)

        UPLOAD_DIR = "uploads/resources"
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        unique_name = f"{uuid.uuid4()}_{file.filename}"
        file_location = os.path.join(UPLOAD_DIR, unique_name)

        with open(file_location, "wb") as buffer:
            buffer.write(await file.read())

        resource = Resource(
            title=title,
            description=description,
            subject_id=subject_id,
            faculty_id=current_user["user_id"],
            type=type,
            file_url=file_location,
            created_at=datetime.utcnow()
        )

        db.add(resource)
        db.commit()
        db.refresh(resource)

        # START NEW ALERT LOGIC
        subject = db.query(Subject).filter(Subject.subject_id == subject_id).first()
        if subject:
            # Find all assigned classes for this faculty and subject
            assigned_classes = db.query(FacultySubject).filter(
                FacultySubject.subject_id == subject_id,
                FacultySubject.faculty_id == current_user["user_id"],
                FacultySubject.is_active == True
            ).all()

            for ac in assigned_classes:
                # Find all students in this year/section
                students = db.query(Student).filter(
                    Student.year == ac.year,
                    Student.section == ac.section
                ).all()

                for st in students:
                    # Create alert for each student
                    new_alert = Alert(
                        title="New Resource Uploaded",
                        message=f"A new resource '{title}' ({type}) has been uploaded by your faculty for {subject.subject_name}.",
                        type="resource",
                        target_role="student",
                        target_type="individual",
                        student_id=st.student_id,
                        faculty_id=current_user["user_id"]
                    )
                    db.add(new_alert)
                    db.flush()

                    db.add(AlertRecipient(
                        alert_id=new_alert.id,
                        user_id=st.student_id,
                        is_read=False
                    ))
            
            db.commit()

        return {"message": "Resource uploaded successfully"}

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/student/resources")
def get_student_resources(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    # Student's year and section
    student = db.query(Student).filter(
        Student.student_id == current_user["user_id"]
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Find subjects assigned to this student's year/section
    faculty_subjects = db.query(FacultySubject).filter(
        FacultySubject.year == student.year,
        FacultySubject.section == student.section,
        FacultySubject.is_active == True
    ).all()

    subject_ids = [fs.subject_id for fs in faculty_subjects]

    resources = db.query(Resource, Subject).join(
        Subject, Resource.subject_id == Subject.subject_id
    ).filter(
        Resource.subject_id.in_(subject_ids)
    ).all()

    result = []
    for r, s in resources:
        result.append({
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "type": r.type,
            "file_url": r.file_url,
            "created_at": r.created_at,
            "subject": s.subject_name
        })

    return result

@app.post("/student/resource-access/{resource_id}")
def track_access(
    resource_id: int,
    payload: ResourceAccessRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    existing = db.query(ResourceAccess).filter(
        ResourceAccess.resource_id == resource_id,
        ResourceAccess.student_id == current_user["user_id"],
        ResourceAccess.action_type == payload.action_type
    ).first()

    if not existing:
        access = ResourceAccess(
            resource_id=resource_id,
            student_id=current_user["user_id"],
            action_type=payload.action_type,
            accessed_at=datetime.utcnow()
        )
        db.add(access)
        db.commit()

    return {"message": "Access recorded"}


@app.get("/faculty/resources/{subject_id}")
def faculty_resources(
    subject_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    resources = db.query(Resource, Subject).join(
        Subject, Resource.subject_id == Subject.subject_id
    ).filter(
        Resource.subject_id == subject_id,
        Resource.faculty_id == current_user["user_id"]
    ).all()

    result = []

    for r, s in resources:

        from sqlalchemy import func
        accessed = db.query(func.count(func.distinct(ResourceAccess.student_id))).filter(
            ResourceAccess.resource_id == r.id
        ).scalar()

        downloads = db.query(func.count(func.distinct(ResourceAccess.student_id))).filter(
            ResourceAccess.resource_id == r.id,
            ResourceAccess.action_type == "download"
        ).scalar()

        # Find how many students are in the batches assigned to this subject+faculty
        assigned_classes = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == current_user["user_id"],
            FacultySubject.subject_id == subject_id,
            FacultySubject.is_active == True
        ).all()
        
        total_students = 0
        for ac in assigned_classes:
            count = db.query(Student).filter(
                Student.year == ac.year,
                Student.section == ac.section
            ).count()
            total_students += count

        result.append({
            "id": r.id,
            "title": r.title,
            "type": r.type,
            "subject": s.subject_name,
            "created_at": r.created_at,
            "accessed": accessed,
            "downloads": downloads,
            "total_students": total_students
        })
    return result

@app.get("/faculty/subjects")
def get_faculty_subjects(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    subjects = db.query(FacultySubject, Subject).join(
        Subject, FacultySubject.subject_id == Subject.subject_id
    ).filter(
        FacultySubject.faculty_id == current_user["user_id"],
        FacultySubject.is_active == True
    ).all()

    result = []
    for fs, s in subjects:
        dept_name = DEPARTMENT_MAP.get(s.department_id, str(s.department_id))
        result.append({
            "subject_id": s.subject_id,
            "subject_name": s.subject_name,
            "year": fs.year,
            "section": fs.section,
            "department": dept_name
        })

    return result

@app.get("/faculty/resource-access-details/{resource_id}")
def get_resource_access_details(
    resource_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")
        
    # Verify the resource belongs to this faculty
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.faculty_id == current_user["user_id"]
    ).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    accesses = db.query(ResourceAccess, Student, User).join(
        Student, ResourceAccess.student_id == Student.student_id
    ).join(
        User, Student.student_id == User.user_id
    ).filter(
        ResourceAccess.resource_id == resource_id
    ).order_by(ResourceAccess.accessed_at.desc()).all()
    
    result = []
    for ra, st, u in accesses:
        result.append({
            "student_id": st.student_id,
            "name": u.name,
            "roll_no": st.roll_no,
            "action_type": ra.action_type,
            "accessed_at": ra.accessed_at
        })
        
    return result


# ==========================================
# ADVANCED ALERT SYSTEM (FACULTY)
# ==========================================

@app.get("/faculty/search-students", response_model=List[schemas.StudentSearchResponse])
def search_students(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Search for specific students by name or roll number."""
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    search_term = f"%{q.lower()}%"
    
    # Needs to match User.name or Student.roll_no
    students = db.query(Student, User.name).join(
        User, Student.student_id == User.user_id
    ).filter(
        or_(
            func.lower(User.name).like(search_term),
            func.lower(Student.roll_no).like(search_term)
        )
    ).limit(10).all()
    
    # Return formatted objects
    results = [
        {"student_id": st.Student.student_id, "name": st.name, "roll_no": st.Student.roll_no}
        for st in students
    ]
    return results


@app.post("/faculty/send-alert")
def send_alert(
    alert_req: schemas.AlertSendRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    faculty_id = current_user["user_id"]
    target_students = set()
    
    # Mode 1: Whole Class (Single Subject)
    if alert_req.target == "class" and alert_req.subject_id:
        fs = db.query(FacultySubject).filter(
            FacultySubject.subject_id == alert_req.subject_id,
            FacultySubject.faculty_id == faculty_id,
            FacultySubject.is_active == True
        ).first()
        if fs:
            st_list = db.query(Student.student_id).filter(
                Student.year == fs.year,
                Student.section == fs.section
            ).all()
            target_students.update([s.student_id for s in st_list])
            
    # Mode 2: Multiple Classes
    elif alert_req.target == "multiple_classes" and alert_req.subject_ids:
        for sid in alert_req.subject_ids:
            fs = db.query(FacultySubject).filter(
                FacultySubject.subject_id == sid,
                FacultySubject.faculty_id == faculty_id,
                FacultySubject.is_active == True
            ).first()
            if fs:
                st_list = db.query(Student.student_id).filter(
                    Student.year == fs.year,
                    Student.section == fs.section
                ).all()
                target_students.update([s.student_id for s in st_list])
                
    # Mode 3: Specific Students
    elif alert_req.target == "students" and alert_req.student_ids:
        target_students.update(alert_req.student_ids)
        
    if not target_students:
        raise HTTPException(status_code=400, detail="No students found for given targets")
    
    new_alerts = []
    recipients = []
    
    title_mapping = {
        "Emergency": "Emergency Announcement",
        "Announcement": "New Announcement",
        "Info": "Information Alert",
        "Reminder": "Reminder"
    }
    
    alert_title = title_mapping.get(alert_req.type, "Alert")
    
    for sid in target_students:
        new_alert = Alert(
            title=alert_title,
            message=alert_req.message,
            type=alert_req.type.lower(),
            target_role="student",
            target_type="individual",
            student_id=sid,
            faculty_id=faculty_id
        )
        new_alerts.append(new_alert)
        
    db.add_all(new_alerts)
    db.flush() # assign IDs
    
    for alert in new_alerts:
        recipients.append(AlertRecipient(
            alert_id=alert.id,
            user_id=alert.student_id,
            is_read=False
        ))
        
    db.add_all(recipients)
    db.commit()
    
    return {"message": "Alert sent successfully", "students_targeted": len(target_students)}


@app.post("/faculty/send-resource-reminder/{resource_id}")
def send_resource_reminder(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.faculty_id == current_user["user_id"]
    ).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    # Find the assigned class for this resource
    fs = db.query(FacultySubject).filter(
        FacultySubject.subject_id == resource.subject_id,
        FacultySubject.faculty_id == current_user["user_id"]
    ).first()
    
    if not fs:
        raise HTTPException(status_code=400, detail="Faculty subject mapping not found")
        
    # Get all students in this class
    all_students_in_class_subq = db.query(Student.student_id).filter(
        Student.year == fs.year,
        Student.section == fs.section
    ).subquery()
    
    # Get students who HAVE accessed it
    accessed_students_subq = db.query(ResourceAccess.student_id).filter(
        ResourceAccess.resource_id == resource_id
    ).distinct().subquery()
    
    # Find students who are in the class but NOT in the accessed list
    unaccessed_students = db.query(Student.student_id).filter(
        Student.student_id.in_(all_students_in_class_subq),
        ~Student.student_id.in_(accessed_students_subq)
    ).all()
    
    target_ids = [s.student_id for s in unaccessed_students]
    
    if not target_ids:
        return {"message": "All students have already accessed this resource", "sent_count": 0}
        
    # Bulk create reminders
    new_alerts = []
    
    for sid in target_ids:
        new_alert = Alert(
            title="Resource Reminder",
            message=f"Reminder: Please check the latest study material '{resource.title}'.",
            type="reminder",
            target_role="student",
            target_type="individual",
            student_id=sid,
            faculty_id=current_user["user_id"]
        )
        new_alerts.append(new_alert)
        
    db.add_all(new_alerts)
    db.flush()
    
    recipients = [
        AlertRecipient(alert_id=al.id, user_id=al.student_id, is_read=False)
        for al in new_alerts
    ]
    
    db.add_all(recipients)
    db.commit()
    
    return {"message": "Reminders sent successfully", "sent_count": len(target_ids)}


# ==========================================
# EVENTS MANAGEMENT API
# ==========================================

@app.post("/faculty/events", response_model=EventResponse)
def create_event(
    payload: EventCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    # -------------------------
    # Create Event
    # -------------------------
    new_event = Event(
        title=payload.title,
        description=payload.description,
        event_type=payload.event_type,
        organizer=payload.organizer,
        venue=payload.venue,
        location=payload.venue,
        event_date=payload.event_date,
        max_participants=payload.max_participants,
        registration_deadline=payload.registration_deadline,
        external_registration_link=payload.external_registration_link,
        year=payload.year,
        section=payload.section,
        created_by=current_user["user_id"],
        status="upcoming"
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    # -------------------------
    # Find Target Students
    # -------------------------
    query = (
        db.query(Student.student_id)
        .join(User, Student.student_id == User.user_id)
        .filter(or_(User.is_deleted == False, User.is_deleted == None))
    )

    if payload.year != "All":
        query = query.filter(Student.year == int(payload.year))

    if payload.section != "All":
        query = query.filter(Student.section.ilike(payload.section))

    students = query.all()

    # Debug output
    print("TARGET YEAR:", payload.year)
    print("TARGET SECTION:", payload.section)
    print("STUDENTS FOUND:", students)

    # -------------------------
    # Create Alerts
    # -------------------------
    title = f"New Event Created: {payload.title}"
    message = f"New Event Created: {payload.title} on {payload.event_date.strftime('%d %b %Y')} at {payload.venue}."

    new_alerts = []

    for (sid,) in students:
        new_alert = Alert(
            title=title,
            message=message,
            type="announcement",
            target_role="student",
            target_type="individual",
            student_id=sid,
            faculty_id=current_user["user_id"]
        )
        new_alerts.append(new_alert)

    if len(new_alerts) > 0:
        db.add_all(new_alerts)
        db.flush()

        recipients = [
            AlertRecipient(alert_id=al.id, user_id=al.student_id, is_read=False)
            for al in new_alerts
        ]

        db.add_all(recipients)
        db.commit()

    # -------------------------
    # Prepare Response
    # -------------------------
    response_data = EventResponse.from_orm(new_event)
    response_data.total_students = len(students)
    response_data.present_count = 0
    response_data.absent_count = 0

    today = date.today()

    if new_event.event_date > today:
        response_data.status = "Upcoming"
    elif new_event.event_date == today:
        response_data.status = "Ongoing"
    else:
        response_data.status = "Completed"

    return response_data

@app.get("/faculty/events", response_model=List[EventResponse])
def get_events(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    events = db.query(Event).filter(Event.created_by == current_user["user_id"]).order_by(Event.event_date.desc()).all()
    
    results = []
    today = date.today()
    for ev in events:
        resp = EventResponse.from_orm(ev)
        
        # Adjust status on the fly
        if ev.event_date > today:
            resp.status = "Upcoming"
        elif ev.event_date == today:
            resp.status = "Ongoing"
        else:
            resp.status = "Completed"

        # Compute counts
        if resp.status == "Upcoming":
            resp.total_students = db.query(EventRegistration).filter(EventRegistration.event_id == ev.id).count()
            resp.present_count = 0
            resp.absent_count = 0
        else:
            total = db.query(EventRegistration).filter(EventRegistration.event_id == ev.id).count()
            present = db.query(EventRegistration).filter(EventRegistration.event_id == ev.id, EventRegistration.attendance == "present").count()
            absent = db.query(EventRegistration).filter(EventRegistration.event_id == ev.id, EventRegistration.attendance == "absent").count()
            
            resp.total_students = total
            resp.present_count = present
            resp.absent_count = absent
        
        results.append(resp)
        
    return results

@app.get("/faculty/events/{event_id}/attendance", response_model=EventAttendanceResponse)
def get_event_attendance(
    event_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    event = db.query(Event).filter(Event.id == event_id, Event.created_by == current_user["user_id"]).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    today = date.today()
    event_status = "upcoming"
    if event.event_date == today:
        event_status = "ongoing"
    elif event.event_date < today:
        event_status = "completed"

    # EXTERNAL EVENT Check
    if event.event_type == "External":
        return EventAttendanceResponse(
            event_id=event.id,
            title=event.title,
            date=event.event_date,
            location=event.location,
            students=[],
            message="Attendance tracking is not required for external events."
        )

    # UPCOMING Internal
    if event_status == "upcoming":
        return EventAttendanceResponse(
            event_id=event.id,
            title=event.title,
            date=event.event_date,
            location=event.location,
            students=[],
            message="Attendance will be available when the event starts."
        )

    # COMPLETED Internal (Show stats, but roster loading depends on specific requirement)
    # The requirement says "Attendance roster must only load when: internal AND ongoing"
    # However, for completed, it says "Show: Final attendance statistics". 
    # I'll return the students for ongoing AND completed, but the frontend will disable editing for completed.
    # WAIT, Section 9 says "*MUST ONLY LOAD* when ONGOING". I will stick to that to be safe.
    
    if event_status == "completed":
        # Check if we should still return students for COMPLETED to show "Final stats"
        # The prompt says "Show: Final attendance statistics" for COMPLETED. 
        # Usually statistics are calculated from the registration records.
        # If I don't return students, the frontend and backend counts still work.
        return EventAttendanceResponse(
            event_id=event.id,
            title=event.title,
            date=event.event_date,
            location=event.location,
            students=[],
            message="Event completed. Viewing final statistics."
        )

    # ONGOING Internal
    attendance_records = (
        db.query(EventRegistration, Student, User)
        .join(Student, EventRegistration.student_id == Student.student_id)
        .join(User, Student.student_id == User.user_id)
        .filter(EventRegistration.event_id == event_id)
        .order_by(User.name.asc())
        .all()
    )
    
    if not attendance_records:
         return EventAttendanceResponse(
            event_id=event.id,
            title=event.title,
            date=event.event_date,
            location=event.location,
            students=[],
            message="No students registered yet."
        )

    students = []
    for reg, st, usr in attendance_records:
        students.append(EventStudentDetail(
            student_id=st.student_id,
            name=usr.name,
            roll_no=st.roll_no,
            attendance_status=reg.attendance,
            result=reg.result
        ))
        
    return EventAttendanceResponse(
        event_id=event.id,
        title=event.title,
        date=event.event_date,
        location=event.location,
        students=students
    )

@app.patch("/faculty/events/{event_id}/attendance")
def update_event_attendance(
    event_id: int,
    payload: EventAttendanceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    # verify ownership
    event = db.query(Event).filter(Event.id == event_id, Event.created_by == current_user["user_id"]).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    att = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.student_id == payload.student_id
    ).first()
    
    if not att:
        raise HTTPException(status_code=404, detail="Student attendance record not found for this event")
        
    att.attendance = payload.status
    db.commit()
    
    return {"message": "Attendance updated"}

@app.patch("/faculty/events/{event_id}/attendance/bulk")
def bulk_update_event_attendance(
    event_id: int,
    payload: BulkEventAttendanceUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    event = db.query(Event).filter(Event.id == event_id, Event.created_by == current_user["user_id"]).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    for record in payload.students:
        att = db.query(EventRegistration).filter(
            EventRegistration.event_id == event_id,
            EventRegistration.student_id == record.student_id
        ).first()
        if att:
            att.attendance = record.status
            
    db.commit()
    return {"message": "Bulk attendance updated"}

@app.patch("/faculty/events/result")
def update_event_result(
    payload: EventResultUpdate,
    event_id: int = Query(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    event = db.query(Event).filter(Event.id == event_id, Event.created_by == current_user["user_id"]).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or unauthorized")

    att = db.query(EventRegistration).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.student_id == payload.student_id
    ).first()

    if not att:
        raise HTTPException(status_code=404, detail="Student attendance record not found")
    
    if att.attendance != "present":
        raise HTTPException(status_code=400, detail="Cannot assign result to absent student")

    att.result = payload.result
    db.commit()

    return {"message": "Result updated successfully"}

# ==========================================
# STUDENT EVENTS API
# ==========================================

@app.get("/student/events", response_model=List[StudentEventResponse])
def get_student_events(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")

    student = db.query(Student).filter(Student.student_id == current_user["user_id"]).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found")

    user_data = db.query(User).filter(User.user_id == student.student_id).first()
    if not user_data:
        raise HTTPException(status_code=404, detail="User record not found")

    # Fetch events targeted to this student's year/section
    # Not filtered by department to allow global events
    events = (
        db.query(Event)
        .filter(
            or_(Event.year == "All", Event.year == str(student.year)),
            or_(Event.section == "All", Event.section == student.section)
        )
        .order_by(Event.event_date.desc())
        .all()
    )

    results = []
    today = date.today()
    for ev in events:
        resp = StudentEventResponse.from_orm(ev)
        
        # Adjust dynamic status accurately
        if ev.event_date > today:
            resp.status = "Upcoming"
        elif ev.event_date == today:
            resp.status = "Ongoing"
        else:
            resp.status = "Completed"

        # Check registration specifically for this student
        reg = db.query(EventRegistration).filter(
            EventRegistration.event_id == ev.id,
            EventRegistration.student_id == student.student_id
        ).first()
        
        resp.is_registered = bool(reg)
        if reg:
            resp.attendance_status = reg.attendance
            resp.result = reg.result

        results.append(resp)

    return results

@app.post("/student/events/register")
def register_student_event(
    payload: EventRegistrationRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")

    event = db.query(Event).filter(Event.id == payload.event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check for duplicate
    existing_reg = db.query(EventRegistration).filter(
        EventRegistration.event_id == event.id,
        EventRegistration.student_id == current_user["user_id"]
    ).first()

    if existing_reg:
        raise HTTPException(status_code=400, detail="Already registered")
        
    # Validation checks
    if event.registration_deadline and datetime.now() > event.registration_deadline:
        raise HTTPException(status_code=400, detail="Registration deadline has passed")
        
    if event.max_participants is not None:
        current_count = db.query(EventRegistration).filter(EventRegistration.event_id == event.id).count()
        if current_count >= event.max_participants:
            raise HTTPException(status_code=400, detail="Event has reached maximum capacity")

    new_reg = EventRegistration(
        event_id=event.id,
        student_id=current_user["user_id"]
    )
    db.add(new_reg)
    db.commit()

    return {"message": "Successfully registered for event"}

@app.post("/faculty/events/{event_id}/alert")
def send_event_alert(
    event_id: int,
    payload: EventAlertRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    event = db.query(Event).filter(Event.id == event_id, Event.created_by == current_user["user_id"]).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    query = db.query(EventRegistration.student_id).filter(EventRegistration.event_id == event_id)
    if payload.target == "present":
        query = query.filter(EventRegistration.attendance == "present")
    elif payload.target == "absent":
        query = query.filter(EventRegistration.attendance == "absent")
        
    students = query.all()
    target_ids = [s[0] for s in students]
    
    if not target_ids:
        return {"message": "No students found for the given target"}
        
    title = f"Alert: {event.title}"

    new_alerts = []
    for sid in target_ids:
        new_alert = Alert(
            title=title,
            message=payload.message,
            type=payload.type,
            target_role="student",
            target_type="individual",
            student_id=sid,
            faculty_id=current_user["user_id"]
        )
        new_alerts.append(new_alert)
        
    db.add_all(new_alerts)
    db.flush()
    
    recipients = [
        AlertRecipient(alert_id=al.id, user_id=al.student_id, is_read=False)
        for al in new_alerts
    ]
    
    db.add_all(recipients)
    db.commit()

    return {"message": "Alerts sent successfully", "sent_count": len(target_ids)}

@app.post("/faculty/events/{event_id}/reminder")
def remind_absent_students(
    event_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")

    event = db.query(Event).filter(Event.id == event_id, Event.created_by == current_user["user_id"]).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    students = db.query(EventRegistration.student_id).filter(
        EventRegistration.event_id == event_id,
        EventRegistration.attendance == "absent"
    ).all()
    
    target_ids = [s[0] for s in students]
    if not target_ids:
        return {"message": "No absent students to remind"}

    title = f"Reminder: {event.title}"
    message = f"Reminder: Please make sure to attend the event '{event.title}' scheduled on {event.event_date}."

    new_alerts = []
    for sid in target_ids:
        new_alert = Alert(
            title=title,
            message=message,
            type="reminder",
            target_role="student",
            target_type="individual",
            student_id=sid,
            faculty_id=current_user["user_id"]
        )
        new_alerts.append(new_alert)
        
    db.add_all(new_alerts)
    db.flush()
    
    recipients = [
        AlertRecipient(alert_id=al.id, user_id=al.student_id, is_read=False)
        for al in new_alerts
    ]
    
    db.add_all(recipients)
    db.commit()

    return {"message": "Reminders sent successfully", "sent_count": len(target_ids)}

# ==========================================
# EXTERNAL EVENT SUBMISSIONS API
# ==========================================

# Directory for external event achievement uploads
UPLOAD_DIR_EXTERNAL = "uploads/external_events"
os.makedirs(UPLOAD_DIR_EXTERNAL, exist_ok=True)

@app.post("/student/events/external-submit", response_model=ExternalEventSubmissionResponse)
def submit_external_achievement(
    event_name: str = Form(...),
    organizer: Optional[str] = Form(None),
    event_date: date = Form(...),
    achievement_type: Optional[str] = Form(None),
    position: Optional[str] = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
    proof_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student only")
        
    cert_path = None
    if certificate_file:
        file_ext = certificate_file.filename.split(".")[-1]
        unique_name = f"cert_{uuid.uuid4()}.{file_ext}"
        cert_path = os.path.join(UPLOAD_DIR_EXTERNAL, unique_name)
        with open(cert_path, "wb") as buffer:
            shutil.copyfileobj(certificate_file.file, buffer)

    proof_path = None
    if proof_file:
        file_ext = proof_file.filename.split(".")[-1]
        unique_name = f"proof_{uuid.uuid4()}.{file_ext}"
        proof_path = os.path.join(UPLOAD_DIR_EXTERNAL, unique_name)
        with open(proof_path, "wb") as buffer:
            shutil.copyfileobj(proof_file.file, buffer)

    new_sub = ExternalEventSubmission(
        student_id=current_user["user_id"],
        event_name=event_name,
        organizer=organizer,
        event_date=event_date,
        achievement_type=achievement_type,
        position=position,
        certificate_file=cert_path,
        proof_file=proof_path,
        status="pending"
    )
    
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    
    return new_sub

@app.get("/faculty/external-submissions", response_model=List[FacultyExternalSubmissionDetail])
def get_external_submissions(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")
        
    # Faculty can see pending achievements of students
    submissions = (
        db.query(ExternalEventSubmission, User, Student)
        .join(Student, ExternalEventSubmission.student_id == Student.student_id)
        .join(User, Student.student_id == User.user_id)
        .filter(ExternalEventSubmission.status == "pending")
        .order_by(ExternalEventSubmission.submitted_at.desc())
        .all()
    )
    
    results = []
    for sub, usr, st in submissions:
        resp = FacultyExternalSubmissionDetail.from_orm(sub)
        resp.student_name = usr.name
        resp.student_roll_no = st.roll_no
        results.append(resp)
        
    return results

@app.patch("/faculty/external-submissions/{sub_id}/status")
def update_external_submission_status(
    sub_id: int,
    status: str = Query(...), # approved or rejected
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty only")
        
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    sub = db.query(ExternalEventSubmission).filter(ExternalEventSubmission.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    sub.status = status
    sub.faculty_reviewed_by = current_user["user_id"]
    
    if status == "approved":
        student_profile = db.query(Student).filter(Student.student_id == sub.student_id).first()
        if student_profile:
            # Update student certificate count or list
            cert_entry = f"{sub.event_name} ({sub.achievement_type or 'Achievement'})"
            if student_profile.certificates:
                student_profile.certificates += f", {cert_entry}"
            else:
                student_profile.certificates = cert_entry
                
    db.commit()
    
    return {"message": f"External submission {status} successfully"}


#==========================================
# FACULTY MARKS UPLOAD API
#==========================================

@app.post("/faculty/upload-marks")
def upload_marks(
    data: MarksUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    for item in data.marks:

        existing = db.query(Mark).filter(
            Mark.student_id == item.student_id,
            Mark.subject == data.subject,
            Mark.exam_type == data.exam,
            Mark.year == data.year,
            Mark.section == data.section
        ).first()

        if existing:
            existing.marks = item.marks
        else:
            new_mark = Mark(
                student_id=item.student_id,
                subject=data.subject,
                exam_type=data.exam,
                marks=item.marks,
                year=data.year,
                section=data.section,
                faculty_id=current_user.id
            )

            db.add(new_mark)

    db.commit()

    return {"message": "Marks uploaded successfully"}


#==========================================
# GET MARKS FOR SELECTED SUBJECT & EXAM
#==========================================

@app.get("/faculty/marks")
def get_marks(
    year: str,
    section: str,
    subject_id: int,
    exam: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    students = db.query(Student).filter(
        Student.year == year,
        Student.section == section
    ).all()

    result = []

    for s in students:

        mark = db.query(Mark).filter(
            Mark.student_id == s.student_id,
            Mark.subject == str(subject_id),
            Mark.exam_type == exam
        ).first()

        result.append({
            "student_id": s.student_id,
            "name": db.query(User).filter(User.user_id == s.student_id).first().name,
            "roll_no": s.roll_no,
            "marks": mark.marks if mark else None
        })

    return result


# ==========================================
# DOWNLOAD MARKS TEMPLATE
# ==========================================

from fastapi.responses import FileResponse
import pandas as pd


@app.get("/faculty/marks/template")
def download_marks_template(
    year: int = Query(...),
    section: str = Query(...),
    subject_id: int = Query(...),
    db: Session = Depends(get_db)
):
    # Fetch students for the given year and section
    students = db.query(Student, User).join(User, Student.student_id == User.user_id).filter(
        Student.year == str(year),
        Student.section == section,
        User.is_deleted == False
    ).order_by(Student.roll_no.asc()).all()

    data = []
    for s, u in students:
        data.append({
            "Register Number": s.roll_no,
            "Student Name": u.name,
            "Marks": ""
        })

    df = pd.DataFrame(data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    output.seek(0)

    filename = f"marks_template_year{year}_section{section}.xlsx"
    return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={"Content-Disposition": f"attachment; filename={filename}"})

# ==========================================
# UPLOAD MARKS VIA EXCEL
# ==========================================

@app.post("/faculty/marks/upload-excel")
async def upload_marks_excel(
    file: UploadFile = File(...),
    subject: str = "",
    year: str = "",
    section: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    df = pd.read_excel(file.file)

    for _, row in df.iterrows():

        roll_no = row["RollNo"]

        student = db.query(Student).filter(Student.roll_no == roll_no).first()

        if not student:
            continue

        student_id = student.student_id

        for column in df.columns:

            if column in ["RollNo", "StudentName"]:
                continue

            value = row[column]

            if pd.isna(value):
                continue

            new_mark = Mark(
                student_id=student_id,
                subject=subject,
                exam_type=column,
                marks=int(value),
                year=year,
                section=section,
                faculty_id=current_user.id
            )

            db.add(new_mark)

    db.commit()

    return {"message": "Marks uploaded successfully"}


