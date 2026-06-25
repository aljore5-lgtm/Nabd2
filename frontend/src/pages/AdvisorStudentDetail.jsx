import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchAdvisorStudent, fetchStudentInterventions, addIntervention, updateInterventionStatus, advisorAuth,
} from "@/lib/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  ArrowRight, LogOut, Plus, ClipboardList, Mail, User, Award, Calendar, Target, BookOpen, Loader2, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";

const riskTheme = {
  low: { label: "منخفضة", chip: "chip-success", bg: "#10b981" },
  medium: { label: "متوسطة", chip: "chip-warn", bg: "#f59e0b" },
  high: { label: "مرتفعة", chip: "chip-danger", bg: "#ef4444" },
};

const statusLabel = { pending: "بانتظار", in_progress: "قيد التنفيذ", done: "مكتمل" };
const statusChip = { pending: "chip-warn", in_progress: "chip-purple", done: "chip-success" };
const priorityLabel = { high: "عالية", medium: "متوسطة", low: "منخفضة" };
const priorityChip = { high: "chip-danger", medium: "chip-warn", low: "chip-success" };

export default function AdvisorStudentDetail() {
  const { student_id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", note: "", priority: "medium", due_date: "" });

  useEffect(() => {
    if (!advisorAuth.token) {
      navigate("/advisor-login", { replace: true });
      return;
    }
    (async () => {
      try {
        const [p, list] = await Promise.all([
          fetchAdvisorStudent(student_id),
          fetchStudentInterventions(student_id),
        ]);
        setProfile(p);
        setInterventions(list.interventions || []);
      } catch {
        navigate("/advisor-dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [student_id, navigate]);

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.note.trim()) return;
    setSaving(true);
    try {
      const created = await addIntervention({ student_id, ...form });
      setInterventions((prev) => [created, ...prev]);
      setForm({ title: "", note: "", priority: "medium", due_date: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status) {
    const updated = await updateInterventionStatus(id, status);
    setInterventions((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-[var(--nabd-text-soft)]">جارٍ التحميل...</div>;
  if (!profile) return null;

  const theme = riskTheme[profile.risk_level] || riskTheme.medium;
  const assignmentsRatio = profile.assignments_total ? Math.round((profile.assignments_completed / profile.assignments_total) * 100) : 0;

  return (
    <div dir="rtl" className="min-h-screen" data-testid="advisor-student-detail-page">
      <header className="w-full px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 bg-white/85 backdrop-blur-md z-20 border-b border-[var(--nabd-border)]">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center font-extrabold text-lg">ن</div>
            <span className="text-2xl font-extrabold gradient-text">نبض</span>
          </Link>
          <span className="text-xs font-bold text-[var(--nabd-text-soft)] hidden md:inline mr-2">/ لوحة المرشد / {profile.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/advisor-dashboard" className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--nabd-border)] text-sm font-bold hover:border-[var(--nabd-primary)] transition" data-testid="back-to-list-btn">
            <ArrowRight size={14} /> رجوع للقائمة
          </Link>
          <button
            onClick={() => { advisorAuth.clear(); navigate("/"); }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-[var(--nabd-border)] hover:border-red-300 hover:text-red-600 text-sm font-bold transition"
            data-testid="advisor-logout-btn"
          >
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {/* Header */}
        <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
          <div className="nabd-card p-7 fade-up" data-testid="student-profile-card">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl gradient-btn flex items-center justify-center text-2xl font-black">{profile.avatar_initial}</div>
              <div className="flex-1">
                <span className="chip chip-purple">{profile.major} — السنة {profile.year}</span>
                <h1 className="text-2xl md:text-3xl font-black mt-2">{profile.name}</h1>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-[var(--nabd-text-soft)]">
                  <span className="inline-flex items-center gap-1"><User size={14} /> {profile.student_id}</span>
                  <span className="inline-flex items-center gap-1"><Mail size={14} /> {profile.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="nabd-card p-7 fade-up delay-1 relative overflow-hidden" data-testid="risk-summary-card">
            <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(135deg, ${theme.bg}22 0%, ${theme.bg}05 100%)` }}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[var(--nabd-text-soft)]">مستوى المخاطرة</span>
                <span className={`chip ${theme.chip}`}>{theme.label}</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-5xl font-black" style={{ color: theme.bg }}>{profile.risk_score}</div>
                <div className="text-sm text-[var(--nabd-text-soft)] mb-2">/ 100</div>
              </div>
              <div className="progress-track mt-3"><div className="progress-fill" style={{ width: `${profile.risk_score}%`, background: theme.bg }}></div></div>
            </div>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Mini icon={<Award className="text-[var(--nabd-primary)]" />} label="المعدل" value={profile.gpa.toFixed(2)} sub="/ 4.00" />
          <Mini icon={<Calendar className="text-[var(--nabd-primary)]" />} label="الحضور" value={`${profile.attendance.toFixed(0)}%`} />
          <Mini icon={<Target className="text-[var(--nabd-primary)]" />} label="الكويزات" value={`${profile.quiz_avg.toFixed(0)}%`} />
          <Mini icon={<BookOpen className="text-[var(--nabd-primary)]" />} label="الواجبات" value={`${profile.assignments_completed}/${profile.assignments_total}`} sub={`${assignmentsRatio}% منجز`} />
        </section>

        {/* Charts */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="nabd-card p-6" data-testid="advisor-trends-card">
            <div className="font-extrabold mb-3">اتجاه المعدل والحضور</div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={profile.trends}>
                  <CartesianGrid stroke="#ecebf3" strokeDasharray="3 3" />
                  <XAxis dataKey="semester" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" domain={[0, 4]} tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} />
                  <Line yAxisId="left" type="monotone" dataKey="gpa" name="المعدل" stroke="#6d4dff" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="attendance" name="الحضور %" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="nabd-card p-6" data-testid="advisor-courses-card">
            <div className="font-extrabold mb-3">درجات المقررات</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={profile.courses}>
                  <CartesianGrid stroke="#ecebf3" strokeDasharray="3 3" />
                  <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} />
                  <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" />
                  <Bar dataKey="grade" fill="#6d4dff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Interventions */}
        <section className="nabd-card p-7 fade-up" data-testid="interventions-section">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div>
              <span className="chip chip-purple"><ClipboardList size={14} /> خطط التدخل</span>
              <h2 className="text-2xl font-black mt-2">التوصيات وخطط التدخّل</h2>
              <p className="text-sm text-[var(--nabd-text-soft)] mt-1">سجّل الإجراءات التي ستتخذها مع الطالب وتابع حالتها.</p>
            </div>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="gradient-btn px-5 py-2.5 rounded-full font-bold inline-flex items-center gap-2"
              data-testid="toggle-intervention-form-btn"
            >
              <Plus size={16} /> {showForm ? "إلغاء" : "إضافة توصية"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#fbfaff] border border-[var(--nabd-border)] mb-5" data-testid="intervention-form">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">العنوان</label>
                <input
                  data-testid="intervention-title-input"
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: اجتماع متابعة أسبوعي"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">الملاحظات / الإجراء</label>
                <textarea
                  data-testid="intervention-note-input"
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none min-h-24"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="اشرح خطة العمل بالتفصيل..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الأولوية</label>
                <select
                  data-testid="intervention-priority-select"
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">الموعد النهائي (اختياري)</label>
                <input
                  type="date"
                  data-testid="intervention-due-date-input"
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <button type="submit" disabled={saving} className="gradient-btn px-6 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 disabled:opacity-60" data-testid="intervention-submit-btn">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} حفظ التوصية
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3" data-testid="interventions-list">
            {interventions.length === 0 && (
              <div className="text-center py-8 text-[var(--nabd-text-soft)]" data-testid="interventions-empty">
                <ClipboardList size={36} className="mx-auto mb-2 opacity-50" />
                <p className="font-bold">لا توجد توصيات مسجّلة بعد.</p>
              </div>
            )}
            {interventions.map((it) => {
              const sChip = statusChip[it.status] || "chip-warn";
              const pChip = priorityChip[it.priority] || "chip-warn";
              return (
                <div key={it.id} className="p-5 rounded-2xl border border-[var(--nabd-border)] bg-white" data-testid={`intervention-${it.id}`}>
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
                    <div>
                      <div className="font-bold text-lg">{it.title}</div>
                      <div className="text-xs text-[var(--nabd-text-soft)] mt-1">
                        أُضيفت بواسطة {it.advisor_name} · {new Date(it.created_at).toLocaleDateString("ar-EG")}
                        {it.due_date && <> · موعد التنفيذ: {it.due_date}</>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`chip ${pChip}`}>أولوية {priorityLabel[it.priority]}</span>
                      <span className={`chip ${sChip}`}>{statusLabel[it.status]}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--nabd-text-soft)] leading-relaxed mb-3 whitespace-pre-wrap">{it.note}</p>
                  <div className="flex gap-2 flex-wrap">
                    <StatusBtn current={it.status} target="pending" icon={<AlertCircle size={14} />} onClick={() => updateStatus(it.id, "pending")} testId={`set-pending-${it.id}`}>بانتظار</StatusBtn>
                    <StatusBtn current={it.status} target="in_progress" icon={<Clock size={14} />} onClick={() => updateStatus(it.id, "in_progress")} testId={`set-inprogress-${it.id}`}>قيد التنفيذ</StatusBtn>
                    <StatusBtn current={it.status} target="done" icon={<CheckCircle2 size={14} />} onClick={() => updateStatus(it.id, "done")} testId={`set-done-${it.id}`}>مكتمل</StatusBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

function Mini({ icon, label, value, sub }) {
  return (
    <div className="nabd-card p-5">
      <div className="w-10 h-10 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-2">{icon}</div>
      <div className="text-xs font-bold text-[var(--nabd-text-soft)]">{label}</div>
      <div className="text-2xl font-black mt-1">{value}</div>
      {sub && <div className="text-xs text-[var(--nabd-text-soft)] mt-1">{sub}</div>}
    </div>
  );
}

function StatusBtn({ current, target, icon, onClick, children, testId }) {
  const active = current === target;
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
        active ? "bg-[var(--nabd-primary)] text-white border-[var(--nabd-primary)]" : "bg-white border-[var(--nabd-border)] hover:border-[var(--nabd-primary)]"
      }`}
    >
      {icon} {children}
    </button>
  );
}
