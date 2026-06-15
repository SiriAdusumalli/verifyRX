import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Voice = SpeechSynthesisVoice | null;

export interface AccessibilitySettings {
  voice: Voice;
  rate: number;
  pitch: number;
  volume: number;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  voices: SpeechSynthesisVoice[];
  isSpeaking: boolean;
  speak: (text: string, locale?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  readSelectedText: () => void;
  getVoicesByLanguage: (languageCode: string) => SpeechSynthesisVoice[];
  translateText: (text: string, targetLanguage: string) => Promise<string>;
}

const AccessibilityCtx = createContext<AccessibilityContextType | null>(null);

const STORAGE_KEY = "accessibility_settings";

const defaultSettings: AccessibilitySettings = {
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return { ...defaultSettings, ...parsed };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);

      // Auto-select default voice if none selected
      if (!settings.voice && availableVoices.length > 0) {
        const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
        updateSettings({ voice: defaultVoice });
      }
    };

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...settings,
      voice: settings.voice ? {
        name: settings.voice.name,
        lang: settings.voice.lang,
        voiceURI: settings.voice.voiceURI,
      } : null,
    }));
  }, [settings]);

  // Update settings
  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Speech functions
  const speak = useCallback((text: string, locale?: string) => {
    if (!text.trim()) return;

    // Get voice for the specified locale
    let voiceToUse = settings.voice;
    if (locale) {
      const languageVoices = getVoicesByLanguage(locale);
      if (languageVoices.length > 0) {
        voiceToUse = languageVoices[0];
      }
    }

    if (!voiceToUse) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voiceToUse;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [settings]);

  const pause = useCallback(() => {
    speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    speechSynthesis.resume();
  }, []);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Get voices for a specific language
  const getVoicesByLanguage = useCallback((languageCode: string): SpeechSynthesisVoice[] => {
    const langMap: { [key: string]: string[] } = {
      'en': ['en-US', 'en-GB', 'en'],
      'hi': ['hi-IN', 'hi'],
      'te': ['te-IN', 'te'],
    };

    const targetLangs = langMap[languageCode] || [languageCode];
    return voices.filter(voice =>
      targetLangs.some(lang => voice.lang.toLowerCase().includes(lang.toLowerCase()))
    );
  }, [voices]);

  // Translate text using Google Translate API
  const translateText = useCallback(async (text: string, targetLanguage: string): Promise<string> => {
    if (targetLanguage === 'en' || !text.trim()) return text;

    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`
      );
      const data = await response.json();
      return data.responseData?.translatedText || text;
    } catch (error) {
      console.warn('Translation failed, using original text:', error);
      return text;
    }
  }, []);

  const readSelectedText = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      speak(selection.toString().trim());
    }
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      voices,
      isSpeaking,
      speak,
      pause,
      resume,
      stop,
      readSelectedText,
      getVoicesByLanguage,
      translateText,
    }),
    [settings, updateSettings, voices, isSpeaking, speak, pause, resume, stop, readSelectedText, getVoicesByLanguage, translateText]
  );

  return <AccessibilityCtx.Provider value={value}>{children}</AccessibilityCtx.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityCtx);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}