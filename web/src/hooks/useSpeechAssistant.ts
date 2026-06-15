import { useState, useEffect, useCallback, useRef } from "react";

// Helper function to clean text, strip markdown, and expand medical shorthand appropriately
function cleanTextForSpeech(text: string, langKey: "en" | "hi" | "te"): string {
  let cleaned = text
    .replace(/\*\*|__|_|\*|#/g, "")      // Strip bold/italics/headings markdown tags
    .replace(/^\s*[-*•]\s+/gm, "")       // Remove bullets at the beginning of lines
    .replace(/\s+/g, " ")                // Clean up multiple whitespace characters
    .trim();

  // Expand standard shorthand and metrics to ensure clear, high-quality audio
  if (langKey === "hi") {
    cleaned = cleaned
      .replace(/\bmg\b/gi, " मिलीग्राम ")
      .replace(/\bml\b/gi, " मिलीलीटर ")
      .replace(/\bBP\b/gi, " ब्लड प्रेशर ")
      .replace(/\bDr\b\.?/gi, " डॉक्टर ")
      .replace(/\bRx\b/gi, " पर्चा ")
      .replace(/&/g, " और ")
      .replace(/%/g, " प्रतिशत ");
  } else if (langKey === "te") {
    cleaned = cleaned
      .replace(/\bmg\b/gi, " మిల్లీగ్రాములు ")
      .replace(/\bml\b/gi, " మిల్లీలీటర్లు ")
      .replace(/\bBP\b/gi, " రక్తపోటు ")
      .replace(/\bDr\b\.?/gi, " డాక్టర్ ")
      .replace(/&/g, " మరియు ")
      .replace(/%/g, " శాతం ");
  } else {
    cleaned = cleaned
      .replace(/\bmg\b/gi, " milligrams ")
      .replace(/\bmcg\b/gi, " micrograms ")
      .replace(/\bml\b/gi, " milliliters ")
      .replace(/\bmcg\/ml\b/gi, " micrograms per milliliter ")
      .replace(/\btabs?\b/gi, " tablets ")
      .replace(/\bcaps?\b/gi, " capsules ")
      .replace(/\btemp\b/gi, " temperature ")
      .replace(/\bhrs?\b/gi, " hours ")
      .replace(/\bmins?\b/gi, " minutes ")
      .replace(/\bw\//gi, " with ")
      .replace(/\bw\/o\b/gi, " without ")
      .replace(/\bBP\b/gi, " blood pressure ")
      .replace(/\bOTC\b/gi, " over the counter ")
      .replace(/\bRx\b/gi, " prescription ")
      .replace(/\bDr\b\.?/gi, " Doctor ")
      .replace(/&/g, " and ")
      .replace(/@/g, " at ")
      .replace(/%/g, " percent ");
  }

  return cleaned.replace(/\s+/g, " ").trim();
}

export function useSpeechAssistant() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLang, setActiveLang] = useState<"en" | "hi" | "te" | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const lastTextRef = useRef<string>("");
  const lastLangRef = useRef<"en" | "hi" | "te">("en");

  // Load and listen to speechSynthesis voices asynchronously
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    
    // Bind to the onvoiceschanged event to handle dynamic browser voice loading
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveLang(null);
  }, []);

  const speakText = useCallback((text: string, langKey: "en" | "hi" | "te") => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // 1. Cancel any active speech instances first
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setActiveLang(null);

    const trimmed = text.trim();
    if (!trimmed) return;

    lastTextRef.current = trimmed;
    lastLangRef.current = langKey;

    // 2. Clean the speech text and expand shorthand metrics
    const cleanedText = cleanTextForSpeech(trimmed, langKey);
    if (!cleanedText) return;

    // 3. Resolve active speech voices (combining state & dynamic fallbacks)
    const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;
    let targetLang = "en-US";
    let speechRate = 0.90;

    if (langKey === "hi") {
      // Strict Indian Hindi voice filtering
      const matches = currentVoices.filter(v => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        return lang.startsWith("hi") || name.includes("hindi") || (name.includes("india") && lang.includes("hi"));
      });

      // Prioritize premium Google or Microsoft Natural/Neural voices
      selectedVoice = matches.find(v => 
        v.name.toLowerCase().includes("google") || 
        v.name.toLowerCase().includes("natural") || 
        v.name.toLowerCase().includes("neural")
      ) || matches.find(v => 
        v.lang.toLowerCase() === "hi-in" || 
        v.lang.toLowerCase() === "hi_in"
      ) || matches[0];

      // Block fallback to English pronunciation: throw device notification and stop
      if (!selectedVoice) {
        setToastMessage("Native Hindi voice not available on this device");
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      targetLang = "hi-IN";
      speechRate = 0.82; // Slower natural pace for rural Indian health accessibility
    } else if (langKey === "te") {
      // Strict Indian Telugu voice filtering
      const matches = currentVoices.filter(v => {
        const name = v.name.toLowerCase();
        const lang = v.lang.toLowerCase();
        return lang.startsWith("te") || name.includes("telugu") || (name.includes("india") && lang.includes("te"));
      });

      // Prioritize premium Google or Microsoft Natural/Neural voices
      selectedVoice = matches.find(v => 
        v.name.toLowerCase().includes("google") || 
        v.name.toLowerCase().includes("natural") || 
        v.name.toLowerCase().includes("neural")
      ) || matches.find(v => 
        v.lang.toLowerCase() === "te-in" || 
        v.lang.toLowerCase() === "te_in"
      ) || matches[0];

      // Block fallback to English pronunciation: throw device notification and stop
      if (!selectedVoice) {
        setToastMessage("Native Telugu voice not available on this device");
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      targetLang = "te-IN";
      speechRate = 0.82; // Slower natural pace for rural Indian health accessibility
    } else {
      // Standard English
      selectedVoice = currentVoices.find(v => 
        v.lang.toLowerCase().includes("en-us") || 
        v.lang.toLowerCase().includes("en_us")
      ) || currentVoices.find(v => v.lang.toLowerCase().startsWith("en"));
      
      targetLang = "en-US";
      speechRate = 0.90;
    }

    // 4. Create SpeechSynthesisUtterance with native specifications
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.lang = targetLang;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.rate = speechRate;

    utterance.onstart = () => {
      setIsPlaying(true);
      setActiveLang(langKey);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setActiveLang(null);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveLang(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [voices]);

  const replaySpeech = useCallback(() => {
    if (lastTextRef.current && lastLangRef.current) {
      speakText(lastTextRef.current, lastLangRef.current);
    }
  }, [speakText]);

  // Unmount cancel cleanup
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    speakText,
    stopSpeech,
    replaySpeech,
    isPlaying,
    activeLang,
    toastMessage,
    lastLang: lastLangRef.current,
    hasSpeechText: !!lastTextRef.current,
  };
}
