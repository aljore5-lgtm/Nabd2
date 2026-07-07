import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Sparkles, ShieldCheck, ChartLine, Mic, ArrowLeft, LogIn, User, Mail, Code2, Bot, Wallet } from "lucide-react";

const sampleStudents = [
  { initial: "س", name: "سارة العتيبي", risk: 12, color: "var(--nabd-success)" },
  { initial: "م", name: "محمد القحطاني", risk: 67, color: "var(--nabd-danger)" },
  { initial: "ر", name: "ريم الزهراني", risk: 28, color: "var(--nabd-success)" },
  { initial: "خ", name: "خالد الحربي", risk: 82, color: "var(--nabd-danger)" },
];

export default function Landing() {
  return (
    <div dir="rtl" className="min-h-screen" data-testid="landing-page">
      {/* Top Nav */}
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-[var(--nabd-border)]">
        <div className="flex items-center gap-3" data-testid="brand-logo">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center font-extrabold text-lg">ن</div>
          <span className="text-2xl font-extrabold gradient-text">نبض</span>
        </div>
        <nav className="hidden md:flex items-center gap-7 text-sm font-bold">
          <a href="#features" className="text-[var(--nabd-text)] hover:text-[var(--nabd-primary)] transition" data-testid="nav-features">الميزات</a>
          <a href="#preview" className="text-[var(--nabd-text)] hover:text-[var(--nabd-primary)] transition" data-testid="nav-preview">عن المنصة</a>
          <Link to="/student-login" className="text-[var(--nabd-text)] hover:text-[var(--nabd-primary)] transition" data-testid="nav-student-portal">بوابة الطالب</Link>
          <Link to="/advisor-login" className="text-[var(--nabd-text)] hover:text-[var(--nabd-primary)] transition" data-testid="nav-advisor">لوحة المرشد</Link>
          <Link to="/wallet" className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-extrabold transition hover:bg-emerald-100" data-testid="nav-wallet">
            <Wallet size={14} /> محفظة الإنماء
          </Link>
          <Link to="/development-center" className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 font-extrabold transition hover:bg-indigo-100" data-testid="nav-development">
            <GraduationCap size={14} /> مركز التطوير
          </Link>
          <Link to="/contact" className="text-[var(--nabd-text)] hover:text-[var(--nabd-primary)] transition" data-testid="nav-contact">تواصل</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/student-login"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--nabd-border)] text-sm font-bold hover:border-[var(--nabd-primary)] transition"
            data-testid="header-student-portal-btn"
          >
            <User size={16} />
            <span>بوابة الطالب</span>
          </Link>
          <Link
            to="/advisor-login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--nabd-border)] text-sm font-bold hover:border-[var(--nabd-primary)] transition"
            data-testid="advisor-login-btn"
          >
            <LogIn size={16} />
            <span>دخول المرشد</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 md:px-12 pt-16 pb-24 bg-grid">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Right column (text) */}
          <div className="fade-up">
            <span className="chip chip-purple mb-6"><Sparkles size={14} /> ذكاء اصطناعي للجامعات</span>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.15] mb-6">
              <span className="gradient-text">نبض</span>
              <br />
              نكتشف التعثر قبل أن يتحول إلى رسوب
            </h1>
            <p className="text-lg text-[var(--nabd-text-soft)] mb-8 leading-relaxed">
              نظام ذكاء اصطناعي للتنبؤ المبكر بنجاح الطلاب الجامعيين — مع بوابة طالب جديدة لمتابعة وضعك الأكاديمي شخصياً.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/student-login" className="gradient-btn px-6 py-3 rounded-full font-bold inline-flex items-center gap-2" data-testid="hero-student-portal-btn">
                <GraduationCap size={18} /> دخول بوابة الطالب <ArrowLeft size={16} />
              </Link>
              <Link to="/advisor-login" className="px-6 py-3 rounded-full font-bold border border-[var(--nabd-border)] bg-white hover:border-[var(--nabd-primary)] transition inline-flex items-center gap-2" data-testid="advisor-login-btn-hero">
                <ShieldCheck size={16} /> دخول المرشد
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-12">
              <Stat label="طالب نموذجي" value="18" />
              <Stat label="مقياس الخطر" value="0-100%" />
              <Stat label="ثنائي اللغة" value="AR / EN" />
            </div>
          </div>

          {/* Left column (preview card) */}
          <div className="fade-up delay-2 glow-ring">
            <div className="nabd-card p-6 relative z-10" data-testid="advisor-preview-card">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--nabd-text-soft)]">
                  <span className="dot" style={{ background: "var(--nabd-success)" }}></span>
                  نموذج ذكي يعمل الآن
                </div>
                <div className="w-9 h-9 rounded-xl bg-[#f1edff] flex items-center justify-center text-[var(--nabd-primary)]">
                  <GraduationCap size={18} />
                </div>
              </div>
              {sampleStudents.map((s) => (
                <div key={s.name} className="flex items-center gap-4 py-3 border-b last:border-0 border-[var(--nabd-border)]">
                  <div className="w-10 h-10 rounded-full bg-[#f5f3ff] flex items-center justify-center font-extrabold text-[var(--nabd-primary)]">{s.initial}</div>
                  <div className="flex-1">
                    <div className="font-bold text-sm mb-1">{s.name}</div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${s.risk}%`, background: s.color }}></div>
                    </div>
                  </div>
                  <div className="font-bold text-sm" style={{ color: s.color }}>{s.risk}%</div>
                </div>
              ))}
              <div className="text-center text-xs text-[var(--nabd-text-soft)] mt-4">مقتطف من لوحة المرشد الأكاديمي</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 md:px-12 pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Feature
            icon={<ShieldCheck className="text-[var(--nabd-primary)]" />}
            title="تنبؤ مبكّر"
            desc="نحدد الطلاب المعرّضين للتعثر قبل أن يتأخر التدخل."
            testId="feature-prediction"
          />
          <Feature
            icon={<ChartLine className="text-[var(--nabd-primary)]" />}
            title="تحليلات حية"
            desc="لوحة بيانات تفاعلية: المعدلات، الحضور، الواجبات والاختبارات."
            testId="feature-analytics"
          />
          <Feature
            icon={<Bot className="text-[var(--nabd-primary)]" />}
            title="مساعد ذكي للطالب"
            desc="شات بوت بالعربية يجيب عن الأسئلة الأكاديمية ويقترح خطط دراسة شخصية."
            testId="feature-assistant"
          />
          <Feature
            icon={<Mic className="text-[var(--nabd-primary)]" />}
            title="محادثة صوتية بالعربية"
            desc="بوت 'نبض' يتحدث ويستمع — تجربة طبيعية وذكية."
            testId="feature-voice"
          />
        </div>
      </section>

      {/* Student CTA banner */}
      <section className="px-6 md:px-12 pb-24" id="preview">
        <div className="max-w-7xl mx-auto nabd-card overflow-hidden relative">
          <div className="absolute inset-0 opacity-90" style={{ background: "linear-gradient(135deg, #6d4dff 0%, #4f46e5 60%, #8b5cf6 100%)" }}></div>
          <div className="absolute inset-0 bg-grid opacity-15"></div>
          <div className="relative grid md:grid-cols-[2fr_1fr] gap-8 p-10 md:p-14 text-white">
            <div>
              <span className="chip" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                <Sparkles size={14} /> جديد — بوابة الطالب
              </span>
              <h2 className="text-3xl md:text-4xl font-black mt-5 mb-3 leading-tight">
                وضعك الأكاديمي بين يديك — مع توصيات ذكية شخصية
              </h2>
              <p className="text-white/85 leading-relaxed max-w-2xl">
                ادخل إلى بوابة الطالب واطلع على معدلك، مستوى المخاطرة، نسبة الحضور، اتجاهاتك الأكاديمية، وتوصيات مولّدة بالذكاء الاصطناعي لمساعدتك على تجنب التعثر.
              </p>
            </div>
            <div className="flex items-center md:justify-end">
              <Link
                to="/student-login"
                className="inline-flex items-center gap-2 bg-white text-[var(--nabd-primary)] px-7 py-4 rounded-full font-extrabold hover:bg-[#f5f3ff] transition"
                data-testid="cta-student-portal-btn"
              >
                <GraduationCap size={18} /> ادخل بوابة الطالب <ArrowLeft size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact section on landing */}
      <section id="contact" className="px-6 md:px-12 pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="nabd-card p-8 fade-up" data-testid="landing-developed-by-card">
            <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-4 text-[var(--nabd-primary)]">
              <Code2 />
            </div>
            <div className="text-xs font-bold text-[var(--nabd-text-soft)] mb-4 tracking-wide">DEVELOPED BY · تم التطوير بواسطة</div>
            <ul className="space-y-3">
              <li data-testid="landing-developer-1" className="text-xl md:text-2xl font-black leading-tight break-words">
                Aljory Mohamd Alaboud
              </li>
              <li data-testid="landing-developer-2" className="text-xl md:text-2xl font-black leading-tight break-words pt-3 border-t border-[var(--nabd-border)]">
                Hanan Aldahmashi
              </li>
            </ul>
          </div>
          <div className="nabd-card p-8 fade-up delay-1" data-testid="landing-project-card">
            <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-4 text-[var(--nabd-primary)]">
              <Sparkles />
            </div>
            <div className="text-xs font-bold text-[var(--nabd-text-soft)] mb-1">اسم المشروع</div>
            <h3 className="text-2xl font-black mb-2">Nabd Assistant</h3>
            <p className="text-[var(--nabd-text-soft)] leading-relaxed">
              نظام ذكاء اصطناعي للتنبؤ المبكر بنجاح الطلاب الجامعيين، يدمج بوابة الطالب، مساعد المحادثة، ولوحة المرشد.
            </p>
            <Link to="/contact" className="mt-4 inline-flex items-center gap-2 font-bold text-[var(--nabd-primary)] hover:underline" data-testid="landing-contact-link">
              <Mail size={16} /> صفحة التواصل الكاملة
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-12 py-8 border-t border-[var(--nabd-border)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-[var(--nabd-text-soft)]">
          <div>© {new Date().getFullYear()} نبض — منصة الذكاء الاصطناعي للجامعات · تم التطوير بواسطة Aljory Mohamd Alaboud &amp; Hanan Aldahmashi</div>
          <Link to="/student-login" className="font-bold text-[var(--nabd-primary)] hover:underline" data-testid="footer-student-portal-link">
            بوابة الطالب →
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-3xl font-black gradient-text">{value}</div>
      <div className="text-xs text-[var(--nabd-text-soft)] mt-1 font-bold">{label}</div>
    </div>
  );
}

function Feature({ icon, title, desc, testId }) {
  return (
    <div className="nabd-card p-6 fade-up" data-testid={testId}>
      <div className="w-11 h-11 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-4">{icon}</div>
      <h3 className="text-lg font-extrabold mb-2">{title}</h3>
      <p className="text-sm text-[var(--nabd-text-soft)] leading-relaxed">{desc}</p>
    </div>
  );
}
