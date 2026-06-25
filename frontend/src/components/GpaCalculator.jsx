import React, { useMemo, useState } from "react";
import { Calculator, Plus, Trash2, Sparkles, RefreshCw } from "lucide-react";

// Convert percentage grade (0-100) to GPA point (0-4)
function gradeToPoint(grade) {
  if (grade >= 95) return 4.0;
  if (grade >= 90) return 3.75;
  if (grade >= 85) return 3.5;
  if (grade >= 80) return 3.0;
  if (grade >= 75) return 2.75;
  if (grade >= 70) return 2.5;
  if (grade >= 65) return 2.0;
  if (grade >= 60) return 1.5;
  return 0.0;
}

function computeGpa(rows) {
  let totalPoints = 0;
  let totalCredits = 0;
  rows.forEach((r) => {
    const c = Number(r.credits) || 0;
    const g = Number(r.grade);
    if (!c || Number.isNaN(g)) return;
    totalPoints += gradeToPoint(g) * c;
    totalCredits += c;
  });
  return totalCredits ? totalPoints / totalCredits : 0;
}

export default function GpaCalculator({ currentCourses = [], currentGpa = 0 }) {
  const initial = currentCourses.length
    ? currentCourses.map((c) => ({ id: c.code, name: c.name, code: c.code, credits: c.credits, grade: c.grade }))
    : [{ id: "row-1", name: "مقرر جديد", code: "NEW101", credits: 3, grade: 80 }];

  const [rows, setRows] = useState(initial);

  const projectedGpa = useMemo(() => computeGpa(rows), [rows]);
  const delta = projectedGpa - currentGpa;

  function update(i, key, value) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { id: `row-${Date.now()}`, name: "مقرر إضافي", code: `EXTRA${prev.length + 1}`, credits: 3, grade: 85 }]);
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }
  function reset() {
    setRows(initial);
  }

  return (
    <section className="nabd-card p-7 fade-up" data-testid="gpa-calculator-section">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <span className="chip chip-purple"><Calculator size={14} /> حاسبة المعدل</span>
          <h2 className="text-2xl font-black mt-2">ماذا لو…؟ احسب معدلك المتوقع</h2>
          <p className="text-sm text-[var(--nabd-text-soft)] mt-1">
            عدّل درجات مقرراتك أو أضف مقررات افتراضية لرؤية معدلك المتوقع فوراً.
          </p>
        </div>
        <button onClick={reset} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--nabd-border)] text-sm font-bold hover:border-[var(--nabd-primary)] transition" data-testid="gpa-reset-btn">
          <RefreshCw size={14} /> إعادة تعيين
        </button>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-3" data-testid="gpa-rows">
          {rows.map((r, i) => (
            <div key={r.id} className="p-4 rounded-2xl border border-[var(--nabd-border)] bg-white grid grid-cols-12 gap-3 items-center">
              <input
                className="col-span-5 bg-[#fbfaff] border border-[var(--nabd-border)] rounded-xl px-3 py-2 text-sm focus:border-[var(--nabd-primary)] focus:outline-none"
                value={r.name}
                onChange={(e) => update(i, "name", e.target.value)}
                placeholder="اسم المقرر"
                data-testid={`gpa-name-${i}`}
              />
              <div className="col-span-3">
                <label className="text-xs font-bold text-[var(--nabd-text-soft)]">الساعات</label>
                <select
                  className="w-full bg-[#fbfaff] border border-[var(--nabd-border)] rounded-xl px-2 py-2 text-sm focus:border-[var(--nabd-primary)] focus:outline-none"
                  value={r.credits}
                  onChange={(e) => update(i, "credits", Number(e.target.value))}
                  data-testid={`gpa-credits-${i}`}
                >
                  {[1, 2, 3, 4, 5].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-3">
                <label className="text-xs font-bold text-[var(--nabd-text-soft)]">الدرجة %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full bg-[#fbfaff] border border-[var(--nabd-border)] rounded-xl px-3 py-2 text-sm focus:border-[var(--nabd-primary)] focus:outline-none"
                  value={r.grade}
                  onChange={(e) => update(i, "grade", e.target.value)}
                  data-testid={`gpa-grade-${i}`}
                />
              </div>
              <button
                onClick={() => removeRow(i)}
                className="col-span-1 p-2 rounded-xl text-red-500 hover:bg-red-50 transition"
                title="حذف"
                data-testid={`gpa-remove-${i}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            className="w-full p-3 rounded-2xl border-2 border-dashed border-[var(--nabd-border)] text-[var(--nabd-text-soft)] hover:border-[var(--nabd-primary)] hover:text-[var(--nabd-primary)] font-bold inline-flex items-center justify-center gap-2 transition"
            data-testid="gpa-add-row-btn"
          >
            <Plus size={16} /> أضف مقرر افتراضي
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-5 rounded-2xl bg-[#fbfaff] border border-[var(--nabd-border)]">
            <div className="text-xs font-bold text-[var(--nabd-text-soft)]">المعدل الحالي</div>
            <div className="text-3xl font-black mt-1">{currentGpa.toFixed(2)}</div>
            <div className="text-xs text-[var(--nabd-text-soft)] mt-1">من 4.00</div>
          </div>
          <div className="p-5 rounded-2xl text-white relative overflow-hidden" style={{ background: "linear-gradient(135deg, #6d4dff 0%, #4f46e5 100%)" }} data-testid="gpa-projected">
            <Sparkles size={16} className="absolute top-3 left-3 opacity-70" />
            <div className="text-xs font-bold opacity-90">المعدل المتوقع</div>
            <div className="text-4xl font-black mt-1">{projectedGpa.toFixed(2)}</div>
            <div className={`text-sm font-bold mt-2 inline-flex items-center gap-1 ${delta >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(2)} {delta >= 0 ? "تحسن" : "تراجع"}
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-[var(--nabd-border)] text-xs text-[var(--nabd-text-soft)] leading-relaxed">
            💡 <strong className="text-[var(--nabd-text)]">طريقة الحساب:</strong> نحوّل الدرجة المئوية إلى نقاط من 4.00 ونحسب المتوسط الموزون حسب الساعات المعتمدة. عدّل الأرقام لتعرف أثر كل مقرر على معدلك.
          </div>
        </div>
      </div>
    </section>
  );
}
