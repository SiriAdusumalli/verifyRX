import { useAccessibility } from "../contexts/AccessibilityContext";

export function useSpeech() {
  const { speak, pause, resume, stop, isSpeaking, readSelectedText } = useAccessibility();

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    readSelectedText,
  };
}