# GVP-MAAA

path:
/*frontend*/
cd "C:\Users\my pc\OneDrive\Desktop\GVP-MAAA\gvp-maaa"
/*backend*/
cd "C:\Users\my pc\OneDrive\Desktop\GVP-MAAA\gvp-maaa\Backend" 
/*virtual env*/
venv\Scripts\activate
localhost
http://127.0.0.1:8000/
uvicorn main:app --reload
uvicorn main:app

http://127.0.0.1:8000/docs

npm run dev 


CTRL + C
uvicorn main:app --reload










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
        student.year = payload.new_year
        student.semester = payload.new_semester
        if payload.new_section:
            student.section = payload.new_section

    db.commit()

    return {
        "message": "Students promoted successfully",
        "updated_count": len(students)
    }
