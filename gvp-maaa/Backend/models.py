from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
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
    year = Column(Integer, default=1)
    semester = Column(Integer, default=1)
    section = Column(String, nullable=True)
    cgpa = Column(Numeric(3, 2), default=0.00)


# -------------------------
# FACULTY (EXTENSION)
# -------------------------
class Faculty(Base):
    __tablename__ = "faculty"

    faculty_id = Column(
        Integer,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        primary_key=True
    )
    designation = Column(String, nullable=False)
    qualifications = Column(String, nullable=False)
    experience = Column(Integer, nullable=False)   # years
    subjects_handled = Column(String, nullable=False)
