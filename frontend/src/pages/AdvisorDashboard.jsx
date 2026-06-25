import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchAdvisorStudents, advisorAuth, fetchAdvisorAppointments, updateAppointmentStatus } from "@/lib/api";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { LogOut, Users, TrendingUp, Search, ShieldAlert, ShieldCheck, ShieldQuestion, ChevronLeft, GraduationCap, CalendarClock, Video, MapPin, Check, X as XIcon } from "lucide-react";

const riskTheme = {
  low: { label: "منخفضة", chip: "chip-success", color: "#10b981", bg: "#e7f8f1", text: "#047857" },
  medium: { label: "متوسطة", chip: "chip-warn", color: "#f59e0b", bg: "#fef3c7", text: "#b45309" },
  high: { label: "مرتفعة", chip: "chip-danger", color: "#ef4444", bg: "#fee2e2", text: "#b91c1c" },
};

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    if (!advisorAuth.token) {
      navigate("/advisor-login", { replace: true });
      return;
    }
    (async () => {
      try {
        setData(await fetchAdvisorStudents());
        try {
          const r = await fetchAdvisorAppointments();
          setAppointments(r.appointments || []);
        } catch (_) { /* empty */ }
      } catch {
        advisorAuth.clear();
        navigate("/advisor-login", { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  async function setApptStatus(id, status) {
    try {
      const upd = await updateAppointmentStatus(id, status);
      setAppointments((prev) => prev.map((a) => (a.id === id ? upd : a)));
    } catch (_) { /* empty */ }
  }

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.students
      .filter((s) => filter === "all" || s.risk_level === filter)
      .filter((s) =>
        !q ||
        s.name.includes(q) ||
        s.student_id.toLowerCase().includes(q.toLowerCase()) ||
        s.major.includes(q)
      );
  }, [data, q, filter]);

  function logout() {
    advisorAuth.clear();
    navigate("/");
  }

  if (loading) return <PageLoader />;
  if (!data) return null;

  const { stats, students } = data;

  const pieData = [
    { name: "مرتفعة", value: stats.high, color: "#ef4444" },
    { name: "متوسطة", value: stats.medium, color: "#f59e0b" },
    { name: "منخفضة", value: stats.low, color: "#10b981" },
  ];

  const barData = students.slice(0, 8).map((s) => ({ name: s.avatar_initial, risk: s.risk_score, gpa: +(s.gpa * 25).toFixed(0) }));

  return (
    <div dir="rtl" className="min-h-screen" data-testid="advisor-dashboard-page">
      <header className="w-full px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 bg-white/85 backdrop-blur-md z-20 border-b border-[var(--nabd-border)]">
        <Link to="/" className="flex items-center gap-3" data-testid="advisor-brand-link">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center font-extrabold text-lg">ن</div>
          <span className="text-2xl font-extrabold gradient-text">نبض</span>
          <span className="text-xs font-bold text-[var(--nabd-text-soft)] hidden md:inline mr-2">/ لوحة المرشد</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-[#f5f3ff]">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-extrabold text-[var(--nabd-primary)]">ع</div>
            <div className="text-xs font-bold">د. عبدالله المرشد</div>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--nabd-border)] hover:border-red-300 hover:text-red-600 text-sm font-bold transition" data-testid="advisor-logout-btn">
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {/* Header */}
        <section className="fade-up">
          <span className="chip chip-purple"><ShieldCheck size={14} /> لوحة المرشد الأكاديمي</span>
          <h1 className="text-3xl md:text-4xl font-black mt-3">نظرة عامة على الطلاب</h1>
          <p className="text-[var(--nabd-text-soft)] mt-2">تابع مستويات المخاطرة، راجع الأداء، وأضِف خطط تدخّل للطلاب المعرضين للتعثر.</p>
        </section>

        {/* Stats */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard icon={<Users className="text-[var(--nabd-primary)]" />} label="عدد الطلاب" value={stats.total} testId="stat-total" />
          <StatCard icon={<ShieldAlert className="text-red-500" />} label="مخاطرة مرتفعة" value={stats.high} accent="#ef4444" testId="stat-high" />
          <StatCard icon={<ShieldQuestion className="text-amber-500" />} label="مخاطرة متوسطة" value={stats.medium} accent="#f59e0b" testId="stat-medium" />
          <StatCard icon={<TrendingUp className="text-emerald-500" />} label="متوسط المعدل" value={stats.avg_gpa.toFixed(2)} sub={`متوسط الحضور ${stats.avg_attendance}%`} accent="#10b981" testId="stat-avg-gpa" />
        </section>

        {/* Charts */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="nabd-card p-6 fade-up" data-testid="risk-distribution-card">
            <div className="font-extrabold mb-1">توزيع مستوى المخاطرة</div>
            <div className="text-xs text-[var(--nabd-text-soft)] mb-3">إجمالي {stats.total} طلاب</div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="nabd-card p-6 fade-up delay-1" data-testid="risk-vs-gpa-card">
            <div className="font-extrabold mb-1">المخاطرة مقابل المعدل</div>
            <div className="text-xs text-[var(--nabd-text-soft)] mb-3">العمود الأحمر = مؤشر المخاطرة، الأخضر = المعدل (مقياس 100)</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={barData}>
                  <CartesianGrid stroke="#ecebf3" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} />
                  <Bar dataKey="risk" name="المخاطرة" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="gpa" name="المعدل" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Appointments queue */}
        <section className="nabd-card p-7 fade-up" data-testid="advisor-appointments-section">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div>
              <span className="chip chip-purple"><CalendarClock size={14} /> طلبات المواعيد</span>
              <h2 className="text-2xl font-black mt-2">طلبات الحجز من الطلاب</h2>
              <p className="text-sm text-[var(--nabd-text-soft)] mt-1">راجع المواعيد المطلوبة وأكدها أو رفضها.</p>
            </div>
            <div className="text-sm font-bold text-[var(--nabd-text-soft)]">
              {appointments.filter((a) => a.status === "pending").length} بانتظار التأكيد
            </div>
          </div>
          {appointments.length === 0 ? (
            <div className="text-center py-6 text-[var(--nabd-text-soft)] text-sm" data-testid="advisor-appointments-empty">
              <CalendarClock size={28} className="mx-auto mb-2 opacity-40" />
              لا توجد طلبات حالياً.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3" data-testid="advisor-appointments-list">
              {appointments.map((a) => {
                const dt = new Date(a.scheduled_at);
                const isPending = a.status === "pending";
                const chip = a.status === "confirmed" ? "chip-success"
                  : a.status === "rejected" || a.status === "cancelled" ? "chip-danger"
                  : a.status === "completed" ? "chip-purple"
                  : "chip-warn";
                const statusLabel = a.status === "confirmed" ? "مؤكد"
                  : a.status === "rejected" ? "مرفوض"
                  : a.status === "completed" ? "مكتمل"
                  : a.status === "cancelled" ? "ملغى"
                  : "بانتظار";
                return (
                  <div key={a.id} className="p-4 rounded-2xl border border-[var(--nabd-border)] bg-white" data-testid={`advisor-appt-${a.id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <div>
                        <div className="font-bold">{a.student_name} <span className="text-xs text-[var(--nabd-text-soft)] font-normal">({a.student_id})</span></div>
                        <div className="text-xs text-[var(--nabd-text-soft)] mt-1 inline-flex items-center gap-2">
                          {a.mode === "online" ? <Video size={12} /> : <MapPin size={12} />}
                          {dt.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          · {a.duration_min} دق
                        </div>
                      </div>
                      <span className={`chip ${chip}`}>{statusLabel}</span>
                    </div>
                    <p className="text-sm text-[var(--nabd-text-soft)] leading-relaxed mb-3">{a.reason}</p>
                    {isPending && (
                      <div className="flex gap-2">
                        <button onClick={() => setApptStatus(a.id, "confirmed")} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition" data-testid={`confirm-appt-${a.id}`}>
                          <Check size={14} /> تأكيد
                        </button>
                        <button onClick={() => setApptStatus(a.id, "rejected")} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition" data-testid={`reject-appt-${a.id}`}>
                          <XIcon size={14} /> رفض
                        </button>
                      </div>
                    )}
                    {a.status === "confirmed" && (
                      <button onClick={() => setApptStatus(a.id, "completed")} className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold bg-[var(--nabd-primary)] text-white hover:opacity-90 transition" data-testid={`complete-appt-${a.id}`}>
                        <Check size={14} /> تم تنفيذ الموعد
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Filters */}
        <section className="nabd-card p-5 fade-up" data-testid="filters-card">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-64">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
              <input
                data-testid="search-input"
                className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-10 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none transition"
                placeholder="ابحث بالاسم أو رقم الطالب أو التخصص..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {["all", "high", "medium", "low"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                    filter === f
                      ? "bg-[var(--nabd-primary)] text-white border-[var(--nabd-primary)]"
                      : "bg-white border-[var(--nabd-border)] hover:border-[var(--nabd-primary)]"
                  }`}
                  data-testid={`filter-${f}`}
                >
                  {f === "all" ? "الكل" : riskTheme[f].label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Students list */}
        <section className="space-y-3" data-testid="students-list">
          {filtered.map((s) => {
            const t = riskTheme[s.risk_level];
            return (
              <Link
                to={`/advisor-dashboard/student/${s.student_id}`}
                key={s.student_id}
                className="nabd-card p-5 flex items-center gap-4 hover:scale-[1.005] transition"
                data-testid={`student-row-${s.student_id}`}
              >
                <div className="w-12 h-12 rounded-2xl gradient-btn flex items-center justify-center font-extrabold text-lg">{s.avatar_initial}</div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-bold">{s.name}</div>
                    <span className={`chip ${t.chip}`}>{t.label}</span>
                  </div>
                  <div className="text-xs text-[var(--nabd-text-soft)] mt-1">
                    {s.student_id} · {s.major} · السنة {s.year}
                  </div>
                </div>
                <div className="hidden sm:block w-40">
                  <div className="text-xs text-[var(--nabd-text-soft)] mb-1">المعدل {s.gpa.toFixed(2)} / الحضور {s.attendance.toFixed(0)}%</div>
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${s.risk_score}%`, background: t.color }}></div></div>
                </div>
                <div className="text-left">
                  <div className="text-3xl font-black" style={{ color: t.color }}>{s.risk_score}</div>
                  <div className="text-xs text-[var(--nabd-text-soft)]">/ 100</div>
                </div>
                <ChevronLeft className="text-[var(--nabd-text-soft)]" />
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="nabd-card p-8 text-center text-[var(--nabd-text-soft)]" data-testid="empty-state">
              <GraduationCap size={36} className="mx-auto mb-2 opacity-50" />
              <p className="font-bold">لا توجد نتائج مطابقة</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent, testId }) {
  return (
    <div className="nabd-card p-5 fade-up" data-testid={testId}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] flex items-center justify-center">{icon}</div>
      </div>
      <div className="text-xs font-bold text-[var(--nabd-text-soft)]">{label}</div>
      <div className="text-3xl font-black mt-1" style={accent ? { color: accent } : null}>{value}</div>
      {sub && <div className="text-xs text-[var(--nabd-text-soft)] mt-1">{sub}</div>}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-[var(--nabd-text-soft)] font-bold">
      جارٍ التحميل...
    </div>
  );
}
