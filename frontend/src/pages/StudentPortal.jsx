import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchMe, fetchAISuggestions, auth } from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  GraduationCap, LogOut, Sparkles, TrendingUp, TrendingDown, Calendar, BookOpen,
  Target, Award, AlertTriangle, CheckCircle2, Brain, RefreshCw, Loader2, Clock, Mail, User,
} from "lucide-react";

const riskTheme = {
  low: { label: "منخفضة", chip: "chip-success", bg: "#10b981", soft: "#e7f8f1", text: "#047857" },
  medium: { label: "متوسطة", chip: "chip-warn", bg: "#f59e0b", soft: "#fef3c7", text: "#b45309" },
  high: { label: "مرتفعة", chip: "chip-danger", bg: "#ef4444", soft: "#fee2e2", text: "#b91c1c" },
};

export default function StudentPortal() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (!auth.token) {
      navigate("/student-login", { replace: true });
      return;
    }
    (async () => {
      try {
        const p = await fetchMe();
        setProfile(p);
      } catch {
        auth.clear();
        navigate("/student-login", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function loadAI() {
    setAiLoading(true);
    setAiError("");
    try {
      const r = await fetchAISuggestions();
      setAi(r);
    } catch (e) {
      setAiError(e?.response?.data?.detail || "تعذر تحميل التوصيات");
    } finally {
      setAiLoading(false);
    }
  }

  function logout() {
    auth.clear();
    navigate("/");
  }

  if (loading) return <FullPageLoader />;
  if (!profile) return null;

  const theme = riskTheme[profile.risk_level] || riskTheme.medium;
  const assignmentsRatio = profile.assignments_total
    ? Math.round((profile.assignments_completed / profile.assignments_total) * 100)
    : 0;
  const trendDir = profile.trends.length >= 2
    ? profile.trends[profile.trends.length - 1].gpa - profile.trends[0].gpa
    : 0;

  // performance radar
  const radarData = [
    { metric: "المعدل", value: Math.round((profile.gpa / 4) * 100) },
    { metric: "الحضور", value: Math.round(profile.attendance) },
    { metric: "الكويزات", value: Math.round(profile.quiz_avg) },
    { metric: "الواجبات", value: assignmentsRatio },
    { metric: "المذاكرة", value: Math.min(100, Math.round((profile.study_hours_weekly / 20) * 100)) },
  ];

  return (
    <div dir="rtl" className="min-h-screen" data-testid="student-portal-page">
      {/* Top Nav */}
      <header className="w-full px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 bg-white/85 backdrop-blur-md z-20 border-b border-[var(--nabd-border)]">
        <Link to="/" className="flex items-center gap-3" data-testid="portal-brand-link">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center font-extrabold text-lg">ن</div>
          <span className="text-2xl font-extrabold gradient-text">نبض</span>
          <span className="text-xs font-bold text-[var(--nabd-text-soft)] hidden md:inline mr-2">/ بوابة الطالب</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-[#f5f3ff]">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-extrabold text-[var(--nabd-primary)]">
              {profile.avatar_initial}
            </div>
            <div className="text-xs font-bold">{profile.name}</div>
          </div>
          <button
            onClick={logout}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--nabd-border)] hover:border-red-300 hover:text-red-600 text-sm font-bold transition"
            data-testid="logout-btn"
          >
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {/* Header / Profile */}
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
          <div className="nabd-card p-7 fade-up" data-testid="profile-card">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl gradient-btn flex items-center justify-center text-2xl font-black">
                {profile.avatar_initial}
              </div>
              <div className="flex-1">
                <span className="chip chip-purple mb-2"><GraduationCap size={14} /> {profile.major} — السنة {profile.year}</span>
                <h1 className="text-2xl md:text-3xl font-black mt-1">مرحباً، {profile.name}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-[var(--nabd-text-soft)]">
                  <span className="inline-flex items-center gap-1"><User size={14} /> {profile.student_id}</span>
                  <span className="inline-flex items-center gap-1"><Mail size={14} /> {profile.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="nabd-card p-7 fade-up delay-1 relative overflow-hidden" data-testid="risk-card">
            <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(135deg, ${theme.bg}22 0%, ${theme.bg}05 100%)` }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[var(--nabd-text-soft)]">مستوى المخاطرة الأكاديمية</span>
                <span className={`chip ${theme.chip}`} data-testid="risk-level-chip">{theme.label}</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-5xl font-black" style={{ color: theme.bg }} data-testid="risk-score">{profile.risk_score}</div>
                <div className="text-sm text-[var(--nabd-text-soft)] mb-2">/ 100</div>
              </div>
              <div className="progress-track mt-3">
                <div className="progress-fill" style={{ width: `${profile.risk_score}%`, background: theme.bg }}></div>
              </div>
              <div className="text-xs text-[var(--nabd-text-soft)] mt-3">
                المؤشر مركّب من المعدل، الحضور، الكويزات، وإنجاز الواجبات.
              </div>
            </div>
          </div>
        </section>

        {/* KPI cards */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPI
            icon={<Award className="text-[var(--nabd-primary)]" />}
            label="المعدل التراكمي"
            value={profile.gpa.toFixed(2)}
            sub="من 4.00"
            trend={trendDir}
            testId="kpi-gpa"
          />
          <KPI
            icon={<Calendar className="text-[var(--nabd-primary)]" />}
            label="نسبة الحضور"
            value={`${profile.attendance.toFixed(0)}%`}
            sub={profile.attendance >= 80 ? "ضمن المستوى الجيد" : "بحاجة تحسين"}
            testId="kpi-attendance"
          />
          <KPI
            icon={<Target className="text-[var(--nabd-primary)]" />}
            label="متوسط الكويزات"
            value={`${profile.quiz_avg.toFixed(0)}%`}
            sub="آخر التقييمات"
            testId="kpi-quiz"
          />
          <KPI
            icon={<BookOpen className="text-[var(--nabd-primary)]" />}
            label="الواجبات المكتملة"
            value={`${profile.assignments_completed}/${profile.assignments_total}`}
            sub={`${assignmentsRatio}% من إجمالي الواجبات`}
            testId="kpi-assignments"
          />
        </section>

        {/* Charts */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="nabd-card p-6 fade-up" data-testid="trends-chart-card">
            <SectionHeader title="اتجاه المعدل والحضور" subtitle="آخر 4 فصول دراسية" icon={<TrendingUp size={18} />} />
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={profile.trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#ecebf3" strokeDasharray="3 3" />
                  <XAxis dataKey="semester" tick={{ fontSize: 12, fill: "#5b5670" }} />
                  <YAxis yAxisId="left" domain={[0, 4]} tick={{ fontSize: 12, fill: "#5b5670" }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12, fill: "#5b5670" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} />
                  <Line yAxisId="left" type="monotone" dataKey="gpa" name="المعدل" stroke="#6d4dff" strokeWidth={3} dot={{ r: 5, fill: "#6d4dff" }} />
                  <Line yAxisId="right" type="monotone" dataKey="attendance" name="الحضور %" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: "#10b981" }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nabd-card p-6 fade-up delay-1" data-testid="courses-chart-card">
            <SectionHeader title="درجات المقررات الحالية" subtitle="حد النجاح 60%" icon={<BookOpen size={18} />} />
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={profile.courses} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#ecebf3" strokeDasharray="3 3" />
                  <XAxis dataKey="code" tick={{ fontSize: 12, fill: "#5b5670" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#5b5670" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }}
                    formatter={(v, _n, p) => [`${v}%`, p?.payload?.name]}
                  />
                  <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" />
                  <Bar dataKey="grade" name="الدرجة" radius={[8, 8, 0, 0]} fill="#6d4dff" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nabd-card p-6 fade-up delay-2" data-testid="radar-chart-card">
            <SectionHeader title="مؤشرات الأداء" subtitle="نظرة شاملة على نقاط القوة والضعف" icon={<Target size={18} />} />
            <div className="h-72">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#ecebf3" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 13, fill: "#1a1530", fontWeight: 700 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#5b5670" }} />
                  <Radar dataKey="value" stroke="#6d4dff" fill="#6d4dff" fillOpacity={0.35} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nabd-card p-6 fade-up delay-3" data-testid="courses-list-card">
            <SectionHeader title="تفاصيل المقررات" subtitle="الدرجة والوحدات المعتمدة" icon={<BookOpen size={18} />} />
            <div className="space-y-3">
              {profile.courses.map((c) => {
                const color = c.grade >= 80 ? "#10b981" : c.grade >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={c.code} className="flex items-center gap-3 p-3 rounded-xl bg-[#fbfaff] border border-[var(--nabd-border)]">
                    <div className="flex-1">
                      <div className="font-bold">{c.name}</div>
                      <div className="text-xs text-[var(--nabd-text-soft)] mt-0.5">{c.code} · {c.credits} ساعات</div>
                    </div>
                    <div className="w-32">
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${c.grade}%`, background: color }}></div>
                      </div>
                    </div>
                    <div className="font-extrabold w-12 text-left" style={{ color }}>{c.grade}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI Suggestions */}
        <section className="nabd-card p-7 fade-up relative overflow-hidden" data-testid="ai-suggestions-card">
          <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-30" style={{ background: "radial-gradient(closest-side, #c4b5fd, transparent 70%)" }}></div>
          <div className="relative">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div>
                <span className="chip chip-purple"><Sparkles size={14} /> ذكاء اصطناعي</span>
                <h2 className="text-2xl font-black mt-2 flex items-center gap-2">
                  <Brain className="text-[var(--nabd-primary)]" /> توصيات شخصية لتجنّب التعثر
                </h2>
                <p className="text-sm text-[var(--nabd-text-soft)] mt-1">
                  مولّدة بواسطة Claude Sonnet 4.5 وفق بياناتك الفعلية
                </p>
              </div>
              <button
                onClick={loadAI}
                disabled={aiLoading}
                className="gradient-btn px-5 py-2.5 rounded-full font-bold inline-flex items-center gap-2 disabled:opacity-60"
                data-testid="generate-ai-btn"
              >
                {aiLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                {ai ? "إعادة التوليد" : "ولّد التوصيات"}
              </button>
            </div>

            {aiError && (
              <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 mb-3" data-testid="ai-error">
                {aiError}
              </div>
            )}

            {!ai && !aiLoading && (
              <div className="text-center py-10 text-[var(--nabd-text-soft)]" data-testid="ai-empty-state">
                <Brain size={40} className="mx-auto mb-3 text-[var(--nabd-primary)] opacity-60" />
                <p className="font-bold">انقر على «ولّد التوصيات» للحصول على خطة شخصية مدعومة بالذكاء الاصطناعي.</p>
              </div>
            )}

            {aiLoading && (
              <div className="text-center py-10 text-[var(--nabd-text-soft)]">
                <Loader2 className="animate-spin mx-auto mb-3 text-[var(--nabd-primary)]" size={28} />
                <p className="font-bold">يتم تحليل بياناتك وإعداد توصيات مخصصة...</p>
              </div>
            )}

            {ai?.data && (
              <div className="space-y-5 mt-2" data-testid="ai-result">
                {ai.source === "fallback" && (
                  <div className="chip chip-warn">وضع احتياطي — تم استخدام منطق محلي</div>
                )}
                <div className="p-4 rounded-2xl bg-[#fbfaff] border border-[var(--nabd-border)]">
                  <div className="text-xs font-bold text-[var(--nabd-text-soft)] mb-1">ملخّص</div>
                  <p className="leading-relaxed">{ai.data.summary}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/50">
                    <div className="font-extrabold text-emerald-700 mb-2 flex items-center gap-2"><CheckCircle2 size={18} /> نقاط القوة</div>
                    <ul className="space-y-1.5 text-sm">
                      {ai.data.strengths?.map((s, i) => <li key={i} className="flex gap-2"><span>•</span>{s}</li>)}
                    </ul>
                  </div>
                  <div className="p-4 rounded-2xl border border-rose-100 bg-rose-50/50">
                    <div className="font-extrabold text-rose-700 mb-2 flex items-center gap-2"><AlertTriangle size={18} /> تحديات يجب معالجتها</div>
                    <ul className="space-y-1.5 text-sm">
                      {ai.data.risks?.map((s, i) => <li key={i} className="flex gap-2"><span>•</span>{s}</li>)}
                    </ul>
                  </div>
                </div>

                <div>
                  <div className="font-extrabold mb-3 flex items-center gap-2"><Target size={18} className="text-[var(--nabd-primary)]" /> توصيات عملية</div>
                  <div className="grid md:grid-cols-2 gap-3">
                    {ai.data.recommendations?.map((r, i) => {
                      const p = r.priority === "high" ? "chip-danger" : r.priority === "medium" ? "chip-warn" : "chip-success";
                      const pl = r.priority === "high" ? "عالية" : r.priority === "medium" ? "متوسطة" : "منخفضة";
                      return (
                        <div key={i} className="p-4 rounded-2xl bg-white border border-[var(--nabd-border)]" data-testid={`ai-rec-${i}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-bold">{r.title}</div>
                            <span className={`chip ${p}`}>{pl}</span>
                          </div>
                          <p className="text-sm text-[var(--nabd-text-soft)] leading-relaxed">{r.action}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="font-extrabold mb-3 flex items-center gap-2"><Clock size={18} className="text-[var(--nabd-primary)]" /> خطة الأسبوع</div>
                  <ol className="grid md:grid-cols-2 gap-2 text-sm">
                    {ai.data.weekly_plan?.map((step, i) => (
                      <li key={i} className="flex gap-3 p-3 rounded-xl bg-[#fbfaff] border border-[var(--nabd-border)]">
                        <span className="w-6 h-6 rounded-full bg-[var(--nabd-primary)] text-white flex items-center justify-center text-xs font-extrabold flex-shrink-0">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {ai.data.motivational_message && (
                  <div className="p-5 rounded-2xl text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #6d4dff 0%, #8b5cf6 100%)" }} data-testid="ai-motivation">
                    <Sparkles size={20} className="mb-2" />
                    <p className="font-extrabold text-lg leading-relaxed">{ai.data.motivational_message}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function KPI({ icon, label, value, sub, trend, testId }) {
  return (
    <div className="nabd-card p-5 fade-up" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] flex items-center justify-center">{icon}</div>
        {typeof trend === "number" && trend !== 0 && (
          <span className={`text-xs font-bold inline-flex items-center gap-1 ${trend > 0 ? "text-emerald-600" : "text-rose-600"}`}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {trend > 0 ? "تحسّن" : "تراجع"}
          </span>
        )}
      </div>
      <div className="text-xs font-bold text-[var(--nabd-text-soft)]">{label}</div>
      <div className="text-3xl font-black mt-1">{value}</div>
      {sub && <div className="text-xs text-[var(--nabd-text-soft)] mt-1">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 font-extrabold">
        <span className="text-[var(--nabd-primary)]">{icon}</span> {title}
      </div>
      {subtitle && <div className="text-xs text-[var(--nabd-text-soft)] mt-1">{subtitle}</div>}
    </div>
  );
}

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin mx-auto text-[var(--nabd-primary)]" size={36} />
        <p className="mt-3 font-bold text-[var(--nabd-text-soft)]">جارٍ تحميل بياناتك...</p>
      </div>
    </div>
  );
}
