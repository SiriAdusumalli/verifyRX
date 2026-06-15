import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { I18nProvider } from "./contexts/I18nContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AccessibilityProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AccessibilityProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>
);
