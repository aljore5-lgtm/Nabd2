import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { advisorLogin, advisorAuth } from "@/lib/api";
import { ArrowLeft, KeyRound, ShieldCheck, AlertCircle, User } from "lucide-react";

export default function AdvisorLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (advisorAuth.token) navigate("/advisor-dashboard", { replace: true });
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await advisorLogin(username.trim(), password);
      navigate("/advisor-dashboard");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  function quickFill() {
    setUsername("advisor");
    setPassword("nabd1234");
  }

  return (
    <div dir="rtl" className="min-h-screen bg-grid" data-testid="advisor-login-page">
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between border-b border-[var(--nabd-border)] bg-white/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3" data-testid="back-home-link">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center font-extrabold text-lg">ن</div>
          <span className="text-2xl font-extrabold gradient-text">نبض</span>
        </Link>
        <Link to="/" className="text-sm font-bold text-[var(--nabd-text-soft)] hover:text-[var(--nabd-primary)] inline-flex items-center gap-1">
          <ArrowLeft size={16} /> الرئيسية
        </Link>
      </header>

      <main className="max-w-md mx-auto px-6 py-16">
        <div className="nabd-card p-8 md:p-10 fade-up">
          <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-5 text-[var(--nabd-primary)]">
            <ShieldCheck />
          </div>
          <h1 className="text-3xl font-black mb-2">دخول المرشد الأكاديمي</h1>
          <p className="text-[var(--nabd-text-soft)] mb-8">
            لوحة المرشد الأكاديمي: متابعة طلابك، مراجعة المخاطر، وإضافة خطط التدخل.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2">اسم المستخدم</label>
              <div className="relative">
                <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
                <input
                  data-testid="advisor-username-input"
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-10 py-3 focus:border-[var(--nabd-primary)] focus:outline-none transition text-base"
                  placeholder="advisor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">كلمة المرور</label>
              <div className="relative">
                <KeyRound size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
                <input
                  data-testid="advisor-password-input"
                  type="password"
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-10 py-3 focus:border-[var(--nabd-primary)] focus:outline-none transition text-base"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {err && (
              <div className="flex items-center gap-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3" data-testid="advisor-login-error">
                <AlertCircle size={16} /> {err}
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full gradient-btn px-6 py-3 rounded-xl font-bold disabled:opacity-60" data-testid="advisor-login-submit-btn">
              {loading ? "جارٍ الدخول..." : "دخول"}
            </button>
          </form>

          <button
            type="button"
            onClick={quickFill}
            className="mt-5 w-full text-sm font-bold text-[var(--nabd-primary)] underline-offset-4 hover:underline"
            data-testid="advisor-demo-fill-btn"
          >
            استخدم بيانات الحساب التجريبي (advisor / nabd1234)
          </button>
        </div>
      </main>
    </div>
  );
}
