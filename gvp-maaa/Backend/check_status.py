"""
check_status.py — Run this to instantly see if Gemini + RAG pipeline are working.
Command: python check_status.py
"""
import os, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)

print("=" * 55)
print("  GVP-MAAA SYSTEM STATUS CHECK")
print("=" * 55)

# 1. API Key
key = os.environ.get("GEMINI_API_KEY", "")
if key.startswith("AIzaSy"):
    print(f"[1] API Key       : FOUND ({key[:12]}...)")
else:
    print(f"[1] API Key       : MISSING or INVALID  <-- FIX THIS")
    sys.exit(1)

# 2. google-genai package
try:
    from google import genai
    print("[2] google-genai  : INSTALLED")
except ImportError:
    print("[2] google-genai  : NOT INSTALLED  <-- run: pip install google-genai")
    sys.exit(1)

# 3. Live Gemini call
print("[3] Gemini call   : Testing...", end=" ", flush=True)
try:
    client = genai.Client(api_key=key)
    r = client.models.generate_content(
        model="models/gemini-2.5-flash",
        contents="Respond with exactly the word: WORKING"
    )
    if r and r.text:
        print(f"SUCCESS — response: '{r.text.strip()[:20]}'")
    else:
        print("FAILED — empty response")
        sys.exit(1)
except Exception as e:
    print(f"FAILED — {e}")
    sys.exit(1)

# 4. Retriever import
print("[4] retriever.py  : ", end="", flush=True)
try:
    from rag.retriever import retrieve_student_data
    print("OK")
except Exception as e:
    print(f"ERROR — {e}")

# 5. Generator import
print("[5] generator.py  : ", end="", flush=True)
try:
    from rag.generator import generate_answer, GEMINI_AVAILABLE
    status = "GEMINI ACTIVE" if GEMINI_AVAILABLE else "FALLBACK MODE"
    print(f"OK ({status})")
except Exception as e:
    print(f"ERROR — {e}")

# 6. Full pipeline test (no DB needed)
print("[6] Pipeline test : ", end="", flush=True)
try:
    from rag.generator import generate_answer
    fake_data = {
        "attendance": {
            "overall_percentage": 72.5,
            "total_classes": 80,
            "present": 58,
            "absent": 22,
            "status": "Below 75% - URGENT",
            "per_subject": [
                {"subject_name": "Machine Learning", "percentage": 68.0,
                 "present": 17, "total_classes": 25, "status": "LOW"},
                {"subject_name": "DBMS", "percentage": 80.0,
                 "present": 20, "total_classes": 25, "status": "OK"},
            ]
        },
        "marks": [],
        "assignments": {"total": 5, "pending_count": 2, "submitted_count": 3,
                        "pending_list": [{"title": "ML Assignment", "due_date": "2026-04-20"}]},
        "alerts": [],
        "events": [],
        "resources": [],
        "risk": {"level": "MEDIUM", "score": 0.4},
        "profile": {"year": 3, "section": "A", "semester": 5, "cgpa": 7.8}
    }
    answer = generate_answer(
        role="student",
        retrieved_data=fake_data,
        user_question="what is my machine learning attendance",
        conversation_history=[]
    )
    if answer and len(answer) > 10:
        print("SUCCESS")
        print()
        print("  Sample answer for 'what is my ML attendance':")
        print(f"  >> {answer[:180]}")
    else:
        print("FAILED — empty answer")
except Exception as e:
    print(f"ERROR — {e}")

print()
print("=" * 55)
print("  If all 6 checks show OK/SUCCESS, restart uvicorn.")
print("  Then every chat message will use Gemini + real DB.")
print("=" * 55)
