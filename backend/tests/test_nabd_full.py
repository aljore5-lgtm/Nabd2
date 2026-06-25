"""End-to-end backend API tests for Nabd platform (Student Portal + Advisor + Chatbot + Contact)."""
import os
import time
import pytest
import requests

BASE_URL = (os.environ.get('REACT_APP_BACKEND_URL') or 'https://student-portal-1115.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# ============ Fixtures ============

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login_student(session, sid, password="nabd1234"):
    r = session.post(f"{API}/student/login", json={"student_id": sid, "password": password})
    assert r.status_code == 200, f"Login {sid} failed: {r.text}"
    return r.json()["token"]


def _login_advisor(session, username="advisor", password="nabd1234"):
    r = session.post(f"{API}/advisor/login", json={"username": username, "password": password})
    assert r.status_code == 200, f"Advisor login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def advisor_token(session):
    return _login_advisor(session)


@pytest.fixture(scope="module")
def s1003_token(session):
    return _login_student(session, "S1003")


# ============ Advisor Login ============
class TestAdvisorLogin:
    def test_login_success(self, session):
        r = session.post(f"{API}/advisor/login", json={"username": "advisor", "password": "nabd1234"})
        assert r.status_code == 200
        body = r.json()
        assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 10
        assert body.get("advisor", {}).get("username") == "advisor" or "advisor" in body

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/advisor/login", json={"username": "advisor", "password": "wrong"})
        assert r.status_code == 401


# ============ Advisor Students ============
class TestAdvisorStudents:
    def test_list_students_with_stats(self, session, advisor_token):
        r = requests.get(f"{API}/advisor/students", headers={"Authorization": f"Bearer {advisor_token}"})
        assert r.status_code == 200
        body = r.json()
        assert "students" in body and "stats" in body
        assert isinstance(body["students"], list) and len(body["students"]) >= 5
        # sorted by risk_score desc
        scores = [s["risk_score"] for s in body["students"]]
        assert scores == sorted(scores, reverse=True), f"Not sorted desc: {scores}"
        # S1004 must be high risk and ideally first
        s1004 = next(s for s in body["students"] if s["student_id"] == "S1004")
        assert s1004["risk_level"] == "high", f"S1004 should be high, got {s1004['risk_level']}"
        # stats
        stats = body["stats"]
        assert "high" in stats and "medium" in stats and "low" in stats
        assert stats["high"] >= 1

    def test_list_students_unauth(self):
        r = requests.get(f"{API}/advisor/students")
        assert r.status_code == 401

    def test_get_student_detail(self, advisor_token):
        r = requests.get(f"{API}/advisor/student/S1004", headers={"Authorization": f"Bearer {advisor_token}"})
        assert r.status_code == 200
        p = r.json()
        for k in ["student_id", "name", "gpa", "attendance", "risk_level", "courses", "trends"]:
            assert k in p
        assert p["student_id"] == "S1004"
        assert p["risk_level"] == "high"


# ============ Risk computation regression ============
class TestRiskRegression:
    @pytest.mark.parametrize("sid,expected", [
        ("S1001", "low"),
        ("S1002", "medium"),
        ("S1003", "low"),
        ("S1004", "high"),
        ("S1005", "low"),
    ])
    def test_risk_levels(self, session, sid, expected):
        token = _login_student(session, sid)
        r = requests.get(f"{API}/student/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        actual = r.json()["risk_level"]
        assert actual == expected, f"{sid}: expected {expected}, got {actual}"


# ============ Interventions ============
class TestInterventions:
    def test_create_intervention(self, session, advisor_token, s1003_token):
        payload = {
            "student_id": "S1003",
            "title": "TEST_اجتماع متابعة",
            "note": "TEST_تفاصيل المتابعة الأكاديمية",
            "priority": "high",
        }
        r = requests.post(
            f"{API}/advisor/intervention",
            json=payload,
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        assert "id" in body
        assert body.get("status") == "pending"
        assert body.get("priority") == "high"
        assert body.get("student_id") == "S1003"
        pytest.intervention_id = body["id"]

    def test_list_interventions_advisor(self, advisor_token):
        r = requests.get(
            f"{API}/advisor/student/S1003/interventions",
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("interventions", [])
        assert isinstance(items, list) and len(items) >= 1
        ids = [i["id"] for i in items]
        assert pytest.intervention_id in ids

    def test_student_can_see_interventions(self, s1003_token):
        r = requests.get(
            f"{API}/student/interventions",
            headers={"Authorization": f"Bearer {s1003_token}"},
        )
        assert r.status_code == 200
        data = r.json()
        items = data if isinstance(data, list) else data.get("interventions", [])
        assert isinstance(items, list) and len(items) >= 1
        ids = [i["id"] for i in items]
        assert pytest.intervention_id in ids

    def test_patch_status_valid(self, advisor_token):
        r = requests.patch(
            f"{API}/advisor/intervention/{pytest.intervention_id}",
            json={"status": "in_progress"},
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "in_progress"

    def test_patch_status_invalid(self, advisor_token):
        r = requests.patch(
            f"{API}/advisor/intervention/{pytest.intervention_id}",
            json={"status": "bogus"},
            headers={"Authorization": f"Bearer {advisor_token}"},
        )
        assert r.status_code == 400


# ============ Contact ============
class TestContact:
    def test_get_contact_info(self, session):
        r = session.get(f"{API}/contact")
        assert r.status_code == 200
        body = r.json()
        assert body.get("project_name") == "Nabd Assistant"
        assert body.get("developer") == "Aljory Mohammed Alaboud"
        assert "tagline" in body

    def test_post_contact_message(self, session):
        r = session.post(
            f"{API}/contact/message",
            json={"name": "TEST_user", "email": "test@example.com", "message": "TEST_رسالة"},
        )
        assert r.status_code == 200
        body = r.json()
        assert body.get("ok") is True


# ============ Chatbot (AI) - run last to minimise concurrent AI calls ============
class TestChatbot:
    def test_chat_history_clear_initial(self, s1003_token):
        # clear first to start clean
        r = requests.delete(
            f"{API}/student/chat/history",
            headers={"Authorization": f"Bearer {s1003_token}"},
        )
        assert r.status_code == 200
        r2 = requests.get(
            f"{API}/student/chat/history",
            headers={"Authorization": f"Bearer {s1003_token}"},
        )
        assert r2.status_code == 200
        assert r2.json() == [] or r2.json().get("messages") == []

    def test_chat_send_and_persist(self, s1003_token):
        r = requests.post(
            f"{API}/student/chat",
            json={"message": "كيف يمكنني تحسين معدلي؟"},
            headers={"Authorization": f"Bearer {s1003_token}"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "reply" in body and isinstance(body["reply"], str) and len(body["reply"]) > 3
        # source should be 'ai' (Claude); 'fallback' acceptable but flag
        assert body.get("source") in ("ai", "fallback")
        # history
        time.sleep(0.5)
        h = requests.get(
            f"{API}/student/chat/history",
            headers={"Authorization": f"Bearer {s1003_token}"},
        )
        assert h.status_code == 200
        msgs = h.json() if isinstance(h.json(), list) else h.json().get("messages", [])
        assert len(msgs) >= 2
        roles = [m.get("role") for m in msgs]
        assert "user" in roles and "assistant" in roles

    def test_chat_history_delete(self, s1003_token):
        r = requests.delete(
            f"{API}/student/chat/history",
            headers={"Authorization": f"Bearer {s1003_token}"},
        )
        assert r.status_code == 200
        r2 = requests.get(
            f"{API}/student/chat/history",
            headers={"Authorization": f"Bearer {s1003_token}"},
        )
        msgs = r2.json() if isinstance(r2.json(), list) else r2.json().get("messages", [])
        assert msgs == []
