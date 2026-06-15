import { useSpeech } from "@/hooks/useSpeech";
import { useI18n } from "@/contexts/I18nContext";

/**
 * Example Page Component demonstrating accessibility features
 * 
 * Features demonstrated:
 * - Translation with useTranslation hook
 * - Speech synthesis with useSpeech hook
 * - Read page content on demand
 * - Auto-detect browser language
 * - Language switching
 */

export function ExamplePage() {
  const { speak } = useSpeech();
  const { t, locale, setLocale } = useI18n();

  const handleReadDescription = () => {
    const text = t("welcomeDescription");
    speak(text, locale);
  };

  const handleReadFeatures = () => {
    const features = [
      t("medicineScanner"),
      t("compareMedicines"),
      t("chatAssistant"),
      t("verification"),
    ].join(". ");
    speak(features, locale);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-10">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as "en" | "hi" | "te")}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="te">తెలుగు (Telugu)</option>
        </select>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {t("brand")}
          </h1>
          <p className="text-gray-600">{t("disclaimer")}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Introduction Section */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t("home")}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t("welcomeMessage")}
            </p>
            <p className="text-gray-700 leading-relaxed mb-6">
              {t("appDescription")}
            </p>

            {/* Accessibility Demo Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleReadDescription}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                🔊 {t("readDescription")}
              </button>
              <button
                onClick={handleReadFeatures}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                📖 {t("readFeatures")}
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {t("settings")}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-3">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("medicineScanner")}
              </h3>
              <p className="text-gray-600">
                {t("medicineScannerDesc")}
              </p>
              <button
                onClick={() => speak(t("medicineScanner"), locale)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                🔊 {t("read")}
              </button>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-3">⚖️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("compareMedicines")}
              </h3>
              <p className="text-gray-600">
                {t("compareMedicinesDesc")}
              </p>
              <button
                onClick={() => speak(t("compareMedicines"), locale)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                🔊 {t("read")}
              </button>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("chatAssistant")}
              </h3>
              <p className="text-gray-600">
                {t("chatAssistantDesc")}
              </p>
              <button
                onClick={() => speak(t("chatAssistant"), locale)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                🔊 {t("read")}
              </button>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t("verification")}
              </h3>
              <p className="text-gray-600">
                {t("verificationDesc")}
              </p>
              <button
                onClick={() => speak(t("verification"), locale)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                🔊 {t("read")}
              </button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">
            {t("howItWorks")}
          </h3>
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("scan")} Medicine
                  </h4>
                  <p className="text-gray-600">
                    {t("scanMedicineDesc")}
                  </p>
                  <button
                    onClick={() => speak(t("scanMedicine"), locale)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    🔊 {t("read")}
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("getInformation")}
                  </h4>
                  <p className="text-gray-600">
                    {t("getInformationDesc")}
                  </p>
                  <button
                    onClick={() => speak(t("getInformation"), locale)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    🔊 {t("read")}
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("compare")} & Verify
                  </h4>
                  <p className="text-gray-600">
                    {t("compareVerifyDesc")}
                  </p>
                  <button
                    onClick={() => speak(t("compareVerify"), locale)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    🔊 {t("read")}
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {t("makeInformedDecision")}
                  </h4>
                  <p className="text-gray-600">
                    {t("makeInformedDecisionDesc")}
                  </p>
                  <button
                    onClick={() => speak(t("makeInformedDecision"), locale)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    🔊 {t("read")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility Features Section */}
        <section className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            ♿ {t("accessibilityFeatures")}
          </h3>
          <p className="text-gray-700 mb-4">
            {t("accessibilityDescription")}
          </p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>
                <strong>{t("readAloud")}:</strong> {t("readAloudDesc")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>
                <strong>{t("languageSupport")}:</strong> {t("languageSupportDesc")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>
                <strong>{t("voiceSelection")}:</strong> {t("voiceSelectionDesc")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>
                <strong>{t("speedControl")}:</strong> {t("speedControlDesc")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>
                <strong>{t("readSelectedText")}:</strong> {t("readSelectedTextDesc")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>
                <strong>{t("persistentSettings")}:</strong> {t("persistentSettingsDesc")}
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>
                <strong>{t("keyboardNavigation")}:</strong> {t("keyboardNavigationDesc")}
              </span>
            </li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-4xl mx-auto px-6">
          <p className="mb-2">
            <strong>{t("brand")}</strong> - {t("disclaimer")}
          </p>
          <p className="text-gray-400 text-sm">
            © 2025 {t("brand")}. {t("allRightsReserved")}
          </p>
        </div>
      </footer>
    </div>
  );
}