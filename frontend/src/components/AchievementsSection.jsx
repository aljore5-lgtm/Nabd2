import React, { useEffect, useState } from "react";
import { fetchAchievements } from "@/lib/api";
import { Award, Calendar, Target, BookOpen, Clock, TrendingUp, Shield, Lock, CheckCircle2, Sparkles } from "lucide-react";

const ICON_MAP = {
  calendar: Calendar,
  award: Award,
  target: Target,
  book: BookOpen,
  clock: Clock,
  "trending-up": TrendingUp,
  shield: Shield,
};

export default function AchievementsSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAchievements().then(setData).catch(() => {});
  }, []);

  if (!data) return null;
  const { earned, total, items } = data;

  return (
    <section className="nabd-card p-7 fade-up" data-testid="achievements-section">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <span className="chip chip-purple"><Sparkles size={14} /> الإنجازات</span>
          <h2 className="text-2xl font-black mt-2">شاراتك وإنجازاتك</h2>
          <p className="text-sm text-[var(--nabd-text-soft)] mt-1">
            حصلت على {earned} من أصل {total} شارة — استمر لتفتح المزيد!
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="text-4xl font-black gradient-text" data-testid="achievements-count">{earned}/{total}</div>
        </div>
      </div>

      <div className="progress-track mb-5">
        <div className="progress-fill" style={{ width: `${(earned / total) * 100}%`, background: "linear-gradient(135deg, #6d4dff, #4f46e5)" }}></div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => {
          const Icon = ICON_MAP[it.icon] || Award;
          const earnedState = it.earned;
          return (
            <div
              key={it.id}
              data-testid={`achievement-${it.id}`}
              className={`p-5 rounded-2xl border transition relative overflow-hidden ${
                earnedState
                  ? "border-transparent text-white shadow-lg"
                  : "bg-[#fbfaff] border-[var(--nabd-border)]"
              }`}
              style={earnedState ? { background: `linear-gradient(135deg, ${it.color} 0%, ${shade(it.color, -25)} 100%)` } : {}}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${earnedState ? "bg-white/25" : "bg-white"}`}>
                  {earnedState
                    ? <Icon size={22} className="text-white" />
                    : <Icon size={22} style={{ color: it.color, opacity: 0.4 }} />
                  }
                </div>
                {earnedState
                  ? <CheckCircle2 size={20} className="text-white/90" />
                  : <Lock size={18} className="text-[var(--nabd-text-soft)] opacity-50" />
                }
              </div>
              <div className={`font-extrabold text-lg ${earnedState ? "text-white" : ""}`}>{it.title}</div>
              <div className={`text-sm mt-1 ${earnedState ? "text-white/85" : "text-[var(--nabd-text-soft)]"}`}>{it.desc}</div>
              {!earnedState && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs font-bold mb-1 text-[var(--nabd-text-soft)]">
                    <span>{it.value}{it.unit}</span>
                    <span>الهدف {it.threshold}{it.unit}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${it.progress}%`, background: it.color }}></div>
                  </div>
                </div>
              )}
              {earnedState && (
                <div className="mt-3 text-xs font-bold text-white/90">
                  ✓ تم تحقيقها · {it.value}{it.unit}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Simple hex color shading
function shade(hex, percent) {
  const c = hex.replace("#", "");
  const num = parseInt(c, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + Math.round((255 * percent) / 100)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + Math.round((255 * percent) / 100)));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + Math.round((255 * percent) / 100)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
