import io
import os
import re
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI(title="AI Career Copilot - Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
        "https://ai-career-copilot-ashen.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Output schemas ────────────────────────────────────────────────────────────
class RoadmapModule(BaseModel):
    title: str
    timeline: str
    topics: List[str]
    projects: List[str]

class ATSBreakdown(BaseModel):
    skills_match: int
    projects_match: int
    education_match: int
    keyword_match: int

class AnalysisResult(BaseModel):
    match_score: int
    ats_breakdown: Optional[ATSBreakdown] = None
    matching_skills: List[str]
    missing_skills: List[str]
    suggestions: List[str]
    interview_questions: List[str]
    learning_roadmap: List[RoadmapModule]

# ── Helpers ───────────────────────────────────────────────────────────────────
MAX_RESUME_CHARS = 3000
MAX_JD_CHARS     = 1500

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        return "\n".join(
            p.extract_text() for p in reader.pages if p.extract_text()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")

def compress(text: str, max_chars: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]

SYSTEM_INSTRUCTION = (
    "You are a concise ATS optimizer and career coach. "
    "Analyze the resume vs. the job description. "
    "Return ONLY a valid JSON object — no markdown, no extra text. Rules:\n"
    "- match_score: integer 0-100 (overall weighted ATS score)\n"
    "- ats_breakdown: object with four integer fields (each 0-100):\n"
    "    - skills_match: how well the candidate's skills match the required skills\n"
    "    - projects_match: how well the candidate's projects/experience match job requirements\n"
    "    - education_match: how well the candidate's education matches job requirements\n"
    "    - keyword_match: how well the resume keywords match the job description keywords\n"
    "- matching_skills: up to 8 short skill names\n"
    "- missing_skills: up to 6 short skill names\n"
    "- suggestions: exactly 3 concise actionable bullet points\n"
    "- interview_questions: exactly 3 questions\n"
    "- learning_roadmap: 2-3 phases for missing skills only (empty list [] if none), "
    "each with title, timeline, up to 5 topics, and 2 projects"
)

def build_prompt(resume_text: str, jd_text: str) -> str:
    return f"RESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{jd_text}"

def parse_result(raw: str) -> AnalysisResult:
    """Strip markdown fences if present and parse into schema."""
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?", "", raw).strip()
    raw = re.sub(r"```$", "", raw).strip()
    data = json.loads(raw)
    return AnalysisResult(**data)

def friendly_error(err_str: str):
    """Return (status_code, message) from raw API error string."""
    if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str or "rate_limit_exceeded" in err_str:
        return 429, (
            "API quota exhausted. "
            "Get a fresh Gemini key at https://aistudio.google.com/apikey "
            "or a fresh Groq key at https://console.groq.com/keys "
            "and add it to backend/.env."
        )
    if "UNAVAILABLE" in err_str or "503" in err_str:
        return 503, "Models are under high demand. Please wait 30-60 seconds and try again."
    return 500, f"API error: {err_str[:300]}"

# ── Groq provider ─────────────────────────────────────────────────────────────
def call_groq(prompt: str) -> AnalysisResult:
    from groq import Groq
    groq_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_key:
        raise ValueError("GROQ_API_KEY not set")

    client = Groq(api_key=groq_key)
    # llama-3.3-70b-versatile is Groq's fastest + most capable model for JSON tasks
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_INSTRUCTION},
            {"role": "user",   "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=1400,
    )
    return parse_result(resp.choices[0].message.content)

# ── Gemini provider ───────────────────────────────────────────────────────────
def call_gemini(prompt: str) -> AnalysisResult:
    from google import genai
    from google.genai import types
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_key or gemini_key == "your_gemini_api_key_here":
        raise ValueError("GEMINI_API_KEY not set")

    client = genai.Client(api_key=gemini_key)
    for model_name in ["gemini-2.5-flash", "gemini-flash-latest"]:
        try:
            print(f"  Trying Gemini model: {model_name}")
            resp = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AnalysisResult,
                    system_instruction=SYSTEM_INSTRUCTION,
                    max_output_tokens=1400,
                    temperature=0.2,
                ),
            )
            return resp.parsed or parse_result(resp.text)
        except Exception as e:
            print(f"  Gemini {model_name} failed: {e}")
            last = e
    raise last

# ── Endpoint ──────────────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...),
):
    if not resume.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported.")

    try:
        raw_text = extract_text_from_pdf(await resume.read())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {e}")

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="PDF appears empty or unscannable.")

    prompt = build_prompt(
        compress(raw_text, MAX_RESUME_CHARS),
        compress(job_description, MAX_JD_CHARS),
    )

    # 1️⃣ Try Groq first (fastest — typically < 2 s)
    try:
        print("Attempting analysis via Groq …")
        result = call_groq(prompt)
        print("✓ Groq succeeded")
        return result
    except Exception as groq_err:
        print(f"Groq failed: {groq_err}")

    # 2️⃣ Fall back to Gemini
    try:
        print("Falling back to Gemini …")
        result = call_gemini(prompt)
        print("✓ Gemini succeeded")
        return result
    except Exception as gemini_err:
        print(f"Gemini failed: {gemini_err}")
        status, detail = friendly_error(str(groq_err) + str(gemini_err))
        raise HTTPException(status_code=status, detail=detail)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
