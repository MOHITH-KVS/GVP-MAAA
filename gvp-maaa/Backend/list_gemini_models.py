"""
list_gemini_models.py - Lists available models for this API key
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent / ".env", override=True)
key = os.environ.get("GEMINI_API_KEY", "")
print(f"Key: {key[:15]}...")

from google import genai
client = genai.Client(api_key=key)

print("\nAvailable models that support generateContent:")
for m in client.models.list():
    name = m.name
    # Only show Gemini models
    if "gemini" in name.lower():
        supported = getattr(m, "supported_actions", []) or []
        print(f"  {name}")
