from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, Text, Boolean, DateTime, Date, UniqueConstraint, JSON, Float
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

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

    intervention_status = Column(String, nullable=True, default="none")
    intervention_type = Column(String, nullable=True)
    intervention_last_updated = Column(DateTime, nullable=True)
    previous_risk_score = Column(Numeric(5, 2), nullable=True)

     # ✅ NEW (SOFT DELETE)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)


# -------------------------
# PLACEMENT INTELLIGENCE
# -------------------------
class PlacementStudentProfile(Base):
    __tablename__ = "student_profile"

    student_id = Column(
        Integer,
        ForeignKey("students.student_id", ondelete="CASCADE"),
        primary_key=True,
    )
    cgpa = Column(Numeric(3, 2), nullable=True)
    backlogs = Column(Integer, default=0)
    department = Column(String(50), nullable=True)
    year = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlacementInterview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    company_name = Column(String(255), nullable=False)
    date = Column(Date, nullable=True)
    mode = Column(String(20), nullable=True)
    status = Column(String(20), nullable=True)
    result = Column(String(20), nullable=True)
    round_reached = Column(String(100), nullable=True)
    feedback = Column(Text, nullable=True)
    weak_area = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PlacementCompany(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    role = Column(String(255), nullable=True)
    package_lpa = Column(Numeric(10, 2), nullable=True)
    min_cgpa = Column(Numeric(3, 2), nullable=False)
    max_backlogs = Column(Integer, default=0)
    branches = Column(ARRAY(String), nullable=True)
    selection_process = Column(ARRAY(String), nullable=True)
    role_type = Column(String(50), nullable=True)
    required_skills = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlacementStudentSkill(Base):
    __tablename__ = "student_skills"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(120), nullable=False)
    level = Column(String(20), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "skill_name", name="unique_student_skill"),
    )


class PlacementProgress(Base):
    __tablename__ = "placement_progress"

    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), primary_key=True)
    readiness_score = Column(Numeric(5, 2), nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=True)
    company_name = Column(String(255), nullable=True)
    role = Column(String(255), nullable=True)
    package_lpa = Column(Numeric(10, 2), nullable=True)
    min_cgpa = Column(Numeric(3, 2), nullable=True)
    max_backlogs = Column(Integer, default=0)
    selection_process = Column(ARRAY(String), nullable=True)
    drive_date = Column(Date, nullable=True)
    mode = Column(String(30), nullable=True)
    location = Column(String(255), nullable=True)
    registration_deadline = Column(Date, nullable=True)
    eligible_years = Column(ARRAY(Integer), nullable=True)
    status = Column(String(30), default="open")
    branches = Column(ARRAY(String), nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StudentDrive(Base):
    __tablename__ = "student_drives"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    drive_id = Column(Integer, ForeignKey("placement_drives.id", ondelete="CASCADE"), nullable=False)
    is_eligible = Column(Boolean, default=False)
    applied = Column(Boolean, default=False)
    status = Column(String(30), default="Not Applied")
    probability_score = Column(Float, nullable=True)
    current_round = Column(Integer, default=0)
    final_result = Column(String(30), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "drive_id", name="unique_student_drive"),
    )


class PlacementFeedback(Base):
    __tablename__ = "placement_feedback"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    drive_id = Column(Integer, ForeignKey("placement_drives.id", ondelete="CASCADE"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    comment = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    
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
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)

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
# SYSTEM SETTINGS
class SystemSetting(Base):
    __tablename__ = "system_settings"
    __table_args__ = (UniqueConstraint("key"),)

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), unique=True, nullable=False)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# =========================
# MARKS UPLOADS
# =========================
# SETTINGS AUDIT LOGS
class SettingsAuditLog(Base):
    __tablename__ = "settings_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(255), nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    updated_by = Column(String, default="admin")
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)


class MarksUpload(Base):
    __tablename__ = "marks_uploads"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    year = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)
    exam = Column(String(50), nullable=False)
    file_hash = Column(String(64), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())



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
    file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_type = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

# -------------------------
# ALERT RECIPIENTS
# -------------------------
class AlertRecipient(Base):
    __tablename__ = "alert_recipients"

    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    is_read = Column(Boolean, default=False)

# -------------------------
# FACULTY SUBJECTS (MANY-TO-MANY)
# -------------------------
class FacultySubject(Base):
    __tablename__ = "faculty_subjects"

    id = Column(Integer, primary_key=True, index=True)

    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"))
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"))

    year = Column(Integer, nullable=False)
    section = Column(String, nullable=False)

    is_active = Column(Boolean, default=True)
    subject = relationship("Subject") 

    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# -------------------------
# SUBJECTS
# -------------------------
class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(Integer, primary_key=True)
    subject_code = Column(String)
    subject_name = Column(String)
    semester = Column(Integer)
    credits = Column(Integer)
    department_id = Column(Integer)


class Attendance(Base):
    __tablename__ = "attendance"

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "subject_id",
            "attendance_date",
            name="unique_attendance_per_day"
        ),
    )

    attendance_id = Column(Integer, primary_key=True, index=True)

    student_id = Column(Integer, ForeignKey("students.student_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=False)

    attendance_date = Column(Date, nullable=False)

    status = Column(Boolean, nullable=False)

    student = relationship("Student")
    subject = relationship("Subject")
    faculty = relationship("Faculty")

class AttendanceWarning(Base):
    __tablename__ = "attendance_warnings"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer)
    subject_id = Column(Integer)
    semester = Column(Integer)
    level = Column(String)
    last_sent = Column(DateTime, default=datetime.utcnow)


class FacultyMonthlyAttendanceAlert(Base):
    __tablename__ = "faculty_monthly_attendance_alerts"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer)
    subject_id = Column(Integer)
    year = Column(Integer)
    section = Column(String)
    month = Column(Integer)
    year_value = Column(Integer)
    last_sent = Column(DateTime, default=datetime.utcnow)


# -------------------------
# ASSIGNMENTS
# -------------------------
class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    
    # Assignment Basic Info
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Class Details
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"), nullable=False)
    year = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)
    
    # Dates
    created_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    
    # File
    file_name = Column(String(255), nullable=True)
    file_path = Column(Text, nullable=True)
    file_type = Column(String(20), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Relationships
    faculty = relationship("Faculty")
    subject = relationship("Subject")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True, index=True)

    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    student_id = Column(Integer, ForeignKey("students.student_id"))

    file_name = Column(String, nullable=True)
    file_path = Column(String, nullable=True)
    file_type = Column(String, nullable=True)

    submission_text = Column(Text, nullable=True)

    submitted_at = Column(DateTime)
    is_late = Column(Boolean, default=False)
    is_submitted = Column(Boolean, default=True)
    status = Column(String(20), default="pending")

    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="unique_submission"),
    )

class AssignmentDeadlineAlert(Base):
    __tablename__ = "assignment_deadline_alerts"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer)
    faculty_id = Column(Integer)
    alert_sent = Column(Boolean, default=False)
    sent_at = Column(DateTime)


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    subject_id = Column(Integer)
    faculty_id = Column(Integer)
    type = Column(String)
    file_url = Column(Text)
    created_at = Column(DateTime)


class ResourceAccess(Base):
    __tablename__ = "resource_access"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer)
    student_id = Column(Integer)
    action_type = Column(String, default="view")
    accessed_at = Column(DateTime)

# =========================
# EVENTS
# =========================
class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String(100), nullable=False)
    event_date = Column(Date, nullable=False)
    location = Column(String(255), nullable=True)
    venue = Column(String(255), nullable=True)
    organizer = Column(String(255), nullable=True)
    max_participants = Column(Integer, nullable=True)
    registration_deadline = Column(DateTime, nullable=True)
    external_registration_link = Column(String, nullable=True)
    
    year = Column(String(20), nullable=True)
    section = Column(String(10), nullable=True)
    
    created_by = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=False)
    status = Column(String(50), default="upcoming") # upcoming, ongoing, completed
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    faculty = relationship("Faculty")

class EventAttendance(Base):
    __tablename__ = "event_attendance"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    
    status = Column(String(50), default="absent")  # present / absent
    result = Column(String(50), nullable=True)     # winner, runner_up, participant, None
    marked_at = Column(DateTime(timezone=True), onupdate=func.now())

    event = relationship("Event")
    student = relationship("Student")


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    attendance = Column(String(50), default=None, nullable=True)
    result = Column(String(50), nullable=True)
    certificate_uploaded = Column(String, nullable=True)
    faculty_verified = Column(Boolean, default=False)

    event = relationship("Event")
    student = relationship("Student")


class ExternalEventSubmission(Base):
    __tablename__ = "external_event_submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    event_name = Column(String(255), nullable=False)
    organizer = Column(String(255), nullable=True)
    event_date = Column(Date, nullable=False)
    achievement_type = Column(String(100), nullable=True) # Participation, Winner, etc.
    position = Column(String(100), nullable=True)
    certificate_file = Column(String, nullable=True)
    proof_file = Column(String, nullable=True)
    status = Column(String(50), default="pending")  # pending / approved / rejected
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    faculty_reviewed_by = Column(Integer, ForeignKey("faculty.faculty_id"), nullable=True)

    student = relationship("Student")


# -------------------------
# MARKS
# -------------------------
class Mark(Base):
    __tablename__ = "marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"))
    exam = Column(String)  # Mid-1, Mid-2, Assignment, Semester
    marks = Column(Numeric(5,2), nullable=True)
    extra_data = Column(JSON, default={})
    assignment_total = Column(Numeric(5,2), default=0.00)
    mid1 = Column(Numeric(5,2), default=0.00)
    mid2 = Column(Numeric(5,2), default=0.00)
    semester = Column(Numeric(5,2), default=0.00)
    total = Column(Numeric(5,2), default=0.00)
    sgpa = Column(Numeric(4,2), default=0.00)
    cgpa = Column(Numeric(4,2), default=0.00)
    year = Column(Integer)
    section = Column(String)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("Student")
    subject = relationship("Subject")
    faculty = relationship("Faculty")


# -------------------------
# SCALING SYSTEM
# -------------------------
class ScaledMark(Base):
    __tablename__ = "scaled_marks"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id"))
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"))
    year = Column(Integer)
    section = Column(String)
    assignment_scaled = Column(Numeric(5,2))
    mid1_scaled = Column(Numeric(5,2))
    mid2_scaled = Column(Numeric(5,2))
    mid_combined = Column(Numeric(5,2))
    internal_total = Column(Numeric(5,2))
    semester_marks = Column(Numeric(5,2))
    final_total = Column(Numeric(5,2))

    student = relationship("Student")
    subject = relationship("Subject")


class ScalingLog(Base):
    __tablename__ = "scaling_logs"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id"))
    action_type = Column(String) # "apply" | "recalculate" | "undo"
    year = Column(Integer)
    section = Column(String)
    subject_id = Column(Integer, ForeignKey("subjects.subject_id"))
    file_name = Column(String, nullable=True) # New column for excel scaling
    timestamp = Column(DateTime, default=datetime.utcnow)
    snapshot_data = Column(JSON, nullable=True) # Stores previous state for undo.


# -------------------------
# GAMIFICATION PROGRESS
# -------------------------
class StudentProgress(Base):
    __tablename__ = "student_progress"

    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), primary_key=True)
    total_xp = Column(Integer, default=0, nullable=False)
    streak_days = Column(Integer, default=0, nullable=False)
    last_active_date = Column(Date, nullable=True)


class TaskLog(Base):
    __tablename__ = "task_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(String(255), nullable=False, index=True)
    completed = Column(Boolean, default=False, nullable=False)
    verified = Column(Boolean, default=False, nullable=False)
    xp_earned = Column(Integer, default=0, nullable=False)
    date = Column(Date, default=lambda: datetime.utcnow().date(), nullable=False)

    __table_args__ = (
        UniqueConstraint("student_id", "task_id", "date", name="uq_task_log_student_task_date"),
    )

