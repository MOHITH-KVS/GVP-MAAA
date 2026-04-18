"""
test_gemini.py - Final Gemini connection test
Run from: gvp-maaa/Backend/
Command:  python test_gemini.py
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)
key = os.environ.get("GEMINI_API_KEY", "")

print(f"Python: {sys.version}")
print(f"Working dir: {os.getcwd()}")
print(f"Key: {key[:15]}... (len={len(key)})")
print("-" * 60)

if not key or not key.startswith("AIzaSy"):
    print("[ERROR] Invalid or missing GEMINI_API_KEY in .env")
    sys.exit(1)

from google import genai
from google.genai import types as genai_types

client = genai.Client(api_key=key)

MODELS = [
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.0-flash",
]

working = None
for model in MODELS:
    try:
        r = client.models.generate_content(
            model=model,
            contents="Say exactly: GEMINI_WORKS",
            config=genai_types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=20
            )
        )
        print(f"[WORKS] {model}")
        print(f"  Response: {r.text.strip()[:60]}")
        working = model
        break
    except Exception as e:
        print(f"[FAIL]  {model}: {str(e)[:100]}")

print("-" * 60)
if working:
    print(f"[OK] Gemini is WORKING. Model: {working}")
    print(f"     Restart uvicorn now. You will see:")
    print(f"     [GEMINI] LIVE AND WORKING ({working}): ...")
else:
    print("[ERROR] No Gemini model is available. Check quota at:")
    print("        https://ai.dev/rate-limit")
