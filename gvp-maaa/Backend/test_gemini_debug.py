"""
test_gemini_debug.py - Debug response structure
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)
key = os.environ.get("GEMINI_API_KEY", "")

from google import genai
client = genai.Client(api_key=key)

model = "models/gemini-2.5-flash"
print(f"Testing {model}...")

try:
    r = client.models.generate_content(
        model=model,
        contents="Say OK"
    )
    print(f"Response type: {type(r)}")
    print(f"Response.text: {repr(r.text)}")
    print(f"Response dir: {[a for a in dir(r) if not a.startswith('_')]}")
    if hasattr(r, 'candidates') and r.candidates:
        for c in r.candidates:
            print(f"Candidate: {c}")
            if hasattr(c, 'content') and c.content:
                for part in c.content.parts:
                    print(f"  Part text: {repr(part.text)}")
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")
