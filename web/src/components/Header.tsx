import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { NavLink } from "react-router-dom";
import { Menu, Globe, LogOut } from "lucide-react";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { t, locale, setLocale } = useI18n();
  const { user, dbUser, signOut } = useAuth();

  const isLoggedIn = !!(user && dbUser);

  // Get user avatar letter or default
  const avatarLetter = dbUser?.user_name ? dbUser.user_name.charAt(0).toUpperCase() : "U";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-100 bg-white/70 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between">
      {/* Mobile Menu Toggle Button */}
      <div className="flex items-center gap-3">
        {isLoggedIn && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 lg:hidden active:scale-95 transition"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Small branding shown only on mobile */}
        <span className="lg:hidden font-bold text-slate-800 tracking-tight text-base">
          Verify<span className="text-emerald-600">RX</span>
        </span>
      </div>

      {/* Top Right Floating Controls */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Language Selector */}
        <div className="relative flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm focus-within:border-emerald-500">
          <Globe className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as "en" | "hi" | "te")}
            className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
          >
            <option value="en">EN</option>
            <option value="hi">HI</option>
            <option value="te">TE</option>
          </select>
        </div>

        {/* Auth / Profile Area */}
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 leading-none">
                Hi, {dbUser.user_name}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-semibold">
                Welcome back!
              </span>
            </div>

            {/* Profile Avatar */}
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-emerald-500 text-white font-bold text-sm shadow-sm ring-2 ring-emerald-50 border border-emerald-600">
              {avatarLetter}
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => signOut()}
              title={t("logout") || "Sign out"}
              className="flex h-8.5 w-8.5 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 active:scale-95 transition shadow-sm"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink
              to="/login"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm"
            >
              {t("login") || "Sign in"}
            </NavLink>
            <NavLink
              to="/signup"
              className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/10"
            >
              {t("signup") || "Sign up"}
            </NavLink>
          </div>
        )}
      </div>
    </header>
  );
}
