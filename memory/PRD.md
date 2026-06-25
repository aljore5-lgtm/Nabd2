# Nabd Assistant — PRD

## Original problem statement
Nabd (نبض) is an Arabic-RTL academic early-warning AI platform for universities. Add to the existing platform without modifying current design/structure:
1. Student Portal — student login, profile, GPA, risk level (low/medium/high), attendance %, performance analytics, progress charts, personalized recommendations.
2. AI Student Assistant chatbot accessible from Student Portal (with voice input).
3. Academic Advisor Dashboard — view at-risk students, review performance, add intervention plans, track progress, manage appointments.
4. Contact section with developer info: **Aljory Mohammed Alaboud**, project **Nabd Assistant**.
5. Engagement features: achievements/badges, peer comparison, GPA what-if calculator, appointment booking.

## User personas
- **Student** — uses Student Portal to monitor academic health, earn badges, compare with peers, simulate GPA, book advisor appointments, chat with AI via text or voice.
- **Academic Advisor** — uses Advisor Dashboard to monitor all students, identify at-risk students, manage appointment requests, log intervention plans.
- **Visitor / Prospect** — explores landing page, reaches contact page.

## Architecture
- **Frontend**: React 19, React Router, Tailwind CSS, Recharts, Lucide. Arabic RTL. Font: Tajawal.
- **Backend**: FastAPI + Motor + PyJWT + bcrypt. AI via emergentintegrations (Claude Sonnet 4.5).
- **Voice input**: Web Speech API (`webkitSpeechRecognition`, lang `ar-SA`) — browser-native, no extra backend.
- **Storage**: MongoDB collections — `students`, `advisors`, `interventions`, `chat_messages`, `appointments`, `contact_messages`, `status_checks`.

## Core requirements
- Arabic-first RTL UI; primary color `#6d4dff`.
- Risk: `gpa < 2.0 OR attendance < 60 → high`.
- All endpoints under `/api`; env vars only (no hardcoding).
- Per-student stable session_id for chat memory.

## Implemented timeline

**Session 1 — Student Portal MVP (Jun 2026)**
- Student login (S1001..S1005 / `nabd1234`), JWT, profile + KPIs + Line/Bar/Radar charts, AI suggestions (Claude Sonnet 4.5 + rule fallback), landing/contact-light.

**Session 2 — Advisor + Chatbot + Contact**
- Advisor login (`advisor` / `nabd1234`), advisor dashboard with stats + risk distribution + searchable list, advisor student detail with intervention CRUD (priority, due_date, status). Floating AI chatbot (Claude Sonnet 4.5, persistent history). `/contact` page + landing contact section.

**Session 3 — Code Quality (post-review)**
- Test credentials moved to env. `compute_risk` defensively initialized. `useCallback` for hook deps. Stable React keys (no array-index). Nested ternaries extracted to `/lib/academic.js`. Console statements gated by `/lib/logger.js` (`devLog`). All lint clean, 20/20 backend tests pass.

**Session 4 — Engagement features (current)**
- 🏆 **Achievements**: 7 computed badges (perfect attendance, honor GPA, quiz champion, homework hero, study warrior, rising star, low risk) with earned/locked state and progress bars.
- 📊 **Peer comparison**: aggregated metrics (gpa, attendance, quiz, study hrs, assignments ratio) vs cohort/top-20%. Percentile + insight text. Bar chart + KPI cards.
- 🧮 **GPA What-if calculator**: client-side, weighted GPA from credits + grades, supports editing existing courses and adding hypothetical ones. Shows delta vs current GPA.
- 🗓️ **Appointments**: student books with date/duration/mode/reason; advisor sees queue, can Confirm/Reject/Complete; student can cancel pending/confirmed.
- 🎤 **Voice input for chatbot**: Web Speech API (`ar-SA`); mic toggle with animation; auto-fills text input; graceful fallback if unsupported.
- Backend endpoints added: `/student/achievements`, `/student/comparison`, `/student/appointments` (POST/GET/DELETE), `/advisor/appointments` (GET/PATCH).

## Backlog (P0/P1/P2)
- P1: Refactor `server.py` (~1000+ lines) into modules.
- P1: Reset AI chat session memory after history delete (currently only Mongo is cleared).
- P1: Migrate auth from `localStorage` → `httpOnly` cookies (touches CORS + CSRF).
- P2: Email/SMS notification when advisor confirms appointment or adds intervention.
- P2: Whisper STT fallback for browsers without Web Speech API.
- P2: Advisor analytics over time (GPA delta after intervention).
- P2: Bilingual EN/AR toggle.
- P2: TypeScript migration.

## Test credentials
- Students: `S1001..S1005` / `nabd1234`
- Advisor: `advisor` / `nabd1234`

## Frontend routes
- `/` and `/dashboard` — Landing
- `/student-login`, `/student-portal`
- `/advisor-login`, `/advisor-dashboard`, `/advisor-dashboard/student/:student_id`
- `/contact`
