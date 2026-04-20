import os
import traceback
from typing import List


def extract_text_chunks(file_path: str,
                        chunk_size: int = 1000,
                        overlap: int = 100) -> List[str]:
    """
    Extract text from PDF and split into overlapping chunks.
    chunk_size: characters per chunk
    overlap: characters shared between consecutive chunks
    """
    try:
        import PyPDF2
        full_text = ""

        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            total_pages = len(reader.pages)
            print(f"[PDF] Processing {total_pages} pages")

            for page_num, page in enumerate(reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        full_text += f"\n[Page {page_num+1}]\n"
                        full_text += page_text
                except Exception:
                    continue

        if not full_text.strip():
            return []

        # Split into chunks with overlap
        chunks = []
        start = 0
        text_len = len(full_text)

        step = max(chunk_size - overlap, 1)
        while start < text_len:
            end = min(start + chunk_size, text_len)
            chunk = full_text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start += step

        print(f"[PDF] Created {len(chunks)} chunks from "
              f"{text_len} characters")
        return chunks

    except Exception as e:
        print(f"[PDF] Extraction error: {e}")
        traceback.print_exc()
        return []


def find_relevant_chunks(chunks: List[str],
                         question: str,
                         top_k: int = 3) -> List[str]:
    """
    Find the most relevant chunks for a question.
    Uses simple keyword scoring (no heavy ML models needed).
    Fast and works without GPU.
    """
    if not chunks:
        return []

    question_words = set(question.lower().split())
    # Remove common stop words
    stop_words = {
        'what', 'is', 'the', 'a', 'an', 'are', 'how',
        'why', 'when', 'where', 'who', 'which', 'tell',
        'me', 'about', 'give', 'explain', 'describe',
        'i', 'my', 'you', 'your', 'this', 'that', 'it'
    }
    question_words = question_words - stop_words

    scored_chunks = []
    for i, chunk in enumerate(chunks):
        chunk_lower = chunk.lower()
        # Score = number of question words found in chunk
        score = sum(1 for word in question_words
                   if word in chunk_lower)
        # Boost score for longer matches
        for word in question_words:
            if len(word) > 5 and word in chunk_lower:
                score += 2
        scored_chunks.append((score, i, chunk))

    # Sort by score descending
    scored_chunks.sort(key=lambda x: x[0], reverse=True)

    # Return top_k most relevant chunks
    relevant = [chunk for score, idx, chunk
                in scored_chunks[:top_k] if score > 0]

    # If no relevant chunks found, return first 3
    if not relevant:
        relevant = chunks[:min(top_k, len(chunks))]

    print(f"[PDF] Selected {len(relevant)} relevant chunks "
          f"for question: {question[:50]}")
    return relevant


def answer_pdf_question(file_path: str,
                        question: str,
                        role: str) -> str:
    """
    Main function: given PDF and question, return answer.
    Uses chunking + relevance scoring + Gemini.
    """
    try:
        from rag.generator import call_gemini

        # Extract all chunks
        chunks = extract_text_chunks(file_path,
                                     chunk_size=1500,
                                     overlap=150)

        if not chunks:
            return ("Could not extract text from this PDF. "
                   "Please ensure it is a text-based PDF, "
                   "not a scanned image.")

        total_pages_approx = len(chunks) * 1500 // 3000 + 1

        # Find relevant chunks for the question
        if question.lower() in [
            "summarize", "summary", "explain", "explain briefly",
            "explain the pdf", "explain the pdf very briefly",
            "what is this about", "overview"
        ]:
            # For summary: use first chunk + last chunk + middle
            if len(chunks) >= 3:
                relevant_chunks = [
                    chunks[0],
                    chunks[len(chunks)//2],
                    chunks[-1]
                ]
            else:
                relevant_chunks = chunks
        else:
            # For specific questions: find relevant sections
            relevant_chunks = find_relevant_chunks(
                chunks, question, top_k=3
            )

        # Combine relevant chunks
        context = "\n\n---\n\n".join(relevant_chunks)

        # Build prompt
        if question.lower() in [
            "summarize", "summary", "explain",
            "explain briefly", "explain the pdf very briefly",
            "what is this about", "overview",
            "explain the pdf briefly"
        ]:
            prompt = f"""You are an academic assistant for a {role}.
Summarize this document clearly and completely.

DOCUMENT CONTENT (selected sections from {len(chunks)} total sections):
{context}

Provide a summary covering:
1. What this document is about
2. Main topics covered
3. Key findings or conclusions
4. Who it is relevant for

Keep the summary complete and informative (5-8 sentences)."""

        else:
            prompt = f"""You are an academic assistant for a {role}.
Answer the question using ONLY the document content below.

DOCUMENT CONTENT:
{context}

QUESTION: {question}

Rules:
- Answer using only information from the document
- If the answer is not in the document, say so clearly
- Be specific and complete
- Maximum 5 sentences"""

        answer = call_gemini(prompt)

        if not answer:
            # Fallback: return first chunk summary
            return (
                f"Document overview ({len(chunks)} sections, "
                f"~{total_pages_approx} pages): "
                f"{chunks[0][:500]}..."
            )

        return answer

    except Exception as e:
        print(f"[PDF] answer_pdf_question error: {e}")
        traceback.print_exc()
        return "Error processing PDF. Please try again."


def summarize_pdf(file_path: str, role: str) -> str:
    """Called from chat_router for initial upload summary."""
    return answer_pdf_question(
        file_path, "explain the pdf briefly", role
    )
