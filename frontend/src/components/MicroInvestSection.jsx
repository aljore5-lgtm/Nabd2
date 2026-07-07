import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAutopilot,
  submitAutopilotPurchase,
  updateAutopilotSettings,
  runAutopilotTick,
  resetAutopilot,
  fetchAutopilotInsight,
} from "@/lib/api";
import {
  Zap, TrendingUp, ShoppingBag, Play, RefreshCcw, Sparkles, Coffee, Utensils,
  Fuel, BookOpen, Bus, Activity, Cpu, Loader2, PiggyBank, Wallet as WalletIcon,
} from "lucide-react";

const MERCHANTS = [
  { name: "كوفي شوب", icon: Coffee, min: 8.5, max: 24.9, category: "قهوة" },
  { name: "مطعم", icon: Utensils, min: 12.75, max: 68.4, category: "طعام" },
  { name: "بقالة", icon: ShoppingBag, min: 6.3, max: 47.9, category: "بقالة" },
  { name: "محطة وقود", icon: Fuel, min: 25.4, max: 95.6, category: "وقود" },
  { name: "مكتبة", icon: BookOpen, min: 9.9, max: 58.2, category: "كتب" },
  { name: "تنقّل", icon: Bus, min: 3.2, max: 14.7, category: "مواصلات" },
];

function randAmount(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}
function fmt(n) {
  return (Math.round((n || 0) * 100) / 100).toFixed(2);
}
function relTime(iso) {
  if (!iso) return "";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `منذ ${s} ث`;
  if (s < 3600) return `منذ ${Math.floor(s / 60)} د`;
  if (s < 86400) return `منذ ${Math.floor(s / 3600)} س`;
  return new Date(iso).toLocaleDateString("ar-EG");
}

export default function MicroInvestSection() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [insightBusy, setInsightBusy] = useState(false);
  const [insightMsg, setInsightMsg] = useState(null);
  const [customAmount, setCustomAmount] = useState("13.40");
  const [customMerchant, setCustomMerchant] = useState("متجر مخصص");
  const [error, setError] = useState("");
  const [pulseInv, setPulseInv] = useState(false);
  const [pulseBal, setPulseBal] = useState(false);
  const autoTickRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchAutopilot();
      setState(data);
    } catch (e) {
      setError(e?.response?.data?.detail || "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        } catch { /* silent on insufficient balance */ }
      }, 15000);
    }
    return () => { if (autoTickRef.current) clearInterval(autoTickRef.current); };
  }, [state?.autopilot_enabled, state?.autopilot_daily_amount]);

  const triggerPulse = (next) => {
    if (!state) return;
    if ((next?.investment_wallet ?? 0) !== (state.investment_wallet ?? 0)) {
      setPulseInv(true); setTimeout(() => setPulseInv(false), 900);
    }
    if ((next?.balance ?? 0) !== (state.balance ?? 0)) {
      setPulseBal(true); setTimeout(() => setPulseBal(false), 900);
    }
  };

  async function doPurchase(amount, merchant, category) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const next = await submitAutopilotPurchase({ amount, merchant, category });
      triggerPulse(next);
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذّر إتمام العملية");
    } finally { setBusy(false); }
  }

  async function doCustomPurchase() {
    const v = Number(customAmount);
    if (!Number.isFinite(v) || v <= 0) { setError("أدخل مبلغاً صالحاً"); return; }
    await doPurchase(v, customMerchant || "متجر مخصص", "مخصص");
  }

  async function toggleAutopilot() {
    if (!state) return;
    setBusy(true); setError("");
    try {
      const next = await updateAutopilotSettings({
        autopilot_enabled: !state.autopilot_enabled,
        autopilot_daily_amount: state.autopilot_daily_amount || 1,
      });
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "");
    } finally { setBusy(false); }
  }

  const commitDaily = async () => {
    if (!state) return;
    setBusy(true);
    try {
      const next = await updateAutopilotSettings({
        autopilot_enabled: !!state.autopilot_enabled,
        autopilot_daily_amount: Number(state.autopilot_daily_amount) || 1,
      });
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "");
    } finally { setBusy(false); }
  };

  async function doManualTick() {
    setBusy(true); setError("");
    try {
      const next = await runAutopilotTick();
      triggerPulse(next);
      setState(next);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذّر تنفيذ الاستثمار");
    } finally { setBusy(false); }
  }

  async function doInsight() {
    setInsightBusy(true); setError("");
    try {
      const res = await fetchAutopilotInsight();
      setInsightMsg(res.insight);
      setState(res.state);
    } catch (e) {
      setError(e?.response?.data?.detail || "");
    } finally { setInsightBusy(false); }
  }

  async function doReset() {
    if (!window.confirm("سيتم إعادة تعيين المحفظة الصغيرة إلى 1000 ر.س والاستثمار إلى 0. متابعة؟")) return;
    setBusy(true);
    try {
      const next = await resetAutopilot();
      setState(next);
      setInsightMsg(null);
    } finally { setBusy(false); }
  }

  const transactions = useMemo(() => {
    if (!state?.transactions) return [];
    return [...state.transactions].reverse();
  }, [state]);

  if (loading || !state) {
    return (
      <section className="wallet-card p-8 fade-up flex items-center justify-center" data-testid="micro-invest-loading">
        <Loader2 className="animate-spin text-emerald-600" />
      </section>
    );
  }

  const daily = Number(state.autopilot_daily_amount) || 1;

  return (
    <section className="wallet-card p-6 md:p-7 fade-up relative overflow-hidden" data-testid="micro-invest-section">
      {/* Decorative background */}
      <div aria-hidden className="absolute -top-24 -left-24 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,134,90,0.15), transparent 70%)" }} />

      <div className="relative flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <span className="chip chip-emerald"><PiggyBank size={14} /> استثمار الفكة · Micro-Investing</span>
          <h3 className="text-2xl md:text-3xl font-black mt-2">Pulse Auto-Pilot — التقريب الذكي</h3>
          <p className="text-sm text-[var(--nabd-text-soft)] mt-1">كل عملية شراء تُقرَّب لأقرب ريال، والفرق يُحوَّل تلقائياً إلى محفظة الاستثمار.</p>
        </div>
        <button
          onClick={doReset}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 disabled:opacity-50"
          data-testid="micro-invest-reset-btn"
        >
          <RefreshCcw size={13} /> إعادة تعيين
        </button>
      </div>

      {/* Twin balance cards */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <MiniBalance
          testId="micro-balance-card"
          label="رصيد المحفظة الصغيرة"
          value={fmt(state.balance)}
          icon={<WalletIcon size={20} />}
          hint={`بدأ من 1,000 ر.س · ${state.purchases_count || 0} عملية`}
          tone="emerald"
          pulsing={pulseBal}
        />
        <MiniBalance
          testId="micro-investment-card"
          label="محفظة الاستثمار"
          value={fmt(state.investment_wallet)}
          icon={<TrendingUp size={20} />}
          hint={`تقريب: ${fmt(state.total_rounded_up || 0)} ر.س · تلقائي: ${fmt(state.total_autopilot_invested || 0)} ر.س`}
          tone="gold"
          pulsing={pulseInv}
          featured
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-rose-50 text-rose-700 border border-rose-200" data-testid="micro-invest-error">
          {error}
        </div>
      )}

      {/* Purchase simulator + AutoPilot controls */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {/* Purchase Simulator */}
        <div className="rounded-2xl bg-white border border-emerald-100 p-5" data-testid="micro-invest-purchase-simulator">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><ShoppingBag size={16} /></div>
            <div>
              <div className="font-extrabold">محاكاة الشراء</div>
              <div className="text-xs text-[var(--nabd-text-soft)]">جرّب تاجراً أو مبلغاً مخصصاً</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {MERCHANTS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.name}
                  onClick={() => doPurchase(randAmount(m.min, m.max), m.name, m.category)}
                  disabled={busy}
                  className="rounded-xl p-3 text-right bg-emerald-50/40 hover:bg-emerald-50 border border-emerald-100 transition disabled:opacity-50"
                  data-testid={`micro-merchant-${m.category}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white text-emerald-700 flex items-center justify-center mb-1.5 border border-emerald-100">
                    <Icon size={14} />
                  </div>
                  <div className="text-sm font-extrabold">{m.name}</div>
                  <div className="text-[10px] text-[var(--nabd-text-soft)]">{fmt(m.min)}–{fmt(m.max)} ر.س</div>
                </button>
              );
            })}
          </div>
          <div className="pt-4 border-t border-emerald-100">
            <div className="text-xs font-bold text-[var(--nabd-text-soft)] mb-2">عملية مخصصة</div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="13.40"
                className="rounded-xl bg-emerald-50/40 border border-emerald-200 px-3 py-2 text-sm font-bold focus:border-emerald-500 focus:outline-none"
                data-testid="micro-custom-amount"
              />
              <input
                type="text"
                value={customMerchant}
                onChange={(e) => setCustomMerchant(e.target.value)}
                placeholder="اسم المتجر"
                className="rounded-xl bg-emerald-50/40 border border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                data-testid="micro-custom-merchant"
              />
              <button
                onClick={doCustomPurchase}
                disabled={busy}
                className="gradient-emerald px-4 py-2 rounded-xl text-white font-extrabold text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                data-testid="micro-custom-purchase-btn"
              >
                {busy ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />} تنفيذ
              </button>
            </div>
            <div className="text-[11px] mt-2 text-[var(--nabd-text-soft)]">
              مثال: 13.40 ر.س ← يُخصم 14.00 من الرصيد ويُضاف 0.60 إلى الاستثمار.
            </div>
          </div>
        </div>

        {/* AutoPilot Controls */}
        <div className="rounded-2xl bg-white border border-emerald-100 p-5" data-testid="micro-invest-autopilot">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Cpu size={16} /></div>
            <div>
              <div className="font-extrabold">الطيار الآلي</div>
              <div className="text-xs text-[var(--nabd-text-soft)]">استثمار تلقائي 0.25 – 3 ر.س / يوم</div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-emerald-50/40 border border-emerald-100 px-4 py-3 mb-4">
            <div>
              <div className="text-sm font-extrabold">حالة التشغيل</div>
              <div className="text-[11px] text-[var(--nabd-text-soft)]">{state.autopilot_enabled ? "الطيار مفعّل — يستثمر كل 15 ث (محاكاة)" : "الطيار في وضع الانتظار"}</div>
            </div>
            <button
              onClick={toggleAutopilot}
              disabled={busy}
              className="relative w-14 h-8 rounded-full transition disabled:opacity-50"
              style={{ background: state.autopilot_enabled ? "linear-gradient(135deg,#00865A,#10b981)" : "#cbd5e1" }}
              data-testid="micro-autopilot-toggle"
              aria-pressed={state.autopilot_enabled}
            >
              <span className="absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all" style={{ right: state.autopilot_enabled ? 4 : 28 }} />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-extrabold">المبلغ اليومي</div>
              <div className="text-lg font-black text-emerald-700" data-testid="micro-daily-value">{fmt(daily)} <span className="text-xs font-bold text-[var(--nabd-text-soft)]">ر.س / يوم</span></div>
            </div>
            <input
              type="range"
              min="0.25"
              max="3"
              step="0.05"
              value={daily}
              onChange={(e) => setState({ ...state, autopilot_daily_amount: Number(e.target.value) })}
              onMouseUp={commitDaily}
              onTouchEnd={commitDaily}
              className="w-full micro-slider"
              data-testid="micro-daily-slider"
            />
            <div className="flex justify-between text-[10px] text-[var(--nabd-text-soft)] mt-1">
              <span>0.25</span><span>1.00</span><span>1.75</span><span>2.50</span><span>3.00</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={doManualTick}
              disabled={busy || !state.autopilot_enabled}
              className="rounded-xl px-3 py-2.5 text-sm font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              data-testid="micro-manual-tick-btn"
            >
              <Zap size={13} /> استثمار يوم الآن
            </button>
            <button
              onClick={doInsight}
              disabled={insightBusy}
              className="rounded-xl px-3 py-2.5 text-sm font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50"
              data-testid="micro-insight-btn"
            >
              {insightBusy ? <Loader2 className="animate-spin" size={13} /> : <Sparkles size={13} />} رؤية AI
            </button>
          </div>

          {insightMsg && (
            <div className="mt-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/60 border border-emerald-200 p-3 text-sm text-emerald-900" data-testid="micro-insight-msg">
              <div className="flex items-start gap-2">
                <Sparkles size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                <div>{insightMsg}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live transaction history */}
      <div className="rounded-2xl bg-white border border-emerald-100 p-5" data-testid="micro-invest-transactions">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Activity size={16} /></div>
            <div>
              <div className="font-extrabold">سجل المعاملات المباشر</div>
              <div className="text-xs text-[var(--nabd-text-soft)]">{transactions.length} عملية</div>
            </div>
          </div>
          {state.autopilot_enabled && (
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
              <span className="micro-live-dot" /> LIVE
            </div>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {transactions.length === 0 && (
            <div className="text-sm text-center py-8 text-[var(--nabd-text-soft)]" data-testid="micro-tx-empty">
              لا توجد معاملات بعد — جرّب أول عملية شراء بالأعلى.
            </div>
          )}
          {transactions.map((t) => <TxRow key={t.id} tx={t} />)}
        </div>
      </div>

      <style>{`
        .micro-slider {
          -webkit-appearance: none; appearance: none;
          height: 6px; border-radius: 999px; outline: none;
          background: linear-gradient(90deg, #10b981 0%, #00865A 100%);
        }
        .micro-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 20px; height: 20px; border-radius: 999px;
          background: #fff; border: 3px solid #00865A;
          box-shadow: 0 0 0 4px rgba(0,134,90,0.15); cursor: pointer;
        }
        .micro-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 999px;
          background: #fff; border: 3px solid #00865A; cursor: pointer;
        }
        .micro-live-dot {
          width: 8px; height: 8px; border-radius: 999px; background: #10b981; display: inline-block;
          box-shadow: 0 0 0 0 rgba(16,185,129,0.7); animation: microPulse 1.6s infinite;
        }
        @keyframes microPulse {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        .micro-pulse-glow { animation: microGlow 0.9s ease-out; }
        @keyframes microGlow {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 12px rgba(16,185,129,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
      `}</style>
    </section>
  );
}

function MiniBalance({ label, value, icon, hint, tone, pulsing, featured, testId }) {
  const isGold = tone === "gold";
  return (
    <div
      className={"rounded-2xl p-5 relative overflow-hidden " + (pulsing ? "micro-pulse-glow " : "") + (featured ? "text-white" : "")}
      style={{
        background: featured
          ? "linear-gradient(135deg, #00865A 0%, #10b981 100%)"
          : "linear-gradient(180deg, #ffffff 0%, #f1faf5 100%)",
        border: featured ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,134,90,0.15)",
        boxShadow: featured ? "0 12px 32px -12px rgba(0,134,90,0.45)" : "0 8px 20px -12px rgba(0,0,0,0.08)",
      }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className={`text-[11px] font-extrabold uppercase tracking-wide ${featured ? "text-white/80" : "text-[var(--nabd-text-soft)]"}`}>{label}</div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <div className={`text-3xl md:text-4xl font-black leading-none ${featured ? "text-white" : "text-emerald-900"}`}>{value}</div>
            <div className={`text-sm font-bold ${featured ? "text-white/80" : "text-emerald-700"}`}>ر.س</div>
          </div>
          <div className={`text-[11px] mt-2 truncate ${featured ? "text-white/70" : "text-[var(--nabd-text-soft)]"}`}>{hint}</div>
        </div>
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${featured ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}
          style={{ border: featured ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(0,134,90,0.2)" }}
        >
          {icon}
        </div>
      </div>
      {isGold && featured && (
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
      )}
    </div>
  );
}

function TxRow({ tx }) {
  const isAutopilot = tx.type === "autopilot";
  const Icon = isAutopilot ? Zap : ShoppingBag;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-50 hover:bg-emerald-50 transition" data-testid={`micro-tx-${tx.id}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isAutopilot ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold truncate">{tx.merchant}</div>
        <div className="text-[10px] text-[var(--nabd-text-soft)]">{tx.category} · {relTime(tx.timestamp)}</div>
      </div>
      <div className="text-left shrink-0" style={{ direction: "ltr" }}>
        {!isAutopilot ? (
          <>
            <div className="text-sm font-black text-rose-600">-{fmt(tx.rounded)} SAR</div>
            <div className="text-[10px] text-[var(--nabd-text-soft)]">
              {fmt(tx.amount)} → {fmt(tx.rounded)} · <span className="text-emerald-600 font-bold">+{fmt(tx.round_up)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-black text-emerald-600">+{fmt(tx.round_up)} SAR</div>
            <div className="text-[10px] text-[var(--nabd-text-soft)]">استثمار تلقائي</div>
          </>
        )}
      </div>
    </div>
  );
}
