import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchWallet, createSavingsGoal, depositToGoal, deleteSavingsGoal, fetchWalletCoach, auth,
} from "@/lib/api";
import {
  PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, Target, Sparkles, TrendingUp, ArrowLeft, LogOut,
  Gift, Award, Coffee, Film, Headphones, Plane, Loader2,
  Utensils, Car, GraduationCap, Book, Gamepad2, MoreHorizontal, X, Trash2, CheckCircle2,
  Lightbulb, Send, Trophy, Crown, Laptop,
} from "lucide-react";

const CAT_ICONS = {
  food: Utensils, transport: Car, education: GraduationCap, books: Book,
  entertainment: Gamepad2, other: MoreHorizontal, savings: Target, income: ArrowDownLeft,
};

const REWARD_ICONS = {
  coffee: Coffee, film: Film, gift: Gift, headphones: Headphones, plane: Plane,
};

const HEALTH_TONE = {
  excellent: { bg: "#10b981", text: "text-emerald-100", soft: "rgba(16,185,129,0.15)" },
  good: { bg: "#00865A", text: "text-emerald-100", soft: "rgba(0,134,90,0.15)" },
  fair: { bg: "#f59e0b", text: "text-amber-100", soft: "rgba(245,158,11,0.15)" },
  poor: { bg: "#ef4444", text: "text-rose-100", soft: "rgba(239,68,68,0.15)" },
};

const fmtSar = (v) => `${(Math.round(v * 100) / 100).toLocaleString("ar-EG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.س`;

export default function WalletPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalForm, setGoalForm] = useState({ title: "", target: 1000, monthly_contribution: 200 });
  const [depositTarget, setDepositTarget] = useState(null); // goal object
  const [depositAmount, setDepositAmount] = useState("");
  const [coach, setCoach] = useState(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachQ, setCoachQ] = useState("");
  const [coachReply, setCoachReply] = useState(null);

  useEffect(() => {
    if (!auth.token) {
      navigate("/student-login", { replace: true });
      return;
    }
    fetchWallet().then(setWallet).catch(() => {
      auth.clear();
      navigate("/student-login", { replace: true });
    }).finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={36} />
      </div>
    );
  }
  if (!wallet) return null;

  const { summary, financial_health: fh, rewards, budget, transactions, savings_goals } = wallet;
  const tone = HEALTH_TONE[fh.tone] || HEALTH_TONE.good;

  const budgetChart = budget.map((b) => ({ name: b.name.split(" ")[0], spent: Math.round(b.spent), remaining: Math.max(0, Math.round(b.limit - b.spent)), color: b.color }));
  const budgetPie = budget.filter((b) => b.spent > 0).map((b) => ({ name: b.name, value: Math.round(b.spent), color: b.color }));

  async function handleCreateGoal(e) {
    e.preventDefault();
    if (!goalForm.title.trim() || goalForm.target <= 0) return;
    const created = await createSavingsGoal(goalForm);
    setWallet((w) => ({ ...w, savings_goals: [...w.savings_goals, created] }));
    setGoalForm({ title: "", target: 1000, monthly_contribution: 200 });
    setShowGoalForm(false);
  }
  async function handleDeposit() {
    const amount = Number(depositAmount);
    if (!amount || amount <= 0 || !depositTarget) return;
    try {
      const r = await depositToGoal(depositTarget.id, amount);
      setWallet((w) => ({
        ...w,
        balance: r.balance,
        savings_goals: w.savings_goals.map((g) => g.id === depositTarget.id ? { ...g, saved: r.goal_saved } : g),
        transactions: [r.transaction, ...w.transactions].slice(0, 30),
        rewards_points: w.rewards_points + 5,
        rewards: { ...w.rewards, points: w.rewards.points + 5 },
      }));
      setDepositTarget(null);
      setDepositAmount("");
    } catch (e) {
      alert(e?.response?.data?.detail || "تعذر التحويل");
    }
  }
  async function handleDeleteGoal(id) {
    await deleteSavingsGoal(id);
    setWallet((w) => ({ ...w, savings_goals: w.savings_goals.filter((g) => g.id !== id) }));
  }
  async function loadWeeklyAdvice() {
    setCoachLoading(true);
    try {
      const r = await fetchWalletCoach();
      setCoach(r);
    } finally { setCoachLoading(false); }
  }
  async function askCoach(e) {
    e.preventDefault();
    const q = coachQ.trim();
    if (!q || coachLoading) return;
    setCoachLoading(true);
    setCoachReply({ q, a: "" });
    try {
      const r = await fetchWalletCoach(q);
      setCoachReply({ q, a: r.reply || (r.data?.summary || "") });
      setCoachQ("");
    } finally { setCoachLoading(false); }
  }

  return (
    <div dir="rtl" className="min-h-screen wallet-bg" data-testid="wallet-page">
      {/* Top Nav */}
      <header className="w-full px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-20 wallet-header">
        <Link to="/student-portal" className="flex items-center gap-3" data-testid="wallet-back-link">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-extrabold text-white">ن</div>
          <div className="text-white">
            <div className="text-lg font-extrabold leading-none">محفظة الإنماء للطلاب</div>
            <div className="text-xs opacity-80 mt-0.5">Alinma Student Wallet</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/student-portal" className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-white hover:bg-white/25 text-sm font-bold transition" data-testid="back-to-portal-btn">
            <ArrowLeft size={14} /> بوابة الطالب
          </Link>
          <button onClick={() => { auth.clear(); navigate("/"); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-white hover:bg-white/25 text-sm font-bold transition" data-testid="wallet-logout-btn">
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 -mt-10 pb-12 space-y-6">
        {/* Hero Balance Card */}
        <section className="wallet-hero-card relative overflow-hidden p-7 md:p-9 text-white fade-up" data-testid="balance-card">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="relative grid md:grid-cols-[1.5fr_1fr] gap-8">
            <div>
              <div className="inline-flex items-center gap-2 chip bg-white/15 text-white border border-white/20" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Wallet size={14} /> الحساب الجاري للطالب
              </div>
              <div className="text-sm opacity-80 mt-5">الرصيد المتاح</div>
              <div className="text-5xl md:text-6xl font-black mt-2 tracking-tight" data-testid="wallet-balance">
                {fmtSar(wallet.balance)}
              </div>
              <div className="flex flex-wrap gap-6 mt-6">
                <div>
                  <div className="text-xs opacity-75">المنحة الشهرية</div>
                  <div className="text-2xl font-extrabold mt-1 inline-flex items-center gap-2">
                    <ArrowDownLeft size={16} className="text-emerald-300" />
                    {fmtSar(wallet.monthly_scholarship)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-75">إجمالي المصروفات</div>
                  <div className="text-2xl font-extrabold mt-1 inline-flex items-center gap-2">
                    <ArrowUpRight size={16} className="text-rose-200" />
                    {fmtSar(summary.spent)}
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-75">مُدخّر في الأهداف</div>
                  <div className="text-2xl font-extrabold mt-1 inline-flex items-center gap-2">
                    <Target size={16} className="text-yellow-200" />
                    {fmtSar(summary.saved)}
                  </div>
                </div>
              </div>
            </div>

            {/* Card visual */}
            <div className="relative">
              <div className="relative rounded-3xl p-6 text-white" style={{ background: "linear-gradient(135deg, #003B26 0%, #006442 60%, #00865A 100%)", boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)" }}>
                <div className="flex items-start justify-between">
                  <div className="text-xs opacity-80 font-bold tracking-wider">ALINMA · STUDENT</div>
                  <div className="text-emerald-300 font-black text-2xl">الإنماء</div>
                </div>
                <div className="mt-8 mb-5 font-mono text-xl tracking-widest opacity-95">**** **** **** {wallet.student_id.slice(-4)}</div>
                <div className="flex items-end justify-between text-xs">
                  <div>
                    <div className="opacity-70">حامل البطاقة</div>
                    <div className="font-bold mt-1 text-sm">{wallet.student_id}</div>
                  </div>
                  <div>
                    <div className="opacity-70">صلاحية</div>
                    <div className="font-bold mt-1">12/29</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Financial Health */}
        <section className="grid md:grid-cols-[2fr_1fr] gap-5">
          <div className="wallet-card p-6 fade-up" data-testid="financial-health-card">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <span className="chip chip-emerald"><TrendingUp size={14} /> الصحة المالية</span>
                <h3 className="text-xl font-black mt-2">درجة العافية المالية</h3>
              </div>
              <div className="text-left">
                <div className="text-5xl font-black" style={{ color: tone.bg }} data-testid="health-score">{fh.score}</div>
                <div className="text-xs font-bold mt-1" style={{ color: tone.bg }}>{fh.label}</div>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: "معدل الادخار", value: fh.components.savings_rate },
                { label: "الالتزام بالميزانية", value: fh.components.budget_adherence },
                { label: "حالة الرصيد", value: fh.components.balance_health },
                { label: "صندوق الطوارئ", value: fh.components.emergency_fund },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{m.label}</span>
                    <span style={{ color: tone.bg }}>{m.value}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${m.value}%`, background: tone.bg }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rewards mini */}
          <div className="wallet-card p-6 fade-up delay-1 relative overflow-hidden" data-testid="rewards-summary-card">
            <div className="absolute inset-0 opacity-50" style={{ background: `radial-gradient(circle at 80% 20%, ${rewards.level.current.color}33, transparent 60%)` }} />
            <div className="relative">
              <span className="chip chip-emerald"><Crown size={14} /> مكافآت نبض</span>
              <div className="mt-4 flex items-baseline gap-2">
                <div className="text-4xl font-black" data-testid="rewards-points">{rewards.points}</div>
                <div className="text-xs font-bold text-[var(--nabd-text-soft)]">نقطة</div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: rewards.level.current.color }}>
                  <Trophy size={16} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--nabd-text-soft)]">المستوى الحالي</div>
                  <div className="font-extrabold">{rewards.level.current.name}</div>
                </div>
              </div>
              {rewards.level.next && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs font-bold mb-1 text-[var(--nabd-text-soft)]">
                    <span>للمستوى {rewards.level.next.name}</span>
                    <span>{rewards.level.to_next} نقطة</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${rewards.level.progress}%`, background: `linear-gradient(90deg, ${rewards.level.current.color}, ${rewards.level.next.color})` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* AI Coach */}
        <section className="wallet-card p-7 fade-up relative overflow-hidden" data-testid="ai-coach-card">
          <div className="absolute -top-16 -left-16 w-72 h-72 rounded-full opacity-30" style={{ background: "radial-gradient(closest-side, #a7f3d0, transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <span className="chip chip-emerald"><Sparkles size={14} /> الكوتش المالي AI</span>
                <h3 className="text-2xl font-black mt-2 inline-flex items-center gap-2">
                  <Lightbulb className="text-emerald-600" /> نصائح ذكية لتحسين محفظتك
                </h3>
                <p className="text-sm text-[var(--nabd-text-soft)] mt-1">مدعوم بـ Claude Sonnet 4.5 — يحلل بياناتك ويعطيك خطة شخصية.</p>
              </div>
              <button onClick={loadWeeklyAdvice} disabled={coachLoading} className="gradient-emerald px-5 py-2.5 rounded-full font-bold text-white inline-flex items-center gap-2 disabled:opacity-60" data-testid="get-advice-btn">
                {coachLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {coach ? "تحديث النصائح" : "احصل على نصيحة هذا الأسبوع"}
              </button>
            </div>

            {coach?.data && (
              <div className="space-y-4" data-testid="advice-result">
                {coach.source === "fallback" && (
                  <div className="chip chip-warn inline-flex">وضع احتياطي — تم استخدام منطق محلي</div>
                )}
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="text-xs font-bold text-emerald-700 mb-1">الملخص</div>
                  <p className="text-emerald-900 leading-relaxed">{coach.data.summary}</p>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl border border-emerald-100 bg-white">
                    <div className="font-extrabold text-emerald-700 mb-2 inline-flex items-center gap-2"><CheckCircle2 size={16} /> إنجازاتك</div>
                    <ul className="space-y-1.5 text-sm">
                      {coach.data.wins?.map((w, i) => <li key={`w-${i}`} className="flex gap-2"><span>•</span>{w}</li>)}
                    </ul>
                  </div>
                  <div className="p-4 rounded-2xl border border-amber-100 bg-white">
                    <div className="font-extrabold text-amber-700 mb-2 inline-flex items-center gap-2"><TrendingUp size={16} /> فرص للتحسين</div>
                    <ul className="space-y-1.5 text-sm">
                      {coach.data.improvements?.map((w, i) => <li key={`i-${i}`} className="flex gap-2"><span>•</span>{w}</li>)}
                    </ul>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {coach.data.tips?.map((t, i) => (
                    <div key={`t-${i}`} className="p-4 rounded-2xl bg-white border border-[var(--nabd-border)]">
                      <div className="font-bold mb-1 inline-flex items-center gap-2"><Lightbulb size={14} className="text-emerald-600" /> {t.title}</div>
                      <p className="text-sm text-[var(--nabd-text-soft)] leading-relaxed">{t.advice}</p>
                    </div>
                  ))}
                </div>
                {coach.data.motivational && (
                  <div className="p-4 rounded-2xl text-white" style={{ background: "linear-gradient(135deg, #00865A 0%, #006442 100%)" }}>
                    <Sparkles size={18} className="mb-1" />
                    <p className="font-extrabold">{coach.data.motivational}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ask the coach */}
            <form onSubmit={askCoach} className="mt-5 flex gap-2" data-testid="coach-ask-form">
              <input
                value={coachQ}
                onChange={(e) => setCoachQ(e.target.value)}
                placeholder="اسأل الكوتش: مثلاً — كم محتاج أدخر شهرياً عشان أشتري لاب؟"
                className="flex-1 bg-white border border-[var(--nabd-border)] rounded-full px-4 py-2.5 focus:border-emerald-500 focus:outline-none text-sm"
                data-testid="coach-input"
              />
              <button type="submit" disabled={coachLoading || !coachQ.trim()} className="gradient-emerald rounded-full w-11 h-11 flex items-center justify-center text-white disabled:opacity-50" data-testid="coach-send">
                <Send size={16} />
              </button>
            </form>
            {coachReply && coachReply.a && (
              <div className="mt-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100" data-testid="coach-reply">
                <div className="text-xs font-bold text-emerald-700 mb-1">سؤالك: {coachReply.q}</div>
                <p className="text-emerald-900 leading-relaxed whitespace-pre-wrap">{coachReply.a}</p>
              </div>
            )}
          </div>
        </section>

        {/* Smart Budget */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="wallet-card p-6 fade-up" data-testid="budget-chart-card">
            <div className="font-extrabold mb-1 inline-flex items-center gap-2"><Wallet size={18} className="text-emerald-600" /> الميزانية الذكية</div>
            <div className="text-xs text-[var(--nabd-text-soft)] mb-3">{fmtSar(summary.spent)} من أصل {fmtSar(budget.reduce((s, b) => s + b.limit, 0))}</div>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={budgetChart}>
                  <CartesianGrid stroke="#ecebf3" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} formatter={(v) => `${v} ر.س`} />
                  <Bar dataKey="spent" name="منصرف" radius={[6, 6, 0, 0]}>
                    {budgetChart.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Bar>
                  <Bar dataKey="remaining" name="متبقي" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="wallet-card p-6 fade-up delay-1" data-testid="budget-pie-card">
            <div className="font-extrabold mb-3">توزيع المصروفات</div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={budgetPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={3}>
                    {budgetPie.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} formatter={(v) => `${v} ر.س`} />
                  <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Tajawal" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Budget categories detail */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="budget-categories">
          {budget.map((b) => {
            const pct = Math.min(100, (b.spent / Math.max(1, b.limit)) * 100);
            const overspent = b.spent > b.limit;
            const Icon = CAT_ICONS[b.key] || MoreHorizontal;
            return (
              <div key={b.key} className="wallet-card p-5" data-testid={`category-${b.key}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: b.color }}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{b.name}</div>
                    <div className="text-xs text-[var(--nabd-text-soft)] mt-0.5">{fmtSar(b.spent)} من {fmtSar(b.limit)}</div>
                  </div>
                </div>
                <div className="progress-track mt-3">
                  <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: overspent ? "#ef4444" : b.color }}></div>
                </div>
                <div className={`text-xs font-bold mt-2 ${overspent ? "text-rose-600" : "text-emerald-600"}`}>
                  {overspent ? `▲ تجاوزت بمقدار ${fmtSar(b.spent - b.limit)}` : `▼ متبقي ${fmtSar(b.limit - b.spent)}`}
                </div>
              </div>
            );
          })}
        </section>

        {/* Savings Goals */}
        <section className="wallet-card p-7 fade-up" data-testid="savings-section">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <span className="chip chip-emerald"><Target size={14} /> أهداف الادخار</span>
              <h3 className="text-2xl font-black mt-2">ادّخر لما يهمك</h3>
            </div>
            <button onClick={() => setShowGoalForm((v) => !v)} className="gradient-emerald px-5 py-2.5 rounded-full font-bold text-white inline-flex items-center gap-2" data-testid="add-goal-btn">
              {showGoalForm ? <X size={16} /> : <Plus size={16} />}{showGoalForm ? "إلغاء" : "هدف جديد"}
            </button>
          </div>

          {showGoalForm && (
            <form onSubmit={handleCreateGoal} className="grid md:grid-cols-4 gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 mb-5" data-testid="goal-form">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold mb-1">اسم الهدف</label>
                <input required value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none text-sm" placeholder="مثال: شراء لاب توب" data-testid="goal-title-input" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">المبلغ الهدف (ر.س)</label>
                <input required type="number" min="1" value={goalForm.target} onChange={(e) => setGoalForm({ ...goalForm, target: Number(e.target.value) })} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none text-sm" data-testid="goal-target-input" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">ادخار شهري</label>
                <input required type="number" min="1" value={goalForm.monthly_contribution} onChange={(e) => setGoalForm({ ...goalForm, monthly_contribution: Number(e.target.value) })} className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 focus:border-emerald-500 focus:outline-none text-sm" data-testid="goal-monthly-input" />
              </div>
              <div className="md:col-span-4 flex gap-2 mt-2">
                <button type="submit" className="gradient-emerald px-5 py-2 rounded-xl text-white font-bold text-sm" data-testid="goal-submit-btn">إنشاء الهدف</button>
                {["شراء لاب توب","شهادة احترافية","تابلت جديد","مصاريف الفصل"].map((s) => (
                  <button key={s} type="button" onClick={() => setGoalForm({ ...goalForm, title: s })} className="px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-emerald-200 hover:border-emerald-500 transition">
                    {s}
                  </button>
                ))}
              </div>
            </form>
          )}

          <div className="grid md:grid-cols-2 gap-4" data-testid="goals-list">
            {savings_goals.length === 0 && (
              <div className="md:col-span-2 text-center py-8 text-[var(--nabd-text-soft)]">
                <Target size={36} className="mx-auto mb-2 opacity-40" />
                <p className="font-bold">لا توجد أهداف بعد — أضف هدفك الأول الآن!</p>
              </div>
            )}
            {savings_goals.map((g) => {
              const pct = Math.min(100, (g.saved / g.target) * 100);
              const remaining = g.target - g.saved;
              const months = g.monthly_contribution > 0 ? Math.ceil(remaining / g.monthly_contribution) : 999;
              const eta = new Date();
              eta.setMonth(eta.getMonth() + months);
              const reached = g.saved >= g.target;
              return (
                <div key={g.id} className="p-5 rounded-2xl bg-white border border-emerald-100 relative overflow-hidden" data-testid={`goal-${g.id}`}>
                  {reached && (
                    <div className="absolute top-3 left-3 chip chip-success"><CheckCircle2 size={12} /> تم تحقيقه!</div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: g.color || "#00865A" }}>
                        <Laptop size={18} />
                      </div>
                      <div>
                        <div className="font-bold">{g.title}</div>
                        <div className="text-xs text-[var(--nabd-text-soft)] mt-0.5">شهرياً {fmtSar(g.monthly_contribution)}</div>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteGoal(g.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition" data-testid={`delete-goal-${g.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs font-bold mt-4 mb-1">
                    <span style={{ color: g.color }}>{fmtSar(g.saved)}</span>
                    <span className="text-[var(--nabd-text-soft)]">من {fmtSar(g.target)}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: g.color || "#00865A" }}></div>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-[var(--nabd-text-soft)]">
                      {reached ? "تم بحمد الله 🎉" : `متوقع: ${eta.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}`}
                    </span>
                    {!reached && (
                      <button onClick={() => { setDepositTarget(g); setDepositAmount(""); }} className="gradient-emerald px-3 py-1.5 rounded-full text-white font-bold inline-flex items-center gap-1" data-testid={`deposit-goal-${g.id}`}>
                        <Plus size={12} /> أضف
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Deposit Modal */}
        {depositTarget && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40" onClick={() => setDepositTarget(null)}>
            <div className="bg-white rounded-3xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()} dir="rtl" data-testid="deposit-modal">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-black">إيداع في: {depositTarget.title}</h3>
                <button onClick={() => setDepositTarget(null)}><X /></button>
              </div>
              <p className="text-sm text-[var(--nabd-text-soft)] mb-4">رصيدك الحالي: <strong>{fmtSar(wallet.balance)}</strong></p>
              <input type="number" min="1" max={wallet.balance} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="المبلغ بالريال" className="w-full bg-[#f1faf5] border border-emerald-200 rounded-xl px-4 py-3 text-lg font-bold focus:border-emerald-500 focus:outline-none" autoFocus data-testid="deposit-amount-input" />
              <div className="flex gap-2 mt-3">
                {[50, 100, 200, 500].map((v) => (
                  <button key={v} onClick={() => setDepositAmount(String(v))} className="flex-1 py-2 rounded-xl border border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50 text-sm font-bold transition">
                    {v}
                  </button>
                ))}
              </div>
              <button onClick={handleDeposit} disabled={!depositAmount} className="w-full mt-4 gradient-emerald py-3 rounded-xl text-white font-bold disabled:opacity-50" data-testid="deposit-confirm-btn">
                تأكيد الإيداع
              </button>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <section className="wallet-card p-6 fade-up" data-testid="transactions-card">
          <div className="font-extrabold mb-3 inline-flex items-center gap-2"><Wallet size={18} className="text-emerald-600" /> آخر العمليات</div>
          <div className="space-y-2">
            {transactions.slice(0, 10).map((t) => {
              const Icon = CAT_ICONS[t.category] || MoreHorizontal;
              const isIncome = t.type === "income" || t.amount > 0;
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50/40 transition" data-testid={`txn-${t.id}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{t.label}</div>
                    <div className="text-xs text-[var(--nabd-text-soft)]">{new Date(t.created_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                  <div className={`font-extrabold ${isIncome ? "text-emerald-600" : "text-rose-600"}`}>
                    {isIncome ? "+" : ""}{fmtSar(t.amount).replace("ر.س", "")}<span className="text-xs mr-1">ر.س</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Rewards catalog */}
        <section className="wallet-card p-7 fade-up" data-testid="rewards-catalog">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <span className="chip chip-emerald"><Gift size={14} /> متجر المكافآت</span>
              <h3 className="text-2xl font-black mt-2">استبدل نقاطك بمكافآت</h3>
              <p className="text-sm text-[var(--nabd-text-soft)] mt-1">لديك <strong className="text-emerald-700">{rewards.points} نقطة</strong>.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.catalog.map((r) => {
              const Icon = REWARD_ICONS[r.icon] || Gift;
              const can = rewards.points >= r.cost;
              return (
                <div key={r.id} className={`p-5 rounded-2xl border transition ${can ? "border-emerald-200 bg-white hover:shadow-lg" : "border-[var(--nabd-border)] bg-[#fafafa] opacity-70"}`} data-testid={`reward-${r.id}`}>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${can ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"}`}>
                    <Icon size={18} />
                  </div>
                  <div className="font-extrabold">{r.title}</div>
                  <div className="text-xs text-[var(--nabd-text-soft)] mt-1">{r.partner}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-black text-lg" style={{ color: can ? "#00865A" : "#94a3b8" }}>{r.cost} نقطة</span>
                    <button disabled={!can} className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${can ? "gradient-emerald text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}>
                      {can ? "استبدال" : "غير متاح"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="text-center text-xs text-[var(--nabd-text-soft)] pt-6 pb-4">
          مدعوم بـ <strong className="text-emerald-700">بنك الإنماء</strong> · مشروع نبض · تطوير Aljory Mohamd Alaboud &amp; Hanan Aldahmashi
        </footer>
      </main>
    </div>
  );
}
