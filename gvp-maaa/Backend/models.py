from sqlalchemy import Column, Integer, String, ForeignKey
from database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    department_id = Column(Integer, nullable=False)


class Student(Base):
    __tablename__ = "students"

    student_id = Column(Integer, ForeignKey("users.user_id"), primary_key=True)
    roll_no = Column(String, unique=True, nullable=False)
    year = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=False)
    section = Column(String)
