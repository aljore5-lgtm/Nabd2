import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { studentLogin, fetchDemoCredentials, auth } from "@/lib/api";
import { GraduationCap, ArrowLeft, KeyRound, IdCard, AlertCircle } from "lucide-react";

export default function StudentLogin() {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [demo, setDemo] = useState(null);

  useEffect(() => {
    if (auth.token) navigate("/student-portal", { replace: true });
    fetchDemoCredentials().then(setDemo).catch(() => {});
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await studentLogin(studentId.trim(), password);
      navigate("/student-portal");
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "حدث خطأ، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(sid) {
    setStudentId(sid);
    setPassword(demo?.default_password || "nabd1234");
  }

  return (
    <div dir="rtl" className="min-h-screen bg-grid" data-testid="student-login-page">
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between border-b border-[var(--nabd-border)] bg-white/80 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3" data-testid="back-home-link">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center font-extrabold text-lg">ن</div>
          <span className="text-2xl font-extrabold gradient-text">نبض</span>
        </Link>
        <Link to="/" className="text-sm font-bold text-[var(--nabd-text-soft)] hover:text-[var(--nabd-primary)] inline-flex items-center gap-1">
          <ArrowLeft size={16} /> الرئيسية
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10 items-start">
        {/* Form */}
        <div className="nabd-card p-8 md:p-10 fade-up">
          <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-5 text-[var(--nabd-primary)]">
            <GraduationCap />
          </div>
          <h1 className="text-3xl font-black mb-2">بوابة الطالب</h1>
          <p className="text-[var(--nabd-text-soft)] mb-8">
            سجّل دخولك للاطلاع على وضعك الأكاديمي وتوصيات الذكاء الاصطناعي الشخصية.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold mb-2">رقم الطالب</label>
              <div className="relative">
                <IdCard size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
                <input
                  data-testid="student-id-input"
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-10 py-3 focus:border-[var(--nabd-primary)] focus:outline-none transition text-base"
                  placeholder="مثال: S1001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">كلمة المرور</label>
              <div className="relative">
                <KeyRound size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
                <input
                  data-testid="student-password-input"
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
              <div className="flex items-center gap-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3" data-testid="login-error">
                <AlertCircle size={16} /> {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-btn px-6 py-3 rounded-xl font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              data-testid="login-submit-btn"
            >
              {loading ? "جارٍ الدخول..." : "دخول"}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="nabd-card p-8 fade-up delay-2" data-testid="demo-accounts-card">
          <h3 className="text-lg font-extrabold mb-2">حسابات تجريبية</h3>
          <p className="text-sm text-[var(--nabd-text-soft)] mb-5">
            انقر على أي حساب لتعبئة بياناته. كلمة المرور الافتراضية:{" "}
            <span className="font-bold text-[var(--nabd-primary)]">{demo?.default_password || "nabd1234"}</span>
          </p>
          <div className="space-y-2">
            {demo?.students?.map((s) => {
              const riskColor =
                s.risk_hint === "low" ? "chip-success" : s.risk_hint === "medium" ? "chip-warn" : "chip-danger";
              const riskLabel = s.risk_hint === "low" ? "مخاطرة منخفضة" : s.risk_hint === "medium" ? "متوسطة" : "مرتفعة";
              return (
                <button
                  key={s.student_id}
                  type="button"
                  onClick={() => quickFill(s.student_id)}
                  className="w-full text-right flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--nabd-border)] hover:border-[var(--nabd-primary)] hover:bg-[#fbfaff] transition"
                  data-testid={`demo-account-${s.student_id}`}
                >
                  <div>
                    <div className="font-bold">{s.name}</div>
                    <div className="text-xs text-[var(--nabd-text-soft)] mt-0.5">رقم الطالب: {s.student_id}</div>
                  </div>
                  <span className={`chip ${riskColor}`}>{riskLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
