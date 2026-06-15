import { useI18n } from "@/contexts/I18nContext";
import { useEffect, useRef, useState } from "react";
import {
  Shield,
  Bot,
  Copy,
  RefreshCw,
  SendHorizontal,
  Sparkles,
  Lock,
  Home as HomeIcon,
  Link as LinkIcon,
  Trash2,
  Volume2
} from "lucide-react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  id: string;
  status?: "sending" | "sent" | "error";
};

export function ChatPage() {
  const { locale, t } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: t("chatWelcomeMessage") || "Ask general medicine questions. I will not prescribe or give personal dosing.",
      timestamp: new Date(),
      id: "welcome",
      status: "sent",
    },
  ]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelectMessage = (m: Msg) => {
    if (m.role === "assistant" && m.status !== "error") {
      setSelectedMessageId(m.id);
      window.dispatchEvent(new CustomEvent("verifyrx-message-selected", {
        detail: { id: m.id, content: m.content }
      }));
    }
  };

  // Quick suggestion buttons
  const suggestions = [
    { text: t("suggestionPainRelief") || "What are good pain relief options?", icon: HomeIcon },
    { text: t("suggestionSideEffects") || "What are common side effects?", icon: Shield },
    { text: t("suggestionInteractions") || "Are there any drug interactions?", icon: LinkIcon },
    { text: t("suggestionDosage") || "What's the proper dosage?", icon: LinkIcon },
  ];

  // Load messages from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chatMessages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        }
      } catch (e) {
        console.error("Failed to load chat messages:", e);
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!busy) {
      inputRef.current?.focus();
    }
  }, [busy]);

  async function send(messageText?: string) {
    const text = messageText || input.trim();
    if (!text || busy) return;

    const userMessage: Msg = {
      role: "user",
      content: text,
      timestamp: new Date(),
      id: `user-${Date.now()}`,
      status: "sending",
    };

    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setBusy(true);
    setIsTyping(true);

    try {
      let systemPrompt = "";
      if (locale === "hi") {
        systemPrompt = "आप एक अत्यंत कुशल, विनम्र और मददगार भारतीय स्वास्थ्य सहायक (Healthcare Assistant) हैं। आपको केवल और केवल शुद्ध, प्राकृतिक, बोलचाल की हिंदी (Conversational Indian Hindi) में जवाब देना है। उत्तर में अनावश्यक अंग्रेजी शब्दों या हिंग्लिश (English mixed/transliterated) का प्रयोग करने से बिल्कुल बचें। आपका लहजा बातचीत करने वाला, सम्मानजनक और मानवीय होना चाहिए, जैसे कोई वास्तविक भारतीय डॉक्टर या स्वास्थ्य विशेषज्ञ बात कर रहा हो। कभी भी दवा की खुराक (dosage) न लिखें और न ही व्यक्तिगत चिकित्सा सलाह दें।";
      } else if (locale === "te") {
        systemPrompt = "మీరు ఒక అత్యంత నైపుణ్యం కలిగిన, వినయపూర్వకమైన మరియు సహాయకారియైన ఆరోగ్య సహాయకుడు (Indian Healthcare Assistant). మీరు సమాధానాలను కేవలం సహజమైన, స్పష్టమైన మరియు వ్యవహారిక తెలుగులో (Conversational Telugu) మాత్రమే అందించాలి. అనవసరమైన ఆంగ్ల పదాలను లేదా ఆంగ్ల-తెలుగు కలగలుపును (English mixing/transliteration) పూర్తిగా నివారించండి. ఒక నిజమైన భారతీయ వైద్యుడు లేదా ఆరోగ్య నిపుణుడు మాట్లాడే విధంగా మీ సంభాషణ శైలి గౌరవప్రదంగా మరియు మానవీయంగా ఉండాలి. ఎట్టి పరిస్థితుల్లోనూ మందుల మోతాదును (dosing) సూచించవద్దు మరియు వ్యక్తిగత వైద్య సలహా ఇవ్వవద్దు.";
      } else {
        systemPrompt = t("chatSystemMessage") || "You are a helpful medical assistant. Respond in English. Do not prescribe specific dosage or give personal medical advice.";
      }

      console.log("GROQ KEY:", import.meta.env.VITE_GROQ_API_KEY);
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              ...next.slice(-20).filter(m => m.role !== "assistant" || m.status !== "error").map((m) => ({
                role: m.role,
                content: m.content,
              })),
            ],
          }),
        }
      );

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();

      // Update user message status to sent
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id ? { ...msg, status: "sent" } : msg
      ));

      // Add assistant response
      const assistantMessage: Msg = {
        role: "assistant",
        content: data?.choices?.[0]?.message?.content || t("noResponse") || "No response",
        timestamp: new Date(),
        id: `assistant-${Date.now()}`,
        status: "sent",
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      console.error("FETCH ERROR:", err);

      // Update user message status to error
      setMessages(prev => prev.map(msg =>
        msg.id === userMessage.id ? { ...msg, status: "error" } : msg
      ));

      // Add error message
      const errorMessage: Msg = {
        role: "assistant",
        content: t("networkError") || "Network error — assistant unavailable.",
        timestamp: new Date(),
        id: `error-${Date.now()}`,
        status: "error",
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setBusy(false);
      setIsTyping(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send();
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
  }

  function retryMessage(messageId: string) {
    const messageToRetry = messages.find(msg => msg.id === messageId);
    if (messageToRetry && messageToRetry.status === "error") {
      // Remove the error message and retry
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      send(messageToRetry.content);
    }
  }

  function clearChat() {
    setMessages([{
      role: "assistant",
      content: t("chatWelcomeMessage") || "Ask general medicine questions. I will not prescribe or give personal dosing.",
      timestamp: new Date(),
      id: "welcome",
      status: "sent",
    }]);
    localStorage.removeItem("chatMessages");
    setSelectedMessageId(null);
    window.dispatchEvent(new CustomEvent("verifyrx-message-selected", {
      detail: null
    }));
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-8 sm:px-6 space-y-6 text-left">
      
      {/* Title Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            AI Assistant
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">
            Ask general medicine questions. I will not prescribe or give personal dosing.
          </p>
        </div>

        {/* Floating Top-Right Info Badge */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <Shield className="h-4.5 w-4.5 fill-emerald-600/10" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-snug">Medical AI · Safe · Reliable</h4>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Your health information is protected</p>
          </div>
        </div>
      </div>

      {/* Chat messages viewport */}
      <div className="flex flex-col justify-between flex-1 rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-md min-h-[50vh] max-h-[60vh] overflow-y-auto">
        <div className="space-y-6">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex items-start ${isUser ? "justify-end" : "justify-start"} gap-3`}
              >
                {/* Robot Avatar for Assistant */}
                {!isUser && (
                  <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm mt-0.5">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}

                {/* Message Bubble */}
                <div 
                  className="flex flex-col max-w-[80%] space-y-1 text-left"
                  data-message-id={!isUser && m.status !== "error" ? m.id : undefined}
                  onClick={() => handleSelectMessage(m)}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold leading-relaxed break-words whitespace-pre-wrap relative group shadow-sm transition-all duration-300 ${
                      isUser
                        ? "bg-blue-600 text-white shadow-blue-600/5"
                        : m.status === "error"
                        ? "border-red-100 bg-red-50/50 text-red-800"
                        : `text-slate-700 bg-emerald-50/50 border border-emerald-100/30 cursor-pointer hover:bg-emerald-50/80 hover:border-emerald-250 hover:shadow-md ${
                            selectedMessageId === m.id
                              ? "ring-2 ring-blue-500/50 bg-blue-50/80 border-blue-400 shadow-md shadow-blue-100/30"
                              : ""
                          }`
                    }`}
                  >
                    {m.content}

                    {/* Quick Helper Floating Overlay Action Buttons */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit pl-2 rounded-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // prevent message selection on copy click
                          copyMessage(m.content);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isUser ? "hover:bg-blue-700 text-white" : "hover:bg-emerald-100/80 text-slate-400 hover:text-slate-600"
                        }`}
                        title={t("copy") || "Copy"}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      {m.status === "error" && isUser && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // prevent message selection on retry click
                            retryMessage(m.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                          title={t("retry") || "Retry"}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Status indicators */}
                  <div className={`flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400 pl-1 ${isUser ? "justify-end pr-1 pl-0" : "justify-start"}`}>
                    <span>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {m.status === "sending" && <span className="ml-1.5 text-slate-400">⏳</span>}
                    {m.status === "error" && <span className="ml-1.5 text-red-500">❌</span>}
                    {!isUser && selectedMessageId === m.id && (
                      <span className="flex items-center gap-1 text-blue-600 font-bold ml-1.5 bg-blue-50 px-2 py-0.5 rounded-full ring-1 ring-blue-100/80 animate-pulse">
                        <Volume2 className="h-3 w-3" /> Selected for Read-Aloud
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Bouncer */}
          {isTyping && (
            <div className="flex items-start justify-start gap-3">
              <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-sm mt-0.5">
                <Bot className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col space-y-1">
                <div className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-400 bg-emerald-50/50 border border-emerald-100/30 flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{t("typing") || "AI is typing..."}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottom} />
        </div>
      </div>

      {/* Clear Chat Control */}
      <div className="flex justify-end pt-1">
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-rose-600 border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-100 rounded-xl transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("clearChat") || "Clear Chat"}
        </button>
      </div>

      {/* Quick Suggestions list */}
      {!busy && messages.length <= 1 && (
        <div className="space-y-2 text-left pt-2">
          <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pl-1">
            Quick suggestions
          </p>
          <div className="flex flex-wrap gap-2.5">
            {suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={index}
                  onClick={() => send(suggestion.text)}
                  className="flex items-center gap-2 px-4.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full shadow-sm hover:border-slate-350 active:scale-95 transition"
                >
                  <Icon className="h-3.5 w-3.5 text-slate-400" />
                  {suggestion.text}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat Message Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2.5 sm:gap-3.5 relative">
        <div className="relative flex-1">
          {/* Sparkles icon inside input */}
          <div className="pointer-events-none absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
            <Sparkles className="h-4.5 w-4.5 text-slate-400" />
          </div>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full rounded-2xl border border-slate-200/80 bg-white py-4 pl-11 pr-4 text-sm font-semibold placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
            placeholder={t("askQuestion") || "Ask a question..."}
            disabled={busy}
          />
        </div>

        {/* Paper plane Send button */}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-2xl bg-blue-600 px-6 py-4 text-xs font-bold text-white uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 shadow-md shadow-blue-600/10 active:scale-95"
        >
          {busy ? t("thinking") || "Thinking..." : "Send"}
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>

      {/* Important Medical Disclaimer Footer Banner */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 flex items-center gap-3">
        <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 border border-slate-200/50">
          <Lock className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] font-semibold leading-relaxed text-slate-400 text-left">
          Important: This AI assistant provides general health information only. Always consult a healthcare professional.
        </p>
      </div>

    </div>
  );
}