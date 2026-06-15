# Advanced Examples & Best Practices

## Table of Contents

1. [Advanced Component Examples](#advanced-component-examples)
2. [Custom Hooks](#custom-hooks)
3. [Performance Tips](#performance-tips)
4. [Error Handling](#error-handling)
5. [Testing](#testing)
6. [Production Patterns](#production-patterns)

---

## Advanced Component Examples

### 1. Auto-Reading Component

Automatically reads content when component mounts:

```tsx
import { useEffect } from "react";
import { useSpeech } from "@/hooks/useSpeech";

interface AutoReadProps {
  text: string;
  autoRead?: boolean;
  onReadComplete?: () => void;
}

export function AutoRead({ text, autoRead = true, onReadComplete }: AutoReadProps) {
  const { speak } = useSpeech();

  useEffect(() => {
    if (autoRead && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = onReadComplete;
      window.speechSynthesis.speak(utterance);
    }
  }, [text, autoRead, onReadComplete]);

  return null;
}

// Usage
<AutoRead 
  text="Important announcement" 
  autoRead={true}
  onReadComplete={() => console.log("Done reading")}
/>
```

### 2. Translation Badge Component

Shows current language in a badge:

```tsx
import { useTranslation } from "@/hooks/useTranslation";

const LANGUAGE_NAMES: Record<string, { name: string; emoji: string }> = {
  en: { name: "English", emoji: "🇬🇧" },
  hi: { name: "हिंदी", emoji: "🇮🇳" },
  te: { name: "తెలుగు", emoji: "🇮🇳" },
};

export function LanguageBadge() {
  const { locale } = useTranslation();
  const { name, emoji } = LANGUAGE_NAMES[locale];

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-900 rounded-full text-sm font-medium">
      <span>{emoji}</span>
      <span>{name}</span>
    </div>
  );
}
```

### 3. Speech Status Indicator

Shows real-time speech status:

```tsx
import { useAccessibility } from "@/contexts/AccessibilityContext";

export function SpeechStatusIndicator() {
  const { isSpeaking } = useAccessibility();

  return (
    <div className="flex items-center gap-2">
      {isSpeaking && (
        <>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-600 font-medium">Speaking...</span>
        </>
      )}
    </div>
  );
}
```

### 4. Accessible Dialog Component

Dialog with accessibility features:

```tsx
import { useRef, useEffect } from "react";
import { useSpeech } from "@/hooks/useSpeech";

interface AccessibleDialogProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
  readAloud?: boolean;
}

export function AccessibleDialog({
  isOpen,
  title,
  content,
  onClose,
  readAloud = false,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { speak } = useSpeech();

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
      if (readAloud) {
        speak(`${title}. ${content}`);
      }
    }
  }, [isOpen, title, content, readAloud, speak]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <h2 id="dialog-title" className="text-xl font-bold mb-4">
          {title}
        </h2>
        <p className="text-gray-700 mb-6">{content}</p>
        <button
          onClick={onClose}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          aria-label="Close dialog"
        >
          Close
        </button>
      </div>
    </div>
  );
}
```

### 5. Multilingual Form Component

Form with dynamic language support:

```tsx
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

const FORM_LABELS: Record<string, Record<string, string>> = {
  en: {
    name: "Full Name",
    email: "Email Address",
    message: "Message",
    submit: "Submit",
  },
  hi: {
    name: "पूरा नाम",
    email: "ईमेल पता",
    message: "संदेश",
    submit: "सबमिट करें",
  },
  te: {
    name: "పూర్తి నామ",
    email: "ఈ-మెయిల్ చిరునామా",
    message: "సందేశం",
    submit: "సమర్పించండి",
  },
};

export function MultilingualForm() {
  const { locale } = useTranslation();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const labels = FORM_LABELS[locale];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {labels.name}
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {labels.email}
        </label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {labels.message}
        </label>
        <textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
      >
        {labels.submit}
      </button>
    </form>
  );
}
```

---

## Custom Hooks

### 1. useSpeechWithHighlight

Speak text while highlighting it:

```tsx
import { useRef, useState } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export function useSpeechWithHighlight() {
  const { speak: contextSpeak } = useAccessibility();
  const [highlightedText, setHighlightedText] = useState("");

  const speak = (text: string) => {
    setHighlightedText(text);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setHighlightedText("");
    utterance.onerror = () => setHighlightedText("");
    
    window.speechSynthesis.speak(utterance);
  };

  return { speak, highlightedText };
}

// Usage
export function HighlightExample() {
  const { speak, highlightedText } = useSpeechWithHighlight();

  return (
    <div>
      <p
        className={
          highlightedText
            ? "bg-yellow-200 transition-colors duration-300"
            : "transition-colors duration-300"
        }
      >
        This text will be highlighted while being read.
      </p>
      <button onClick={() => speak("This text will be highlighted while being read.")}>
        Read with Highlight
      </button>
    </div>
  );
}
```

### 2. useLocalizedStrings

Fetch localized strings from an API:

```tsx
import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export function useLocalizedStrings() {
  const { locale } = useTranslation();
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/translations/${locale}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch translations");
        return res.json();
      })
      .then((data) => {
        setStrings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [locale]);

  const t = (key: string): string => strings[key] ?? key;

  return { t, loading, error, locale };
}
```

### 3. useVoicePreference

Manage voice preferences per language:

```tsx
import { useEffect } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

const VOICE_PREFERENCES: Record<string, string> = {
  en: "English (United States)",
  hi: "Hindi",
  te: "Telugu",
};

export function useVoicePreference(locale: string) {
  const { voices, updateSettings } = useAccessibility();

  useEffect(() => {
    const preferredVoiceName = VOICE_PREFERENCES[locale];
    const matchingVoice = voices.find((v) =>
      v.name.includes(preferredVoiceName)
    );

    if (matchingVoice) {
      updateSettings({ voice: matchingVoice });
    }
  }, [locale, voices, updateSettings]);
}

// Usage
export function VoicePreferenceComponent() {
  const { locale } = useTranslation();
  useVoicePreference(locale);

  return <p>Voice automatically set for {locale}</p>;
}
```

---

## Performance Tips

### 1. Memoize Translation Objects

```tsx
import { useMemo } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export function TranslatedComponent() {
  const { t } = useTranslation();

  // Memoize to prevent recalculation
  const messages = useMemo(
    () => ({
      title: t("brand"),
      subtitle: t("disclaimer"),
      button: t("scan"),
    }),
    [t]
  );

  return (
    <div>
      <h1>{messages.title}</h1>
      <p>{messages.subtitle}</p>
      <button>{messages.button}</button>
    </div>
  );
}
```

### 2. Debounce Speech Updates

```tsx
import { useCallback, useRef } from "react";
import { useSpeech } from "@/hooks/useSpeech";

export function useDebouncedSpeech(delay = 300) {
  const { speak } = useSpeech();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSpeak = useCallback(
    (text: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        speak(text);
      }, delay);
    },
    [speak, delay]
  );

  return debouncedSpeak;
}
```

### 3. Lazy Load Widget

```tsx
import { lazy, Suspense } from "react";

const FloatingAccessibilityWidget = lazy(
  () => import("./FloatingAccessibilityWidget")
);

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <Suspense fallback={null}>
        <FloatingAccessibilityWidget />
      </Suspense>
    </div>
  );
}
```

---

## Error Handling

### 1. Graceful Fallback for Speech Synthesis

```tsx
import { useState, useEffect } from "react";

export function useSafeAccessibility() {
  const [supportsSpeak, setSupportsSpeak] = useState(true);

  useEffect(() => {
    const isSupported = "speechSynthesis" in window;
    setSupportsSpeak(isSupported);

    if (!isSupported) {
      console.warn("Speech Synthesis not supported in this browser");
    }
  }, []);

  return { supportsSpeak };
}

// Usage
export function SafeAccessibilityWidget() {
  const { supportsSpeak } = useSafeAccessibility();

  if (!supportsSpeak) {
    return (
      <div className="fixed bottom-4 right-4 p-4 bg-yellow-100 rounded-lg">
        Speech Synthesis not supported in your browser
      </div>
    );
  }

  return <FloatingAccessibilityWidget />;
}
```

### 2. Error Boundary

```tsx
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class AccessibilityErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Accessibility Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 text-red-900 rounded-lg">
          Something went wrong with accessibility features.
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in main.tsx
<AccessibilityErrorBoundary>
  <AccessibilityProvider>
    <App />
  </AccessibilityProvider>
</AccessibilityErrorBoundary>
```

---

## Testing

### 1. Unit Test for useSpeech Hook

```tsx
import { renderHook, act } from "@testing-library/react";
import { useSpeech } from "@/hooks/useSpeech";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";

describe("useSpeech", () => {
  it("should speak text", () => {
    const wrapper = ({ children }: any) => (
      <AccessibilityProvider>{children}</AccessibilityProvider>
    );

    const { result } = renderHook(() => useSpeech(), { wrapper });

    act(() => {
      result.current.speak("Hello World");
    });

    expect(result.current.isSpeaking).toBe(true);
  });

  it("should stop speaking", () => {
    const wrapper = ({ children }: any) => (
      <AccessibilityProvider>{children}</AccessibilityProvider>
    );

    const { result } = renderHook(() => useSpeech(), { wrapper });

    act(() => {
      result.current.speak("Hello");
      result.current.stop();
    });

    expect(result.current.isSpeaking).toBe(false);
  });
});
```

### 2. Integration Test

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FloatingAccessibilityWidget } from "@/components/FloatingAccessibilityWidget";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { I18nProvider } from "@/contexts/I18nContext";

describe("FloatingAccessibilityWidget", () => {
  it("should expand when clicked", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <AccessibilityProvider>
          <FloatingAccessibilityWidget />
        </AccessibilityProvider>
      </I18nProvider>
    );

    const button = screen.getByLabelText("Accessibility Options");
    await user.click(button);

    // Should show language selector
    expect(screen.getByDisplayValue("en")).toBeInTheDocument();
  });

  it("should change language", async () => {
    const user = userEvent.setup();

    render(
      <I18nProvider>
        <AccessibilityProvider>
          <FloatingAccessibilityWidget />
        </AccessibilityProvider>
      </I18nProvider>
    );

    const button = screen.getByLabelText("Accessibility Options");
    await user.click(button);

    const select = screen.getByDisplayValue("en");
    await user.selectOptions(select, "hi");

    expect(select).toHaveValue("hi");
  });
});
```

---

## Production Patterns

### 1. Feature Flag for Accessibility

```tsx
// config.ts
export const FEATURE_FLAGS = {
  accessibility: process.env.VITE_ENABLE_ACCESSIBILITY === "true",
  betaFeatures: process.env.VITE_BETA_FEATURES === "true",
};

// main.tsx
import { FEATURE_FLAGS } from "@/config";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        {FEATURE_FLAGS.accessibility ? (
          <AccessibilityProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </AccessibilityProvider>
        ) : (
          <AuthProvider>
            <App />
          </AuthProvider>
        )}
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
```

### 2. Analytics Tracking

```tsx
import { useEffect } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

export function useAccessibilityAnalytics() {
  const { isSpeaking, settings } = useAccessibility();

  useEffect(() => {
    if (isSpeaking) {
      // Track speech synthesis usage
      trackEvent("speech_synthesis_started", {
        voice: settings.voice?.name,
        rate: settings.rate,
      });
    }
  }, [isSpeaking, settings]);
}

// Usage
export function AnalyticsWrapper() {
  useAccessibilityAnalytics();
  return null;
}
```

### 3. A/B Testing Widget Placement

```tsx
export function FloatingAccessibilityWidgetWrapper() {
  const testGroup = localStorage.getItem("widget_test_group") || "default";

  if (testGroup === "sidebar") {
    return <SidebarAccessibilityWidget />;
  }

  return <FloatingAccessibilityWidget />;
}
```

---

**Best Practices Summary:**

✅ Always use memoization for expensive operations  
✅ Clean up event listeners and timers  
✅ Handle errors gracefully with fallbacks  
✅ Test accessibility features thoroughly  
✅ Monitor performance in production  
✅ Use feature flags for gradual rollout  
✅ Track user engagement  
✅ Follow WCAG guidelines  
✅ Test with real screen readers  
✅ Keep accessibility widget performant  

---

*Last Updated: May 2025*
