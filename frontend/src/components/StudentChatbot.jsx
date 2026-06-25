import React, { useEffect, useRef, useState } from "react";
import { fetchChatHistory, sendChatMessage, clearChatHistory } from "@/lib/api";
import { MessageCircle, X, Send, Sparkles, Loader2, RefreshCw, Bot, User as UserIcon } from "lucide-react";

const QUICK_PROMPTS = [
  "كيف يمكنني تحسين معدلي؟",
  "ما الذي يجعل مستوى مخاطرتي بهذا الشكل؟",
  "اقترح خطة مذاكرة لهذا الأسبوع",
  "ما هي المقررات التي يجب أن أركّز عليها؟",
];

export default function StudentChatbot({ studentName = "" }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      loadHistory();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const r = await fetchChatHistory();
      setMessages(r.messages || []);
    } catch (e) {
      console.warn("load history failed", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function send(text) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setError("");
    setInput("");
    const userMsg = { id: `local-${Date.now()}`, role: "user", content: msg, created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const r = await sendChatMessage(msg);
      setMessages((prev) => [...prev, r.message]);
    } catch (e) {
      setError(e?.response?.data?.detail || "تعذر إرسال الرسالة");
    } finally {
      setLoading(false);
    }
  }

  const [confirmClear, setConfirmClear] = useState(false);

  async function clearAll() {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    try {
      await clearChatHistory();
      setMessages([]);
    } catch (e) {
      console.error("clear chat failed", e);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-30 gradient-btn rounded-full px-5 py-3 font-bold inline-flex items-center gap-2 shadow-xl"
        style={{ display: open ? "none" : "inline-flex" }}
        data-testid="chatbot-launcher"
      >
        <Bot size={20} /> مساعد نبض
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 sm:bottom-6 sm:left-6 z-40 w-full sm:w-[420px] h-[80vh] sm:h-[600px] bg-white border border-[var(--nabd-border)] sm:rounded-3xl shadow-2xl flex flex-col transition-all ${
          open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
        dir="rtl"
        data-testid="chatbot-panel"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--nabd-border)] flex items-center justify-between gradient-btn sm:rounded-t-3xl text-white">
          <div className="flex items-center gap-2">
            <Sparkles size={18} />
            <div>
              <div className="font-extrabold leading-tight">مساعد نبض</div>
              <div className="text-xs opacity-90">مدعوم بـ Claude Sonnet 4.5</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={clearAll} className={`p-2 rounded-full hover:bg-white/15 transition ${confirmClear ? "bg-white/25" : ""}`} title={confirmClear ? "اضغط مرة أخرى للتأكيد" : "مسح المحادثة"} data-testid="chat-clear-btn">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setOpen(false)} className="p-2 rounded-full hover:bg-white/15 transition" data-testid="chat-close-btn">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#fbfaff]" data-testid="chat-messages">
          {loadingHistory && (
            <div className="text-center py-6 text-[var(--nabd-text-soft)] text-sm">
              <Loader2 className="animate-spin mx-auto mb-2 text-[var(--nabd-primary)]" />
              جارٍ تحميل المحادثة...
            </div>
          )}

          {!loadingHistory && messages.length === 0 && (
            <div className="text-center py-8" data-testid="chat-welcome">
              <div className="w-14 h-14 rounded-2xl gradient-btn mx-auto flex items-center justify-center mb-3">
                <Bot className="text-white" />
              </div>
              <p className="font-extrabold mb-1">أهلاً {studentName}!</p>
              <p className="text-sm text-[var(--nabd-text-soft)] mb-5">
                اسألني عن وضعك الأكاديمي، خطط المذاكرة، أو أي صعوبة تواجهك.
              </p>
              <div className="grid gap-2">
                {QUICK_PROMPTS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="text-sm text-right px-4 py-2.5 rounded-xl border border-[var(--nabd-border)] bg-white hover:border-[var(--nabd-primary)] hover:bg-[#f5f3ff] transition"
                    data-testid={`quick-prompt-${i}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <ChatBubble key={m.id} msg={m} />
          ))}

          {loading && (
            <div className="flex items-end gap-2" data-testid="chat-typing">
              <div className="w-8 h-8 rounded-full gradient-btn flex items-center justify-center text-white flex-shrink-0">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl bg-white border border-[var(--nabd-border)] px-4 py-3 text-sm text-[var(--nabd-text-soft)] inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} /> يكتب...
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl px-3 py-2" data-testid="chat-error">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="px-3 py-3 border-t border-[var(--nabd-border)] bg-white flex items-center gap-2"
        >
          <input
            data-testid="chat-input"
            className="flex-1 bg-[#fbfaff] border border-[var(--nabd-border)] rounded-full px-4 py-2.5 focus:border-[var(--nabd-primary)] focus:outline-none text-sm"
            placeholder="اكتب رسالتك..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="gradient-btn rounded-full w-11 h-11 flex items-center justify-center disabled:opacity-50"
            data-testid="chat-send-btn"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </>
  );
}

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`} data-testid={`chat-msg-${msg.role}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? "bg-[#f5f3ff] text-[var(--nabd-primary)]" : "gradient-btn text-white"}`}>
        {isUser ? <UserIcon size={16} /> : <Bot size={16} />}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? "bg-[var(--nabd-primary)] text-white" : "bg-white border border-[var(--nabd-border)]"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}
