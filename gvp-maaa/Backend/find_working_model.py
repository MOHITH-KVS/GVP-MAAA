"""
find_working_model.py - Tests which Gemini model works with this key/quota
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)
key = os.environ.get("GEMINI_API_KEY", "")
print(f"Key: {key[:15]}...")

from google import genai
client = genai.Client(api_key=key)

# Test models in order of preference (lite/small first to avoid quota)
models_to_try = [
    "models/gemini-2.0-flash-lite",
    "models/gemini-2.0-flash-lite-001",
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash",
]

working_model = None
for model in models_to_try:
    try:
        r = client.models.generate_content(model=model, contents="Say OK")
        print(f"[WORKS] {model}: {r.text.strip()[:30]}")
        working_model = model
        break
    except Exception as e:
        err = str(e)[:120]
        print(f"[FAIL]  {model}: {err}")

if working_model:
    print(f"\nUSE THIS MODEL: {working_model}")
else:
    print("\nNo model worked. Check quota at: https://ai.dev/rate-limit")
