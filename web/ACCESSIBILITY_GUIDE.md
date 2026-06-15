# Multilingual Accessibility System - Documentation

## Overview

This comprehensive accessibility system provides a floating widget on your Vite + React + TypeScript web app with support for:
- **Text-to-Speech** (Read Aloud)
- **Language Translation** (English, Hindi, Telugu)
- **Speech Controls** (Play, Pause, Resume, Stop)
- **Voice Selection** (Multiple voices)
- **Adjustable Speech Speed** (0.5x - 2x)
- **Auto-detected Browser Language**
- **Read Selected Text Feature**
- **Persistent Settings** (localStorage)

## Project Structure

```
src/
├── contexts/
│   ├── AccessibilityContext.tsx    # Speech & accessibility settings
│   └── I18nContext.tsx              # Internationalization (already existed)
├── hooks/
│   ├── useSpeech.ts                 # Speech synthesis hook
│   └── useTranslation.ts            # Translation hook
├── components/
│   └── FloatingAccessibilityWidget.tsx  # Main widget
├── locales/
│   ├── en.json                      # English translations
│   ├── hi.json                      # Hindi translations
│   └── te.json                      # Telugu translations
├── main.tsx                         # Updated with AccessibilityProvider
└── App.tsx                          # Unchanged
```

## Components & Hooks

### 1. **AccessibilityContext** (`contexts/AccessibilityContext.tsx`)

Core context providing:
- Speech synthesis management
- Settings persistence
- Voice selection
- Speech rate/pitch/volume control

**Key Features:**
- Automatic voice loading from browser
- localStorage persistence
- Proper cleanup to prevent memory leaks
- ARIA compliant

**Usage:**
```tsx
import { useAccessibility } from "@/contexts/AccessibilityContext";

const { speak, pause, resume, stop, isSpeaking, settings } = useAccessibility();
```

### 2. **useSpeech Hook** (`hooks/useSpeech.ts`)

Simplified interface for speech functionality.

**Usage:**
```tsx
import { useSpeech } from "@/hooks/useSpeech";

const { speak, pause, resume, stop, isSpeaking, readSelectedText } = useSpeech();

// Read page content
speak("Hello World");

// Read currently selected text
readSelectedText();
```

### 3. **useTranslation Hook** (`hooks/useTranslation.ts`)

Access i18n functionality.

**Usage:**
```tsx
import { useTranslation } from "@/hooks/useTranslation";

const { t, locale, setLocale } = useTranslation();

// Get translated string
console.log(t("brand")); // "Smart Medicine Assistant"

// Change language
setLocale("hi"); // Hindi
setLocale("te"); // Telugu
```

### 4. **FloatingAccessibilityWidget** (`components/FloatingAccessibilityWidget.tsx`)

The main UI component - a floating button that expands into an accessibility panel.

**Features:**
- ✅ Floating button at bottom-right
- ✅ Expandable panel with glassmorphism
- ✅ Mobile responsive
- ✅ Keyboard accessible
- ✅ ARIA labels
- ✅ Language selector
- ✅ Voice selector
- ✅ Speech speed control
- ✅ Read page / Read selected text
- ✅ Auto-detect browser language
- ✅ Shows speaking status

## Installation & Setup

### Step 1: Already Integrated

The following files have been created/updated:

✅ `AccessibilityContext.tsx` - Core context  
✅ `useSpeech.ts` - Speech hook  
✅ `useTranslation.ts` - Translation hook  
✅ `FloatingAccessibilityWidget.tsx` - Main widget  
✅ `main.tsx` - AccessibilityProvider added  
✅ `Layout.tsx` - FloatingAccessibilityWidget added  
✅ `I18nContext.tsx` - Extended with new translations  
✅ Translation JSON files (en.json, hi.json, te.json)  

### Step 2: Verify Integration

The app structure is now:

```tsx
<I18nProvider>
  <AccessibilityProvider>
    <AuthProvider>
      <App />
      <FloatingAccessibilityWidget />  {/* Added in Layout */}
    </AuthProvider>
  </AccessibilityProvider>
</I18nProvider>
```

## Features Explained

### 1. **Read Aloud (Text-to-Speech)**

```tsx
// Read entire page
readPageContent()

// Read only selected text
readSelectedText()

// Read specific text
speak("Hello World")
```

**Browser Support:** Chrome, Firefox, Safari, Edge (Modern versions)

### 2. **Language Translation**

Languages: English (en), Hindi (hi), Telugu (te)

```tsx
// Change language
setLocale("hi");  // Switches all UI text to Hindi
setLocale("te");  // Switches all UI text to Telugu
```

**How it works:**
- User selects language from widget dropdown
- `I18nContext` updates all text in real-time
- Setting persists in localStorage as `sma_locale`

### 3. **Voice Selection**

The widget auto-detects available voices from the browser:

```tsx
// Browser automatically loads voices
// User selects from dropdown in widget
// Selection persists in localStorage
```

**Common Voices:**
- Google Chrome: Multiple English, Hindi, Telugu voices
- Firefox: System voices
- Safari: System voices
- Edge: Multiple voices

### 4. **Speech Speed Control**

Adjustable from 0.5x to 2x (normal speed = 1x)

```tsx
// Slider in widget controls this
updateSettings({ rate: 1.5 }); // 1.5x speed
```

### 5. **Auto-Detect Browser Language**

```tsx
// On first load, auto-detects user's browser language
const browserLang = navigator.language.split("-")[0];
// If Hindi or Telugu → automatically sets that language
// Otherwise → defaults to English
```

### 6. **Read Selected Text**

```tsx
// User highlights text on page
// "Read Selected" button appears in widget
// Click to read only that text
```

### 7. **Persistent Settings**

All settings saved to localStorage:
- Selected language (`sma_locale`)
- Speech speed (`accessibility_settings`)
- Voice preference (`accessibility_settings`)

## API Reference

### AccessibilityContext

```tsx
interface AccessibilitySettings {
  voice: SpeechSynthesisVoice | null;
  rate: number;        // 0.5 - 2
  pitch: number;       // Usually 1
  volume: number;      // 0 - 1
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  voices: SpeechSynthesisVoice[];
  isSpeaking: boolean;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  readSelectedText: () => void;
}
```

### useSpeech Hook

```tsx
const {
  speak,           // (text: string) => void
  pause,           // () => void
  resume,          // () => void
  stop,            // () => void
  isSpeaking,      // boolean
  readSelectedText, // () => void
} = useSpeech();
```

### useTranslation Hook

```tsx
const {
  t,        // (key: string) => string - Get translation
  locale,   // "en" | "hi" | "te" - Current language
  setLocale, // (locale: "en" | "hi" | "te") => void
} = useTranslation();
```

## Usage Examples

### Example 1: Basic Usage in a Page Component

```tsx
import { useSpeech } from "@/hooks/useSpeech";
import { useTranslation } from "@/hooks/useTranslation";

export function MyPage() {
  const { speak } = useSpeech();
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("brand")}</h1>
      <p>Welcome to our app</p>
      <button onClick={() => speak("Welcome to our app")}>
        🔊 Read Description
      </button>
    </div>
  );
}
```

### Example 2: Custom Accessibility Component

```tsx
import { useAccessibility } from "@/contexts/AccessibilityContext";

export function AccessibilitySettings() {
  const { settings, updateSettings, voices } = useAccessibility();

  return (
    <div>
      <label>
        Speed: {settings.rate.toFixed(1)}x
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={settings.rate}
          onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })}
        />
      </label>

      <label>
        Voice:
        <select
          value={settings.voice?.voiceURI || ""}
          onChange={(e) => {
            const voice = voices.find(v => v.voiceURI === e.target.value);
            updateSettings({ voice: voice || null });
          }}
        >
          {voices.map((v) => (
            <option key={v.voiceURI} value={v.voiceURI}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

### Example 3: Translation in Components

```tsx
import { useTranslation } from "@/hooks/useTranslation";

export function Header() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <header>
      <h1>{t("brand")}</h1>
      
      <select value={locale} onChange={(e) => setLocale(e.target.value as any)}>
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="te">తెలుగు</option>
      </select>

      <nav>
        <a href="/scan">{t("scan")}</a>
        <a href="/compare">{t("compare")}</a>
        <a href="/chat">{t("chat")}</a>
      </nav>
    </header>
  );
}
```

## Keyboard Accessibility

The floating widget supports:
- **Tab** - Navigate to buttons
- **Enter/Space** - Click buttons
- **Escape** - Close panel (can be added)
- All buttons have `aria-label` for screen readers

## Adding New Languages

To add a new language (e.g., Spanish):

### Step 1: Update I18nContext

```tsx
type Locale = "en" | "hi" | "te" | "es"; // Add "es"

const STRINGS: Record<Locale, Record<string, string>> = {
  // ... existing languages
  es: {
    brand: "Asistente Inteligente de Medicinas",
    scan: "Escanear",
    // ... other translations
  },
};
```

### Step 2: Create Translation File

Create `src/locales/es.json`:
```json
{
  "brand": "Asistente Inteligente de Medicinas",
  "scan": "Escanear",
  ...
}
```

### Step 3: Update Widget

```tsx
<select value={locale} onChange={(e) => handleLanguageChange(e.target.value as any)}>
  <option value="en">English</option>
  <option value="hi">हिंदी (Hindi)</option>
  <option value="te">తెలుగు (Telugu)</option>
  <option value="es">Español (Spanish)</option>
</select>
```

## Performance Optimization

### Memory Management

✅ **Cleanup on unmount:**
```tsx
useEffect(() => {
  return () => {
    speechSynthesis.cancel(); // Clean up speech
  };
}, []);
```

✅ **Event listener cleanup:**
```tsx
useEffect(() => {
  const handleSelection = () => { /* ... */ };
  document.addEventListener("selectionchange", handleSelection);
  return () => document.removeEventListener("selectionchange", handleSelection);
}, []);
```

✅ **Proper voice loading:**
```tsx
useEffect(() => {
  const loadVoices = () => {
    const availableVoices = speechSynthesis.getVoices();
    setVoices(availableVoices);
  };
  
  loadVoices();
  speechSynthesis.addEventListener("voiceschanged", loadVoices);
  return () => {
    speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  };
}, []);
```

### Performance Tips

1. **Lazy load widget** - Only render on client-side
2. **Debounce selection detection** - Optional enhancement
3. **Cache voices** - Already done in context
4. **Don't read huge pages** - Warn user for > 10,000 words

## Customization

### Change Widget Position

In `FloatingAccessibilityWidget.tsx`:
```tsx
<div className="fixed bottom-4 right-4 z-50">  {/* Change these classes */}
  // bottom-4 right-4 = bottom-right
  // For top-left: top-4 left-4
  // For top-right: top-4 right-4
</div>
```

### Change Widget Colors

```tsx
// Main button colors
className="bg-blue-600 hover:bg-blue-700"  {/* Change to other Tailwind colors */}

// Panel background
className="bg-white/90 backdrop-blur-md"  {/* Change opacity/blur */}
```

### Add More Buttons

```tsx
<div className="flex gap-2">
  {/* Add custom button */}
  <button onClick={customFunction} className="...">
    Custom Action
  </button>
</div>
```

## Testing

### Test Speech Synthesis

```tsx
// In browser console
const utterance = new SpeechSynthesisUtterance("Hello World");
speechSynthesis.speak(utterance);
```

### Test Language Switching

```tsx
// In browser console
localStorage.setItem("sma_locale", "hi");
location.reload();
```

### Test Voice Selection

```tsx
// List available voices
const voices = speechSynthesis.getVoices();
console.log(voices);
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Speech Synthesis | ✅ | ✅ | ✅ | ✅ |
| Multiple Voices | ✅ | ✅ | ⚠️ | ✅ |
| Speech Rate | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |

## Troubleshooting

### Issue: No voices available

**Solution:** Wait for `voiceschanged` event:
```tsx
speechSynthesis.onvoiceschanged = () => {
  const voices = speechSynthesis.getVoices();
  console.log(voices); // Now should have voices
};
```

### Issue: Speech not starting

**Solution:** Check if browser allows speech:
```tsx
if (!('speechSynthesis' in window)) {
  console.error("Speech Synthesis not supported");
}
```

### Issue: Language not persisting

**Solution:** Check localStorage:
```tsx
console.log(localStorage.getItem("sma_locale"));
```

### Issue: Widget not appearing

**Solution:** Ensure `FloatingAccessibilityWidget` is in Layout and AccessibilityProvider wraps the app.

## Best Practices

1. ✅ Always wrap app with `AccessibilityProvider`
2. ✅ Use hooks in functional components only
3. ✅ Clean up speech on component unmount
4. ✅ Test on real devices (voices vary)
5. ✅ Provide fallback text for images
6. ✅ Use semantic HTML
7. ✅ Test with screen readers (NVDA, JAWS)
8. ✅ Keyboard navigation must work
9. ✅ Don't auto-play speech
10. ✅ Respect user preferences (prefers-reduced-motion)

## Summary

You now have a **production-ready**, **accessible**, **multilingual** system that:

- 🎤 Reads page content aloud
- 🌐 Supports English, Hindi, Telugu
- 🎛️ Controls speech (play, pause, resume, stop)
- 🎨 Beautiful floating UI (glassmorphism)
- 📱 Fully responsive and mobile-friendly
- ⌨️ Keyboard accessible with ARIA labels
- 💾 Persists user preferences
- 🚀 Optimized and memory-leak free

For more information, check the component files in `src/` directory.
