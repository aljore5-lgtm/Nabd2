import React, { useEffect, useState } from "react";
import { bookAppointment, fetchMyAppointments, cancelAppointment } from "@/lib/api";
import { CalendarClock, Plus, X, MapPin, Video, Loader2, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";

const STATUS_META = {
  pending: { label: "بانتظار التأكيد", chip: "chip-warn", icon: AlertCircle },
  confirmed: { label: "مؤكد", chip: "chip-success", icon: CheckCircle2 },
  rejected: { label: "مرفوض", chip: "chip-danger", icon: XCircle },
  completed: { label: "مكتمل", chip: "chip-purple", icon: CheckCircle2 },
  cancelled: { label: "ملغى", chip: "chip-danger", icon: XCircle },
};

const minDate = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function AppointmentsSection() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ scheduled_at: "", duration_min: 30, mode: "online", reason: "" });

  async function load() {
    try {
      const r = await fetchMyAppointments();
      setItems(r.appointments || []);
    } catch (_) { /* empty */ }
  }

  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.scheduled_at || !form.reason.trim()) return;
    setErr("");
    setSaving(true);
    try {
      const created = await bookAppointment(form);
      setItems((prev) => [created, ...prev]);
      setForm({ scheduled_at: "", duration_min: 30, mode: "online", reason: "" });
      setShowForm(false);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "تعذر الحجز");
    } finally {
      setSaving(false);
    }
  }

  async function cancel(id) {
    try {
      const updated = await cancelAppointment(id);
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (_) { /* empty */ }
  }

  return (
    <section className="nabd-card p-7 fade-up" data-testid="appointments-section">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <span className="chip chip-purple"><CalendarClock size={14} /> المواعيد</span>
          <h2 className="text-2xl font-black mt-2">احجز موعداً مع مرشدك الأكاديمي</h2>
          <p className="text-sm text-[var(--nabd-text-soft)] mt-1">حدد وقتاً مناسباً لمناقشة وضعك الأكاديمي مباشرةً مع المرشد.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="gradient-btn px-5 py-2.5 rounded-full font-bold inline-flex items-center gap-2"
          data-testid="toggle-appointment-form-btn"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "إلغاء" : "حجز موعد"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4 p-5 rounded-2xl bg-[#fbfaff] border border-[var(--nabd-border)] mb-5" data-testid="appointment-form">
          <div>
            <label className="block text-sm font-bold mb-2">التاريخ والوقت</label>
            <input
              type="datetime-local"
              required
              min={minDate()}
              className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              data-testid="appointment-date-input"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">المدة (دقيقة)</label>
            <select
              className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
              value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
              data-testid="appointment-duration-select"
            >
              {[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">طريقة اللقاء</label>
            <div className="flex gap-2">
              {[{ v: "online", l: "أونلاين", I: Video }, { v: "onsite", l: "حضوري", I: MapPin }].map(({ v, l, I }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, mode: v })}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold border transition ${
                    form.mode === v
                      ? "bg-[var(--nabd-primary)] text-white border-[var(--nabd-primary)]"
                      : "bg-white border-[var(--nabd-border)] hover:border-[var(--nabd-primary)]"
                  }`}
                  data-testid={`appointment-mode-${v}`}
                >
                  <I size={14} /> {l}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold mb-2">سبب الاجتماع</label>
            <textarea
              required
              rows={3}
              className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="مثال: أحتاج مناقشة خطة دراسية لتحسين معدلي في الفصل القادم..."
              data-testid="appointment-reason-input"
            />
          </div>
          {err && <div className="md:col-span-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3">{err}</div>}
          <div className="md:col-span-2">
            <button type="submit" disabled={saving} className="gradient-btn px-6 py-2.5 rounded-xl font-bold inline-flex items-center gap-2 disabled:opacity-60" data-testid="appointment-submit-btn">
              {saving ? <Loader2 className="animate-spin" size={16} /> : <CalendarClock size={16} />} تأكيد الحجز
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3" data-testid="appointments-list">
        {items.length === 0 && (
          <div className="text-center py-8 text-[var(--nabd-text-soft)]" data-testid="appointments-empty">
            <CalendarClock size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold">لا توجد مواعيد بعد. اضغط على «حجز موعد» للبدء.</p>
          </div>
        )}
        {items.map((it) => {
          const meta = STATUS_META[it.status] || STATUS_META.pending;
          const Icon = meta.icon;
          const dt = new Date(it.scheduled_at);
          const canCancel = it.status === "pending" || it.status === "confirmed";
          return (
            <div key={it.id} className="p-4 rounded-2xl bg-white border border-[var(--nabd-border)] flex flex-wrap gap-3 items-start" data-testid={`appointment-${it.id}`}>
              <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center text-[var(--nabd-primary)] flex-shrink-0">
                {it.mode === "online" ? <Video /> : <MapPin />}
              </div>
              <div className="flex-1 min-w-48">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold">
                    {dt.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="text-sm text-[var(--nabd-text-soft)]">
                    {dt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })} · {it.duration_min} دقيقة
                  </span>
                </div>
                <p className="text-sm text-[var(--nabd-text-soft)] leading-relaxed mb-1">{it.reason}</p>
                {it.advisor_note && (
                  <p className="text-xs mt-2 px-3 py-2 rounded-xl bg-[#f5f3ff] text-[var(--nabd-primary)]">
                    📝 ملاحظة المرشد: {it.advisor_note}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`chip ${meta.chip} inline-flex items-center gap-1`}><Icon size={12} /> {meta.label}</span>
                {canCancel && (
                  <button
                    onClick={() => cancel(it.id)}
                    className="text-xs font-bold text-red-600 hover:underline"
                    data-testid={`cancel-appointment-${it.id}`}
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
