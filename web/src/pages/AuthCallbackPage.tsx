import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshDbUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus("error");
      setErrorMessage("Supabase is not configured.");
      return;
    }

    let isProcessing = false;

    const processAuth = async () => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        // 1. If there's an authorization code in the URL (PKCE flow), exchange it for a session
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw new Error(`Token exchange failed: ${exchangeError.message}`);
          }
        }

        // 2. Get the authenticated user session from Supabase
        const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
        
        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!session || !session.user) {
          // If no active session is found yet, allow onAuthStateChange or subsequent triggers to try
          isProcessing = false;
          return;
        }

        const user = session.user;

        // 3. Check if user already exists in public.users table to prevent duplicates
        const { data: dbUser, error: dbError } = await supabase!
          .from("users")
          .select("*")
          .eq("email", user.email)
          .maybeSingle();

        if (dbError) {
          throw new Error(`Profile check failed: ${dbError.message}`);
        }

        if (dbUser) {
          // User already exists! If auth_user_id is not set, link it now.
          if (!dbUser.auth_user_id) {
            const { error: updateError } = await supabase!
              .from("users")
              .update({ auth_user_id: user.id })
              .eq("email", user.email);

            if (updateError) {
              console.error("Failed to link auth_user_id to existing profile:", updateError.message);
            }
          }

          // Safe fallback: Update Auth metadata on successful login/callback to sync username as display name
          await supabase!.auth.updateUser({
            data: {
              user_name: dbUser.user_name,
              full_name: dbUser.user_name,
              display_name: dbUser.user_name,
              location: dbUser.location,
            }
          });

          // Hydrate AuthContext so the user is immediately recognized as logged in
          await refreshDbUser();

          setStatus("success");
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1500);
          return;
        }

        // 4. User does not exist, so let's retrieve pendingSignup data from localStorage
        const pendingSignupStr = localStorage.getItem("pendingSignup");
        let userName = user.email?.split("@")[0] || "User";
        let location = "Unknown";

        if (pendingSignupStr) {
          try {
            const pendingSignup = JSON.parse(pendingSignupStr);
            if (pendingSignup.user_name) userName = pendingSignup.user_name;
            if (pendingSignup.location) location = pendingSignup.location;
          } catch (e) {
            console.error("Failed to parse pendingSignup from localStorage:", e);
          }
        }

        // 5. Insert new user record into public.users table
        const { error: insertError } = await supabase!
          .from("users")
          .insert({
            user_name: userName,
            email: user.email,
            location: location,
            auth_user_id: user.id,
            created_at: new Date().toISOString()
          });

        if (insertError) {
          throw new Error(`Failed to create your profile: ${insertError.message}`);
        }

        // Safe fallback: Update Auth metadata on successful signup to sync username as display name
        await supabase!.auth.updateUser({
          data: {
            user_name: userName,
            full_name: userName,
            display_name: userName,
            location: location,
          }
        });

        // 6. Clean up localStorage pending signup key
        localStorage.removeItem("pendingSignup");

        // 7. Hydrate AuthContext so the user is immediately recognized as logged in
        await refreshDbUser();

        setStatus("success");
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 1500);

      } catch (err: any) {
        console.error("Auth callback processing error:", err);
        setStatus("error");
        setErrorMessage(err.message || "An authentication error occurred.");
      }
    };

    // Run processing on mount
    processAuth();

    // Listen for transitions to SIGNED_IN in case token exchange is deferred
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        processAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, searchParams, refreshDbUser]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-16 bg-slate-50/50">
      <div className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl md:p-10 transition-all duration-300">
        <div className="flex flex-col items-center text-center">
          
          {status === "loading" && (
            <>
              <div className="rounded-full bg-blue-50 p-4 text-blue-600 animate-spin">
                <Loader2 className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-800">Verifying Identity</h2>
              <p className="mt-2 text-sm text-slate-500 max-w-xs">
                Syncing secure credentials and completing your signup...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="rounded-full bg-emerald-50 p-4 text-emerald-600 animate-bounce">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-800">Verification Successful</h2>
              <p className="mt-2 text-sm text-slate-500">
                Welcome to VerifyRX! Redirecting you...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="rounded-full bg-rose-50 p-4 text-rose-600">
                <AlertCircle className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-slate-800">Verification Failed</h2>
              <p className="mt-2 text-sm text-rose-600 bg-rose-50/80 px-4 py-3 rounded-2xl font-medium border border-rose-100 w-full mt-4">
                {errorMessage}
              </p>
              <div className="mt-8 flex flex-col gap-3 w-full">
                <button
                  type="button"
                  onClick={() => navigate("/signup", { replace: true })}
                  className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Go to Signup
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login", { replace: true })}
                  className="w-full rounded-2xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  Back to Login
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
