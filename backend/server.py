from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Env
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------- Models ----------------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class StudentLoginIn(BaseModel):
    student_id: str
    password: str


class CourseGrade(BaseModel):
    code: str
    name: str
    grade: float  # 0-100
    credits: int


class SemesterTrend(BaseModel):
    semester: str
    gpa: float
    attendance: float


class StudentProfile(BaseModel):
    id: str
    student_id: str
    name: str
    email: str
    major: str
    year: int
    avatar_initial: str
    gpa: float
    attendance: float
    risk_level: str  # low | medium | high
    risk_score: int  # 0-100
    courses: List[CourseGrade]
    trends: List[SemesterTrend]
    assignments_completed: int
    assignments_total: int
    quiz_avg: float
    study_hours_weekly: int


class AISuggestionRequest(BaseModel):
    pass


# ---------------- Helpers ----------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False


def create_token(student_id: str) -> str:
    payload = {
        "sub": student_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def create_advisor_token(username: str) -> str:
    payload = {
        "sub": username,
        "role": "advisor",
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


async def get_current_advisor(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("role") != "advisor":
            raise HTTPException(status_code=403, detail="Advisor access only")
        username = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    doc = await db.advisors.find_one({"username": username}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Advisor not found")
    return doc


async def get_current_student(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        student_id = payload.get("sub")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    doc = await db.students.find_one({"student_id": student_id}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    return doc


def compute_risk(gpa: float, attendance: float, quiz_avg: float, assignments_ratio: float) -> tuple:
    """Returns (risk_level, risk_score 0-100). Higher score = higher risk."""
    # Normalize each factor to a risk contribution (0-100, higher = worse)
    gpa_risk = max(0.0, (4.0 - gpa) / 4.0) * 100  # gpa 0..4
    att_risk = max(0.0, (100 - attendance))
    quiz_risk = max(0.0, (100 - quiz_avg))
    assn_risk = max(0.0, (1 - assignments_ratio) * 100)
    score = round(0.40 * gpa_risk + 0.30 * att_risk + 0.20 * quiz_risk + 0.10 * assn_risk)
    score = max(0, min(100, score))
    # Default before classification — guarantees `level` is always defined.
    level = "medium"
    # Deterministic overrides for clearly failing students
    if gpa < 2.0 or attendance < 60:
        level = "high"
    elif gpa < 2.5 or attendance < 75 or score >= 50:
        level = "medium"
    elif score < 30:
        level = "low"
    return level, score


def build_profile(doc: dict) -> StudentProfile:
    completed = doc.get("assignments_completed", 0)
    total = max(1, doc.get("assignments_total", 1))
    level, score = compute_risk(
        doc["gpa"], doc["attendance"], doc.get("quiz_avg", 70), completed / total
    )
    return StudentProfile(
        id=doc["id"],
        student_id=doc["student_id"],
        name=doc["name"],
        email=doc["email"],
        major=doc["major"],
        year=doc["year"],
        avatar_initial=doc["avatar_initial"],
        gpa=doc["gpa"],
        attendance=doc["attendance"],
        risk_level=level,
        risk_score=score,
        courses=[CourseGrade(**c) for c in doc.get("courses", [])],
        trends=[SemesterTrend(**t) for t in doc.get("trends", [])],
        assignments_completed=completed,
        assignments_total=doc.get("assignments_total", 0),
        quiz_avg=doc.get("quiz_avg", 0),
        study_hours_weekly=doc.get("study_hours_weekly", 0),
    )


# ---------------- Seed ----------------
SEED_STUDENTS = [
    {
        "student_id": "S1001", "password": "nabd1234",
        "name": "سارة العتيبي", "email": "sara.alotaibi@nabd.edu",
        "major": "علوم الحاسب", "year": 3, "avatar_initial": "س",
        "gpa": 3.7, "attendance": 95.0, "quiz_avg": 88.0,
        "assignments_completed": 22, "assignments_total": 24, "study_hours_weekly": 18,
        "courses": [
            {"code": "CS301", "name": "هياكل البيانات", "grade": 92, "credits": 3},
            {"code": "CS305", "name": "قواعد البيانات", "grade": 88, "credits": 3},
            {"code": "MATH210", "name": "الإحصاء", "grade": 85, "credits": 3},
            {"code": "ENG201", "name": "كتابة تقنية", "grade": 90, "credits": 2},
        ],
        "trends": [
            {"semester": "الفصل 1", "gpa": 3.4, "attendance": 92},
            {"semester": "الفصل 2", "gpa": 3.5, "attendance": 93},
            {"semester": "الفصل 3", "gpa": 3.6, "attendance": 94},
            {"semester": "الفصل 4", "gpa": 3.7, "attendance": 95},
        ],
    },
    {
        "student_id": "S1002", "password": "nabd1234",
        "name": "محمد القحطاني", "email": "m.alqahtani@nabd.edu",
        "major": "هندسة كهربائية", "year": 2, "avatar_initial": "م",
        "gpa": 2.4, "attendance": 68.0, "quiz_avg": 62.0,
        "assignments_completed": 12, "assignments_total": 22, "study_hours_weekly": 6,
        "courses": [
            {"code": "EE201", "name": "الدوائر الكهربائية", "grade": 64, "credits": 3},
            {"code": "EE210", "name": "الإلكترونيات", "grade": 58, "credits": 3},
            {"code": "MATH220", "name": "تفاضل وتكامل", "grade": 55, "credits": 4},
            {"code": "PHYS201", "name": "فيزياء عامة", "grade": 70, "credits": 3},
        ],
        "trends": [
            {"semester": "الفصل 1", "gpa": 3.0, "attendance": 85},
            {"semester": "الفصل 2", "gpa": 2.8, "attendance": 78},
            {"semester": "الفصل 3", "gpa": 2.6, "attendance": 72},
            {"semester": "الفصل 4", "gpa": 2.4, "attendance": 68},
        ],
    },
    {
        "student_id": "S1003", "password": "nabd1234",
        "name": "ريم الزهراني", "email": "reem.alzahrani@nabd.edu",
        "major": "إدارة أعمال", "year": 4, "avatar_initial": "ر",
        "gpa": 3.4, "attendance": 90.0, "quiz_avg": 82.0,
        "assignments_completed": 19, "assignments_total": 21, "study_hours_weekly": 14,
        "courses": [
            {"code": "BUS401", "name": "الإدارة الإستراتيجية", "grade": 87, "credits": 3},
            {"code": "ACC301", "name": "المحاسبة المتوسطة", "grade": 80, "credits": 3},
            {"code": "MKT310", "name": "تسويق رقمي", "grade": 84, "credits": 3},
            {"code": "FIN320", "name": "تمويل الشركات", "grade": 78, "credits": 3},
        ],
        "trends": [
            {"semester": "الفصل 1", "gpa": 3.1, "attendance": 86},
            {"semester": "الفصل 2", "gpa": 3.2, "attendance": 88},
            {"semester": "الفصل 3", "gpa": 3.3, "attendance": 89},
            {"semester": "الفصل 4", "gpa": 3.4, "attendance": 90},
        ],
    },
    {
        "student_id": "S1004", "password": "nabd1234",
        "name": "خالد الحربي", "email": "khalid.harbi@nabd.edu",
        "major": "هندسة مدنية", "year": 2, "avatar_initial": "خ",
        "gpa": 1.9, "attendance": 55.0, "quiz_avg": 48.0,
        "assignments_completed": 8, "assignments_total": 20, "study_hours_weekly": 4,
        "courses": [
            {"code": "CIV201", "name": "ميكانيكا المواد", "grade": 52, "credits": 3},
            {"code": "CIV210", "name": "الجيوديسيا", "grade": 45, "credits": 3},
            {"code": "MATH220", "name": "تفاضل وتكامل", "grade": 42, "credits": 4},
            {"code": "PHYS201", "name": "فيزياء عامة", "grade": 58, "credits": 3},
        ],
        "trends": [
            {"semester": "الفصل 1", "gpa": 2.4, "attendance": 75},
            {"semester": "الفصل 2", "gpa": 2.2, "attendance": 68},
            {"semester": "الفصل 3", "gpa": 2.0, "attendance": 60},
            {"semester": "الفصل 4", "gpa": 1.9, "attendance": 55},
        ],
    },
    {
        "student_id": "S1005", "password": "nabd1234",
        "name": "ليان الشمري", "email": "layan.alshammari@nabd.edu",
        "major": "تصميم جرافيك", "year": 3, "avatar_initial": "ل",
        "gpa": 3.9, "attendance": 98.0, "quiz_avg": 95.0,
        "assignments_completed": 25, "assignments_total": 25, "study_hours_weekly": 22,
        "courses": [
            {"code": "ART301", "name": "تصميم الهوية", "grade": 96, "credits": 3},
            {"code": "ART305", "name": "التصوير الرقمي", "grade": 94, "credits": 3},
            {"code": "DES310", "name": "تصميم تجربة المستخدم", "grade": 95, "credits": 3},
            {"code": "MM320", "name": "وسائط متعددة", "grade": 92, "credits": 2},
        ],
        "trends": [
            {"semester": "الفصل 1", "gpa": 3.7, "attendance": 94},
            {"semester": "الفصل 2", "gpa": 3.8, "attendance": 96},
            {"semester": "الفصل 3", "gpa": 3.85, "attendance": 97},
            {"semester": "الفصل 4", "gpa": 3.9, "attendance": 98},
        ],
    },
]


async def seed_students():
    count = await db.students.count_documents({})
    if count > 0:
        logger.info(f"Students already seeded: {count}")
        return
    docs = []
    now = datetime.now(timezone.utc).isoformat()
    for s in SEED_STUDENTS:
        d = {**s}
        d["id"] = str(uuid.uuid4())
        d["password_hash"] = hash_password(d.pop("password"))
        d["created_at"] = now
        docs.append(d)
    await db.students.insert_many(docs)
    logger.info(f"Seeded {len(docs)} students")


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Nabd API running"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    obj = StatusCheck(**input.model_dump())
    doc = obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for c in checks:
        if isinstance(c['timestamp'], str):
            c['timestamp'] = datetime.fromisoformat(c['timestamp'])
    return checks


@api_router.post("/student/login")
async def student_login(body: StudentLoginIn):
    doc = await db.students.find_one({"student_id": body.student_id})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="رقم الطالب أو كلمة المرور غير صحيحة")
    token = create_token(doc["student_id"])
    return {
        "token": token,
        "student": {
            "student_id": doc["student_id"],
            "name": doc["name"],
            "avatar_initial": doc["avatar_initial"],
        },
    }


@api_router.get("/student/me", response_model=StudentProfile)
async def get_me(student=Depends(get_current_student)):
    return build_profile(student)


@api_router.get("/student/demo-credentials")
async def demo_credentials():
    """Return demo students list (no password reveal beyond default)."""
    return {
        "default_password": "nabd1234",
        "students": [
            {"student_id": s["student_id"], "name": s["name"], "risk_hint": _hint(s)}
            for s in SEED_STUDENTS
        ],
    }


def _hint(s):
    if s["gpa"] >= 3.5:
        return "low"
    if s["gpa"] >= 2.5:
        return "medium"
    return "high"


@api_router.post("/student/ai-suggestions")
async def ai_suggestions(student=Depends(get_current_student)):
    profile = build_profile(student)
    # Build a structured prompt in Arabic
    courses_text = "\n".join(
        f"- {c.name} ({c.code}): {c.grade}%" for c in profile.courses
    )
    prompt = f"""أنت مرشد أكاديمي ذكي في منصة نبض. حلّل بيانات الطالب التالية وقدّم اقتراحات شخصية ومحددة لمساعدته على تجنب التعثر الأكاديمي وتحسين أدائه.

بيانات الطالب:
- الاسم: {profile.name}
- التخصص: {profile.major} — السنة {profile.year}
- المعدل التراكمي: {profile.gpa:.2f} من 4.00
- نسبة الحضور: {profile.attendance:.0f}%
- متوسط الكويزات: {profile.quiz_avg:.0f}%
- الواجبات المكتملة: {profile.assignments_completed}/{profile.assignments_total}
- ساعات الدراسة الأسبوعية: {profile.study_hours_weekly}
- مستوى المخاطرة: {profile.risk_level} ({profile.risk_score}/100)
- المقررات:
{courses_text}

أجب بصيغة JSON صالحة فقط وبدون أي نص خارجي بالتنسيق التالي:
{{
  "summary": "ملخص قصير عن وضع الطالب (سطرين كحد أقصى)",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "risks": ["خطر/تحدٍ 1", "خطر/تحدٍ 2"],
  "recommendations": [
    {{"title": "عنوان قصير", "action": "خطوة عملية مفصلة", "priority": "high|medium|low"}},
    {{"title": "...", "action": "...", "priority": "..."}}
  ],
  "weekly_plan": ["إجراء يوم الإثنين", "إجراء يوم الثلاثاء", "...", "إجراء يوم الأحد"],
  "motivational_message": "رسالة تحفيزية قصيرة بالعربية"
}}
أعطِ 4-5 توصيات و7 خطوات للخطة الأسبوعية. اجعل النصائح محددة جداً لبيانات الطالب."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"nabd-{profile.student_id}-{uuid.uuid4().hex[:8]}",
            system_message="أنت مرشد أكاديمي خبير ومتعاطف. تقدم نصائح عملية بالعربية. ترد دائماً بتنسيق JSON صالح فقط دون أي شرح أو تنسيق markdown.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=prompt))
        text = response if isinstance(response, str) else str(response)

        # Strip markdown fences if present
        import re
        import json
        cleaned = text.strip()
        m = re.search(r"\{[\s\S]*\}", cleaned)
        if m:
            cleaned = m.group(0)
        data = json.loads(cleaned)
        return {"source": "ai", "data": data}
    except Exception as e:
        logger.error(f"AI suggestion error: {e}")
        # Fallback: rule-based suggestions
        return {"source": "fallback", "data": _fallback_suggestions(profile)}


def _fallback_suggestions(p: StudentProfile):
    recs = []
    if p.attendance < 75:
        recs.append({"title": "تحسين الحضور", "action": "ضع تذكيراً يومياً للحضور والتزم بالوصول قبل بدء المحاضرة بـ 10 دقائق.", "priority": "high"})
    if p.gpa < 2.5:
        recs.append({"title": "خطة تعافي أكاديمي", "action": "احجز موعداً مع المرشد الأكاديمي خلال الأسبوع لمراجعة المقررات الضعيفة.", "priority": "high"})
    if p.quiz_avg < 70:
        recs.append({"title": "تحسين الكويزات", "action": "خصص 30 دقيقة يومياً لمراجعة المحاضرات السابقة وحل أسئلة تجريبية.", "priority": "medium"})
    if p.assignments_completed / max(1, p.assignments_total) < 0.8:
        recs.append({"title": "إنجاز الواجبات", "action": "استخدم تطبيق مهام وقسّم كل واجب إلى مهام صغيرة بمواعيد محددة.", "priority": "medium"})
    if p.study_hours_weekly < 10:
        recs.append({"title": "زيادة وقت المذاكرة", "action": "اهدف إلى 12-15 ساعة أسبوعياً موزّعة على 5 أيام بدلاً من الحشد ليلة الامتحان.", "priority": "low"})
    if not recs:
        recs.append({"title": "حافظ على المستوى", "action": "أداؤك ممتاز، استمر بنفس النهج وفكّر بدعم زملائك في الدراسة الجماعية.", "priority": "low"})

    return {
        "summary": f"معدلك {p.gpa:.2f} وحضورك {p.attendance:.0f}% — مستوى المخاطرة الحالي: {p.risk_level}.",
        "strengths": ["انتظام في تقديم الواجبات" if p.assignments_completed / max(1, p.assignments_total) > 0.8 else "إمكانية كبيرة للتحسن"],
        "risks": ["معدل تراكمي منخفض" if p.gpa < 2.5 else "بعض المقررات تحتاج اهتماماً"],
        "recommendations": recs[:5],
        "weekly_plan": [
            "الإثنين: مراجعة محاضرات الأسبوع السابق (90 دقيقة)",
            "الثلاثاء: حل واجبات المقررات الضعيفة",
            "الأربعاء: جلسة دراسة جماعية مع زميل",
            "الخميس: حضور ساعات المكتب لأستاذ المادة الأصعب",
            "الجمعة: تطبيق عملي/مشاريع",
            "السبت: اختبار ذاتي قصير",
            "الأحد: تخطيط الأسبوع التالي ومراجعة الأهداف",
        ],
        "motivational_message": "كل خطوة صغيرة تقربك من هدفك — استمر، أنت قادر! 💪",
    }



# ============================================================
# Advisor authentication & data
# ============================================================
class AdvisorLoginIn(BaseModel):
    username: str
    password: str


class InterventionIn(BaseModel):
    student_id: str
    title: str
    note: str
    priority: str = "medium"  # low | medium | high
    due_date: Optional[str] = None  # ISO date string


class InterventionStatusIn(BaseModel):
    status: str  # pending | in_progress | done


SEED_ADVISOR = {
    "username": "advisor",
    "password": "nabd1234",
    "name": "د. عبدالله المرشد",
    "email": "advisor@nabd.edu",
    "avatar_initial": "ع",
    "title": "مرشد أكاديمي",
}


async def seed_advisor():
    count = await db.advisors.count_documents({})
    if count > 0:
        logger.info(f"Advisors already seeded: {count}")
        return
    doc = {
        "id": str(uuid.uuid4()),
        "username": SEED_ADVISOR["username"],
        "name": SEED_ADVISOR["name"],
        "email": SEED_ADVISOR["email"],
        "avatar_initial": SEED_ADVISOR["avatar_initial"],
        "title": SEED_ADVISOR["title"],
        "password_hash": hash_password(SEED_ADVISOR["password"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.advisors.insert_one(doc)
    logger.info("Seeded default advisor")


@api_router.post("/advisor/login")
async def advisor_login(body: AdvisorLoginIn):
    doc = await db.advisors.find_one({"username": body.username})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")
    token = create_advisor_token(doc["username"])
    return {
        "token": token,
        "advisor": {
            "username": doc["username"],
            "name": doc["name"],
            "title": doc["title"],
            "avatar_initial": doc["avatar_initial"],
        },
    }


@api_router.get("/advisor/me")
async def advisor_me(advisor=Depends(get_current_advisor)):
    return advisor


@api_router.get("/advisor/students")
async def advisor_list_students(advisor=Depends(get_current_advisor)):
    """Return all students with summary risk for advisor dashboard."""
    cursor = db.students.find({}, {"_id": 0, "password_hash": 0})
    students = await cursor.to_list(1000)
    out = []
    for s in students:
        completed = s.get("assignments_completed", 0)
        total = max(1, s.get("assignments_total", 1))
        level, score = compute_risk(s["gpa"], s["attendance"], s.get("quiz_avg", 70), completed / total)
        out.append({
            "id": s["id"],
            "student_id": s["student_id"],
            "name": s["name"],
            "avatar_initial": s["avatar_initial"],
            "major": s["major"],
            "year": s["year"],
            "gpa": s["gpa"],
            "attendance": s["attendance"],
            "risk_level": level,
            "risk_score": score,
        })
    # Sort by risk_score desc (most at-risk first)
    out.sort(key=lambda x: -x["risk_score"])
    # Stats
    stats = {
        "total": len(out),
        "high": sum(1 for x in out if x["risk_level"] == "high"),
        "medium": sum(1 for x in out if x["risk_level"] == "medium"),
        "low": sum(1 for x in out if x["risk_level"] == "low"),
        "avg_gpa": round(sum(x["gpa"] for x in out) / max(1, len(out)), 2),
        "avg_attendance": round(sum(x["attendance"] for x in out) / max(1, len(out)), 1),
    }
    return {"students": out, "stats": stats}


@api_router.get("/advisor/student/{student_id}", response_model=StudentProfile)
async def advisor_student_detail(student_id: str, advisor=Depends(get_current_advisor)):
    doc = await db.students.find_one({"student_id": student_id}, {"_id": 0, "password_hash": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    return build_profile(doc)


@api_router.post("/advisor/intervention")
async def add_intervention(body: InterventionIn, advisor=Depends(get_current_advisor)):
    student = await db.students.find_one({"student_id": body.student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    doc = {
        "id": str(uuid.uuid4()),
        "student_id": body.student_id,
        "advisor_username": advisor["username"],
        "advisor_name": advisor["name"],
        "title": body.title,
        "note": body.note,
        "priority": body.priority,
        "due_date": body.due_date,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.interventions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/advisor/student/{student_id}/interventions")
async def list_interventions_advisor(student_id: str, advisor=Depends(get_current_advisor)):
    cursor = db.interventions.find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(500)
    return {"interventions": items}


@api_router.patch("/advisor/intervention/{intervention_id}")
async def update_intervention(intervention_id: str, body: InterventionStatusIn, advisor=Depends(get_current_advisor)):
    if body.status not in ("pending", "in_progress", "done"):
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.interventions.update_one(
        {"id": intervention_id},
        {"$set": {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention not found")
    doc = await db.interventions.find_one({"id": intervention_id}, {"_id": 0})
    return doc


# Student can view their own interventions (read-only)
@api_router.get("/student/interventions")
async def list_my_interventions(student=Depends(get_current_student)):
    cursor = db.interventions.find({"student_id": student["student_id"]}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(500)
    return {"interventions": items}


# ============================================================
# AI Student Assistant Chatbot
# ============================================================
class ChatMessageIn(BaseModel):
    message: str


@api_router.get("/student/chat/history")
async def chat_history(student=Depends(get_current_student)):
    cursor = db.chat_messages.find({"student_id": student["student_id"]}, {"_id": 0}).sort("created_at", 1)
    msgs = await cursor.to_list(1000)
    return {"messages": msgs}


@api_router.delete("/student/chat/history")
async def chat_history_clear(student=Depends(get_current_student)):
    await db.chat_messages.delete_many({"student_id": student["student_id"]})
    return {"ok": True}


@api_router.post("/student/chat")
async def chat_send(body: ChatMessageIn, student=Depends(get_current_student)):
    msg = body.message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="رسالة فارغة")
    profile = build_profile(student)
    now_iso = datetime.now(timezone.utc).isoformat()

    # Persist user message
    user_doc = {
        "id": str(uuid.uuid4()),
        "student_id": profile.student_id,
        "role": "user",
        "content": msg,
        "created_at": now_iso,
    }
    await db.chat_messages.insert_one(user_doc)

    # Build context: previous turns (limit last 20)
    history_cursor = db.chat_messages.find(
        {"student_id": profile.student_id}, {"_id": 0}
    ).sort("created_at", 1)
    history = await history_cursor.to_list(40)
    # Keep last 20 prior messages (excluding current we just added is fine to include)
    history = history[-20:]

    courses_text = ", ".join(f"{c.code} ({c.grade}%)" for c in profile.courses)
    system_message = (
        f"أنت 'مساعد نبض'، مرشد أكاديمي ذكي ومتعاطف يتحدث العربية بطلاقة. "
        f"تساعد الطلاب الجامعيين على فهم وضعهم الأكاديمي، وتقدم نصائح دراسية عملية، "
        f"تشرح المعدلات، تقترح خطط مذاكرة، وتجيب عن أي سؤال بشأن الدراسة. "
        f"بيانات الطالب الحالي:\n"
        f"- الاسم: {profile.name}\n"
        f"- التخصص: {profile.major} (السنة {profile.year})\n"
        f"- المعدل التراكمي: {profile.gpa:.2f} من 4.00\n"
        f"- الحضور: {profile.attendance:.0f}%\n"
        f"- متوسط الكويزات: {profile.quiz_avg:.0f}%\n"
        f"- الواجبات: {profile.assignments_completed}/{profile.assignments_total}\n"
        f"- مستوى المخاطرة: {profile.risk_level} ({profile.risk_score}/100)\n"
        f"- المقررات: {courses_text}\n"
        f"كن ودوداً، شخصياً، ومحدداً. استخدم لغة مشجعة. اجعل الردود قصيرة-متوسطة الطول وقابلة للتنفيذ."
    )

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        # Use a stable per-student session id so the library keeps context
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"nabd-chat-{profile.student_id}",
            system_message=system_message,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        # We send the latest user message; library handles session memory.
        response = await chat.send_message(UserMessage(text=msg))
        reply = response if isinstance(response, str) else str(response)
        source = "ai"
    except Exception as e:
        logger.error(f"Chat AI error: {e}")
        reply = _chat_fallback(msg, profile)
        source = "fallback"

    assistant_doc = {
        "id": str(uuid.uuid4()),
        "student_id": profile.student_id,
        "role": "assistant",
        "content": reply,
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(assistant_doc)
    assistant_doc.pop("_id", None)
    return {"reply": reply, "source": source, "message": assistant_doc}


def _chat_fallback(msg: str, p: StudentProfile) -> str:
    m = msg.strip()
    if any(k in m for k in ["معدل", "GPA", "gpa"]):
        return f"معدلك التراكمي حالياً {p.gpa:.2f}. {'استمر بنفس النهج!' if p.gpa >= 3.0 else 'لرفع المعدل: ركّز على المقررات الأضعف، احضر ساعات المكتب، وضع خطة مذاكرة أسبوعية ثابتة.'}"
    if "حضور" in m:
        return f"نسبة حضورك {p.attendance:.0f}%. {'ممتاز' if p.attendance >= 90 else 'حاول الالتزام بكل المحاضرات، الحضور المنتظم يرفع المعدل بشكل ملحوظ.'}"
    if any(k in m for k in ["خطر", "مخاطرة", "تعثر"]):
        return f"مستوى مخاطرتك حالياً: {p.risk_level}. {'لا داعي للقلق ' if p.risk_level == 'low' else 'يمكنك تحسينه بسرعة بالتركيز على الحضور والواجبات.'}"
    return "أنا هنا لمساعدتك! اسألني عن معدلك، نسبة حضورك، خطط مذاكرة، أو أي صعوبة تواجهها في مقرر معين."


# ============================================================
# Contact / About
# ============================================================
@api_router.get("/contact")
async def contact_info():
    return {
        "project_name": "Nabd Assistant",
        "project_name_ar": "مساعد نبض",
        "developer": "Aljory Mohammed Alaboud",
        "tagline": "نظام ذكاء اصطناعي للتنبؤ المبكر بنجاح الطلاب الجامعيين",
        "tagline_ar": "نظام ذكاء اصطناعي للتنبؤ المبكر بنجاح الطلاب الجامعيين",
        "email": "contact@nabd.edu",
        "year": datetime.now(timezone.utc).year,
    }


class ContactMessageIn(BaseModel):
    name: str
    email: str
    message: str


@api_router.post("/contact/message")
async def contact_message(body: ContactMessageIn):
    doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "message": body.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.contact_messages.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "message": doc}


# ============================================================
# Achievements / Badges (computed from profile)
# ============================================================
def _compute_achievements(p: StudentProfile) -> List[dict]:
    assn_ratio = (p.assignments_completed / p.assignments_total) if p.assignments_total else 0
    trend_delta = 0.0
    if len(p.trends) >= 2:
        trend_delta = p.trends[-1].gpa - p.trends[0].gpa

    defs = [
        {"id": "perfect_attendance", "icon": "calendar", "color": "#10b981",
         "title": "حضور مثالي", "desc": "حضور 95% أو أعلى",
         "threshold": 95, "value": p.attendance, "unit": "%"},
        {"id": "honor_gpa", "icon": "award", "color": "#6d4dff",
         "title": "قائمة الشرف", "desc": "معدل تراكمي 3.5 أو أعلى",
         "threshold": 3.5, "value": p.gpa, "unit": "/4"},
        {"id": "quiz_champion", "icon": "target", "color": "#f59e0b",
         "title": "بطل الكويزات", "desc": "متوسط 85% أو أعلى",
         "threshold": 85, "value": p.quiz_avg, "unit": "%"},
        {"id": "homework_hero", "icon": "book", "color": "#0ea5e9",
         "title": "ملتزم بالواجبات", "desc": "إنجاز 95% من الواجبات",
         "threshold": 95, "value": assn_ratio * 100, "unit": "%"},
        {"id": "study_warrior", "icon": "clock", "color": "#a855f7",
         "title": "مذاكر مجدّ", "desc": "15 ساعة مذاكرة أسبوعياً",
         "threshold": 15, "value": p.study_hours_weekly, "unit": "س"},
        {"id": "rising_star", "icon": "trending-up", "color": "#ec4899",
         "title": "نجم صاعد", "desc": "تحسّن في المعدل بين الفصول",
         "threshold": 0.1, "value": trend_delta, "unit": "نقطة"},
        {"id": "low_risk", "icon": "shield", "color": "#14b8a6",
         "title": "مسار آمن", "desc": "مستوى مخاطرة منخفض",
         "threshold": 70, "value": 100 - p.risk_score, "unit": "%"},
    ]

    out = []
    for d in defs:
        earned = d["value"] >= d["threshold"]
        progress = 0
        if d["threshold"] > 0:
            progress = max(0, min(100, round((d["value"] / d["threshold"]) * 100)))
        out.append({
            "id": d["id"],
            "title": d["title"],
            "desc": d["desc"],
            "icon": d["icon"],
            "color": d["color"],
            "earned": bool(earned),
            "progress": progress,
            "value": round(float(d["value"]), 2),
            "threshold": d["threshold"],
            "unit": d["unit"],
        })
    return out


@api_router.get("/student/achievements")
async def get_achievements(student=Depends(get_current_student)):
    p = build_profile(student)
    items = _compute_achievements(p)
    earned = sum(1 for x in items if x["earned"])
    return {"earned": earned, "total": len(items), "items": items}


# ============================================================
# Peer Comparison
# ============================================================
@api_router.get("/student/comparison")
async def peer_comparison(student=Depends(get_current_student)):
    p = build_profile(student)
    cursor = db.students.find({}, {"_id": 0, "password_hash": 0})
    everyone = await cursor.to_list(1000)
    if not everyone:
        raise HTTPException(status_code=500, detail="No peers found")

    def avg(items, key, default=0):
        vals = [x.get(key, default) for x in items]
        return sum(vals) / len(vals) if vals else 0

    cohort = [x for x in everyone if x.get("major") == p.major] or everyone
    sorted_by_gpa = sorted(everyone, key=lambda x: -x.get("gpa", 0))
    top_count = max(1, len(sorted_by_gpa) // 5)
    top = sorted_by_gpa[:top_count]

    def metric(label, key, your_value, multiplier=1):
        peer_avg = avg(everyone, key) * multiplier
        cohort_avg = avg(cohort, key) * multiplier
        top_avg = avg(top, key) * multiplier
        better_or_equal = sum(1 for x in everyone if (x.get(key, 0) * multiplier) <= your_value)
        percentile = round((better_or_equal / len(everyone)) * 100)
        return {
            "label": label, "key": key,
            "you": round(float(your_value), 2),
            "peers_avg": round(float(peer_avg), 2),
            "cohort_avg": round(float(cohort_avg), 2),
            "top_avg": round(float(top_avg), 2),
            "percentile": percentile,
        }

    assn_ratio = (p.assignments_completed / max(1, p.assignments_total)) * 100
    metrics = [
        metric("المعدل التراكمي", "gpa", p.gpa),
        metric("نسبة الحضور", "attendance", p.attendance),
        metric("متوسط الكويزات", "quiz_avg", p.quiz_avg),
        metric("ساعات المذاكرة", "study_hours_weekly", p.study_hours_weekly),
    ]
    def assn_pct(items):
        nums = [x.get("assignments_completed", 0) / max(1, x.get("assignments_total", 1)) * 100 for x in items]
        return sum(nums) / len(nums) if nums else 0
    metrics.append({
        "label": "إنجاز الواجبات", "key": "assignments_ratio",
        "you": round(assn_ratio, 1),
        "peers_avg": round(assn_pct(everyone), 1),
        "cohort_avg": round(assn_pct(cohort), 1),
        "top_avg": round(assn_pct(top), 1),
        "percentile": round(sum(
            1 for x in everyone
            if (x.get("assignments_completed", 0) / max(1, x.get("assignments_total", 1)) * 100) <= assn_ratio
        ) / len(everyone) * 100),
    })

    return {
        "cohort": p.major,
        "cohort_size": len(cohort),
        "total_peers": len(everyone),
        "metrics": metrics,
    }


# ============================================================
# Appointments (Student ↔ Advisor)
# ============================================================
class AppointmentIn(BaseModel):
    scheduled_at: str  # ISO datetime string
    duration_min: int = 30
    mode: str = "online"  # online | onsite
    reason: str


class AppointmentStatusIn(BaseModel):
    status: str  # pending | confirmed | rejected | completed | cancelled
    advisor_note: Optional[str] = None


def _validate_appointment_status(status: str):
    if status not in ("pending", "confirmed", "rejected", "completed", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid status")


@api_router.post("/student/appointments")
async def book_appointment(body: AppointmentIn, student=Depends(get_current_student)):
    if body.mode not in ("online", "onsite"):
        raise HTTPException(status_code=400, detail="Invalid mode")
    if body.duration_min not in (15, 30, 45, 60):
        raise HTTPException(status_code=400, detail="Invalid duration")
    if not body.reason.strip():
        raise HTTPException(status_code=400, detail="السبب مطلوب")
    doc = {
        "id": str(uuid.uuid4()),
        "student_id": student["student_id"],
        "student_name": student["name"],
        "advisor_username": SEED_ADVISOR["username"],
        "scheduled_at": body.scheduled_at,
        "duration_min": body.duration_min,
        "mode": body.mode,
        "reason": body.reason.strip(),
        "status": "pending",
        "advisor_note": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.appointments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/student/appointments")
async def list_my_appointments(student=Depends(get_current_student)):
    cursor = db.appointments.find({"student_id": student["student_id"]}, {"_id": 0}).sort("scheduled_at", -1)
    items = await cursor.to_list(500)
    return {"appointments": items}


@api_router.delete("/student/appointments/{appointment_id}")
async def cancel_my_appointment(appointment_id: str, student=Depends(get_current_student)):
    res = await db.appointments.update_one(
        {"id": appointment_id, "student_id": student["student_id"], "status": {"$in": ["pending", "confirmed"]}},
        {"$set": {"status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found or not cancellable")
    doc = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return doc


@api_router.get("/advisor/appointments")
async def list_advisor_appointments(advisor=Depends(get_current_advisor)):
    cursor = db.appointments.find({"advisor_username": advisor["username"]}, {"_id": 0}).sort("scheduled_at", 1)
    items = await cursor.to_list(500)
    return {"appointments": items}


@api_router.patch("/advisor/appointments/{appointment_id}")
async def update_appointment_status(appointment_id: str, body: AppointmentStatusIn, advisor=Depends(get_current_advisor)):
    _validate_appointment_status(body.status)
    update = {"status": body.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if body.advisor_note is not None:
        update["advisor_note"] = body.advisor_note
    res = await db.appointments.update_one(
        {"id": appointment_id, "advisor_username": advisor["username"]},
        {"$set": update},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    doc = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    return doc


# ============================================================
# 💚 Alinma Student Wallet
# ============================================================
import random

DEFAULT_SCHOLARSHIP = 990.0  # SAR — typical Saudi student monthly stipend

CATEGORY_DEFS = [
    {"key": "food", "name": "طعام ومشروبات", "icon": "utensils", "color": "#f59e0b"},
    {"key": "transport", "name": "مواصلات", "icon": "car", "color": "#0ea5e9"},
    {"key": "education", "name": "تعليم ودورات", "icon": "graduation-cap", "color": "#6d4dff"},
    {"key": "books", "name": "كتب ومراجع", "icon": "book", "color": "#ec4899"},
    {"key": "entertainment", "name": "ترفيه", "icon": "gamepad", "color": "#a855f7"},
    {"key": "other", "name": "مصروفات أخرى", "icon": "more-horizontal", "color": "#94a3b8"},
]

STUDENT_OFFERS = [
    {"id": "off-noon", "brand": "نون", "title": "خصم 15% للطلاب", "desc": "خصم على الإلكترونيات والمستلزمات الدراسية", "discount": "15%", "tag": "تكنولوجيا", "color": "#FFE600", "code": "STUDENT15"},
    {"id": "off-jarir", "brand": "مكتبة جرير", "title": "10% على الكتب الجامعية", "desc": "كتب أكاديمية + قرطاسية", "discount": "10%", "tag": "كتب", "color": "#003E7E", "code": "NABD-JARIR"},
    {"id": "off-careem", "brand": "كريم", "title": "20 ر.س لأول 3 رحلات", "desc": "للطلاب الجامعيين فقط", "discount": "20 ر.س", "tag": "مواصلات", "color": "#0fa54a", "code": "STUDENT20"},
    {"id": "off-shahid", "brand": "شاهد VIP", "title": "اشتراك شهري بنصف السعر", "desc": "محتوى تعليمي وترفيهي حصري", "discount": "50%", "tag": "ترفيه", "color": "#0ea5e9", "code": "NABDSHAHID"},
    {"id": "off-jollibee", "brand": "ماكدونالدز", "title": "وجبة الطالب بسعر مميز", "desc": "ساندوتش + شراب بـ 15 ر.س", "discount": "خاص", "tag": "طعام", "color": "#FFCB00", "code": "STDMEAL"},
    {"id": "off-coursera", "brand": "كورسيرا", "title": "كورس مجاني مع شهادة", "desc": "أكثر من 200 شهادة احترافية", "discount": "مجاناً", "tag": "تعليم", "color": "#0056D2", "code": "NABDFREE"},
]

REWARD_LEVELS = [
    {"key": "bronze", "name": "برونزي", "min_points": 0, "color": "#cd7f32"},
    {"key": "silver", "name": "فضي", "min_points": 200, "color": "#94a3b8"},
    {"key": "gold", "name": "ذهبي", "min_points": 500, "color": "#d4af37"},
    {"key": "platinum", "name": "بلاتيني", "min_points": 1000, "color": "#10b981"},
]

REWARDS_CATALOG = [
    {"id": "rw-coffee", "title": "كوب قهوة مجاني", "cost": 50, "icon": "coffee", "partner": "ستاربكس"},
    {"id": "rw-cinema", "title": "تذكرة سينما", "cost": 150, "icon": "film", "partner": "VOX Cinemas"},
    {"id": "rw-amazon", "title": "بطاقة أمازون 50 ر.س", "cost": 250, "icon": "gift", "partner": "أمازون"},
    {"id": "rw-airpods", "title": "خصم 100 ر.س على إكسسوارات", "cost": 400, "icon": "headphones", "partner": "إكسترا"},
    {"id": "rw-trip", "title": "رحلة طلابية مدعومة", "cost": 800, "icon": "plane", "partner": "STC Travel"},
]


def _level_from_points(points: int) -> dict:
    current = REWARD_LEVELS[0]
    nxt = None
    for i, lvl in enumerate(REWARD_LEVELS):
        if points >= lvl["min_points"]:
            current = lvl
            nxt = REWARD_LEVELS[i + 1] if i + 1 < len(REWARD_LEVELS) else None
    progress = 100
    to_next = 0
    if nxt:
        span = nxt["min_points"] - current["min_points"]
        in_span = points - current["min_points"]
        progress = round((in_span / span) * 100) if span else 0
        to_next = nxt["min_points"] - points
    return {
        "current": current,
        "next": nxt,
        "progress": max(0, min(100, progress)),
        "to_next": max(0, to_next),
    }


def _seed_wallet_for(student) -> dict:
    """Create a deterministic, persona-aware wallet for a seeded student."""
    sid = student["student_id"]
    rng = random.Random(sid)

    # Persona-specific defaults keyed by seeded student_id
    personas = {
        # سارة (Top CS student) — well-balanced, big saver
        "S1001": {
            "balance_range": (2400, 3200),
            "points_range": (450, 650),
            "samples": [
                ("education", -149.0, "كورس Python — يوديمي"),
                ("books", -85.0, "كتاب هياكل البيانات"),
                ("food", -32.0, "كافيه الجامعة"),
                ("transport", -22.0, "كريم — المختبر"),
                ("education", -75.0, "كتاب SQL"),
                ("entertainment", -19.0, "اشتراك Spotify Student"),
                ("books", -42.0, "قرطاسية وأقلام"),
                ("food", -28.5, "وجبة بين المحاضرات"),
            ],
            "budget": {"food": 280, "transport": 180, "education": 350, "books": 250, "entertainment": 100, "other": 150},
            "goal": {"title": "MacBook للبرمجة", "target": 6500, "saved": 1850, "monthly": 400, "color": "#00865A"},
        },
        # محمد (EE struggling) — overspending, low saving
        "S1002": {
            "balance_range": (300, 800),
            "points_range": (40, 120),
            "samples": [
                ("entertainment", -89.0, "PlayStation Store"),
                ("food", -68.0, "ماكدونالدز"),
                ("transport", -45.0, "أوبر — العودة المتأخرة"),
                ("entertainment", -55.0, "تذكرة سينما + بوبكورن"),
                ("food", -52.0, "كنتاكي"),
                ("entertainment", -49.0, "اشتراك Netflix"),
                ("other", -120.0, "ملابس"),
                ("food", -38.0, "كافيه ستاربكس"),
                ("transport", -28.0, "كريم"),
            ],
            "budget": {"food": 300, "transport": 200, "education": 200, "books": 100, "entertainment": 150, "other": 200},
            "goal": {"title": "إصلاح اللاب توب", "target": 1200, "saved": 180, "monthly": 150, "color": "#f59e0b"},
        },
        # ريم (Business student) — moderate, balanced
        "S1003": {
            "balance_range": (1400, 2200),
            "points_range": (220, 380),
            "samples": [
                ("education", -199.0, "Coursera — تسويق رقمي"),
                ("books", -125.0, "كتاب Strategic Management"),
                ("food", -45.0, "مطعم ايطالي مع زميلات"),
                ("transport", -32.0, "أوبر للمكتبة"),
                ("entertainment", -38.0, "اشتراك LinkedIn Premium"),
                ("food", -28.0, "كافيه دراسة"),
                ("books", -55.0, "تقارير حالات تسويقية"),
                ("other", -75.0, "حقيبة لاب توب"),
            ],
            "budget": {"food": 350, "transport": 200, "education": 300, "books": 200, "entertainment": 120, "other": 200},
            "goal": {"title": "حقيبة عمل + شهادة CMA", "target": 3500, "saved": 920, "monthly": 350, "color": "#6d4dff"},
        },
        # خالد (Civil Engineering — at risk) — financially stressed
        "S1004": {
            "balance_range": (120, 450),
            "points_range": (20, 80),
            "samples": [
                ("food", -85.0, "وجبات سريعة متكررة"),
                ("entertainment", -120.0, "ألعاب جوال (Top-up)"),
                ("food", -52.0, "ماكدونالدز"),
                ("transport", -48.0, "أوبر — تأخر للمحاضرة"),
                ("entertainment", -75.0, "تذكرة سينما"),
                ("other", -180.0, "إكسسوارات جوال"),
                ("food", -42.0, "ديليفري بيتزا"),
                ("books", -28.0, "كتاب فيزياء (متأخر)"),
                ("transport", -35.0, "كريم"),
            ],
            "budget": {"food": 280, "transport": 200, "education": 250, "books": 150, "entertainment": 100, "other": 200},
            "goal": {"title": "صندوق طوارئ", "target": 1000, "saved": 95, "monthly": 100, "color": "#ef4444"},
        },
        # ليان (Graphic Design — high performer) — creative spending
        "S1005": {
            "balance_range": (1800, 2800),
            "points_range": (550, 720),
            "samples": [
                ("education", -245.0, "Adobe Creative Cloud — اشتراك"),
                ("books", -180.0, "كتاب UI/UX Design"),
                ("education", -159.0, "كورس Figma — Coursera"),
                ("food", -38.0, "كافيه فني"),
                ("entertainment", -45.0, "معرض فني"),
                ("books", -95.0, "كتب تصميم جرافيك"),
                ("transport", -25.0, "كريم — استوديو"),
                ("food", -32.0, "وجبة صحية"),
                ("other", -110.0, "أدوات رسم"),
            ],
            "budget": {"food": 250, "transport": 150, "education": 400, "books": 300, "entertainment": 150, "other": 250},
            "goal": {"title": "تابلت Wacom احترافي", "target": 3800, "saved": 2200, "monthly": 450, "color": "#ec4899"},
        },
    }

    persona = personas.get(sid, {
        "balance_range": (800, 2500),
        "points_range": (80, 400),
        "samples": [
            ("food", -32.0, "كافيه الجامعة"),
            ("transport", -22.0, "كريم"),
            ("education", -149.0, "دورة أونلاين"),
            ("books", -65.0, "كتاب جامعي"),
            ("entertainment", -38.0, "اشتراك ترفيهي"),
            ("food", -28.0, "وجبة سريعة"),
            ("other", -45.0, "متفرقات"),
            ("transport", -18.0, "مواصلات"),
        ],
        "budget": {"food": 320, "transport": 200, "education": 250, "books": 180, "entertainment": 130, "other": 200},
        "goal": {"title": "هدف ادخار شخصي", "target": 2500, "saved": 500, "monthly": 250, "color": "#00865A"},
    })

    balance = round(rng.uniform(*persona["balance_range"]), 2)
    points = rng.randint(*persona["points_range"])

    today = datetime.now(timezone.utc)
    transactions = []
    samples = list(persona["samples"])
    rng.shuffle(samples)
    for i, (cat, amount, label) in enumerate(samples):
        adj = round(amount + rng.uniform(-3, 3), 2)
        transactions.append({
            "id": str(uuid.uuid4()),
            "label": label,
            "category": cat,
            "amount": adj,
            "type": "expense",
            "created_at": (today - timedelta(days=i + 1, hours=rng.randint(0, 22))).isoformat(),
        })
    transactions.insert(0, {
        "id": str(uuid.uuid4()),
        "label": "إيداع المنحة الشهرية",
        "category": "income",
        "amount": DEFAULT_SCHOLARSHIP,
        "type": "income",
        "created_at": (today - timedelta(days=2)).isoformat(),
    })

    budget = []
    for c in CATEGORY_DEFS:
        spent = sum(abs(t["amount"]) for t in transactions if t["category"] == c["key"])
        budget.append({
            "key": c["key"], "name": c["name"], "icon": c["icon"], "color": c["color"],
            "limit": persona["budget"].get(c["key"], 200),
            "spent": round(spent, 2),
        })

    g = persona["goal"]
    goals = [{
        "id": str(uuid.uuid4()),
        "title": g["title"],
        "target": float(g["target"]),
        "saved": float(g["saved"]),
        "monthly_contribution": float(g["monthly"]),
        "icon": "laptop",
        "color": g["color"],
        "created_at": today.isoformat(),
    }]

    return {
        "id": str(uuid.uuid4()),
        "student_id": sid,
        "balance": balance,
        "monthly_scholarship": DEFAULT_SCHOLARSHIP,
        "transactions": transactions,
        "budget": budget,
        "savings_goals": goals,
        "rewards_points": points,
        "created_at": today.isoformat(),
        "updated_at": today.isoformat(),
    }


async def _get_or_create_wallet(student) -> dict:
    doc = await db.wallets.find_one({"student_id": student["student_id"]}, {"_id": 0})
    if doc:
        return doc
    new_doc = _seed_wallet_for(student)
    await db.wallets.insert_one(new_doc)
    new_doc.pop("_id", None)
    return new_doc


def _financial_health(wallet: dict) -> dict:
    income = wallet["monthly_scholarship"]
    # total budget spent
    total_spent = sum(b["spent"] for b in wallet["budget"])
    total_limit = sum(b["limit"] for b in wallet["budget"])
    saved_in_goals = sum(g["saved"] for g in wallet["savings_goals"])

    # Components (0-100 each)
    savings_rate = min(100, (saved_in_goals / max(1, income * 6)) * 100)  # vs 6 months income
    budget_adherence = max(0, 100 - max(0, (total_spent - total_limit) / max(1, total_limit) * 100))
    if total_spent < total_limit * 0.5:
        budget_adherence = min(100, budget_adherence + 10)  # bonus for under-spending
    balance_health = min(100, (wallet["balance"] / max(1, income)) * 50)  # cap at 2 months income
    emergency = 100 if wallet["balance"] >= income else round((wallet["balance"] / income) * 100)

    score = round(0.30 * savings_rate + 0.30 * budget_adherence + 0.25 * balance_health + 0.15 * emergency)
    score = max(0, min(100, score))

    if score >= 80:
        label = "ممتاز"
        tone = "excellent"
    elif score >= 60:
        label = "جيد"
        tone = "good"
    elif score >= 40:
        label = "متوسط"
        tone = "fair"
    else:
        label = "يحتاج تحسين"
        tone = "poor"

    return {
        "score": score,
        "label": label,
        "tone": tone,
        "components": {
            "savings_rate": round(savings_rate),
            "budget_adherence": round(budget_adherence),
            "balance_health": round(balance_health),
            "emergency_fund": round(emergency),
        },
    }


def _enrich(wallet: dict) -> dict:
    """Add computed fields: financial_health, rewards level, summary."""
    health = _financial_health(wallet)
    level_info = _level_from_points(wallet["rewards_points"])
    income = wallet["monthly_scholarship"]
    total_spent = sum(b["spent"] for b in wallet["budget"])
    saved = sum(g["saved"] for g in wallet["savings_goals"])
    return {
        **wallet,
        "categories": CATEGORY_DEFS,
        "financial_health": health,
        "rewards": {
            "points": wallet["rewards_points"],
            "level": level_info,
            "catalog": REWARDS_CATALOG,
        },
        "offers": STUDENT_OFFERS,
        "summary": {
            "income": income,
            "spent": round(total_spent, 2),
            "saved": round(saved, 2),
            "remaining": round(income - total_spent, 2),
            "savings_rate_pct": round((saved / max(1, income * 6)) * 100, 1),
        },
    }


class SavingsGoalIn(BaseModel):
    title: str
    target: float
    monthly_contribution: float = 200.0
    icon: str = "target"
    color: str = "#00865A"


class GoalDepositIn(BaseModel):
    amount: float


class WalletCoachIn(BaseModel):
    question: Optional[str] = None  # if None → general weekly advice


@api_router.get("/wallet/me")
async def get_wallet(student=Depends(get_current_student)):
    wallet = await _get_or_create_wallet(student)
    return _enrich(wallet)


@api_router.post("/wallet/goal")
async def create_goal(body: SavingsGoalIn, student=Depends(get_current_student)):
    if body.target <= 0:
        raise HTTPException(status_code=400, detail="هدف غير صالح")
    if not body.title.strip():
        raise HTTPException(status_code=400, detail="عنوان الهدف مطلوب")
    # Ensure wallet exists (auto-create on first use)
    await _get_or_create_wallet(student)
    goal = {
        "id": str(uuid.uuid4()),
        "title": body.title.strip(),
        "target": round(float(body.target), 2),
        "saved": 0.0,
        "monthly_contribution": round(float(body.monthly_contribution), 2),
        "icon": body.icon or "target",
        "color": body.color or "#00865A",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wallets.update_one(
        {"student_id": student["student_id"]},
        {"$push": {"savings_goals": goal}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return goal


@api_router.post("/wallet/goal/{goal_id}/deposit")
async def deposit_goal(goal_id: str, body: GoalDepositIn, student=Depends(get_current_student)):
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")
    wallet = await _get_or_create_wallet(student)
    if body.amount > wallet["balance"]:
        raise HTTPException(status_code=400, detail="الرصيد غير كافٍ")
    target_goal = next((g for g in wallet["savings_goals"] if g["id"] == goal_id), None)
    if not target_goal:
        raise HTTPException(status_code=404, detail="الهدف غير موجود")

    new_saved = round(target_goal["saved"] + body.amount, 2)
    new_balance = round(wallet["balance"] - body.amount, 2)
    txn = {
        "id": str(uuid.uuid4()),
        "label": f"تحويل لهدف: {target_goal['title']}",
        "category": "savings",
        "amount": -round(float(body.amount), 2),
        "type": "transfer",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.wallets.update_one(
        {"student_id": student["student_id"], "savings_goals.id": goal_id},
        {
            "$set": {
                "savings_goals.$.saved": new_saved,
                "balance": new_balance,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            "$push": {"transactions": {"$each": [txn], "$position": 0, "$slice": 30}},
            "$inc": {"rewards_points": 5},
        },
    )
    return {"ok": True, "goal_saved": new_saved, "balance": new_balance, "transaction": txn}


@api_router.delete("/wallet/goal/{goal_id}")
async def delete_goal(goal_id: str, student=Depends(get_current_student)):
    res = await db.wallets.update_one(
        {"student_id": student["student_id"]},
        {"$pull": {"savings_goals": {"id": goal_id}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="الهدف غير موجود")
    return {"ok": True}


@api_router.post("/wallet/coach")
async def wallet_ai_coach(body: WalletCoachIn, student=Depends(get_current_student)):
    wallet = await _get_or_create_wallet(student)
    enriched = _enrich(wallet)
    summary = enriched["summary"]
    health = enriched["financial_health"]

    budget_text = "\n".join(
        f"- {b['name']}: أنفقت {b['spent']:.0f} من {b['limit']:.0f} ر.س"
        for b in wallet["budget"]
    )
    goals_text = "\n".join(
        f"- {g['title']}: تم ادخار {g['saved']:.0f} من {g['target']:.0f} ر.س (شهرياً {g['monthly_contribution']:.0f})"
        for g in wallet["savings_goals"]
    ) or "لا توجد أهداف ادخار حالياً."

    user_q = (body.question or "").strip()
    base_context = f"""بيانات الطالب المالية:
- الرصيد المتاح: {wallet['balance']:.0f} ر.س
- المنحة الشهرية: {wallet['monthly_scholarship']:.0f} ر.س
- مجموع المصروفات هذا الشهر: {summary['spent']:.0f} ر.س
- مجموع الادخار في الأهداف: {summary['saved']:.0f} ر.س
- درجة الصحة المالية: {health['score']}/100 ({health['label']})

تفصيل الميزانية:
{budget_text}

أهداف الادخار:
{goals_text}
"""

    if user_q:
        prompt = base_context + f"\n\nسؤال الطالب: {user_q}\n\nأجب بإجابة قصيرة عملية ومخصصة بناءً على بياناته."
    else:
        prompt = base_context + """

اكتب نصيحة مالية أسبوعية ومخصصة بصيغة JSON صالحة فقط (بدون أي شرح خارجي):
{
  "summary": "ملخص حالة الطالب المالية (سطرين كحد أقصى)",
  "wins": ["إنجاز إيجابي 1", "إنجاز 2"],
  "improvements": ["مجال للتحسين 1", "مجال 2"],
  "tips": [
    {"title": "عنوان", "advice": "نصيحة محددة قابلة للتنفيذ"},
    {"title": "...", "advice": "..."}
  ],
  "next_goal_suggestion": "اقتراح بهدف ادخار جديد",
  "motivational": "رسالة قصيرة محفزة"
}
أعطِ 3-4 نصائح. اربط النصائح بأرقام فعلية من بياناته."""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        system_msg = (
            "أنت 'كوتش مالي ذكي' في محفظة الإنماء للطلاب. تتحدث العربية بطلاقة. "
            "تقدم نصائح عملية ومحددة بناءً على بيانات الطالب الفعلية. "
            "كن ودوداً، مشجعاً، وأرفق أرقاماً عند الإمكان. "
            + ("ترد بـ JSON صالح فقط." if not user_q else "أجب بنص عربي طبيعي.")
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"nabd-wallet-{student['student_id']}-{uuid.uuid4().hex[:6]}",
            system_message=system_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        response = await chat.send_message(UserMessage(text=prompt))
        text = response if isinstance(response, str) else str(response)
        if user_q:
            return {"source": "ai", "type": "chat", "reply": text.strip()}
        # JSON-mode weekly advice
        import re
        import json
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            raise ValueError("No JSON in response")
        data = json.loads(m.group(0))
        return {"source": "ai", "type": "advice", "data": data}
    except Exception as e:
        logger.error(f"Wallet coach error: {e}")
        return {"source": "fallback", "type": "chat" if user_q else "advice", "data": _wallet_fallback(enriched), "reply": _wallet_simple_reply(user_q, enriched)}


def _wallet_simple_reply(q, enriched):
    if not q:
        return ""
    q = q.strip()
    s = enriched["summary"]
    if "ادخار" in q or "ادخر" in q or "حفظ" in q:
        return f"الادخار الحالي {s['saved']:.0f} ر.س. لو خصصت 200 ر.س شهرياً، هتقدر تشتري لابتوب بـ 4500 خلال 18 شهر تقريباً."
    if "ميزانية" in q or "أصرف" in q or "صرف" in q:
        over = [b for b in enriched["budget"] if b["spent"] > b["limit"]]
        if over:
            return f"تجاوزت ميزانيتك في {over[0]['name']} بـ {over[0]['spent']-over[0]['limit']:.0f} ر.س. حاول تقلل في هذي الفئة الشهر القادم."
        return f"ميزانيتك متوازنة: أنفقت {s['spent']:.0f} من المنحة {s['income']:.0f}."
    return f"محفظتك في حالة {enriched['financial_health']['label']} ({enriched['financial_health']['score']}/100). اسألني عن الميزانية أو الادخار وأنا أساعدك."


def _wallet_fallback(enriched):
    s = enriched["summary"]
    health = enriched["financial_health"]
    over = [b for b in enriched["budget"] if b["spent"] > b["limit"]]
    wins = []
    improvements = []
    if s["saved"] > 0:
        wins.append(f"بدأت الادخار بـ {s['saved']:.0f} ر.س — خطوة ممتازة!")
    if s["remaining"] > 0:
        wins.append(f"يتبقى لديك {s['remaining']:.0f} ر.س من ميزانية الشهر.")
    if not wins:
        wins.append("التزامك بمتابعة محفظتك خطوة ذكية بحد ذاتها.")
    if over:
        improvements.append(f"تجاوزت ميزانية {over[0]['name']} — حاول تقلّلها 20% الشهر القادم.")
    if s["saved"] / max(1, s["income"]) < 0.2:
        improvements.append("نسبة ادخارك منخفضة، اهدف لـ 20% من المنحة شهرياً.")
    if not improvements:
        improvements.append("استمر على نفس الوتيرة وفكر بإضافة هدف ادخار جديد.")

    return {
        "summary": f"صحتك المالية: {health['label']} ({health['score']}/100).",
        "wins": wins,
        "improvements": improvements,
        "tips": [
            {"title": "قاعدة 50/30/20", "advice": "50% للضروريات، 30% للرغبات، 20% للادخار."},
            {"title": "تتبع يومي", "advice": "افتح المحفظة كل يوم وراجع المعاملات لتجنّب المفاجآت."},
            {"title": "استفد من العروض", "advice": "استخدم عروض الطلاب لخفض المصاريف الثابتة."},
        ],
        "next_goal_suggestion": "ابدأ بهدف 'صندوق طوارئ' بقيمة 1000 ر.س.",
        "motivational": "كل ريال تدّخره اليوم = حرية أكبر غداً 💚",
    }


@api_router.get("/wallet/offers")
async def list_offers(student=Depends(get_current_student)):
    _ = student
    return {"offers": STUDENT_OFFERS}




# ============================================================
# 🎓 Development Center — programs catalog from leading orgs
# ============================================================
DEV_CATEGORIES = [
    {"key": "ai", "name": "ذكاء اصطناعي", "color": "#6d4dff"},
    {"key": "data", "name": "علم البيانات", "color": "#0ea5e9"},
    {"key": "cyber", "name": "الأمن السيبراني", "color": "#ef4444"},
    {"key": "cloud", "name": "الحوسبة السحابية", "color": "#06b6d4"},
    {"key": "programming", "name": "البرمجة", "color": "#10b981"},
    {"key": "business", "name": "إدارة الأعمال", "color": "#f59e0b"},
    {"key": "design", "name": "التصميم وتجربة المستخدم", "color": "#ec4899"},
    {"key": "leadership", "name": "القيادة وريادة الأعمال", "color": "#a855f7"},
]

DEV_PROVIDERS = [
    {"key": "tuwaiq", "name": "أكاديمية طويق", "name_en": "Tuwaiq Academy", "color": "#003B7E", "logo": "T", "desc": "بوت كامبات ودورات مكثفة في التقنية."},
    {"key": "misk", "name": "مؤسسة مسك", "name_en": "Misk Foundation", "color": "#00766B", "logo": "م", "desc": "برامج قيادية، منح دراسية، وريادة أعمال."},
    {"key": "sdaia", "name": "سدايا", "name_en": "SDAIA", "color": "#1B3A6B", "logo": "S", "desc": "مبادرات الذكاء الاصطناعي والبيانات والمسابقات."},
    {"key": "google", "name": "Google Career Certificates", "name_en": "Google", "color": "#4285F4", "logo": "G", "desc": "شهادات احترافية معترف بها عالمياً."},
    {"key": "cisco", "name": "Cisco Networking Academy", "name_en": "Cisco", "color": "#1BA0D7", "logo": "C", "desc": "تأهيل احترافي في الشبكات والأمن."},
    {"key": "microsoft", "name": "Microsoft Learn", "name_en": "Microsoft Learn", "color": "#0078D4", "logo": "M", "desc": "مسارات Azure، AI، تطوير برمجيات."},
]

DEV_PROGRAMS = [
    # Tuwaiq
    {"id": "tw-ai-bootcamp", "provider": "tuwaiq", "title": "معسكر الذكاء الاصطناعي التطبيقي", "category": "ai", "duration": "12 أسبوع", "level": "متقدم", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب", "هندسة كهربائية"], "url": "https://tuwaiq.edu.sa/"},
    {"id": "tw-fullstack", "provider": "tuwaiq", "title": "Full-Stack Web Development", "category": "programming", "duration": "16 أسبوع", "level": "متوسط", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب"], "url": "https://tuwaiq.edu.sa/"},
    {"id": "tw-cyber", "provider": "tuwaiq", "title": "بوت كامب الأمن السيبراني", "category": "cyber", "duration": "14 أسبوع", "level": "متقدم", "status": "soon", "price": "مجاناً", "majors": ["علوم الحاسب", "هندسة كهربائية"], "url": "https://tuwaiq.edu.sa/"},
    {"id": "tw-data", "provider": "tuwaiq", "title": "علم البيانات وتحليلها بـ Python", "category": "data", "duration": "10 أسابيع", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب", "إدارة أعمال"], "url": "https://tuwaiq.edu.sa/"},
    # Misk
    {"id": "misk-leaders", "provider": "misk", "title": "برنامج قادة المستقبل", "category": "leadership", "duration": "6 أشهر", "level": "متوسط", "status": "open", "price": "ممول بالكامل", "majors": ["إدارة أعمال", "علوم الحاسب", "هندسة مدنية"], "url": "https://misk.org.sa/"},
    {"id": "misk-entrepreneur", "provider": "misk", "title": "مسرّعة مسك لرواد الأعمال", "category": "leadership", "duration": "12 أسبوع", "level": "متقدم", "status": "open", "price": "ممول", "majors": ["إدارة أعمال", "تصميم جرافيك"], "url": "https://misk.org.sa/"},
    {"id": "misk-scholarship", "provider": "misk", "title": "منحة مسك الدراسية للماجستير", "category": "business", "duration": "2 سنة", "level": "خريج", "status": "soon", "price": "ممول بالكامل", "majors": ["إدارة أعمال", "علوم الحاسب", "هندسة كهربائية"], "url": "https://misk.org.sa/"},
    # SDAIA
    {"id": "sdaia-academy", "provider": "sdaia", "title": "أكاديمية سدايا للذكاء الاصطناعي", "category": "ai", "duration": "8 أسابيع", "level": "متوسط", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب", "هندسة كهربائية"], "url": "https://sdaia.gov.sa/"},
    {"id": "sdaia-datathon", "provider": "sdaia", "title": "مسابقة Datathon الوطنية", "category": "data", "duration": "أسبوعان", "level": "متقدم", "status": "open", "price": "جوائز قيمة", "majors": ["علوم الحاسب", "إدارة أعمال"], "url": "https://sdaia.gov.sa/"},
    {"id": "sdaia-ethics", "provider": "sdaia", "title": "أخلاقيات الذكاء الاصطناعي", "category": "ai", "duration": "3 أسابيع", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب", "إدارة أعمال"], "url": "https://sdaia.gov.sa/"},
    # Google
    {"id": "g-data-analytics", "provider": "google", "title": "Google Data Analytics Certificate", "category": "data", "duration": "6 أشهر", "level": "مبتدئ", "status": "open", "price": "اشتراك Coursera", "majors": ["إدارة أعمال", "علوم الحاسب"], "url": "https://grow.google/"},
    {"id": "g-it-support", "provider": "google", "title": "Google IT Support Certificate", "category": "programming", "duration": "5 أشهر", "level": "مبتدئ", "status": "open", "price": "اشتراك Coursera", "majors": ["علوم الحاسب"], "url": "https://grow.google/"},
    {"id": "g-ux", "provider": "google", "title": "Google UX Design Certificate", "category": "design", "duration": "6 أشهر", "level": "مبتدئ", "status": "open", "price": "اشتراك Coursera", "majors": ["تصميم جرافيك", "علوم الحاسب"], "url": "https://grow.google/"},
    {"id": "g-pm", "provider": "google", "title": "Google Project Management Certificate", "category": "business", "duration": "6 أشهر", "level": "مبتدئ", "status": "open", "price": "اشتراك Coursera", "majors": ["إدارة أعمال", "هندسة مدنية"], "url": "https://grow.google/"},
    # Cisco
    {"id": "cisco-ccna", "provider": "cisco", "title": "CCNA — Routing & Switching", "category": "cloud", "duration": "70 ساعة", "level": "متقدم", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب", "هندسة كهربائية"], "url": "https://www.netacad.com/"},
    {"id": "cisco-cyber-essentials", "provider": "cisco", "title": "Cybersecurity Essentials", "category": "cyber", "duration": "30 ساعة", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب"], "url": "https://www.netacad.com/"},
    {"id": "cisco-iot", "provider": "cisco", "title": "Introduction to IoT", "category": "programming", "duration": "20 ساعة", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["هندسة كهربائية", "علوم الحاسب"], "url": "https://www.netacad.com/"},
    # Microsoft Learn
    {"id": "ms-az900", "provider": "microsoft", "title": "Azure Fundamentals (AZ-900)", "category": "cloud", "duration": "4 أسابيع", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب"], "url": "https://learn.microsoft.com/"},
    {"id": "ms-ai900", "provider": "microsoft", "title": "Azure AI Fundamentals (AI-900)", "category": "ai", "duration": "4 أسابيع", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب", "هندسة كهربائية"], "url": "https://learn.microsoft.com/"},
    {"id": "ms-dp900", "provider": "microsoft", "title": "Azure Data Fundamentals (DP-900)", "category": "data", "duration": "4 أسابيع", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب", "إدارة أعمال"], "url": "https://learn.microsoft.com/"},
    {"id": "ms-sc900", "provider": "microsoft", "title": "Security, Compliance & Identity (SC-900)", "category": "cyber", "duration": "5 أسابيع", "level": "مبتدئ", "status": "open", "price": "مجاناً", "majors": ["علوم الحاسب"], "url": "https://learn.microsoft.com/"},
]


def _enrich_program(p, favorites, completed):
    prov = next((x for x in DEV_PROVIDERS if x["key"] == p["provider"]), None)
    cat = next((x for x in DEV_CATEGORIES if x["key"] == p["category"]), None)
    return {
        **p,
        "provider_info": prov,
        "category_info": cat,
        "is_favorite": p["id"] in favorites,
        "is_completed": p["id"] in completed,
    }


async def _get_dev_state(student) -> dict:
    doc = await db.dev_state.find_one({"student_id": student["student_id"]}, {"_id": 0})
    if not doc:
        doc = {
            "student_id": student["student_id"],
            "favorites": [],
            "completed": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.dev_state.insert_one(doc)
        doc.pop("_id", None)
    doc.setdefault("favorites", [])
    doc.setdefault("completed", [])
    return doc


@api_router.get("/development/catalog")
async def dev_catalog(student=Depends(get_current_student)):
    state = await _get_dev_state(student)
    favorites = set(state["favorites"])
    completed = set(state["completed"])
    items = [_enrich_program(p, favorites, completed) for p in DEV_PROGRAMS]
    return {
        "providers": DEV_PROVIDERS,
        "categories": DEV_CATEGORIES,
        "programs": items,
        "favorites_count": len(favorites),
        "completed_count": len(completed),
    }


@api_router.post("/development/favorite/{program_id}")
async def toggle_favorite(program_id: str, student=Depends(get_current_student)):
    if not any(p["id"] == program_id for p in DEV_PROGRAMS):
        raise HTTPException(status_code=404, detail="Program not found")
    state = await _get_dev_state(student)
    favorites = set(state["favorites"])
    if program_id in favorites:
        favorites.discard(program_id)
        action = "removed"
    else:
        favorites.add(program_id)
        action = "added"
    await db.dev_state.update_one(
        {"student_id": student["student_id"]},
        {"$set": {"favorites": list(favorites), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"action": action, "favorites": list(favorites)}


@api_router.post("/development/complete/{program_id}")
async def mark_completed(program_id: str, student=Depends(get_current_student)):
    if not any(p["id"] == program_id for p in DEV_PROGRAMS):
        raise HTTPException(status_code=404, detail="Program not found")
    state = await _get_dev_state(student)
    completed = set(state["completed"])
    if program_id in completed:
        completed.discard(program_id)
        action = "uncompleted"
    else:
        completed.add(program_id)
        action = "completed"
    await db.dev_state.update_one(
        {"student_id": student["student_id"]},
        {"$set": {"completed": list(completed), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"action": action, "completed": list(completed)}


@api_router.post("/development/recommendations")
async def dev_recommendations(student=Depends(get_current_student)):
    profile = build_profile(student)
    state = await _get_dev_state(student)
    matching = [p for p in DEV_PROGRAMS if profile.major in p.get("majors", [])]

    prompt = f"""بيانات الطالب:
- التخصص: {profile.major} — السنة {profile.year}
- المعدل: {profile.gpa:.2f}/4 — مستوى المخاطرة: {profile.risk_level}

البرامج المتاحة (الأنسب لتخصصه):
{chr(10).join(f"- [{p['id']}] {p['title']} ({p['duration']}, مستوى {p['level']}, مزود {p['provider']})" for p in matching)}

اختر 3-5 برامج هي الأنسب لهذا الطالب. أجب بـ JSON صالح فقط بالشكل التالي بدون أي شرح خارجي:
{{
  "summary": "سطر واحد يلخص توجهك",
  "picks": [
    {{"id": "program_id_من_القائمة_أعلاه", "why": "سبب اختيار البرنامج للطالب (سطر واحد)"}},
    ...
  ]
}}"""

    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"nabd-dev-{profile.student_id}-{uuid.uuid4().hex[:6]}",
            system_message="أنت مستشار تطوير مسار مهني للطلاب الجامعيين في السعودية. ترد بـ JSON صالح فقط.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        text = await chat.send_message(UserMessage(text=prompt))
        text = text if isinstance(text, str) else str(text)
        import re
        import json
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            raise ValueError("no json")
        data = json.loads(m.group(0))
        # Enrich each pick with full program data
        favs = set(state["favorites"])
        done = set(state["completed"])
        enriched_picks = []
        for pick in data.get("picks", [])[:5]:
            p = next((x for x in DEV_PROGRAMS if x["id"] == pick.get("id")), None)
            if p:
                enriched_picks.append({**_enrich_program(p, favs, done), "why": pick.get("why", "")})
        if enriched_picks:
            return {"source": "ai", "summary": data.get("summary", ""), "picks": enriched_picks}
    except Exception as e:
        logger.error(f"Dev rec error: {e}")

    # Fallback: rule-based
    favs = set(state["favorites"])
    done = set(state["completed"])
    fallback_picks = [
        {**_enrich_program(p, favs, done), "why": f"يتماشى مع تخصص {profile.major}."}
        for p in matching[:4]
    ]
    return {
        "source": "fallback",
        "summary": f"اخترنا لك {len(fallback_picks)} برامج تناسب تخصص {profile.major}.",
        "picks": fallback_picks,
    }




app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await seed_students()
    await seed_advisor()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
