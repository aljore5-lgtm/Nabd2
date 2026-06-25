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
    # Deterministic overrides for clearly failing students
    if gpa < 2.0 or attendance < 60:
        level = "high"
    elif gpa < 2.5 or attendance < 75 or score >= 50:
        level = "medium"
    elif score < 30:
        level = "low"
    else:
        level = "medium"
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
