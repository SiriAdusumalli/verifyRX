import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Shield,
  Activity,
  Award,
  Sparkles,
  Upload,
  Link2,
  Bell,
  Lock,
  Scan
} from "lucide-react";

export function LandingPage() {
  const { t } = useI18n();
  const { user, dbUser } = useAuth();
  
  const isLoggedIn = !!(user && dbUser);

  return (
    <div className="relative overflow-hidden bg-white/30 py-12 md:py-20 lg:py-24">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 -z-10 h-[400px] w-[400px] rounded-full bg-emerald-50/40 blur-3xl" />
      <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-sky-50/50 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        
        {/* Main Hero Grid */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          
          {/* Left Column: Text Content */}
          <div className="text-left lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 border border-emerald-100/50"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
              AI-Powered · Secure · Reliable
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-black tracking-tight text-slate-900 md:text-5.5xl lg:text-6xl leading-tight"
            >
              Verify and Analyze Your{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                Medicines
              </span>{" "}
              Instantly
            </motion.h1>

         

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4 pt-2"
            >
              {isLoggedIn ? (
                <>
                  <Link
                    to="/scan"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/10 transition duration-300 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Scan className="h-4.5 w-4.5" />
                    {t("startScan") || "Scan Medicine"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition duration-300 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Open Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-emerald-600/10 transition duration-300 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition duration-300 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Login to VerifyRX
                  </Link>
                </>
              )}
            </motion.div>

            {/* Muted Encryption Note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Shield className="h-3.5 w-3.5 fill-emerald-600/10" />
              </div>
              Your data is encrypted and secure
            </motion.div>
          </div>

          {/* Right Column: Visual Box Illustration */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative w-full max-w-[340px] flex justify-center items-center"
            >
              {/* Paracetamol Box Image */}
              <img
                src="/paracetamol.png"
                alt="Paracetamol 500mg Tablets"
                className="w-full max-w-[280px] h-auto object-contain drop-shadow-[0_15px_35px_rgba(15,23,42,0.12)] hover:scale-105 transition-transform duration-500 ease-out rounded-2xl"
              />
            </motion.div>
          </div>

        </div>

        {/* Bottom Feature Cards Row */}
        <div className="mt-20 border-t border-slate-100 pt-16">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            
            {/* Card 1: 100% Secure */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-start text-left space-y-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">100% Secure</h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-400">
                  End-to-end encrypted scans and verification files hosted securely.
                </p>
              </div>
            </motion.div>

            {/* Card 2: Real-Time Analysis */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-start text-left space-y-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Real-Time Analysis</h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-400">
                  Instant scanning and OpenFDA matching within milliseconds.
                </p>
              </div>
            </motion.div>

            {/* Card 3: Supply Chain Verified */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-start text-left space-y-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Supply Chain Verified</h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-400">
                  Track from manufacturer to direct consumer retail pharmacy outlets.
                </p>
              </div>
            </motion.div>

            {/* Card 4: Smart Alerts */}
            <motion.div 
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-start text-left space-y-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Smart Alerts</h3>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-400">
                  Receive notifications regarding compromised or suspended medicine batches.
                </p>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </div>
  );
}
