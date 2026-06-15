import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, User, MapPin, Loader2, ArrowRight, Shield, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

export function SignupPage() {
  const { user } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Frontend-only UI state for Password field
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect authenticated users
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg(null);

    try {
      // Store signup data temporarily
      localStorage.setItem(
        "pendingSignup",
        JSON.stringify({
          user_name: username.trim(),
          email: email.trim(),
          location: location.trim(),
        })
      );

      const authClient = supabase?.auth;
      if (!authClient) {
        throw new Error("Authentication service unavailable.");
      }

      // Strictly preserves original OTP email auth logic and payload parameters
      const { error } = await authClient.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup`,
          data: {
            user_name: username.trim(),
            full_name: username.trim(),
            display_name: username.trim(),
            location: location.trim(),
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setIsSubmitted(true);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Something went wrong. Please try again.");
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

        {!isSubmitted ? (
          <>
            {/* Medical Header */}
            <div className="text-center flex flex-col items-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 border border-brand-100/50 text-brand-600 shadow-sm relative group mb-6"
              >
                <User className="h-7 w-7 text-brand-600 transition-transform duration-300 group-hover:scale-105" />
                {/* Small check indicator overlay */}
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm border border-white text-[10px] font-extrabold select-none">
                  ✓
                </div>
              </motion.div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 bg-clip-text text-transparent">
                Create your account
              </h1>

              <p className="mt-2 text-sm text-slate-500 font-medium leading-relaxed">
                Sign up to get started with VerifyRX
              </p>
            </div>

            {/* Error Message Block */}
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-xs font-semibold text-rose-600"
              >
                {errorMsg}
              </motion.div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">

              {/* Full Name / Username */}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block"
                >
                  Full Name
                </label>

                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-brand-600 transition-colors duration-200">
                    <User className="h-4.5 w-4.5" />
                  </div>

                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:shadow-sm"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block"
                >
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
                    placeholder="jane@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:shadow-sm"
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

              {/* Location */}
              <div className="space-y-2">
                <label
                  htmlFor="location"
                  className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block"
                >
                  Location
                </label>

                <div className="relative group">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-brand-600 transition-colors duration-200">
                    <MapPin className="h-4.5 w-4.5" />
                  </div>

                  <input
                    id="location"
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. California, USA"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none transition duration-200 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/5 focus:shadow-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.005, translateY: -0.5 }}
                whileTap={{ scale: 0.995 }}
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-100/50 hover:shadow-brand-100 hover:from-brand-700 hover:to-brand-800 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed pt-4"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer switch to Login */}
            <div className="mt-8 text-center text-xs font-bold text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-brand-600 hover:text-brand-700 transition-colors"
              >
                Sign in
              </Link>
            </div>
          </>
        ) : (
          /* Check Email Success State */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center flex flex-col items-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-sm mb-6 animate-pulse">
              <Mail className="h-8 w-8 text-emerald-600" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Check Your Email
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
              We sent a secure Magic Link to{" "}
              <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-100/80">
                {email}
              </span>
              . Click the link in your email inbox to complete registration.
            </p>

            <div className="mt-10 pt-4 border-t border-slate-100 w-full">
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="text-xs font-bold uppercase tracking-wider text-brand-600 hover:text-brand-700 transition-colors"
              >
                Change details or retry
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}