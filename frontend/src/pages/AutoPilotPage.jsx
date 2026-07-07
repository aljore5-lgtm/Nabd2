import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  Zap,
  Play,
  RefreshCcw,
  Sparkles,
  Coffee,
  ShoppingBag,
  Utensils,
  Fuel,
  BookOpen,
  Bus,
  Send,
  Terminal as TerminalIcon,
  Activity,
  Cpu,
  Loader2,
} from "lucide-react";
import {
  fetchAutopilot,
  submitAutopilotPurchase,
  updateAutopilotSettings,
  runAutopilotTick,
  resetAutopilot,
  fetchAutopilotInsight,
  auth,
} from "@/lib/api";

const MERCHANTS = [
  { name: "كوفي شوب", icon: Coffee, min: 8.5, max: 24.9, category: "قهوة" },
  { name: "مطعم", icon: Utensils, min: 12.75, max: 68.4, category: "طعام" },
  { name: "بقالة", icon: ShoppingBag, min: 6.3, max: 47.9, category: "بقالة" },
  { name: "محطة وقود", icon: Fuel, min: 25.4, max: 95.6, category: "وقود" },
  { name: "مكتبة", icon: BookOpen, min: 9.9, max: 58.2, category: "كتب" },
  { name: "تنقّل", icon: Bus, min: 3.2, max: 14.7, category: "مواصلات" },
];

function randAmount(min, max) {
  const v = min + Math.random() * (max - min);
  return Math.round(v * 100) / 100;
}

function fmt(n) {
  return (Math.round((n || 0) * 100) / 100).toFixed(2);
}

function relTime(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return `منذ ${s} ث`;
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  return new Date(iso).toLocaleDateString("ar-SA");
}

export default function AutoPilotPage() {
  const nav = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customAmount, setCustomAmount] = useState("13.40");
  const [customMerchant, setCustomMerchant] = useState("متجر مخصص");
  const [busy, setBusy] = useState(false);
  const [insightBusy, setInsightBusy] = useState(false);
  const [error, setError] = useState("");
  const [pulseInv, setPulseInv] = useState(false);
  const [pulseBal, setPulseBal] = useState(false);
  const termRef = useRef(null);
  const autoTickRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAutopilot();
      setState(data);
    } catch (e) {
      if (e?.response?.status === 401) nav("/student-login");
      setError(e?.response?.data?.detail || "تعذّر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [nav]);

  useEffect(() => {
    if (!auth.token) {
      nav("/student-login");
      return;
    }
    load();
  }, [load, nav]);

  // Scroll terminal to bottom on new logs
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [state?.ai_logs?.length]);

  // Simulated Auto-Pilot heartbeat: when enabled, run a tick every 15s (demo speed)
  useEffect(() => {
    if (autoTickRef.current) {
      clearInterval(autoTickRef.current);
      autoTickRef.current = null;
    }
    if (state?.autopilot_enabled) {
      autoTickRef.current = setInterval(async () => {
        try {
          const next = await runAutopilotTick();
          triggerPulse(next);
          setState(next);
        } catch {
          // stop silently on insufficient balance
        }
      }, 15000);
    }
    return () => {
      if (autoTickRef.current) clearInterval(autoTickRef.current);
    };
  }, [state?.autopilot_enabled, state?.autopilot_daily_amount]);

  const triggerPulse = (next) => {
    if (!state) return;
    if ((next?.investment_wallet ?? 0) !== (state.investment_wallet ?? 0)) {
      setPulseInv(true);
      setTimeout(() => setPulseInv(false), 900);
    }
    if ((next?.balance ?? 0) !== (state.balance ?? 0)) {
      setPulseBal(true);
      setTimeout(() => setPulseBal(false), 900);
    }
  };

  async function doPurchase(amount, merchant, category) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await submitAutopilotPurchase({
        amount,
        merchant: merchant || "متجر عام",
        category: category || "عام",
      });
      triggerPulse(next);
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذّر إتمام العملية");
    } finally {
      setBusy(false);
    }
  }

  async function doCustomPurchase() {
    const v = Number(customAmount);
    if (!Number.isFinite(v) || v <= 0) {
      setError("أدخل مبلغاً صالحاً أكبر من صفر");
      return;
    }
    await doPurchase(v, customMerchant || "متجر مخصص", "مخصص");
  }

  async function toggleAutopilot() {
    if (!state) return;
    setBusy(true);
    setError("");
    try {
      const next = await updateAutopilotSettings({
        autopilot_enabled: !state.autopilot_enabled,
        autopilot_daily_amount: state.autopilot_daily_amount || 1,
      });
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذّر تحديث الإعدادات");
    } finally {
      setBusy(false);
    }
  }

  async function updateDaily(val) {
    if (!state) return;
    const v = Math.max(0.25, Math.min(3, Number(val)));
    setState({ ...state, autopilot_daily_amount: v });
  }

  async function commitDaily() {
    if (!state) return;
    setBusy(true);
    try {
      const next = await updateAutopilotSettings({
        autopilot_enabled: !!state.autopilot_enabled,
        autopilot_daily_amount: Number(state.autopilot_daily_amount) || 1,
      });
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذّر تحديث الإعدادات");
    } finally {
      setBusy(false);
    }
  }

  async function doManualTick() {
    setBusy(true);
    setError("");
    try {
      const next = await runAutopilotTick();
      triggerPulse(next);
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذّر تنفيذ الاستثمار التلقائي");
    } finally {
      setBusy(false);
    }
  }

  async function doInsight() {
    setInsightBusy(true);
    setError("");
    try {
      const res = await fetchAutopilotInsight();
      setState(res.state);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذّر توليد الرؤية");
    } finally {
      setInsightBusy(false);
    }
  }

  async function doReset() {
    if (!confirm("سيتم إعادة تعيين المحفظة إلى 1000 ر.س والاستثمار إلى 0. متابعة؟")) return;
    setBusy(true);
    try {
      const next = await resetAutopilot();
      setState(next);
    } finally {
      setBusy(false);
    }
  }

  const transactions = useMemo(() => {
    if (!state?.transactions) return [];
    return [...state.transactions].reverse();
  }, [state]);

  if (loading || !state) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e", color: "#e5e7eb" }}>
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  const daily = Number(state.autopilot_daily_amount) || 1;

  return (
    <div dir="rtl" className="min-h-screen" data-testid="autopilot-page" style={{ background: "radial-gradient(1200px 600px at 80% -10%, rgba(124,58,237,0.25) 0%, transparent 60%), radial-gradient(1000px 500px at 0% 100%, rgba(16,185,129,0.18) 0%, transparent 60%), #06080f", color: "#e5e7eb" }}>
      {/* Top bar */}
      <header className="w-full px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md" style={{ background: "rgba(6,8,15,0.72)", borderBottom: "1px solid rgba(148,163,184,0.15)" }}>
        <Link to="/student-portal" className="flex items-center gap-3" data-testid="autopilot-brand-link">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-lg" style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", color: "#0b1020" }}>ن</div>
          <div>
            <div className="text-lg font-extrabold" style={{ color: "#fff" }}>Pulse Auto-Pilot</div>
            <div className="text-[11px] font-bold" style={{ color: "#94a3b8" }}>محفظة استثمار التقريب الذكية</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={doReset} className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition" style={{ background: "rgba(148,163,184,0.10)", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.2)" }} data-testid="autopilot-reset-btn">
            <RefreshCcw size={14} /> إعادة تعيين
          </button>
          <Link to="/student-portal" className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-bold" style={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1", border: "1px solid rgba(148,163,184,0.2)" }} data-testid="autopilot-back-link">
            <ArrowLeft size={14} /> البوابة
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-6">
        {/* Hero + Balance Cards */}
        <section className="grid md:grid-cols-3 gap-5">
          <BalanceCard
            testId="autopilot-balance-card"
            label="الرصيد المتاح"
            value={fmt(state.balance)}
            unit="ر.س"
            icon={<Wallet size={22} />}
            accent="#22d3ee"
            hint={`رصيد افتراضي بدأ من ${fmt(1000)} ر.س`}
            pulsing={pulseBal}
          />
          <BalanceCard
            testId="autopilot-investment-card"
            label="محفظة الاستثمار"
            value={fmt(state.investment_wallet)}
            unit="ر.س"
            icon={<TrendingUp size={22} />}
            accent="#22c55e"
            hint={`مجموع التقريب: ${fmt(state.total_rounded_up || 0)} ر.س • تلقائي: ${fmt(state.total_autopilot_invested || 0)} ر.س`}
            pulsing={pulseInv}
            featured
          />
          <BalanceCard
            testId="autopilot-status-card"
            label="حالة الطيار الآلي"
            value={state.autopilot_enabled ? "مفعّل" : "متوقف"}
            unit=""
            icon={<Zap size={22} />}
            accent={state.autopilot_enabled ? "#f59e0b" : "#64748b"}
            hint={`اليوم: ${fmt(daily)} ر.س • عمليات: ${state.purchases_count || 0} • ضربات: ${state.autopilot_ticks_count || 0}`}
          />
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#fecaca" }} data-testid="autopilot-error">
            {error}
          </div>
        )}

        {/* Purchase Simulator + Auto-Pilot Controls */}
        <section className="grid lg:grid-cols-2 gap-5">
          {/* Purchase simulator */}
          <div className="rounded-2xl p-6" style={cardStyle} data-testid="autopilot-purchase-simulator">
            <SectionHeader icon={<ShoppingBag size={18} />} title="محاكاة الشراء" subtitle="اختر تاجراً أو أدخل مبلغاً مخصصاً — النظام يقرّب لأقرب ريال ويحوّل الفرق للاستثمار" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
              {MERCHANTS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.name}
                    onClick={() => doPurchase(randAmount(m.min, m.max), m.name, m.category)}
                    disabled={busy}
                    className="rounded-xl p-4 text-right transition disabled:opacity-50 hover:-translate-y-0.5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.15)" }}
                    data-testid={`autopilot-merchant-${m.category}`}
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.25),rgba(34,211,238,0.25))", color: "#e2e8f0" }}>
                      <Icon size={16} />
                    </div>
                    <div className="text-sm font-extrabold" style={{ color: "#f1f5f9" }}>{m.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "#94a3b8" }}>{fmt(m.min)}–{fmt(m.max)} ر.س</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 pt-5 border-t" style={{ borderColor: "rgba(148,163,184,0.15)" }}>
              <div className="text-xs font-bold mb-2" style={{ color: "#94a3b8" }}>عملية مخصصة</div>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="13.40"
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.2)", color: "#f1f5f9" }}
                  data-testid="autopilot-custom-amount"
                />
                <input
                  type="text"
                  value={customMerchant}
                  onChange={(e) => setCustomMerchant(e.target.value)}
                  placeholder="اسم المتجر"
                  className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(148,163,184,0.2)", color: "#f1f5f9" }}
                  data-testid="autopilot-custom-merchant"
                />
                <button
                  onClick={doCustomPurchase}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-extrabold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#8b5cf6,#22d3ee)", color: "#0b1020" }}
                  data-testid="autopilot-custom-purchase-btn"
                >
                  {busy ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />} تنفيذ
                </button>
              </div>
              <div className="text-[11px] mt-2" style={{ color: "#94a3b8" }}>
                مثال: 13.40 → يُخصم 14.00 ر.س من الرصيد • يُضاف 0.60 ر.س إلى محفظة الاستثمار.
              </div>
            </div>
          </div>

          {/* Auto-Pilot control */}
          <div className="rounded-2xl p-6" style={cardStyle} data-testid="autopilot-controls">
            <SectionHeader icon={<Cpu size={18} />} title="محرّك الطيار الآلي" subtitle="يستثمر تلقائياً من 0.25 إلى 3 ر.س يومياً" />

            <div className="mt-5 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.15)" }}>
              <div>
                <div className="text-sm font-extrabold" style={{ color: "#f1f5f9" }}>حالة التشغيل</div>
                <div className="text-[11px]" style={{ color: "#94a3b8" }}>{state.autopilot_enabled ? "الطيار يعمل — يستثمر تلقائياً كل 15 ثانية (وضع المحاكاة)" : "الطيار في وضع الانتظار"}</div>
              </div>
              <button
                onClick={toggleAutopilot}
                disabled={busy}
                className="relative w-14 h-8 rounded-full transition"
                style={{ background: state.autopilot_enabled ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "rgba(148,163,184,0.35)" }}
                data-testid="autopilot-toggle"
                aria-pressed={state.autopilot_enabled}
                aria-label="تفعيل الطيار الآلي"
              >
                <span
                  className="absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all"
                  style={{ right: state.autopilot_enabled ? 4 : 28 }}
                />
              </button>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-extrabold" style={{ color: "#f1f5f9" }}>المبلغ اليومي</div>
                <div className="text-lg font-black" style={{ color: "#22d3ee" }} data-testid="autopilot-daily-value">{fmt(daily)} <span className="text-xs font-bold" style={{ color: "#94a3b8" }}>ر.س / يوم</span></div>
              </div>
              <input
                type="range"
                min="0.25"
                max="3"
                step="0.05"
                value={daily}
                onChange={(e) => updateDaily(e.target.value)}
                onMouseUp={commitDaily}
                onTouchEnd={commitDaily}
                className="w-full autopilot-slider"
                data-testid="autopilot-daily-slider"
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: "#94a3b8" }}>
                <span>0.25</span><span>1.00</span><span>1.75</span><span>2.50</span><span>3.00</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={doManualTick}
                disabled={busy || !state.autopilot_enabled}
                className="rounded-xl px-4 py-2.5 text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: "rgba(34,197,94,0.15)", color: "#86efac", border: "1px solid rgba(34,197,94,0.35)" }}
                data-testid="autopilot-manual-tick-btn"
              >
                <Zap size={14} /> تنفيذ استثمار يوم
              </button>
              <button
                onClick={doInsight}
                disabled={insightBusy}
                className="rounded-xl px-4 py-2.5 text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.35)" }}
                data-testid="autopilot-insight-btn"
              >
                {insightBusy ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} رؤية AI
              </button>
            </div>

            <div className="mt-4 rounded-xl px-4 py-3 text-xs" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.10),rgba(34,211,238,0.10))", border: "1px solid rgba(148,163,184,0.15)", color: "#cbd5e1" }}>
              <span className="font-bold" style={{ color: "#e2e8f0" }}>ملاحظة:</span> عند التشغيل، يقوم الطيار الآلي بتحويل المبلغ المحدد من رصيدك إلى محفظة الاستثمار مرة كل 15 ثانية (وضع محاكاة سريع للعرض).
            </div>
          </div>
        </section>

        {/* Terminal + Transactions */}
        <section className="grid lg:grid-cols-2 gap-5">
          {/* AI Terminal */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "#020617", border: "1px solid rgba(34,211,238,0.25)", boxShadow: "0 20px 60px -20px rgba(34,211,238,0.25)" }} data-testid="autopilot-terminal">
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(90deg,#0f172a,#020617)", borderBottom: "1px solid rgba(34,211,238,0.15)" }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
                <div className="w-3 h-3 rounded-full" style={{ background: "#22c55e" }} />
                <div className="flex items-center gap-2 mr-3" style={{ color: "#67e8f9" }}>
                  <TerminalIcon size={14} />
                  <span className="text-[11px] font-bold" style={{ letterSpacing: 1 }}>pulse@autopilot ~ live-feed</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: state.autopilot_enabled ? "#22c55e" : "#64748b" }}>
                <span className={state.autopilot_enabled ? "autopilot-dot-live" : "autopilot-dot-idle"} />
                {state.autopilot_enabled ? "LIVE" : "IDLE"}
              </div>
            </div>
            <div ref={termRef} className="p-4 font-mono text-[12px] leading-6 h-80 overflow-y-auto autopilot-terminal-body" data-testid="autopilot-terminal-body">
              {(state.ai_logs || []).map((line, i) => {
                const color = line.includes("AI-INSIGHT") ? "#c4b5fd"
                  : line.includes("AUTOPILOT-TICK") ? "#86efac"
                  : line.includes("AUTOPILOT") ? "#fcd34d"
                  : line.includes("PURCHASE") ? "#67e8f9"
                  : "#94a3b8";
                return (
                  <div key={i} style={{ color }}>
                    <span style={{ color: "#22c55e" }}>▸ </span>{line}
                  </div>
                );
              })}
              <div style={{ color: "#22c55e" }}>▸ <span className="autopilot-caret">_</span></div>
            </div>
          </div>

          {/* Transaction history */}
          <div className="rounded-2xl p-6" style={cardStyle} data-testid="autopilot-transactions">
            <SectionHeader icon={<Activity size={18} />} title="سجل المعاملات المباشر" subtitle={`${transactions.length} عملية`} />
            <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
              {transactions.length === 0 && (
                <div className="text-sm py-8 text-center" style={{ color: "#94a3b8" }} data-testid="autopilot-tx-empty">
                  لا توجد معاملات بعد — جرّب أول عملية شراء بالأعلى.
                </div>
              )}
              {transactions.map((t) => (
                <TxRow key={t.id} tx={t} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 md:px-10 py-6 text-center text-xs" style={{ color: "#64748b", borderTop: "1px solid rgba(148,163,184,0.12)" }}>
        Pulse Auto-Pilot · محرك التقريب والاستثمار الذكي من نبض · وضع محاكاة تعليمي
      </footer>

      <style>{`
        .autopilot-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg,#8b5cf6 0%,#22d3ee 100%);
          outline: none;
        }
        .autopilot-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px; border-radius: 999px;
          background: #fff;
          border: 3px solid #22d3ee;
          box-shadow: 0 0 0 4px rgba(34,211,238,0.25);
          cursor: pointer;
        }
        .autopilot-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 999px;
          background: #fff; border: 3px solid #22d3ee; cursor: pointer;
        }
        .autopilot-terminal-body::-webkit-scrollbar { width: 6px; }
        .autopilot-terminal-body::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.3); border-radius: 999px; }
        .autopilot-dot-live, .autopilot-dot-idle {
          width: 8px; height: 8px; border-radius: 999px; display: inline-block;
        }
        .autopilot-dot-live { background:#22c55e; box-shadow:0 0 0 0 rgba(34,197,94,0.7); animation: autopilotPulse 1.6s infinite; }
        .autopilot-dot-idle { background:#475569; }
        @keyframes autopilotPulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        .autopilot-caret { animation: autopilotBlink 1s steps(2, start) infinite; }
        @keyframes autopilotBlink { to { visibility: hidden; } }
        .autopilot-pulse-glow { animation: autopilotGlow 0.9s ease-out; }
        @keyframes autopilotGlow {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,211,238,0.55); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 12px rgba(34,211,238,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(34,211,238,0); }
        }
      `}</style>
    </div>
  );
}

const cardStyle = {
  background: "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(10,15,30,0.85) 100%)",
  border: "1px solid rgba(148,163,184,0.15)",
  boxShadow: "0 20px 60px -30px rgba(0,0,0,0.6)",
};

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}>{icon}</div>
      <div>
        <h2 className="text-lg font-extrabold" style={{ color: "#f1f5f9" }}>{title}</h2>
        <p className="text-[12px]" style={{ color: "#94a3b8" }}>{subtitle}</p>
      </div>
    </div>
  );
}

function BalanceCard({ label, value, unit, icon, accent, hint, pulsing, featured, testId }) {
  return (
    <div
      className={"rounded-2xl p-5 relative overflow-hidden " + (pulsing ? "autopilot-pulse-glow" : "")}
      style={{
        background: featured
          ? "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(34,211,238,0.10) 100%)"
          : "linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(10,15,30,0.85) 100%)",
        border: `1px solid ${featured ? "rgba(34,197,94,0.35)" : "rgba(148,163,184,0.15)"}`,
        boxShadow: featured ? "0 20px 60px -20px rgba(34,197,94,0.35)" : "0 20px 60px -30px rgba(0,0,0,0.6)",
      }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-extrabold uppercase" style={{ color: "#94a3b8", letterSpacing: 1 }}>{label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl md:text-4xl font-black" style={{ color: "#fff" }}>{value}</div>
            {unit && <div className="text-sm font-bold" style={{ color: accent }}>{unit}</div>}
          </div>
          <div className="text-[11px] mt-2" style={{ color: "#94a3b8" }}>{hint}</div>
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}>{icon}</div>
      </div>
    </div>
  );
}

function TxRow({ tx }) {
  const isAutopilot = tx.type === "autopilot";
  const color = isAutopilot ? "#86efac" : "#67e8f9";
  const icon = isAutopilot ? <Zap size={14} /> : <ShoppingBag size={14} />;
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.12)" }} data-testid={`autopilot-tx-${tx.id}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>{icon}</div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold truncate" style={{ color: "#f1f5f9" }}>{tx.merchant}</div>
          <div className="text-[10px]" style={{ color: "#94a3b8" }}>{tx.category} · {relTime(tx.timestamp)}</div>
        </div>
      </div>
      <div className="text-left" style={{ direction: "ltr" }}>
        {!isAutopilot ? (
          <>
            <div className="text-sm font-black" style={{ color: "#fca5a5" }}>-{fmt(tx.rounded)} SAR</div>
            <div className="text-[10px]" style={{ color: "#94a3b8" }}>
              {fmt(tx.amount)} → {fmt(tx.rounded)} • <span style={{ color: "#86efac" }}>+{fmt(tx.round_up)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-black" style={{ color: "#86efac" }}>+{fmt(tx.round_up)} SAR</div>
            <div className="text-[10px]" style={{ color: "#94a3b8" }}>استثمار تلقائي</div>
          </>
        )}
      </div>
    </div>
  );
}
