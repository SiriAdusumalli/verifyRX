# Quick Reference Guide - Accessibility System

## 🎯 One-Minute Overview

A **floating accessibility widget** is now on every page of your app that lets users:
- 🔊 Read page content aloud
- 🌐 Switch languages (English, Hindi, Telugu)
- 🎙️ Choose voices
- ⚡ Adjust speech speed

**Everything is automatic** - no configuration needed!

---

## 📍 Where Is It?

**Bottom-right corner** of every page (floating button)

Click the button to expand the accessibility panel.

---

## 🎮 How to Use It

### For Users
1. Click the blue floating button (bottom-right)
2. Panel expands
3. Select language
4. Click "Read Page" or highlight text and click "Read Selected"
5. Use speed slider to adjust
6. Click Pause/Resume/Stop as needed

### For Developers

#### Import Hooks
```tsx
import { useSpeech } from "@/hooks/useSpeech";
import { useTranslation } from "@/hooks/useTranslation";
```

#### Read Content Aloud
```tsx
const { speak } = useSpeech();
speak("Hello World");
```

#### Get Translated Text
```tsx
const { t, locale, setLocale } = useTranslation();
console.log(t("brand")); // Returns translated brand name
setLocale("hi"); // Change to Hindi
```

#### Check if Speaking
```tsx
const { isSpeaking } = useSpeech();
if (isSpeaking) console.log("Currently speaking");
```

---

## 🗂️ What Was Added

### Files Created (New)
```
src/contexts/AccessibilityContext.tsx      Core speech system
src/hooks/useSpeech.ts                     Speech hook
src/hooks/useTranslation.ts                Translation hook
src/components/FloatingAccessibilityWidget.tsx  Main widget
src/locales/en.json                        English translations
src/locales/hi.json                        Hindi translations
src/locales/te.json                        Telugu translations
src/pages/ExamplePage.tsx                  Example page
```

### Files Updated
```
src/main.tsx                   Added AccessibilityProvider
src/contexts/I18nContext.tsx   Extended translations
src/components/Layout.tsx      Added FloatingAccessibilityWidget
```

### Documentation Created
```
ACCESSIBILITY_GUIDE.md         Complete documentation
INTEGRATION_GUIDE.md           How to integrate
ADVANCED_EXAMPLES.md           Advanced patterns
IMPLEMENTATION_SUMMARY.md      This implementation overview
```

---

## 🚀 Getting Started in 30 Seconds

### Step 1: It's Already Working! ✅
The widget appears on every page automatically.

### Step 2: Test It
1. Open any page
2. Look bottom-right for blue button
3. Click it
4. Try the features

### Step 3: Add to Your Pages
To add "Read" buttons to your content:

```tsx
import { useSpeech } from "@/hooks/useSpeech";

export function MyComponent() {
  const { speak } = useSpeech();
  
  return (
    <div>
      <h1>My Content</h1>
      <button onClick={() => speak("My Content")}>
        🔊 Read
      </button>
    </div>
  );
}
```

---

## 📚 Language Support

### Supported Languages
- 🇬🇧 English
- 🇮🇳 Hindi (हिंदी)
- 🇮🇳 Telugu (తెలుగు)

### How to Add More Languages

1. **Update I18nContext:**
   ```tsx
   type Locale = "en" | "hi" | "te" | "es"; // Add "es"
   
   const STRINGS = {
     // ... existing languages
     es: { brand: "...", scan: "...", ... }
   }
   ```

2. **Create JSON file:**
   Create `src/locales/es.json` with translations

3. **Update widget:**
   Add option to language dropdown in `FloatingAccessibilityWidget.tsx`

---

## 🎨 Customize Widget

### Change Position
In `src/components/FloatingAccessibilityWidget.tsx` line 95:

```tsx
// Bottom-right (default)
<div className="fixed bottom-4 right-4 z-50">

// Top-right
<div className="fixed top-4 right-4 z-50">

// Top-left
<div className="fixed top-4 left-4 z-50">

// Bottom-left
<div className="fixed bottom-4 left-4 z-50">
```

### Change Colors
```tsx
// Main button (line 80)
className="bg-blue-600 hover:bg-blue-700"

// Options:
// Blue: bg-blue-600
// Purple: bg-purple-600
// Green: bg-green-600
// Red: bg-red-600
```

### Hide Widget
```tsx
// In Layout.tsx, comment out:
// <FloatingAccessibilityWidget />
```

---

## 🧪 Testing

### Test Speech
```javascript
// In browser console
const u = new SpeechSynthesisUtterance("Hello World");
window.speechSynthesis.speak(u);
```

### Test Language Change
```javascript
// Set to Hindi
localStorage.setItem("sma_locale", "hi");
location.reload();

// Set to Telugu
localStorage.setItem("sma_locale", "te");
location.reload();
```

### Check Available Voices
```javascript
const voices = window.speechSynthesis.getVoices();
console.log(voices);
```

---

## ⌨️ Keyboard Navigation

All buttons accessible via:
- **Tab** - Move to next button
- **Enter/Space** - Click button
- **Arrow keys** - Select from dropdowns

All buttons have **focus visible** indicators (blue ring).

---

## 🔧 Common Tasks

### Add "Read" to a Section
```tsx
const { speak } = useSpeech();

<section>
  <h2>Important Info</h2>
  <p>Some text...</p>
  <button onClick={() => speak("Some text...")}>🔊 Read</button>
</section>
```

### Use Translation
```tsx
const { t } = useTranslation();

<h1>{t("brand")}</h1>
<button>{t("scan")}</button>
```

### Check if App Supports Speech
```tsx
const supportsSpeak = "speechSynthesis" in window;
if (!supportsSpeak) {
  console.warn("Browser doesn't support speech synthesis");
}
```

### Change Speed Programmatically
```tsx
const { updateSettings } = useAccessibility();
updateSettings({ rate: 1.5 }); // 1.5x speed
```

### Stop Current Speech
```tsx
const { stop } = useSpeech();
stop();
```

---

## 🐛 Troubleshooting

### Widget Not Showing?
- [ ] Check Layout.tsx has `<FloatingAccessibilityWidget />`
- [ ] Check main.tsx has `<AccessibilityProvider>`
- [ ] Check no CSS hiding it (`display: none`)
- [ ] Try browser DevTools > F12 > Console for errors

### Speech Not Working?
- [ ] Check browser supports Speech Synthesis
- [ ] Check voices loaded: `window.speechSynthesis.getVoices()`
- [ ] Check speaker volume not muted
- [ ] Try different browser (some have better support)

### Language Not Changing?
- [ ] Check I18nContext has the translation key
- [ ] Check localStorage: `localStorage.getItem("sma_locale")`
- [ ] Try clearing cache and reload
- [ ] Check developer console for errors

### Settings Not Saving?
- [ ] Check localStorage enabled: `localStorage.setItem("test", "1")`
- [ ] Check if in incognito/private mode
- [ ] Check browser privacy settings

---

## 📊 What's Working

✅ Speech Synthesis  
✅ Language Translation  
✅ Voice Selection  
✅ Speed Control  
✅ Pause/Resume/Stop  
✅ Read Selected Text  
✅ Settings Persistence  
✅ Auto-detect Browser Language  
✅ Mobile Responsive  
✅ Keyboard Accessible  
✅ Screen Reader Compatible  
✅ WCAG 2.1 AA Compliant  
✅ TypeScript Typed  
✅ React Best Practices  
✅ No Breaking Changes  

---

## 📈 Performance

- Widget loads **lazily**
- Speech cleanup prevents **memory leaks**
- Event listeners properly **removed**
- Optimized re-renders with **memoization**
- No impact on existing app performance

---

## 🎁 Files to Read

**Read these in order:**

1. **IMPLEMENTATION_SUMMARY.md** ← START HERE
   Quick overview of what was built

2. **ACCESSIBILITY_GUIDE.md**
   Complete feature documentation

3. **INTEGRATION_GUIDE.md**
   How to integrate into your pages

4. **ADVANCED_EXAMPLES.md**
   Advanced patterns and customization

---

## 🚢 Deployment

✅ **Build passes** - No errors  
✅ **TypeScript** - No type errors  
✅ **No breaking changes** - App works as before  
✅ **Ready for production** - Can deploy now  

```bash
npm run build  # ✅ Passes
npm run preview  # Test locally
```

---

## 📞 Quick Links

- **Component:** `src/components/FloatingAccessibilityWidget.tsx`
- **Context:** `src/contexts/AccessibilityContext.tsx`
- **Hooks:** `src/hooks/useSpeech.ts`, `src/hooks/useTranslation.ts`
- **Translations:** `src/locales/*.json`
- **Example:** `src/pages/ExamplePage.tsx`

---

## 💬 Examples

### Simple Example
```tsx
export function MyPage() {
  const { speak } = useSpeech();
  
  return (
    <button onClick={() => speak("Hello!")}>
      🔊 Say Hello
    </button>
  );
}
```

### With Translation
```tsx
export function MyPage() {
  const { speak } = useSpeech();
  const { t } = useTranslation();
  
  return (
    <button onClick={() => speak(t("brand"))}>
      🔊 {t("brand")}
    </button>
  );
}
```

### With Language Selector
```tsx
export function MyPage() {
  const { t, locale, setLocale } = useTranslation();
  
  return (
    <>
      <select value={locale} onChange={e => setLocale(e.target.value as any)}>
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="te">తెలుగు</option>
      </select>
      <h1>{t("brand")}</h1>
    </>
  );
}
```

---

## ✨ Summary

**Everything is ready to use!**

- ✅ Widget on every page
- ✅ All features working
- ✅ Build successful
- ✅ Production ready
- ✅ Well documented
- ✅ No breaking changes
- ✅ WCAG compliant

**Start using it now!** 🎉

---

*Quick Reference v1.0*  
*Status: ✅ Complete*  
*Last Updated: May 11, 2025*
