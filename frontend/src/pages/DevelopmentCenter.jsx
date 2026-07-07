import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchDevCatalog, toggleDevFavorite, toggleDevCompleted, fetchDevRecommendations, auth,
} from "@/lib/api";
import {
  GraduationCap, Search, Heart, CheckCircle2, ExternalLink, Sparkles, BookOpen, Award,
  Clock, BarChart3, ArrowLeft, LogOut, Loader2, X, Filter, Trophy, Brain, Bookmark,
} from "lucide-react";

const LEVEL_CHIP = {
  "مبتدئ": "chip-success",
  "متوسط": "chip-purple",
  "متقدم": "chip-warn",
  "خريج": "chip-danger",
};

const STATUS_LABEL = {
  open: { label: "التسجيل مفتوح", chip: "chip-success" },
  soon: { label: "قريباً", chip: "chip-warn" },
  closed: { label: "مغلق", chip: "chip-danger" },
};

export default function DevelopmentCenter() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [provider, setProvider] = useState("all");
  const [showOnlyFav, setShowOnlyFav] = useState(false);
  const [rec, setRec] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    if (!auth.token) {
      navigate("/student-login", { replace: true });
      return;
    }
    fetchDevCatalog().then(setData).catch(() => {
      auth.clear();
      navigate("/student-login", { replace: true });
    }).finally(() => setLoading(false));
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.programs.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (provider !== "all" && p.provider !== provider) return false;
      if (showOnlyFav && !p.is_favorite) return false;
      if (q && !`${p.title} ${p.provider_info?.name}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, category, provider, showOnlyFav]);

  async function onFavorite(id) {
    const r = await toggleDevFavorite(id);
    const favs = new Set(r.favorites);
    setData((d) => ({
      ...d,
      programs: d.programs.map((p) => ({ ...p, is_favorite: favs.has(p.id) })),
      favorites_count: r.favorites.length,
    }));
  }
  async function onComplete(id) {
    const r = await toggleDevCompleted(id);
    const done = new Set(r.completed);
    setData((d) => ({
      ...d,
      programs: d.programs.map((p) => ({ ...p, is_completed: done.has(p.id) })),
      completed_count: r.completed.length,
    }));
  }
  async function loadRecommendations() {
    setRecLoading(true);
    try {
      setRec(await fetchDevRecommendations());
    } finally { setRecLoading(false); }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[var(--nabd-primary)]" size={36} /></div>;
  }
  if (!data) return null;

  return (
    <div dir="rtl" className="min-h-screen dev-bg" data-testid="development-center-page">
      <header className="w-full px-6 md:px-10 py-4 flex items-center justify-between sticky top-0 z-20 dev-header">
        <Link to="/student-portal" className="flex items-center gap-3" data-testid="dev-brand-link">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center font-extrabold text-white">ن</div>
          <div className="text-white">
            <div className="text-lg font-extrabold leading-none">مركز التطوير</div>
            <div className="text-xs opacity-80 mt-0.5">Development Center</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/student-portal" className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-white hover:bg-white/25 text-sm font-bold transition" data-testid="dev-back-btn">
            <ArrowLeft size={14} /> بوابة الطالب
          </Link>
          <button onClick={() => { auth.clear(); navigate("/"); }} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/15 text-white hover:bg-white/25 text-sm font-bold transition" data-testid="dev-logout-btn">
            <LogOut size={14} /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 -mt-12 pb-12 space-y-6">
        {/* Hero */}
        <section className="dev-hero text-white p-8 md:p-10 relative overflow-hidden fade-up" data-testid="dev-hero">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="relative grid md:grid-cols-[2fr_1fr] gap-6 items-center">
            <div>
              <span className="chip" style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}><Sparkles size={14} /> مركز التطوير المهني</span>
              <h1 className="text-3xl md:text-5xl font-black mt-3 leading-tight">طوّر مهاراتك من أفضل الجهات</h1>
              <p className="opacity-90 mt-2 max-w-2xl leading-relaxed">برامج، شهادات، ومسابقات من طويق، مسك، سدايا، Google، Cisco، Microsoft.</p>
              <div className="flex flex-wrap gap-6 mt-6">
                <Stat icon={<BookOpen size={16} />} label="برنامج متاح" value={data.programs.length} />
                <Stat icon={<Bookmark size={16} />} label="محفوظات" value={data.favorites_count} testId="stat-favorites" />
                <Stat icon={<Trophy size={16} />} label="شهادات مُكتسبة" value={data.completed_count} testId="stat-completed" />
              </div>
            </div>
            <button onClick={loadRecommendations} disabled={recLoading} className="bg-white text-indigo-700 px-6 py-4 rounded-2xl font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-60 hover:scale-105 transition" data-testid="dev-recommend-btn">
              {recLoading ? <Loader2 className="animate-spin" size={18} /> : <Brain size={18} />}
              <span className="text-base">{rec ? "تحديث التوصيات" : "نصائح AI لتخصصي"}</span>
            </button>
          </div>
        </section>

        {/* AI recommendations */}
        {rec?.picks?.length > 0 && (
          <section className="dev-card p-6 fade-up" data-testid="recommendations-section">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <span className="chip chip-purple"><Sparkles size={14} /> توصيات شخصية</span>
                <h2 className="text-2xl font-black mt-2 inline-flex items-center gap-2">
                  <Brain className="text-[var(--nabd-primary)]" /> برامج مختارة لك
                </h2>
                <p className="text-sm text-[var(--nabd-text-soft)] mt-1">{rec.summary}</p>
              </div>
              {rec.source === "fallback" && <span className="chip chip-warn">منطق محلي</span>}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {rec.picks.map((p) => (
                <ProgramCard key={`rec-${p.id}`} program={p} onFavorite={onFavorite} onComplete={onComplete} highlight rationale={p.why} />
              ))}
            </div>
          </section>
        )}

        {/* Providers strip */}
        <section className="dev-card p-6 fade-up" data-testid="providers-strip">
          <h3 className="font-extrabold mb-4">جهات التطوير</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.providers.map((pv) => {
              const active = provider === pv.key;
              return (
                <button
                  key={pv.key}
                  onClick={() => setProvider(active ? "all" : pv.key)}
                  className={`text-right p-4 rounded-2xl border transition flex items-center gap-3 ${active ? "border-transparent text-white shadow-lg" : "bg-white border-[var(--nabd-border)] hover:border-[var(--nabd-primary)]"}`}
                  style={active ? { background: `linear-gradient(135deg, ${pv.color} 0%, ${pv.color}dd 100%)` } : {}}
                  data-testid={`provider-${pv.key}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${active ? "bg-white/25 text-white" : "text-white"}`} style={active ? {} : { background: pv.color }}>
                    {pv.logo}
                  </div>
                  <div className="flex-1">
                    <div className="font-extrabold text-sm">{pv.name}</div>
                    <div className={`text-xs mt-0.5 ${active ? "opacity-90" : "text-[var(--nabd-text-soft)]"}`}>{pv.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Search + Category filters */}
        <section className="dev-card p-5 fade-up" data-testid="filters-bar">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-64">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث عن برنامج، شهادة، أو جهة..."
                className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-10 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none transition"
                data-testid="dev-search-input"
              />
            </div>
            <button
              onClick={() => setShowOnlyFav((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition ${showOnlyFav ? "bg-[var(--nabd-primary)] text-white border-[var(--nabd-primary)]" : "bg-white border-[var(--nabd-border)] hover:border-[var(--nabd-primary)]"}`}
              data-testid="filter-fav-toggle"
            >
              <Heart size={14} fill={showOnlyFav ? "currentColor" : "none"} /> المحفوظات فقط
            </button>
          </div>
          <div className="flex flex-wrap gap-2" data-testid="category-filters">
            <CatBtn active={category === "all"} onClick={() => setCategory("all")}>الكل</CatBtn>
            {data.categories.map((c) => (
              <CatBtn key={c.key} active={category === c.key} color={c.color} onClick={() => setCategory(c.key)} testId={`category-${c.key}`}>
                {c.name}
              </CatBtn>
            ))}
          </div>
          {(category !== "all" || provider !== "all" || showOnlyFav || q) && (
            <div className="mt-3 text-xs text-[var(--nabd-text-soft)] inline-flex items-center gap-2">
              <Filter size={12} /> {filtered.length} نتيجة
              <button onClick={() => { setCategory("all"); setProvider("all"); setShowOnlyFav(false); setQ(""); }} className="text-[var(--nabd-primary)] font-bold hover:underline" data-testid="clear-filters-btn">
                مسح الفلاتر
              </button>
            </div>
          )}
        </section>

        {/* Programs grid */}
        <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="programs-grid">
          {filtered.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 dev-card p-10 text-center text-[var(--nabd-text-soft)]" data-testid="empty-state">
              <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-bold">لا توجد نتائج. جرّبي تعديل الفلاتر.</p>
            </div>
          )}
          {filtered.map((p) => (
            <ProgramCard key={p.id} program={p} onFavorite={onFavorite} onComplete={onComplete} />
          ))}
        </section>

        <footer className="text-center text-xs text-[var(--nabd-text-soft)] pt-4 pb-2">
          مركز التطوير · شراكات تعليمية · مشروع نبض · تطوير Aljory Mohamd Alaboud &amp; Hanan Aldahmashi
        </footer>
      </main>
    </div>
  );
}

function Stat({ icon, label, value, testId }) {
  return (
    <div className="inline-flex items-center gap-2" data-testid={testId}>
      <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-xs opacity-75">{label}</div>
        <div className="text-2xl font-extrabold">{value}</div>
      </div>
    </div>
  );
}

function CatBtn({ active, onClick, children, color, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
        active ? "text-white border-transparent" : "bg-white border-[var(--nabd-border)] hover:border-[var(--nabd-primary)]"
      }`}
      style={active ? { background: color || "#6d4dff" } : {}}
    >
      {children}
    </button>
  );
}

function ProgramCard({ program, onFavorite, onComplete, highlight = false, rationale = "" }) {
  const p = program;
  const status = STATUS_LABEL[p.status] || STATUS_LABEL.open;
  const lvlChip = LEVEL_CHIP[p.level] || "chip-purple";
  const prov = p.provider_info || {};
  const cat = p.category_info || {};
  return (
    <div className={`dev-card relative overflow-hidden flex flex-col ${highlight ? "ring-2 ring-purple-400/70" : ""}`} data-testid={`program-${p.id}`}>
      {/* Header strip */}
      <div className="h-2" style={{ background: prov.color || "#6d4dff" }} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg" style={{ background: prov.color }}>
            {prov.logo}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[var(--nabd-text-soft)]">{prov.name}</div>
            <h4 className="font-extrabold mt-0.5 leading-tight">{p.title}</h4>
          </div>
          <button
            onClick={() => onFavorite(p.id)}
            className={`p-2 rounded-full transition flex-shrink-0 ${p.is_favorite ? "bg-rose-50 text-rose-500" : "bg-gray-50 text-gray-400 hover:text-rose-500"}`}
            title={p.is_favorite ? "إزالة من المحفوظات" : "حفظ"}
            data-testid={`fav-${p.id}`}
          >
            <Heart size={16} fill={p.is_favorite ? "currentColor" : "none"} />
          </button>
        </div>

        {rationale && (
          <div className="mb-3 p-3 rounded-xl bg-purple-50 text-purple-900 text-xs leading-relaxed border border-purple-100">
            <Sparkles size={12} className="inline mr-1" /> {rationale}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3">
          <span className={`chip ${lvlChip} inline-flex items-center gap-1`}><BarChart3 size={12} /> {p.level}</span>
          <span className="chip inline-flex items-center gap-1" style={{ background: `${cat.color}20`, color: cat.color }}>{cat.name}</span>
          <span className={`chip ${status.chip}`}>{status.label}</span>
        </div>

        <div className="text-sm text-[var(--nabd-text-soft)] space-y-1 mb-4 flex-1">
          <div className="inline-flex items-center gap-2"><Clock size={14} /> المدة: <strong className="text-[var(--nabd-text)]">{p.duration}</strong></div>
          <div className="inline-flex items-center gap-2 mr-3"><Award size={14} /> السعر: <strong className="text-[var(--nabd-text)]">{p.price}</strong></div>
        </div>

        <div className="flex gap-2 mt-auto">
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 gradient-btn px-4 py-2.5 rounded-xl text-sm font-bold text-center inline-flex items-center justify-center gap-1 text-white"
            data-testid={`apply-${p.id}`}
          >
            {p.status === "soon" ? "اعرف المزيد" : "سجّل الآن"} <ExternalLink size={14} />
          </a>
          <button
            onClick={() => onComplete(p.id)}
            className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition inline-flex items-center gap-1 ${p.is_completed ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-[var(--nabd-border)] hover:border-emerald-500 hover:text-emerald-600"}`}
            title={p.is_completed ? "تم" : "علّم كمكتمل"}
            data-testid={`complete-${p.id}`}
          >
            {p.is_completed ? <><CheckCircle2 size={14} /> مكتمل</> : <><CheckCircle2 size={14} /> أنهيته</>}
          </button>
        </div>
      </div>
    </div>
  );
}
