import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  Home as HomeIcon,
  Scan,
  GitCompare,
  Bot,
  Shield,
  Menu,
  X,
  Globe
} from "lucide-react";
import { Header } from "./Header";
import { FloatingAccessibilityWidget } from "./FloatingAccessibilityWidget";

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t, locale, setLocale } = useI18n();
  const { user, dbUser } = useAuth();
  
  const isLoggedIn = !!(user && dbUser);

  const menuItems = [
    { path: "/", label: t("home") || "Home", icon: HomeIcon },
    { path: "/scan", label: t("scanMedicine") || "Scan Medicine", icon: Scan },
    { path: "/compare", label: t("compare") || "Compare", icon: GitCompare },
    { path: "/chat", label: t("chat") || "Assistant", icon: Bot },
  ];

  const currentPath = location.pathname;

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between py-6 px-4 relative z-10">
      <div>
        {/* Logo Section */}
        <Link 
          to="/" 
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 px-3 py-1 font-bold text-slate-900 tracking-tight text-xl"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50">
            <Shield className="h-5 w-5 fill-emerald-600/10" />
          </div>
          <span className="bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent">
            Verify<span className="text-emerald-600 font-extrabold">RX</span>
          </span>
        </Link>

        {/* Navigation Items */}
        <nav className="mt-8 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 shadow-sm border-l-4 border-emerald-600 pl-3"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 transition-colors duration-200 ${
                    isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Trust Card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/30 to-emerald-50/80 p-4 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/10 mb-3">
          <Shield className="h-4.5 w-4.5" />
        </div>
        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
          Stay Safe, Stay Protected
        </h4>
        <p className="mt-1 text-[11px] leading-relaxed text-emerald-800/80 font-medium">
          Verify medicines and protect yourself and your loved ones.
        </p>
      </div>

      {/* Decorative Wave Background Shape */}
      <div className="absolute bottom-0 left-0 w-32 h-24 bg-gradient-to-tr from-emerald-100/30 via-emerald-100/10 to-transparent rounded-tr-full -z-10 pointer-events-none" />
    </div>
  );

  const isAuthPage = currentPath === "/login" || currentPath === "/signup";

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50/50 flex flex-col relative overflow-x-hidden antialiased">
        {/* Decorative background shapes */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-100/20 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-50/20 rounded-full blur-3xl -z-10 pointer-events-none" />

        {/* Minimal floating top bar */}
        <header className="w-full px-4 sm:px-6 py-4 flex justify-center z-50">
          <div className="w-full max-w-5xl flex items-center justify-between bg-white/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-slate-100/80 shadow-soft">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 font-bold text-slate-900 tracking-tight text-lg"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 border border-brand-100/50 text-brand-600 shadow-sm">
                <Shield className="h-4.5 w-4.5 fill-brand-600/10 text-brand-600" />
              </div>
              <span className="bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent">
                Verify<span className="text-brand-600 font-extrabold">RX</span>
              </span>
            </Link>

            {/* Right-aligned Navigation Controls */}
            <div className="flex items-center gap-4">
              {/* Language Selector */}
              <div className="relative flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm focus-within:border-brand-500 transition duration-200">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as "en" | "hi" | "te")}
                  className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer pr-1"
                >
                  <option value="en">EN</option>
                  <option value="hi">HI</option>
                  <option value="te">TE</option>
                </select>
              </div>

              {/* Sign In / Sign Up switch button */}
              {currentPath === "/login" ? (
                <Link
                  to="/signup"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 transition duration-200 shadow-sm"
                >
                  Sign Up
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-brand-600 hover:bg-brand-50 transition duration-200 shadow-sm"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          {children}
        </main>

        <FloatingAccessibilityWidget />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/20 flex flex-row">
      {/* Desktop Sidebar (Fixed Left) */}
      {isLoggedIn && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[250px] border-r border-slate-100 bg-white lg:flex lg:flex-col shadow-sm">
          {renderSidebarContent()}
        </aside>
      )}

      {/* Mobile Drawer Sidebar */}
      {isLoggedIn && mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative flex w-[260px] max-w-xs flex-1 flex-col bg-white border-r border-slate-100 shadow-xl transition-transform duration-300">
            {/* Close Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-500 shadow-sm hover:bg-slate-50 active:scale-95 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className={`flex-1 flex flex-col min-w-0 ${isLoggedIn ? "lg:pl-[250px]" : ""} transition-all duration-300`}>
        {/* Top Floating Header */}
        <Header onMenuToggle={() => setMobileOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 relative">
          {children}
        </main>
      </div>

      <FloatingAccessibilityWidget />
    </div>
  );
}
