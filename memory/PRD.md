# Nabd Assistant — PRD

## Original problem statement
Nabd (نبض) is an Arabic-RTL academic early-warning AI platform for universities. Add to the existing platform without modifying current design/structure:
1. Student Portal — student login, profile, GPA, risk level (low/medium/high), attendance %, performance analytics, progress charts, personalized recommendations.
2. AI Student Assistant chatbot accessible from Student Portal.
3. Academic Advisor Dashboard — view at-risk students, review performance, add intervention plans, track progress.
4. Contact section with developer info: **Aljory Mohammed Alaboud**, project **Nabd Assistant**.

## User personas
- **Student** — logs into the Student Portal to monitor academic health, get AI-generated recommendations, and chat with the AI assistant.
- **Academic Advisor** — uses the Advisor Dashboard to monitor all students, identify at-risk students, and log intervention plans.
- **Visitor / Prospect** — explores landing page, learns about the platform, can reach the contact page.

## Architecture
- **Frontend**: React 19 + React Router, Tailwind CSS, Recharts, Lucide icons. Arabic RTL throughout. Font: Tajawal.
- **Backend**: FastAPI (Python) + MongoDB (motor) + JWT (PyJWT) + bcrypt. AI via emergentintegrations (Claude Sonnet 4.5).
- **AI**: Emergent LLM Key — Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) for both `/api/student/ai-suggestions` and `/api/student/chat`. Per-student stable session_id for chat memory.
- **Storage**: collections — `students`, `advisors`, `interventions`, `chat_messages`, `contact_messages`, `status_checks`.

## Core requirements (static)
- Arabic-first RTL UI matching the original Nabd visual identity (light theme, purple/violet `#6d4dff`, soft cards).
- Risk computation deterministic with override: `gpa < 2.0 OR attendance < 60 → high`.
- Bilingual support optional. All UI strings currently Arabic.
- Endpoints under `/api` prefix.
- All env variables from `.env`. No hardcoding.

## Implemented (Jun 2026)
**Session 1 — Student Portal MVP**
- Student login (S1001..S1005 / `nabd1234`) with JWT.
- Student dashboard: profile card, risk card with score 0-100, KPIs (GPA, attendance, quiz avg, assignments), Line chart (trends), Bar chart (courses), Radar chart (performance), courses list.
- AI Suggestions section (`POST /api/student/ai-suggestions`) — Claude Sonnet 4.5; rule-based fallback if AI fails.
- Landing page + login routes.

**Session 2 — Advisor + Chatbot + Contact**
- Academic Advisor login (`advisor` / `nabd1234`) — separate JWT (role="advisor").
- Advisor dashboard with stats (total / high / medium / avg GPA), pie chart of risk distribution, bar chart of risk vs GPA, searchable + filterable student list sorted by risk_score desc.
- Advisor student detail with profile, trends/courses charts, intervention CRUD (title, note, priority, due_date, status: pending/in_progress/done).
- Student-side read-only view of advisor interventions on `/student-portal`.
- AI Chatbot floating launcher on Student Portal — Claude Sonnet 4.5 with persistent history (`chat_messages` collection), 4 quick prompts, clear-history (double-tap confirm), per-student session memory.
- Contact section on Landing (#contact) + dedicated `/contact` page with `Aljory Mohammed Alaboud` and `Nabd Assistant`. Public contact-message endpoint.
- Risk override fix — S1004 now correctly flagged HIGH (was MEDIUM in iter 1).
- Tested: 31/31 backend tests pass; all major frontend flows verified.

## What's been implemented
- Backend (`/app/backend/server.py`):
  - Students: `/student/login`, `/student/me`, `/student/demo-credentials`, `/student/ai-suggestions`, `/student/interventions`.
  - Chat: `/student/chat` (POST), `/student/chat/history` (GET, DELETE).
  - Advisor: `/advisor/login`, `/advisor/me`, `/advisor/students`, `/advisor/student/{id}`, `/advisor/intervention` (POST), `/advisor/student/{id}/interventions`, `/advisor/intervention/{id}` (PATCH).
  - Contact: `/contact` (GET info), `/contact/message` (POST).
- Frontend pages: `Landing`, `StudentLogin`, `StudentPortal`, `AdvisorLogin`, `AdvisorDashboard`, `AdvisorStudentDetail`, `Contact`. Component: `StudentChatbot`.

## Prioritized backlog (P0/P1/P2)
- P1: Refactor `server.py` into modules (`auth.py`, `ai.py`, `advisor_routes.py`, `student_routes.py`, `contact_routes.py`) — file is ~800 lines.
- P1: Reset AI session memory after chat history delete (currently only Mongo is cleared).
- P2: Email notification when advisor adds an intervention to a student.
- P2: Advisor analytics over time (interventions completed, GPA delta after intervention).
- P2: Bilingual EN/AR toggle for new pages (currently AR-only).
- P2: Suppress Recharts `width(-1)` console warnings (cosmetic).
- P2: Return plain arrays from list endpoints instead of `{interventions: [...]}` wrapper.

## Next tasks
1. Optionally split `server.py` and add tests for the refactor.
2. Consider an admin role (institution-level dashboard aggregating multiple advisors).
3. Wire up the existing landing-page voice bot CTA (currently feature card only).
