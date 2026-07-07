import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchContactInfo, sendContactMessage } from "@/lib/api";
import { ArrowLeft, Mail, User, MessageSquare, Sparkles, Code2, Send, CheckCircle2, Loader2 } from "lucide-react";

export default function Contact() {
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchContactInfo().then(setInfo).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setSending(true);
    try {
      await sendContactMessage(form);
      setSent(true);
      setForm({ name: "", email: "", message: "" });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || "تعذر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen" data-testid="contact-page">
      <header className="w-full px-6 md:px-12 py-5 flex items-center justify-between sticky top-0 bg-white/85 backdrop-blur-md z-20 border-b border-[var(--nabd-border)]">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-btn flex items-center justify-center font-extrabold text-lg">ن</div>
          <span className="text-2xl font-extrabold gradient-text">نبض</span>
        </Link>
        <Link to="/" className="text-sm font-bold text-[var(--nabd-text-soft)] hover:text-[var(--nabd-primary)] inline-flex items-center gap-1">
          <ArrowLeft size={16} /> الرئيسية
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        <section className="text-center fade-up">
          <span className="chip chip-purple"><Sparkles size={14} /> تواصل معنا</span>
          <h1 className="text-4xl md:text-5xl font-black mt-4">حول المشروع</h1>
          <p className="text-[var(--nabd-text-soft)] mt-3 max-w-2xl mx-auto">
            مشروع نبض هو نظام ذكاء اصطناعي للتنبؤ المبكر بنجاح الطلاب الجامعيين، صُمم لمساعدة المرشدين الأكاديميين والطلاب على تحديد التحديات قبل أن تتحول إلى رسوب.
          </p>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="nabd-card p-8 fade-up" data-testid="developed-by-card">
            <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-5 text-[var(--nabd-primary)]">
              <Code2 />
            </div>
            <div className="text-xs font-bold text-[var(--nabd-text-soft)] mb-4 tracking-wide">DEVELOPED BY · تم التطوير بواسطة</div>
            <ul className="space-y-3">
              <li data-testid="developer-1" className="text-xl md:text-2xl font-black leading-tight break-words">
                Aljory Mohamd Alaboud
              </li>
              <li data-testid="developer-2" className="text-xl md:text-2xl font-black leading-tight break-words pt-3 border-t border-[var(--nabd-border)]">
                Hanan Aldahmashi
              </li>
            </ul>
          </div>

          <div className="nabd-card p-8 fade-up delay-1" data-testid="project-card">
            <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center mb-5 text-[var(--nabd-primary)]">
              <Sparkles />
            </div>
            <div className="text-xs font-bold text-[var(--nabd-text-soft)] mb-1">اسم المشروع</div>
            <h2 className="text-2xl font-black mb-2" data-testid="project-name">{info?.project_name || "Nabd Assistant"}</h2>
            <p className="text-[var(--nabd-text-soft)] leading-relaxed">
              {info?.tagline_ar || "نظام ذكاء اصطناعي للتنبؤ المبكر بنجاح الطلاب الجامعيين"}.
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="nabd-card p-8 fade-up" data-testid="contact-form-card">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center text-[var(--nabd-primary)]">
              <MessageSquare />
            </div>
            <div>
              <h3 className="text-xl font-black">أرسل لنا رسالة</h3>
              <p className="text-sm text-[var(--nabd-text-soft)] mt-1">يسعدنا تلقي ملاحظاتك أو استفساراتك.</p>
            </div>
          </div>

          {sent ? (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3" data-testid="contact-success">
              <CheckCircle2 /> شكراً! وصلتنا رسالتك وسنرد عليك في أقرب وقت.
            </div>
          ) : (
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2">الاسم</label>
                <div className="relative">
                  <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
                  <input
                    required
                    data-testid="contact-name-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-10 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nabd-text-soft)]" />
                  <input
                    type="email"
                    required
                    data-testid="contact-email-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-10 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">الرسالة</label>
                <textarea
                  required
                  data-testid="contact-message-input"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-white border border-[var(--nabd-border)] rounded-xl px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none min-h-32"
                  placeholder="اكتب رسالتك هنا..."
                />
              </div>
              {err && <div className="md:col-span-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3">{err}</div>}
              <div className="md:col-span-2">
                <button type="submit" disabled={sending} className="gradient-btn px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2 disabled:opacity-60" data-testid="contact-submit-btn">
                  {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} إرسال
                </button>
              </div>
            </form>
          )}
        </section>
      </main>

      <footer className="px-6 md:px-12 py-8 border-t border-[var(--nabd-border)] text-center text-sm text-[var(--nabd-text-soft)]">
        © {info?.year || new Date().getFullYear()} {info?.project_name || "Nabd Assistant"} — تم التطوير بواسطة Aljory Mohamd Alaboud &amp; Hanan Aldahmashi
      </footer>
    </div>
  );
}
