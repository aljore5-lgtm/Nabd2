"""Backend API tests for Nabd Student Portal."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://student-portal-1115.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def token_s1002(session):
    r = session.post(f"{API}/student/login", json={"student_id": "S1002", "password": "nabd1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


# --- Login ---
class TestLogin:
    def test_login_success(self, session):
        r = session.post(f"{API}/student/login", json={"student_id": "S1002", "password": "nabd1234"})
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 10
        assert body["student"]["student_id"] == "S1002"
        assert "name" in body["student"]

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/student/login", json={"student_id": "S1002", "password": "wrong"})
        assert r.status_code == 401
        # Arabic error message
        detail = r.json().get("detail", "")
        assert "كلمة" in detail or "غير" in detail

    def test_login_unknown_student(self, session):
        r = session.post(f"{API}/student/login", json={"student_id": "SXXXX", "password": "nabd1234"})
        assert r.status_code == 401


# --- /me ---
class TestMe:
    def test_me_without_token(self, session):
        r = requests.get(f"{API}/student/me")
        assert r.status_code == 401

    def test_me_with_token(self, session, token_s1002):
        r = requests.get(f"{API}/student/me", headers={"Authorization": f"Bearer {token_s1002}"})
        assert r.status_code == 200
        p = r.json()
        for key in ["gpa", "attendance", "risk_level", "risk_score", "courses",
                    "trends", "assignments_completed", "assignments_total",
                    "quiz_avg", "study_hours_weekly"]:
            assert key in p, f"missing {key}"
        assert p["risk_level"] in ("low", "medium", "high")
        assert 0 <= p["risk_score"] <= 100
        assert len(p["trends"]) == 4
        assert len(p["courses"]) >= 1
        c = p["courses"][0]
        for k in ["name", "code", "grade", "credits"]:
            assert k in c

    def test_me_invalid_token(self):
        r = requests.get(f"{API}/student/me", headers={"Authorization": "Bearer notavalidtoken"})
        assert r.status_code == 401


# --- Demo credentials ---
class TestDemoCreds:
    def test_demo_creds(self, session):
        r = session.get(f"{API}/student/demo-credentials")
        assert r.status_code == 200
        body = r.json()
        assert body.get("default_password") == "nabd1234"
        assert len(body.get("students", [])) == 5
        for s in body["students"]:
            assert "student_id" in s and "risk_hint" in s


# --- Risk computation ---
class TestRiskComputation:
    def _login(self, session, sid):
        r = session.post(f"{API}/student/login", json={"student_id": sid, "password": "nabd1234"})
        assert r.status_code == 200
        return r.json()["token"]

    def test_s1004_high_risk(self, session):
        t = self._login(session, "S1004")
        r = requests.get(f"{API}/student/me", headers={"Authorization": f"Bearer {t}"})
        assert r.status_code == 200
        assert r.json()["risk_level"] == "high"

    def test_s1001_low_risk(self, session):
        t = self._login(session, "S1001")
        r = requests.get(f"{API}/student/me", headers={"Authorization": f"Bearer {t}"})
        assert r.status_code == 200
        assert r.json()["risk_level"] == "low"


# --- AI suggestions ---
class TestAISuggestions:
    def test_ai_suggestions(self, token_s1002):
        r = requests.post(
            f"{API}/student/ai-suggestions",
            headers={"Authorization": f"Bearer {token_s1002}"},
            timeout=90,
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("source") in ("ai", "fallback")
        data = body.get("data", {})
        for k in ["summary", "strengths", "risks", "recommendations", "weekly_plan", "motivational_message"]:
            assert k in data, f"missing {k}"
        assert len(data["weekly_plan"]) == 7
        assert len(data["recommendations"]) >= 1

    def test_ai_suggestions_unauth(self):
        r = requests.post(f"{API}/student/ai-suggestions")
        assert r.status_code == 401
