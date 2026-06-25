import React, { useEffect, useState } from "react";
import { fetchComparison } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Users, TrendingUp, Sparkles, Trophy } from "lucide-react";

export default function PeerComparisonSection() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchComparison().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  // Normalize values for the bar chart (GPA is 0-4, others 0-100)
  const chartData = data.metrics.map((m) => {
    const norm = m.key === "gpa" ? 25 : 1; // multiply gpa by 25 to fit 0-100 visual
    return {
      label: m.label,
      you: +(m.you * norm).toFixed(1),
      peers: +(m.peers_avg * norm).toFixed(1),
      top: +(m.top_avg * norm).toFixed(1),
    };
  });

  return (
    <section className="nabd-card p-7 fade-up" data-testid="peer-comparison-section">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <span className="chip chip-purple"><Users size={14} /> مقارنة بالزملاء</span>
          <h2 className="text-2xl font-black mt-2">أين تقف بين زملائك؟</h2>
          <p className="text-sm text-[var(--nabd-text-soft)] mt-1">
            مقارنة بياناتك مع {data.total_peers} طالب — منهم {data.cohort_size} في تخصص {data.cohort}.
          </p>
        </div>
      </div>

      <div className="h-72 mb-6">
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#ecebf3" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5b5670" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecebf3", fontFamily: "Tajawal" }} />
            <Legend />
            <Bar dataKey="you" name="أنت" fill="#6d4dff" radius={[8, 8, 0, 0]} />
            <Bar dataKey="peers" name="متوسط الجميع" fill="#a78bfa" radius={[8, 8, 0, 0]} />
            <Bar dataKey="top" name="أفضل 20%" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.metrics.map((m) => {
          const positive = m.percentile >= 60;
          return (
            <div key={m.key} className="p-4 rounded-2xl bg-[#fbfaff] border border-[var(--nabd-border)]" data-testid={`comparison-${m.key}`}>
              <div className="text-xs font-bold text-[var(--nabd-text-soft)]">{m.label}</div>
              <div className="flex items-end justify-between mt-1">
                <div>
                  <div className="text-2xl font-black">{m.you}{m.key === "gpa" ? "" : "%"}</div>
                  <div className="text-xs text-[var(--nabd-text-soft)] mt-1">
                    المتوسط: {m.peers_avg}{m.key === "gpa" ? "" : "%"}
                  </div>
                </div>
                <span className={`chip ${positive ? "chip-success" : "chip-warn"}`}>
                  {positive ? <Trophy size={12} /> : <TrendingUp size={12} />}
                  أعلى من {m.percentile}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 p-4 rounded-2xl bg-gradient-to-l from-[#f5f3ff] to-white border border-[var(--nabd-border)] flex items-center gap-3">
        <Sparkles className="text-[var(--nabd-primary)] flex-shrink-0" />
        <p className="text-sm leading-relaxed">
          {data.metrics[0].percentile >= 75
            ? `أنت من المتفوقين في ${data.cohort} — حافظ على هذا الأداء!`
            : data.metrics[0].percentile >= 50
              ? `أنت في المنتصف الأعلى — بقليل من الجهد تصل لأفضل 20%.`
              : `لديك إمكانية كبيرة للارتفاع. ابدأ بفجوة 'المعدل' لأنها الأعلى تأثيراً.`}
        </p>
      </div>
    </section>
  );
}
