"""Backend tests for Pulse Auto-Pilot endpoints + regression on existing endpoints."""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "").rstrip("/")
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL must be set")
API = f"{BASE_URL}/api"

STUDENT_PW = "nabd1234"


@pytest.fixture(scope="module")
def student_token():
    r = requests.post(f"{API}/student/login", json={"student_id": "S1001", "password": STUDENT_PW})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(student_token):
    return {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}


@pytest.fixture(autouse=True)
def _reset_state(headers):
    # Ensure clean state before every test
    r = requests.post(f"{API}/autopilot/reset", headers=headers)
    assert r.status_code == 200
    yield


# ---------------- Auth guards ----------------
class TestAuthGuards:
    @pytest.mark.parametrize("path,method", [
        ("/autopilot/me", "get"),
        ("/autopilot/reset", "post"),
        ("/autopilot/purchase", "post"),
        ("/autopilot/settings", "post"),
        ("/autopilot/tick", "post"),
        ("/autopilot/ai-insight", "post"),
    ])
    def test_requires_auth(self, path, method):
        fn = getattr(requests, method)
        r = fn(f"{API}{path}", json={} if method == "post" else None)
        assert r.status_code == 401, f"{path} expected 401, got {r.status_code}"


# ---------------- /autopilot/me ----------------
class TestAutopilotMe:
    def test_seeds_wallet(self, headers):
        r = requests.get(f"{API}/autopilot/me", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert d["balance"] == 1000.0
        assert d["investment_wallet"] == 0.0
        assert d["autopilot_enabled"] is False
        assert d["autopilot_daily_amount"] == 1.0
        assert d["transactions"] == []
        assert isinstance(d["ai_logs"], list) and len(d["ai_logs"]) == 2

    def test_idempotent(self, headers):
        a = requests.get(f"{API}/autopilot/me", headers=headers).json()
        b = requests.get(f"{API}/autopilot/me", headers=headers).json()
        assert a["balance"] == b["balance"]
        assert a["student_id"] == b["student_id"]
        assert len(a["ai_logs"]) == len(b["ai_logs"])  # no new logs on GET


# ---------------- Purchase ----------------
class TestPurchase:
    def test_roundup_fractional(self, headers):
        r = requests.post(f"{API}/autopilot/purchase", headers=headers,
                          json={"amount": 13.40, "merchant": "Starbucks", "category": "قهوة"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["balance"] == 986.0
        assert d["investment_wallet"] == 0.6
        tx = d["transactions"][-1]
        assert tx["type"] == "purchase"
        assert tx["amount"] == 13.4
        assert tx["rounded"] == 14.0
        assert tx["round_up"] == 0.6
        # PURCHASE log line
        assert any("PURCHASE" in l for l in d["ai_logs"])

    def test_whole_riyal_no_roundup(self, headers):
        r = requests.post(f"{API}/autopilot/purchase", headers=headers,
                          json={"amount": 20.00, "merchant": "Test"})
        assert r.status_code == 200
        d = r.json()
        assert d["balance"] == 980.0
        assert d["investment_wallet"] == 0.0
        tx = d["transactions"][-1]
        assert tx["rounded"] == 20.0
        assert tx["round_up"] == 0.0

    def test_insufficient_balance(self, headers):
        # amount within Pydantic bounds (<=10000) but greater than starting balance 1000
        r = requests.post(f"{API}/autopilot/purchase", headers=headers, json={"amount": 5000})
        assert r.status_code == 400

    @pytest.mark.parametrize("bad", [0, -5, -0.01])
    def test_invalid_amount(self, headers, bad):
        r = requests.post(f"{API}/autopilot/purchase", headers=headers, json={"amount": bad})
        assert r.status_code == 422


# ---------------- Settings ----------------
class TestSettings:
    def test_update_valid(self, headers):
        r = requests.post(f"{API}/autopilot/settings", headers=headers,
                          json={"autopilot_enabled": True, "autopilot_daily_amount": 1.5})
        assert r.status_code == 200
        d = r.json()
        assert d["autopilot_enabled"] is True
        assert d["autopilot_daily_amount"] == 1.5

    @pytest.mark.parametrize("val", [0.1, 5.0, 0.24, 3.01])
    def test_reject_out_of_range(self, headers, val):
        r = requests.post(f"{API}/autopilot/settings", headers=headers,
                          json={"autopilot_enabled": True, "autopilot_daily_amount": val})
        assert r.status_code == 422


# ---------------- Tick ----------------
class TestTick:
    def test_tick_disabled(self, headers):
        r = requests.post(f"{API}/autopilot/tick", headers=headers)
        assert r.status_code == 400

    def test_tick_enabled(self, headers):
        # enable
        requests.post(f"{API}/autopilot/settings", headers=headers,
                      json={"autopilot_enabled": True, "autopilot_daily_amount": 1.5})
        r = requests.post(f"{API}/autopilot/tick", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert d["balance"] == 998.5
        assert d["investment_wallet"] == 1.5
        tx = d["transactions"][-1]
        assert tx["type"] == "autopilot"
        assert tx["amount"] == 1.5
        assert any("AUTOPILOT-TICK" in l for l in d["ai_logs"])

    def test_tick_insufficient(self, headers):
        # enable then drain balance
        requests.post(f"{API}/autopilot/settings", headers=headers,
                      json={"autopilot_enabled": True, "autopilot_daily_amount": 3.0})
        # drain: buy 1000 (whole) to hit balance=0
        requests.post(f"{API}/autopilot/purchase", headers=headers, json={"amount": 1000})
        r = requests.post(f"{API}/autopilot/tick", headers=headers)
        assert r.status_code == 400


# ---------------- AI Insight ----------------
class TestAIInsight:
    def test_ai_insight(self, headers):
        r = requests.post(f"{API}/autopilot/ai-insight", headers=headers, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "insight" in d and isinstance(d["insight"], str) and len(d["insight"]) > 3
        assert d["source"] in ("ai", "fallback")
        assert "state" in d
        assert any("AI-INSIGHT" in l for l in d["state"]["ai_logs"])


# ---------------- Reset ----------------
class TestReset:
    def test_reset_restores(self, headers):
        requests.post(f"{API}/autopilot/purchase", headers=headers, json={"amount": 13.4})
        r = requests.post(f"{API}/autopilot/reset", headers=headers)
        assert r.status_code == 200
        d = r.json()
        assert d["balance"] == 1000.0
        assert d["investment_wallet"] == 0.0
        assert d["transactions"] == []
        assert len(d["ai_logs"]) == 2


# ---------------- Regression on existing endpoints ----------------
class TestRegression:
    def test_student_me(self, headers):
        r = requests.get(f"{API}/student/me", headers=headers)
        assert r.status_code == 200
        assert r.json()["student_id"] == "S1001"

    def test_wallet_me(self, headers):
        r = requests.get(f"{API}/wallet/me", headers=headers)
        assert r.status_code == 200

    def test_dev_catalog(self, headers):
        r = requests.get(f"{API}/development/catalog", headers=headers)
        assert r.status_code == 200

    def test_contact(self):
        r = requests.get(f"{API}/contact")
        assert r.status_code == 200
        assert r.json()["project_name"] == "Nabd Assistant"

    def test_advisor_login(self):
        r = requests.post(f"{API}/advisor/login", json={"username": "advisor", "password": "nabd1234"})
        assert r.status_code == 200
        assert "token" in r.json()

    def test_student_login(self):
        r = requests.post(f"{API}/student/login", json={"student_id": "S1001", "password": "nabd1234"})
        assert r.status_code == 200
