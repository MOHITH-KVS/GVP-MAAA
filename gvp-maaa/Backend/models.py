from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, Boolean, DateTime
from sqlalchemy.sql import func

from database import Base


# -------------------------
# USER (BASE TABLE)
# -------------------------
class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)   # student | faculty | admin
    department_id = Column(Integer, nullable=False)

    # ✅ NEW (SOFT DELETE)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)


# -------------------------
# STUDENT (EXTENSION)
# -------------------------
class Student(Base):
    __tablename__ = "students"

    student_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True
    )
    roll_no = Column(String, unique=True, nullable=True)
    joining_year = Column(Integer, nullable=False)
    year = Column(Integer, default=1)
    semester = Column(Integer, default=1)
    section = Column(String, nullable=True)
    cgpa = Column(Numeric(3, 2), default=0.00)

    # 🔽 NEW PROFILE FIELDS
    phone = Column(String, nullable=True)
    skills = Column(String, nullable=True)   # comma separated
    certificates = Column(String, nullable=True)  # comma separated
    linkedin = Column(String, nullable=True)
    github = Column(String, nullable=True)
    portfolio = Column(String, nullable=True) 
    bio = Column(String, nullable=True)

     # ✅ NEW (SOFT DELETE)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)

    
# -------------------------
# STUDENT ALERTS
# -------------------------    
class StudentAlert(Base):
    __tablename__ = "student_alerts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    reason = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)




# -------------------------
# FACULTY (EXTENSION)
# -------------------------
class Faculty(Base):
    __tablename__ = "faculty"

    faculty_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    employee_id = Column(String, unique=True, nullable=False)

    designation = Column(String)
    qualifications = Column(String)
    experience = Column(String)

    phone = Column(String)
    bio = Column(Text)

    expertise = Column(Text)        # comma-separated
    certifications = Column(Text)   # JSON string
    publications = Column(Text)     # JSON string
    classes = Column(Text)          # JSON string

    linkedin = Column(String)
    github = Column(String)
    portfolio = Column(String)

    # ✅ NEW (SOFT DELETE)
    #is_deleted = Column(Boolean, default=False)
    #deleted_at = Column(DateTime, nullable=True)


# -------------------------
# TIMETABLE
# -------------------------
class Timetable(Base):
    __tablename__ = "timetables"

    id = Column(Integer, primary_key=True, index=True)

    # BASIC INFO
    title = Column(String(255), nullable=False)        # e.g. "III Year Class Timetable"
    timetable_type = Column(String(50), nullable=False)  # class / exam / fest / event

    # OPTIONAL CLASS DETAILS
    department = Column(String(50), nullable=True)
    year = Column(String(20), nullable=True)
    section = Column(String(10), nullable=True)
    semester = Column(String(20), nullable=True)

    # FILE / LINK DETAILS
    file_name = Column(String(255), nullable=True)
    file_url = Column(Text, nullable=False)
    file_type = Column(String(20), nullable=False)     # pdf / excel / doc / image / link

    # AUDIENCE
    audience = Column(String(50), default="students")  # students / faculty / both / all

    # ADMIN META
    uploaded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    is_active = Column(Boolean, default=True)


# =========================
# ALERTS
# =========================
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    type = Column(String(50), nullable=False)

    target_role = Column(String(50), nullable=False)
    target_type = Column(String(50), nullable=False)

    department = Column(String(50), nullable=True)

    faculty_id = Column(
        Integer,
        ForeignKey("faculty.faculty_id"),
        nullable=True
    )

    student_id = Column(
        Integer,
        ForeignKey("students.student_id"),
        nullable=True
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now())



