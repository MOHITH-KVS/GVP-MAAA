from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from database import SessionLocal
from schemas import LoginRequest, StudentSignupRequest, TeacherSignupRequest,AdminLoginRequest
from models import User

app = FastAPI(title="GVP Academic Analytics Backend")


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
def student_signup(
    data: StudentSignupRequest,
    db: Session = Depends(get_db)
):
    if not data.email.endswith("@gvpcdpgc.edu.in"):
        raise HTTPException(
            status_code=400,
            detail="Only college email allowed"
        )

    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        name=data.name,
        email=data.email,
        password=data.password,   # hashing later
        role="student",
        department_id=data.department_id
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Student account created successfully",
        "user_id": new_user.user_id
    }


# -------------------------
# TEACHER SIGNUP
# -------------------------
@app.post("/signup/teacher")
def teacher_signup(
    data: TeacherSignupRequest,
    db: Session = Depends(get_db)
):
    if not data.email.endswith("@gvpcdpgc.edu.in"):
        raise HTTPException(
            status_code=400,
            detail="Only college email allowed"
        )

    existing_user = db.query(User).filter(User.email == data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    teacher = User(
        name=data.name,
        email=data.email,
        password=data.password,
        role="teacher",
        department_id=data.department_id
    )

    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    return {
        "message": "Teacher account created successfully",
        "user_id": teacher.user_id
    }


# -------------------------
# ADMIN LOGIN
# -------------------------
@app.post("/login/admin")
def admin_login(data: AdminLoginRequest, db: Session = Depends(get_db)):

    if data.access_key != "GVP-ADMIN-2026":
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