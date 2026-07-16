import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, GraduationCap, Building2, Briefcase, Award, Rocket,
  BookOpen, HeartHandshake, Trophy, Sparkles, ArrowRight, ShieldCheck,
  PiggyBank, Users, MapPin, Phone, Mail, Globe, Calendar, Star,
  TrendingUp, Wallet, Lightbulb, Target, Zap, Handshake, Medal,
  Presentation, Code2, Palette, Landmark,
} from "lucide-react";

/**
 * Alinma Sponsorship — Premium banking-style landing page introducing
 * Alinma Bank's student/university support programs.
 *
 * All content is defined as data at the top of this file so it can
 * be easily updated later without touching the presentational JSX.
 */

// ────────────────────────────────────────────────────────────────────
// Content (modular — edit these arrays to update the page)
// ────────────────────────────────────────────────────────────────────

const HERO_STATS = [
  { value: "+15K", label: "طالب مستفيد", icon: GraduationCap },
  { value: "+40", label: "جامعة شريكة", icon: Building2 },
  { value: "+120", label: "منحة سنوية", icon: Award },
  { value: "+25", label: "هاكاثون ومسابقة", icon: Trophy },
];

const SPONSORSHIP_PROGRAMS = [
  {
    icon: Medal,
    title: "رعاية الطلاب المتفوقين",
    desc: "دعم كامل لأصحاب المعدلات العليا مع تغطية الرسوم وتخصيص مرشد مهني.",
    tag: "أكاديمي",
  },
  {
    icon: Users,
    title: "برنامج قادة المستقبل",
    desc: "رحلة قيادية لمدة سنة تشمل ورش تدريبية، ولقاءات مع تنفيذيي البنك.",
    tag: "قيادي",
  },
  {
    icon: Rocket,
    title: "رعاية الابتكار الطلابي",
    desc: "تمويل مشاريع الأفكار الطلابية القابلة للتحوّل إلى منتجات فعلية.",
    tag: "ابتكار",
  },
  {
    icon: Palette,
    title: "رعاية المبدعين",
    desc: "دعم الطلاب في التصميم والفنون والإعلام الرقمي وصناعة المحتوى.",
    tag: "إبداعي",
  },
];

const UNIVERSITY_INITIATIVES = [
  {
    icon: Handshake,
    title: "شراكات استراتيجية",
    desc: "توقيع مذكرات تفاهم مع الجامعات لتصميم برامج مالية مخصّصة للطلاب.",
  },
  {
    icon: Presentation,
    title: "الكراسي البحثية",
    desc: "تمويل كراسي بحث في التمويل الإسلامي، والاقتصاد الرقمي، والذكاء الاصطناعي.",
  },
  {
    icon: Landmark,
    title: "المختبرات المشتركة",
    desc: "افتتاح مختبرات فنتك مشتركة داخل حرم الجامعات لتدريب الطلاب على أدوات القطاع.",
  },
  {
    icon: ShieldCheck,
    title: "برامج معتمدة",
    desc: "شهادات مهنية معتمدة تُمنح بالتعاون مع الجامعات الشريكة.",
  },
];

const TRAINING_TRACKS = [
  {
    icon: Briefcase,
    title: "التدريب الصيفي",
    duration: "8 أسابيع",
    seats: "150 مقعد",
    desc: "برنامج مكثّف داخل الفروع والمقر الرئيسي مع تدريب على الأنظمة البنكية الحقيقية.",
  },
  {
    icon: Code2,
    title: "معسكر الفنتك",
    duration: "12 أسبوع",
    seats: "60 مقعد",
    desc: "مسار تقني في التمويل الرقمي، تطوير التطبيقات المصرفية، وأمن المعاملات.",
  },
  {
    icon: TrendingUp,
    title: "برنامج التدرّج المهني",
    duration: "12 شهر",
    seats: "80 مقعد",
    desc: "توظيف الخريجين الجدد بعقود ثابتة مع مسار تطويري داخلي.",
  },
];

const SCHOLARSHIP_TIERS = [
  { tier: "ذهبية", coverage: "100%", perks: ["رسوم دراسية كاملة", "راتب شهري", "لابتوب مقدَّم"], color: "amber" },
  { tier: "فضية", coverage: "75%", perks: ["رسوم جزئية", "بدل كتب", "منحة تدريبية"], color: "emerald" },
  { tier: "برونزية", coverage: "50%", perks: ["دعم رسوم", "ورش تطويرية", "شبكة زملاء"], color: "sky" },
];

const ENTREPRENEURSHIP_CARDS = [
  { icon: Rocket, title: "احتضان الشركات الناشئة", desc: "تمويل تأسيسي حتى 250,000 ر.س + إرشاد" },
  { icon: Lightbulb, title: "مختبر الأفكار", desc: "مساحات عمل + منتور + وصول لعملاء البنك" },
  { icon: Target, title: "برنامج المؤسِّس الطالب", desc: "دورة 6 أشهر مع لجان تقييم فعلية" },
];

const FINANCIAL_LITERACY = [
  { icon: Wallet, title: "أساسيات إدارة المال", topics: ["ميزانية شخصية", "ادخار ذكي", "تجنّب الديون"] },
  { icon: PiggyBank, title: "الاستثمار للطلاب", topics: ["الاستثمار المصغّر", "المحافظ المتنوعة", "المخاطر"] },
  { icon: ShieldCheck, title: "الوعي الأمني المالي", topics: ["حماية البيانات", "الاحتيال الإلكتروني", "التحقّق الثنائي"] },
];

const COMMUNITY_INITIATIVES = [
  { icon: HeartHandshake, title: "أسر منتجة", desc: "دعم مشاريع الأسر ذات الدخل المحدود" },
  { icon: BookOpen, title: "مكتبات المدارس", desc: "تجهيز مكتبات في المدارس الحكومية" },
  { icon: Users, title: "تطوّع الموظفين", desc: "ساعات تطوعية مع الطلاب والمعلمين" },
  { icon: Award, title: "جائزة التميّز التربوي", desc: "تكريم المعلمين المتميزين سنوياً" },
];

const EVENTS_TIMELINE = [
  { month: "يناير", title: "هاكاثون الفنتك السنوي", type: "هاكاثون", desc: "3 أيام لتطوير حلول مصرفية مبتكرة." },
  { month: "مارس", title: "قمة الطلاب الاقتصاديين", type: "مؤتمر", desc: "لقاء طلاب الاقتصاد والمال مع قيادات القطاع." },
  { month: "مايو", title: "مسابقة التصميم البنكي", type: "مسابقة", desc: "منافسة على أفضل تجربة مستخدم لتطبيق بنكي." },
  { month: "أغسطس", title: "معسكر الفنتك الصيفي", type: "برنامج", desc: "8 أسابيع مكثفة داخل مركز الابتكار." },
  { month: "أكتوبر", title: "أسبوع ريادة الأعمال", type: "فعالية", desc: "ورش وجلسات مع مؤسسين ومستثمرين." },
  { month: "ديسمبر", title: "حفل تكريم الرعاية", type: "احتفال", desc: "تكريم الطلاب المتفوقين والجامعات الشريكة." },
];

const STUDENT_BENEFITS = [
  { icon: Wallet, title: "حسابات طلابية بدون رسوم", desc: "افتتاح حساب مجاني + بطاقة صراف مجانية." },
  { icon: PiggyBank, title: "الاستثمار المصغّر", desc: "خدمة تقريب المشتريات لتغذية محفظة استثمار تلقائياً." },
  { icon: Star, title: "امتيازات حصرية", desc: "خصومات لدى شركاء البنك في المطاعم والمواصلات." },
  { icon: Zap, title: "خدمة رقمية سريعة", desc: "دعم مالي 24/7 عبر تطبيق الإنماء الطلابي." },
];

// ────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────

export default function AlinmaSponsorship() {
  return (
    <div dir="rtl" className="min-h-screen bg-[#fafaf8]" data-testid="alinma-sponsorship-page">
      <TopBar />
      <Hero />
      <SectionStats />
      <SectionSponsorship />
      <SectionUniversities />
      <SectionTraining />
      <SectionScholarships />
      <SectionEntrepreneurship />
      <SectionFinancialLiteracy />
      <SectionCommunity />
      <SectionEvents />
      <SectionStudentBenefits />
      <SectionContact />
      <Footer />
      <StyleBlock />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Top bar (mini-nav, does not touch existing headers elsewhere)
// ────────────────────────────────────────────────────────────────────

function TopBar() {
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-md"
      style={{ background: "rgba(255,255,255,0.85)", borderBottom: "1px solid rgba(0,134,90,0.15)" }}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5" data-testid="alinma-brand-link">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg" style={{ background: "linear-gradient(135deg,#003B26,#00865A)" }}>ن</div>
          <div>
            <div className="text-base font-black text-emerald-900">نبض · Nabd</div>
            <div className="text-[10px] font-bold text-emerald-700/70">شراكة مع بنك الإنماء</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/wallet"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition"
            data-testid="alinma-wallet-link"
          >
            <Wallet size={13} /> محفظتي
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold text-white transition"
            style={{ background: "linear-gradient(135deg,#003B26,#00865A)" }}
            data-testid="alinma-home-link"
          >
            <ArrowLeft size={13} /> الرئيسية
          </Link>
        </div>
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(135deg,#003B26 0%,#00865A 55%,#0aa76a 100%)" }}
      data-testid="alinma-hero"
    >
      <div aria-hidden className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(600px 300px at 15% 0%, rgba(255,255,255,0.35), transparent 60%),radial-gradient(500px 300px at 85% 100%, rgba(255,215,120,0.35), transparent 60%)" }} />
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 md:py-24 relative">
        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
          <div className="alinma-fade-up">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white/15 text-white border border-white/25">
              <Sparkles size={12} /> ALINMA SPONSORSHIP · رعاية الإنماء
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mt-5 leading-[1.1]">
              نستثمر في العقول <br /> ونصنع القادة.
            </h1>
            <p className="text-white/85 text-base md:text-lg mt-5 leading-relaxed max-w-2xl">
              يتشرّف بنك الإنماء بدعم الطلاب والجامعات في المملكة العربية السعودية عبر برامج رعاية،
              منح، تدريب، وحاضنات ابتكار — تصنع فرقاً حقيقياً في مسيرة كل طالب.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#programs" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-emerald-800 font-black text-sm hover:-translate-y-0.5 transition" data-testid="alinma-cta-programs">
                استعرض البرامج <ArrowRight size={16} />
              </a>
              <a href="#contact" className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 text-white font-black text-sm border border-white/30 hover:bg-white/15 transition" data-testid="alinma-cta-contact">
                تواصل معنا <Phone size={14} />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="alinma-hero-card rounded-3xl p-6 md:p-8 bg-white/10 backdrop-blur-lg border border-white/25 text-white shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-white/70">مبادرة العام</div>
                  <div className="text-2xl md:text-3xl font-black mt-1">صندوق دعم الطلاب 2026</div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center border border-white/25">
                  <Landmark size={26} />
                </div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { k: "50 مليون ر.س", v: "ميزانية سنوية" },
                  { k: "+40", v: "جامعة" },
                  { k: "+15K", v: "طالب" },
                ].map((s, i) => (
                  <div key={i} className="rounded-2xl bg-white/10 border border-white/20 p-3 text-center">
                    <div className="text-lg md:text-xl font-black">{s.k}</div>
                    <div className="text-[10px] font-bold text-white/80 mt-0.5">{s.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 h-2 rounded-full bg-white/15 overflow-hidden">
                <div className="alinma-progress-bar h-full rounded-full" style={{ background: "linear-gradient(90deg,#facc15,#fef08a)" }} />
              </div>
              <div className="text-xs text-white/70 mt-2 font-bold">تم استثمار 68% حتى الآن</div>
            </div>

            {/* floating badge */}
            <div className="hidden lg:block absolute -bottom-6 -left-6 rounded-2xl bg-white p-4 shadow-xl border border-emerald-100 alinma-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><Trophy size={18} /></div>
                <div>
                  <div className="text-xs font-black text-emerald-900">جائزة أفضل رعاية طلابية</div>
                  <div className="text-[10px] font-bold text-emerald-700/70">2025 · لجنة التعليم العالي</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Stats strip
// ────────────────────────────────────────────────────────────────────

function SectionStats() {
  return (
    <section className="max-w-7xl mx-auto px-5 md:px-8 -mt-10 relative z-10" data-testid="alinma-stats">
      <div className="rounded-3xl bg-white shadow-xl border border-emerald-100 p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 gap-5">
        {HERO_STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="text-center alinma-fade-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-stat-${i}`}>
              <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Icon size={20} />
              </div>
              <div className="text-3xl md:text-4xl font-black text-emerald-900">{s.value}</div>
              <div className="text-xs font-bold text-emerald-700/70 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Reusable section header
// ────────────────────────────────────────────────────────────────────

function SectionHead({ eyebrow, title, subtitle, id }) {
  return (
    <div id={id} className="max-w-3xl mx-auto text-center mb-10 alinma-fade-up">
      <span className="inline-block text-[11px] font-black uppercase tracking-widest text-emerald-700/80 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">{eyebrow}</span>
      <h2 className="text-3xl md:text-4xl font-black mt-4 text-emerald-950 leading-tight">{title}</h2>
      {subtitle && <p className="text-emerald-700/80 mt-3 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Student Sponsorship Programs
// ────────────────────────────────────────────────────────────────────

function SectionSponsorship() {
  return (
    <section className="max-w-7xl mx-auto px-5 md:px-8 py-16" data-testid="alinma-sponsorship-programs">
      <SectionHead
        id="programs"
        eyebrow="Sponsorship Programs"
        title="برامج رعاية الطلاب"
        subtitle="مسارات مصمّمة لدعم كل طالب حسب اهتمامه وطموحه — من التفوق الأكاديمي حتى الإبداع الفني."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {SPONSORSHIP_PROGRAMS.map((p, i) => {
          const Icon = p.icon;
          return (
            <div
              key={i}
              className="group relative rounded-3xl bg-white border border-emerald-100 p-6 hover:-translate-y-1 hover:shadow-xl transition alinma-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
              data-testid={`alinma-program-${i}`}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white" style={{ background: "linear-gradient(135deg,#00865A,#10b981)" }}>
                <Icon size={20} />
              </div>
              <span className="inline-block text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 mb-3">{p.tag}</span>
              <h3 className="text-lg font-black text-emerald-950 mb-2">{p.title}</h3>
              <p className="text-sm text-emerald-800/75 leading-relaxed">{p.desc}</p>
              <div className="mt-4 pt-4 border-t border-emerald-50 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                <span>اكتشف المزيد</span>
                <ArrowRight size={14} className="transition group-hover:-translate-x-1" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// University Partnerships
// ────────────────────────────────────────────────────────────────────

function SectionUniversities() {
  return (
    <section className="py-16 relative" style={{ background: "linear-gradient(180deg,#f1faf5 0%,#ffffff 100%)" }} data-testid="alinma-universities">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <SectionHead
          eyebrow="University Partnerships"
          title="شراكاتنا مع الجامعات"
          subtitle="نبني جسوراً بين الأكاديميا والقطاع المالي — لتخريج طلاب جاهزين لسوق العمل."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {UNIVERSITY_INITIATIVES.map((u, i) => {
            const Icon = u.icon;
            return (
              <div key={i} className="rounded-3xl bg-white border border-emerald-100 p-6 hover:shadow-lg transition alinma-fade-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-university-${i}`}>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 border border-emerald-100">
                  <Icon size={18} />
                </div>
                <h3 className="text-base font-black text-emerald-950 mb-1.5">{u.title}</h3>
                <p className="text-sm text-emerald-800/75 leading-relaxed">{u.desc}</p>
              </div>
            );
          })}
        </div>

        {/* logos ribbon (placeholder circles) */}
        <div className="mt-10 rounded-3xl bg-white border border-emerald-100 p-6 md:p-8">
          <div className="text-center text-xs font-black uppercase tracking-widest text-emerald-700/70 mb-5">جامعات شريكة</div>
          <div className="flex flex-wrap items-center justify-center gap-6 opacity-80">
            {["KSU","KFUPM","KAU","IMSIU","PNU","KAUST","QU","UOJ"].map((n, i) => (
              <div key={n} className="flex items-center gap-2 text-emerald-800" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-700">{n.slice(0, 3)}</div>
                <span className="text-xs font-black">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Training & Internships
// ────────────────────────────────────────────────────────────────────

function SectionTraining() {
  return (
    <section className="max-w-7xl mx-auto px-5 md:px-8 py-16" data-testid="alinma-training">
      <SectionHead
        eyebrow="Training & Internships"
        title="التدريب والتدرّج"
        subtitle="فرص واقعية داخل الإنماء تفتح أبواب سوق العمل مبكراً."
      />
      <div className="grid md:grid-cols-3 gap-5">
        {TRAINING_TRACKS.map((t, i) => {
          const Icon = t.icon;
          return (
            <div key={i} className="rounded-3xl border border-emerald-100 overflow-hidden bg-white hover:shadow-lg transition alinma-fade-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-training-${i}`}>
              <div className="p-6" style={{ background: "linear-gradient(180deg,#00865A,#0aa76a)" }}>
                <div className="flex items-center justify-between text-white">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/25"><Icon size={18} /></div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/25 px-2.5 py-1 rounded-full">{t.duration}</span>
                </div>
                <h3 className="text-xl font-black text-white mt-4">{t.title}</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-700 mb-3">
                  <Users size={13} /> {t.seats}
                </div>
                <p className="text-sm text-emerald-800/80 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Scholarships
// ────────────────────────────────────────────────────────────────────

function SectionScholarships() {
  const toneMap = {
    amber: { bg: "linear-gradient(135deg,#facc15,#fbbf24)", ring: "border-amber-200", chip: "bg-amber-50 text-amber-700 border-amber-100", dot: "bg-amber-400" },
    emerald: { bg: "linear-gradient(135deg,#10b981,#00865A)", ring: "border-emerald-200", chip: "bg-emerald-50 text-emerald-700 border-emerald-100", dot: "bg-emerald-500" },
    sky: { bg: "linear-gradient(135deg,#38bdf8,#0ea5e9)", ring: "border-sky-200", chip: "bg-sky-50 text-sky-700 border-sky-100", dot: "bg-sky-500" },
  };
  return (
    <section className="py-16 relative" style={{ background: "linear-gradient(180deg,#003B26 0%,#00553a 100%)" }} data-testid="alinma-scholarships">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <span className="inline-block text-[11px] font-black uppercase tracking-widest text-white/80 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Scholarships</span>
          <h2 className="text-3xl md:text-4xl font-black mt-4 text-white leading-tight">منح دراسية للتفوّق والإبداع</h2>
          <p className="text-white/75 mt-3 leading-relaxed">ثلاث فئات تغطي رحلة الطالب من الدراسة حتى التخرّج.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {SCHOLARSHIP_TIERS.map((s, i) => {
            const t = toneMap[s.color];
            return (
              <div key={i} className={`rounded-3xl bg-white border-2 ${t.ring} p-6 relative overflow-hidden alinma-fade-up`} style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-scholarship-${s.tier}`}>
                <div className="absolute -top-14 -left-14 w-40 h-40 rounded-full" style={{ background: t.bg, opacity: 0.20 }} />
                <div className="relative">
                  <span className={`inline-block text-[10px] font-black uppercase tracking-wider ${t.chip} border px-2.5 py-1 rounded-full`}>منحة {s.tier}</span>
                  <div className="mt-4 flex items-baseline gap-2">
                    <div className="text-5xl font-black text-emerald-950">{s.coverage}</div>
                    <div className="text-xs font-black text-emerald-700/70">تغطية</div>
                  </div>
                  <ul className="mt-5 space-y-2.5">
                    {s.perks.map((p, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-emerald-900">
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Entrepreneurship & innovation
// ────────────────────────────────────────────────────────────────────

function SectionEntrepreneurship() {
  return (
    <section className="max-w-7xl mx-auto px-5 md:px-8 py-16" data-testid="alinma-entrepreneurship">
      <SectionHead
        eyebrow="Entrepreneurship"
        title="ريادة الأعمال والابتكار"
        subtitle="من الفكرة إلى شركة ناشئة — نمكّن الطلاب في كل مرحلة."
      />
      <div className="grid md:grid-cols-3 gap-5">
        {ENTREPRENEURSHIP_CARDS.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="rounded-3xl bg-gradient-to-br from-white to-emerald-50/40 border border-emerald-100 p-7 hover:-translate-y-1 hover:shadow-xl transition alinma-fade-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-entrep-${i}`}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5" style={{ background: "linear-gradient(135deg,#00865A,#0aa76a)" }}>
                <Icon size={22} />
              </div>
              <h3 className="text-lg font-black text-emerald-950 mb-2">{c.title}</h3>
              <p className="text-sm text-emerald-800/75 leading-relaxed">{c.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Financial literacy
// ────────────────────────────────────────────────────────────────────

function SectionFinancialLiteracy() {
  return (
    <section className="py-16" style={{ background: "linear-gradient(180deg,#ffffff 0%,#f1faf5 100%)" }} data-testid="alinma-financial-literacy">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <SectionHead
          eyebrow="Financial Literacy"
          title="الوعي المالي والاستثماري"
          subtitle="نُعلّم الطلاب كيف يديرون أموالهم، ويستثمرونها، ويحمونها — بأسلوب مبسّط وممتع."
        />
        <div className="grid md:grid-cols-3 gap-5">
          {FINANCIAL_LITERACY.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="rounded-3xl bg-white border border-emerald-100 p-6 hover:shadow-lg transition alinma-fade-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-lit-${i}`}>
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center mb-4">
                  <Icon size={18} />
                </div>
                <h3 className="text-base font-black text-emerald-950 mb-3">{f.title}</h3>
                <ul className="space-y-2">
                  {f.topics.map((t, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-emerald-800">
                      <Star size={12} className="text-amber-500" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Community & CSR
// ────────────────────────────────────────────────────────────────────

function SectionCommunity() {
  return (
    <section className="max-w-7xl mx-auto px-5 md:px-8 py-16" data-testid="alinma-community">
      <SectionHead
        eyebrow="Community & CSR"
        title="المسؤولية المجتمعية"
        subtitle="مبادرات مستدامة تخدم التعليم والمجتمع من خلال ذراع المسؤولية الاجتماعية."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {COMMUNITY_INITIATIVES.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="rounded-3xl bg-white border border-emerald-100 p-6 text-center hover:-translate-y-1 hover:shadow-lg transition alinma-fade-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-csr-${i}`}>
              <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 bg-amber-50 text-amber-700 border border-amber-100">
                <Icon size={22} />
              </div>
              <h3 className="text-base font-black text-emerald-950 mb-1">{c.title}</h3>
              <p className="text-sm text-emerald-800/75 leading-relaxed">{c.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Events timeline
// ────────────────────────────────────────────────────────────────────

function SectionEvents() {
  return (
    <section className="py-16 relative" style={{ background: "linear-gradient(180deg,#f1faf5 0%,#ffffff 100%)" }} data-testid="alinma-events">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <SectionHead
          eyebrow="Events & Hackathons"
          title="الفعاليات والمسابقات الجامعية"
          subtitle="تقويم سنوي مليء بالفرص للتعلّم، المنافسة، والتشبيك."
        />
        <div className="relative">
          {/* vertical line for md+ */}
          <div aria-hidden className="hidden md:block absolute top-0 bottom-0 right-1/2 w-0.5 bg-emerald-100" />
          <ul className="space-y-6">
            {EVENTS_TIMELINE.map((e, i) => {
              const rightSide = i % 2 === 0; // alternate in RTL
              return (
                <li key={i} className={`relative md:grid md:grid-cols-2 md:gap-8 items-center alinma-fade-up`} style={{ animationDelay: `${i * 60}ms` }} data-testid={`alinma-event-${i}`}>
                  <div className={`${rightSide ? "md:col-start-1" : "md:col-start-2"} rounded-3xl bg-white border border-emerald-100 p-5 hover:shadow-lg transition`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">{e.type}</span>
                      <span className="text-[10px] font-black text-emerald-700/60">· {e.month}</span>
                    </div>
                    <div className="font-black text-emerald-950">{e.title}</div>
                    <p className="text-sm text-emerald-800/75 mt-1">{e.desc}</p>
                  </div>
                  <div className="hidden md:flex md:col-start-2 md:row-start-1 items-center justify-center" style={{ gridColumn: rightSide ? 2 : 1 }}>
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: "linear-gradient(135deg,#00865A,#0aa76a)" }}>
                        <Calendar size={20} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// How students benefit
// ────────────────────────────────────────────────────────────────────

function SectionStudentBenefits() {
  return (
    <section className="max-w-7xl mx-auto px-5 md:px-8 py-16" data-testid="alinma-benefits">
      <SectionHead
        eyebrow="Student Benefits"
        title="كيف يستفيد الطلاب من الإنماء؟"
        subtitle="مزايا مصمّمة خصيصاً لتناسب حياة الطالب اليومية."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STUDENT_BENEFITS.map((b, i) => {
          const Icon = b.icon;
          return (
            <div key={i} className="rounded-3xl p-6 bg-white border border-emerald-100 hover:-translate-y-1 hover:shadow-xl transition alinma-fade-up" style={{ animationDelay: `${i * 80}ms` }} data-testid={`alinma-benefit-${i}`}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white" style={{ background: "linear-gradient(135deg,#003B26,#00865A)" }}>
                <Icon size={20} />
              </div>
              <h3 className="text-base font-black text-emerald-950 mb-1.5">{b.title}</h3>
              <p className="text-sm text-emerald-800/75 leading-relaxed">{b.desc}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-10 rounded-3xl border border-emerald-100 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5 bg-gradient-to-l from-emerald-50 to-white">
        <div>
          <div className="text-lg md:text-xl font-black text-emerald-950">جاهز تفتح حساب الإنماء الطلابي؟</div>
          <div className="text-sm text-emerald-800/70 mt-1">افتح حسابك خلال 3 دقائق من التطبيق واستفد من كل المزايا فوراً.</div>
        </div>
        <Link
          to="/wallet"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full text-white font-black text-sm hover:-translate-y-0.5 transition"
          style={{ background: "linear-gradient(135deg,#00865A,#0aa76a)" }}
          data-testid="alinma-benefits-cta"
        >
          افتح محفظتي الآن <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Contact
// ────────────────────────────────────────────────────────────────────

function SectionContact() {
  const [state, setState] = useState({ name: "", email: "", msg: "" });
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="py-16" style={{ background: "linear-gradient(180deg,#00553a,#003B26)" }} data-testid="alinma-contact">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div className="text-white">
            <span className="inline-block text-[11px] font-black uppercase tracking-widest text-white/80 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">Contact Alinma</span>
            <h2 className="text-3xl md:text-4xl font-black mt-4">تواصل مع فريق رعاية الإنماء</h2>
            <p className="text-white/75 mt-3 leading-relaxed">مهتم بتقديم منحة، أو رعاية حدث، أو الانضمام لبرنامج؟ فريقنا جاهز للرد خلال 48 ساعة عمل.</p>
            <div className="mt-6 space-y-3">
              {[
                { icon: MapPin, label: "المقر الرئيسي", val: "الرياض · الملقا · طريق الملك فهد" },
                { icon: Phone, label: "هاتف", val: "8001256666 (سيُحدَّث لاحقاً)" },
                { icon: Mail, label: "البريد", val: "sponsorship@alinma-placeholder.example" },
                { icon: Globe, label: "الموقع", val: "alinma.com (رابط تجريبي)" },
              ].map((r, i) => {
                const Icon = r.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 p-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white"><Icon size={16} /></div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-white/60">{r.label}</div>
                      <div className="text-sm font-black text-white mt-0.5" style={{ direction: r.label === "هاتف" || r.label === "البريد" || r.label === "الموقع" ? "ltr" : "rtl" }}>{r.val}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 text-[11px] text-white/50">
              ⚠️ جميع المعلومات أعلاه بيانات نائبة سيتم استبدالها لاحقاً بتفاصيل التكامل الرسمية مع الإنماء.
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 md:p-8 border border-emerald-100">
            <div className="font-black text-lg text-emerald-950 mb-1">أرسل استفسارك</div>
            <div className="text-xs text-emerald-700/70 mb-5">النموذج تجريبي — التكامل الفعلي مع الإنماء قيد الإعداد.</div>

            {sent ? (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 text-center" data-testid="alinma-contact-success">
                <div className="w-12 h-12 rounded-2xl bg-white text-emerald-700 border border-emerald-100 mx-auto flex items-center justify-center mb-2"><HeartHandshake size={22} /></div>
                <div className="font-black text-emerald-900">تم استلام رسالتك — شكراً لك!</div>
                <div className="text-xs text-emerald-700 mt-1">سيتواصل الفريق معك عند تفعيل التكامل.</div>
                <button onClick={() => { setSent(false); setState({ name: "", email: "", msg: "" }); }} className="mt-4 text-xs font-bold text-emerald-700 underline" data-testid="alinma-contact-reset">إرسال آخر</button>
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                className="space-y-3"
                data-testid="alinma-contact-form"
              >
                <div>
                  <label className="text-xs font-bold text-emerald-700/80 mb-1 block">الاسم</label>
                  <input
                    value={state.name}
                    onChange={(e) => setState({ ...state, name: e.target.value })}
                    required
                    placeholder="محمد الأحمد"
                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                    data-testid="alinma-contact-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-700/80 mb-1 block">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={state.email}
                    onChange={(e) => setState({ ...state, email: e.target.value })}
                    required
                    placeholder="student@example.com"
                    dir="ltr"
                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                    data-testid="alinma-contact-email"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-emerald-700/80 mb-1 block">رسالتك</label>
                  <textarea
                    value={state.msg}
                    onChange={(e) => setState({ ...state, msg: e.target.value })}
                    required
                    rows={4}
                    placeholder="عن أي برنامج تسأل؟"
                    className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                    data-testid="alinma-contact-msg"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-white font-black text-sm hover:-translate-y-0.5 transition"
                  style={{ background: "linear-gradient(135deg,#00865A,#0aa76a)" }}
                  data-testid="alinma-contact-submit"
                >
                  إرسال الرسالة <ArrowRight size={15} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────
// Footer
// ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-emerald-100 py-8 text-center text-xs text-emerald-800/70 bg-white" data-testid="alinma-footer">
      © {new Date().getFullYear()} رعاية الإنماء · شراكة مع منصة نبض · صفحة تعريفية · تطوير Aljory Mohamd Alaboud &amp; Hanan Aldahmashi
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────────
// Animations & shared styles
// ────────────────────────────────────────────────────────────────────

function StyleBlock() {
  return (
    <style>{`
      .alinma-fade-up { opacity: 0; transform: translateY(14px); animation: alinmaFadeUp 0.7s cubic-bezier(.2,.7,.2,1) forwards; }
      @keyframes alinmaFadeUp { to { opacity: 1; transform: translateY(0); } }
      .alinma-float { animation: alinmaFloat 4s ease-in-out infinite; }
      @keyframes alinmaFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      .alinma-progress-bar { width: 0%; animation: alinmaBar 1.8s ease-out forwards; }
      @keyframes alinmaBar { to { width: 68%; } }
      .alinma-hero-card { animation: alinmaHeroPop 0.9s cubic-bezier(.2,.7,.2,1) forwards; transform: scale(0.96); opacity: 0; }
      @keyframes alinmaHeroPop { to { transform: scale(1); opacity: 1; } }
    `}</style>
  );
}
