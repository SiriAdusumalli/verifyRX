import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSpeechAssistant } from "../hooks/useSpeechAssistant";
import { Play, Square, RotateCcw, Volume2 } from "lucide-react";

export function FloatingAccessibilityWidget() {
  const location = useLocation();
  
  // Restricted Route Rule: Widget only exists on the AI Assistant page (/chat or /assistant)
  const isAssistantPage = 
    location.pathname === "/chat" || 
    location.pathname === "/assistant";

  if (!isAssistantPage) {
    return null;
  }

  const {
    speakText,
    stopSpeech,
    replaySpeech,
    isPlaying,
    activeLang,
    toastMessage,
    lastLang,
    hasSpeechText,
  } = useSpeechAssistant();

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessageText, setSelectedMessageText] = useState<string>("");

  // Listen to message selection events from ChatPage
  useEffect(() => {
    const handleSelected = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; content: string } | null>;
      if (customEvent.detail) {
        setSelectedMessageId(customEvent.detail.id);
        setSelectedMessageText(customEvent.detail.content);
        // Cancel active speech immediately when selected message block changes
        if (typeof window !== "undefined" && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } else {
        setSelectedMessageId(null);
        setSelectedMessageText("");
      }
    };

    window.addEventListener("verifyrx-message-selected", handleSelected);
    return () => {
      window.removeEventListener("verifyrx-message-selected", handleSelected);
    };
  }, []);

  // Stop speech synthesis on route changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [location.pathname]);

  const handleLanguageSpeak = (langKey: "en" | "hi" | "te") => {
    if (!selectedMessageText) return;
    speakText(selectedMessageText, langKey);
  };

  const handlePlayClick = () => {
    if (!selectedMessageText) return;
    // Default to active selection, previously spoken, or English
    const targetLang = activeLang || lastLang || "en";
    speakText(selectedMessageText, targetLang);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Floating Toast Notification Box */}
      {toastMessage && (
        <div className="mb-3 mr-1 bg-slate-900 text-white text-[11px] font-extrabold px-4 py-2.5 rounded-2xl shadow-xl border border-slate-800 animate-fade-in-up flex items-center gap-2 z-50">
          <span className="text-amber-400">⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Expanded TTS Panel */}
      {isExpanded && (
        <div className="mb-4 bg-white/95 backdrop-blur-md border border-slate-100/80 rounded-3xl shadow-2xl p-5 w-80 max-w-sm sm:w-88 transition-all duration-300 animate-scale-up select-none">
          
          {/* Header Row */}
          <div className="flex items-center gap-2 mb-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/50">
              <Volume2 className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">
              Multilingual Read-Aloud
            </h3>
          </div>

          {/* Active Selection Block Card */}
          {selectedMessageId ? (
            <div className="bg-slate-50 border border-slate-100/80 rounded-2xl p-3 mb-4 text-left">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                Selected Assistant Response
              </span>
              <p className="text-xs font-semibold text-slate-600 line-clamp-3 leading-relaxed break-words">
                {selectedMessageText}
              </p>
            </div>
          ) : (
            <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-3.5 mb-4 text-left flex items-start gap-2.5">
              <span className="text-base mt-0.5">💡</span>
              <div>
                <h5 className="text-[11px] font-black text-amber-950 tracking-tight">Select Response Bubble</h5>
                <p className="text-[10px] font-semibold text-amber-800/80 mt-0.5 leading-relaxed">
                  Click any AI assistant response bubble to read it aloud.
                </p>
              </div>
            </div>
          )}

          {/* 3-Language Control Buttons */}
          <div className="mb-4">
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left mb-2">
              Speak Language
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                disabled={!selectedMessageId}
                onClick={() => handleLanguageSpeak("en")}
                className={`py-2 rounded-xl text-xs font-extrabold transition duration-200 border ${
                  !selectedMessageId
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : activeLang === "en" && isPlaying
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95"
                }`}
              >
                EN 🔊
              </button>
              <button
                disabled={!selectedMessageId}
                onClick={() => handleLanguageSpeak("hi")}
                className={`py-2 rounded-xl text-xs font-extrabold transition duration-200 border ${
                  !selectedMessageId
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : activeLang === "hi" && isPlaying
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95"
                }`}
              >
                हिंदी 🔊
              </button>
              <button
                disabled={!selectedMessageId}
                onClick={() => handleLanguageSpeak("te")}
                className={`py-2 rounded-xl text-xs font-extrabold transition duration-200 border ${
                  !selectedMessageId
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : activeLang === "te" && isPlaying
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95"
                }`}
              >
                తెలుగు 🔊
              </button>
            </div>
          </div>

          {/* Playback Controls (Play / Stop / Replay) */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-left mb-2">
              Playback Controls
            </label>
            <div className="flex gap-2">
              {/* Play Button */}
              <button
                disabled={!selectedMessageId}
                onClick={handlePlayClick}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition duration-200 ${
                  !selectedMessageId
                    ? "bg-slate-50 text-slate-350 cursor-not-allowed"
                    : isPlaying
                    ? "bg-blue-50 text-blue-600 hover:bg-blue-100/80 active:scale-95"
                    : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 active:scale-95"
                }`}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Play
              </button>
              
              {/* Stop Button */}
              <button
                disabled={!selectedMessageId || !isPlaying}
                onClick={stopSpeech}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition duration-200 border ${
                  !selectedMessageId || !isPlaying
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100/80 active:scale-95"
                }`}
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop
              </button>
              
              {/* Replay Button */}
              <button
                disabled={!selectedMessageId || !hasSpeechText}
                onClick={replaySpeech}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition duration-200 border ${
                  !selectedMessageId || !hasSpeechText
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 active:scale-95"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Replay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Blue Circle Trigger Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30 active:scale-95 ${
          isPlaying ? "animate-pulse" : ""
        }`}
        aria-label="Read Aloud Options"
        aria-expanded={isExpanded}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>
  );
}