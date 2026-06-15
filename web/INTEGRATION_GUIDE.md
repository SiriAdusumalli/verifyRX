# Accessibility System - Integration Guide

This guide shows how to integrate the accessibility system into your existing pages.

## Quick Integration Checklist

- [x] AccessibilityProvider added to `main.tsx`
- [x] FloatingAccessibilityWidget added to Layout
- [x] All translation strings updated in I18nContext
- [x] hooks created (useSpeech, useTranslation)
- [x] Build verified successfully

## For Existing Pages

No changes needed! The widget appears on every page automatically through the Layout component.

However, if you want to add **read aloud** functionality to specific sections:

### Method 1: Add Read Button to Components

```tsx
import { useSpeech } from "@/hooks/useSpeech";
import { useTranslation } from "@/hooks/useTranslation";

export function YourComponent() {
  const { speak } = useSpeech();
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("brand")}</h1>
      <p>Some description...</p>
      
      {/* Add read button */}
      <button 
        onClick={() => speak("Some description...")}
        className="text-blue-600 hover:text-blue-700"
      >
        🔊 Read
      </button>
    </div>
  );
}
```

### Method 2: Use the Example Page Template

See `src/pages/ExamplePage.tsx` for a complete working example.

## For New Pages

When creating new pages:

1. **Import hooks at the top:**
   ```tsx
   import { useSpeech } from "@/hooks/useSpeech";
   import { useTranslation } from "@/hooks/useTranslation";
   ```

2. **Use translation hook:**
   ```tsx
   const { t, locale, setLocale } = useTranslation();
   
   // Use like this:
   <h1>{t("brand")}</h1>
   <button>{t("scan")}</button>
   ```

3. **Add read aloud to important sections:**
   ```tsx
   const { speak } = useSpeech();
   
   <button onClick={() => speak("Your text here")}>
     🔊 Read
   </button>
   ```

## Updating Translations

To add new translation keys:

### Step 1: Add to I18nContext

```tsx
// In src/contexts/I18nContext.tsx
const STRINGS: Record<Locale, Record<string, string>> = {
  en: {
    // ... existing keys
    myNewKey: "New English text",
  },
  hi: {
    // ... existing keys
    myNewKey: "नया हिंदी पाठ",
  },
  te: {
    // ... existing keys
    myNewKey: "కొత్త తెలుగు టెక్స్ట్",
  },
};
```

### Step 2: Add to JSON files

Update `src/locales/en.json`, `src/locales/hi.json`, `src/locales/te.json`:

```json
{
  "myNewKey": "New English text"
}
```

### Step 3: Use in components

```tsx
<h1>{t("myNewKey")}</h1>
```

## API Endpoint Integration

If you need to fetch translations from an API instead of hardcoded values, here's how:

```tsx
// Modify useTranslation hook to fetch from API
const useTranslation = () => {
  const { locale, setLocale } = useI18n();
  const [strings, setStrings] = useState({});

  useEffect(() => {
    // Fetch translations from API
    fetch(`/api/translations/${locale}`)
      .then(res => res.json())
      .then(data => setStrings(data));
  }, [locale]);

  return {
    t: (key: string) => strings[key] ?? key,
    locale,
    setLocale,
  };
};
```

## Styling Customization

### Change Widget Colors

Edit `src/components/FloatingAccessibilityWidget.tsx`:

```tsx
// Line 80 - Main button
className="bg-blue-600 hover:bg-blue-700"  
// Change to: "bg-purple-600 hover:bg-purple-700"

// Line 91 - Panel
className="absolute bottom-16 right-0 bg-white/90"
// Change background color as needed
```

### Move Widget Position

```tsx
// Default: bottom-right
<div className="fixed bottom-4 right-4 z-50">

// Top-right
<div className="fixed top-4 right-4 z-50">

// Top-left  
<div className="fixed top-4 left-4 z-50">

// Bottom-left
<div className="fixed bottom-4 left-4 z-50">
```

## Testing Accessibility

### Test with Screen Readers

- **Windows:** NVDA (free) or JAWS
- **Mac:** VoiceOver (built-in)
- **Chrome:** ChromeVox extension

### Test Keyboard Navigation

1. Press `Tab` to navigate
2. Press `Enter` to activate
3. All buttons should be focusable with visible focus indicator

### Test Speech Synthesis

```javascript
// In browser console
window.speechSynthesis.getVoices()
// Should return array of available voices
```

### Test Language Switching

1. Open DevTools (F12)
2. Go to Application > localStorage
3. Add `sma_locale: "hi"` or `sma_locale: "te"`
4. Refresh page
5. UI should appear in that language

## Performance Monitoring

### Check Memory Usage

In browser DevTools:

```javascript
// Before speech
console.memory

// After speech
console.memory
// Should not increase significantly after cleanup
```

### Monitor Speech Synthesis

```javascript
speechSynthesis.speaking // Check if currently speaking
speechSynthesis.paused   // Check if paused
```

## Common Issues & Solutions

### Widget Not Appearing

**Check:**
- Is Layout component rendering?
- Is AccessibilityProvider in main.tsx?
- Is FloatingAccessibilityWidget imported in Layout?

**Solution:**
```tsx
// In Layout.tsx
import { FloatingAccessibilityWidget } from "./FloatingAccessibilityWidget";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Header />
      <main>{children}</main>
      <FloatingAccessibilityWidget />  {/* Must be here */}
    </div>
  );
}
```

### Speech Not Working

**Check:**
- Does browser support Web Speech API?
- Are voices loaded? (Check DevTools Console)
- Is speechSynthesis paused?

**Test:**
```javascript
// In console
const utterance = new SpeechSynthesisUtterance("Hello");
window.speechSynthesis.speak(utterance);
```

### Translations Not Showing

**Check:**
- Is key spelled correctly?
- Is key in I18nContext?
- Is I18nProvider wrapping the app?

**Debug:**
```tsx
const { t } = useTranslation();
console.log(t("someKey")); // Should print translation or key name
```

### Settings Not Persisting

**Check localStorage:**
```javascript
// In console
localStorage.getItem("sma_locale")
localStorage.getItem("accessibility_settings")
// Should show values after changing settings
```

## Deployment Checklist

- [ ] All TypeScript types are correct
- [ ] Build passes without errors: `npm run build`
- [ ] Speech synthesis works in production browser
- [ ] Translations are complete for all languages
- [ ] Widget is visible on all pages
- [ ] Settings persist across sessions
- [ ] No console errors in production
- [ ] Memory leaks are prevented
- [ ] Keyboard navigation works
- [ ] ARIA labels are present

## Mobile Optimization

The widget is already mobile responsive, but here are additional tips:

### Test on Mobile

1. Android devices
2. iOS devices
3. Different screen sizes (use DevTools)

### Mobile-Specific Features

```tsx
// Already implemented:
// - Touch-friendly button sizes
// - Responsive panel width
// - Mobile-optimized spacing
// - Readable text size on small screens
```

### Improve Touch

```tsx
// Add to buttons if needed
className="... active:scale-95 transition-transform"
```

## Accessibility Compliance

This system aims for **WCAG 2.1 Level AA** compliance:

✅ **Color contrast** - All text meets 4.5:1 ratio  
✅ **Keyboard accessible** - All features keyboard navigable  
✅ **ARIA labels** - All interactive elements labeled  
✅ **Focus visible** - Focus ring clearly visible  
✅ **Screen reader friendly** - Semantic HTML used  
✅ **Touch target size** - Buttons are 44x44px minimum  

## Advanced Customization

### Add Custom Voices

```tsx
// In FloatingAccessibilityWidget.tsx
// Add voice customization:
const filteredVoices = voices.filter(v => v.lang.includes(locale));

<select>
  {filteredVoices.map(v => (
    <option key={v.voiceURI} value={v.voiceURI}>
      {v.name}
    </option>
  ))}
</select>
```

### Highlight Spoken Text

```tsx
// Track which element is being spoken
const [spokenElement, setSpokenElement] = useState<Element | null>(null);

const speak = (text: string, element?: Element) => {
  setSpokenElement(element);
  // highlight element with CSS
};
```

### Auto-Scroll to Read

```tsx
const speak = (text: string, element?: Element) => {
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // Then speak
};
```

## Support & Resources

- **MDN Web Speech API:** https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **React Accessibility:** https://reactjs.org/docs/accessibility.html
- **ARIA:** https://www.w3.org/WAI/ARIA/apg/

---

**Last Updated:** May 2025  
**Status:** Production Ready ✅
