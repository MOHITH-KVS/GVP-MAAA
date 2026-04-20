import os
import traceback


PDF_CONTEXT_BY_USER = {}


def extract_text_from_pdf(file_path: str) -> str:
    try:
        import PyPDF2

        text = ""
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        return text[:8000]  # Limit to 8000 chars
    except Exception as e:
        traceback.print_exc()
        return f"Could not extract text: {e}"


def summarize_pdf(file_path: str, role: str) -> str:
    from rag.generator import call_gemini

    text = extract_text_from_pdf(file_path)
    if not text or text.startswith("Could not"):
        return "Could not read the PDF file."

    prompt = f"""You are an academic assistant.
Summarize this document in 5 bullet points.
Focus on key information relevant to a {role}.
Document content:
{text[:4000]}

Provide a clear, concise summary:"""

    result = call_gemini(prompt)
    return result or "Could not generate summary."


def set_pdf_context_for_user(user_id: int, text: str, filename: str = "") -> None:
    PDF_CONTEXT_BY_USER[int(user_id)] = {
        "text": str(text or "")[:8000],
        "filename": str(filename or ""),
    }


def get_pdf_context_for_user(user_id: int) -> dict:
    return PDF_CONTEXT_BY_USER.get(int(user_id), {})


def clear_pdf_context_for_user(user_id: int) -> None:
    PDF_CONTEXT_BY_USER.pop(int(user_id), None)
