"""
debug_retriever.py — Run to see exactly what admin/teacher retriever returns from real DB.
Command: python debug_retriever.py
"""
import os, sys
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env", override=True)

from database import SessionLocal
from rag.retriever import retrieve_admin_data, retrieve_teacher_data

db = SessionLocal()
try:
    # ── ADMIN ──────────────────────────────────────────────────────
    print("\n=== ADMIN DATA ===")
    admin_data = retrieve_admin_data(db)
    inst = admin_data.get("institution", {})
    depts = admin_data.get("departments", [])
    print(f"total_students:     {inst.get('total_students')}")
    print(f"total_faculty:      {inst.get('total_faculty')}")
    print(f"overall_attendance: {inst.get('overall_attendance')}")
    print(f"at_risk_count:      {inst.get('at_risk_count')}")
    print(f"departments found:  {len(depts)}")
    for d in depts[:5]:
        print(f"  {d['department']}: {d['attendance_percentage']}% att, {d['at_risk_count']} at-risk/{d['total_students']}")

    # Format it and show what Gemini sees
    from rag.generator import format_data_for_gemini
    formatted_admin = format_data_for_gemini(admin_data, "admin")
    print("\n=== GEMINI SEES FOR ADMIN ===")
    print(formatted_admin)

    # ── TEACHER ────────────────────────────────────────────────────
    print("\n=== TEACHER DATA ===")
    from models import Faculty
    faculties = db.query(Faculty).limit(3).all()
    for fac in faculties:
        fid = fac.faculty_id
        print(f"\n-- Faculty ID: {fid} --")
        tdata = retrieve_teacher_data(fid, db)
        subj = tdata.get("subjects", [])
        att  = tdata.get("class_attendance", {})
        risk = tdata.get("at_risk_students", {})
        print(f"  subjects:       {[s['name'] for s in subj]}")
        print(f"  class_att_avg:  {att.get('average_percentage')}")
        print(f"  total_students: {att.get('total_students')}")
        print(f"  at_risk:        {risk.get('count')}/{risk.get('total')}")
        if att.get("average_percentage") is not None:
            formatted_t = format_data_for_gemini(tdata, "teacher")
            print("\n--- GEMINI SEES FOR TEACHER ---")
            print(formatted_t)
            break

finally:
    db.close()
