import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Loader2, ArrowRight, Shield, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export function LoginPage() {
  const { user, dbUser, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Frontend-only UI state for Password field
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // If user is already authenticated with a complete profile, send them to landing page
  if (user && dbUser) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // Strictly preserves original OTP email auth logic
      const { error } = await signIn(trimmedEmail);
      if (error) {
        setErrorMsg(error.message);
      } else {
        // Redirect directly to landing page on successful login!
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-lg"
    >
      <div className="w-full rounded-[24px] border border-slate-100/80 bg-white p-8 md:p-12 shadow-soft hover:shadow-card transition-all duration-300">
        
        {/* Healthcare Header */}
        <div className="text-center flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100/50 text-brand-600 shadow-sm relative group mb-6"
          >
            <Shield className="h-7 w-7 fill-brand-600/10 text-brand-600 transition-transform duration-300 group-hover:scale-105" />
            {/* Small green cross overlay to represent healthcare trust */}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm border border-white text-[11px] font-extrabold select-none">
              +
            </div>
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 bg-clip-text text-transparent">
            Welcome back!
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium leading-relaxed">
            Sign in to continue to your account
          </p>
        </div>

        {/* Error message block */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-xs font-semibold text-rose-600"
          >
            {errorMsg}
          </motion.div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          
          {/* Email Input */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Email Address
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-brand-600 transition-colors duration-200">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:shadow-sm"
                placeholder="name@example.com"
              />
            </div>
          </div>

          {/* Password Input (Frontend UI Only) */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Password
            </label>
            <div className="relative group">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-brand-600 transition-colors duration-200">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:shadow-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 active:scale-95 transition-transform"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>

            {/* Password Disclaimer */}
            <div className="flex items-start gap-2 mt-2 px-1 text-emerald-600 text-xs font-semibold leading-relaxed">
              <Shield className="h-3.5 w-3.5 shrink-0 fill-emerald-50 text-emerald-600 mt-0.5" />
              <span>Your password is only used on this device and is not stored or verified.</span>
            </div>
          </div>

          {/* Actions: Remember Me & Forgot Password */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 focus:ring-2 cursor-pointer transition"
              />
              <label htmlFor="remember-me" className="ml-2 text-xs font-bold text-slate-600 select-none cursor-pointer">
                Remember me
              </label>
            </div>
            
            <a 
              href="#forgot-password" 
              onClick={(e) => e.preventDefault()}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 transition"
            >
              Forgot password?
            </a>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.005, translateY: -0.5 }}
            whileTap={{ scale: 0.995 }}
            type="submit"
            disabled={loading}
            className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-100/50 hover:shadow-brand-100 hover:from-brand-700 hover:to-brand-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign in
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </>
            )}
          </motion.button>
        </form>

        {/* Footer switch to Signup */}
        <div className="mt-8 text-center text-xs font-bold text-slate-500">
          Don't have an account?{" "}
          <Link to="/signup" className="text-brand-600 hover:text-brand-700 transition-colors">
            Sign up
          </Link>
        </div>

      </div>
    </motion.div>
  );
}
