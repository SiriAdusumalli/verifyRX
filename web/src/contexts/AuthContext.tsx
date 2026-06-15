import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  dbUser: any | null;
  dbLoading: boolean;
  signIn: (email: string) => Promise<{ error: Error | null }>;
  signUp: (email: string) => Promise<{ error: Error | null }>;
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
  signUpWithOtp: (
    email: string,
    username: string,
    location: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshDbUser: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [dbLoading, setDbLoading] = useState(false);

  // Helper to fetch custom profile from public.users table
  const fetchDbProfile = async (email: string, user_id: string) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle();

      if (error) {
        console.error("Error fetching db profile:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("Network error fetching db profile:", err);
      return null;
    }
  };

  const refreshDbUser = async () => {
    if (!session?.user) {
      setDbUser(null);
      return;
    }
    setDbLoading(true);
    const profile = await fetchDbProfile(session.user.email!, session.user.id);
    setDbUser(profile);
    if (profile) {
      localStorage.setItem("verify_rx_mock_user", JSON.stringify(profile));
    }
    setDbLoading(false);
  };

  // Sync session changes and fetch custom users table profile
  useEffect(() => {
    // 1. First, check if there's a cached mock user session in localStorage
    const cachedMockUser = localStorage.getItem("verify_rx_mock_user");
    if (cachedMockUser) {
      try {
        const profile = JSON.parse(cachedMockUser);
        setDbUser(profile);
        setSession({
          access_token: "mock-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh",
          user: {
            id: profile.auth_user_id || profile.id,
            email: profile.email,
            aud: "authenticated",
            role: "authenticated",
            email_confirmed_at: new Date().toISOString(),
            created_at: profile.created_at,
            app_metadata: {},
            user_metadata: {
              user_name: profile.user_name,
              location: profile.location,
            },
          } as any,
        });
        setLoading(false);
        return;
      } catch (err) {
        console.error("Error parsing cached mock user session:", err);
      }
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get current session on mount
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      
      if (s?.user) {
        setDbLoading(true);
        const profile = await fetchDbProfile(s.user.email!, s.user.id);
        setDbUser(profile);
        
        if (profile) {
          localStorage.setItem("verify_rx_mock_user", JSON.stringify(profile));
        }

        // Security check: if user is logged in with Supabase but no profile exists in users table,
        // and we aren't in the middle of auth callback page processing, auto sign them out.
        if (!profile && !window.location.pathname.startsWith("/auth/callback")) {
          await supabase!.auth.signOut();
          setDbUser(null);
          localStorage.removeItem("verify_rx_mock_user");
        }
        setDbLoading(false);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      
      if (s?.user) {
        setDbLoading(true);
        const profile = await fetchDbProfile(s.user.email!, s.user.id);
        setDbUser(profile);

        if (profile) {
          localStorage.setItem("verify_rx_mock_user", JSON.stringify(profile));
        }

        if (!profile && !window.location.pathname.startsWith("/auth/callback")) {
          await supabase!.auth.signOut();
          setDbUser(null);
          localStorage.removeItem("verify_rx_mock_user");
        }
        setDbLoading(false);
      } else {
        // If we are not currently logged in with a local mock session, clear it.
        const cachedMock = localStorage.getItem("verify_rx_mock_user");
        if (!cachedMock) {
          setDbUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Expose simplified and customized authentication methods
  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      dbUser,
      dbLoading,

      // Default signIn trigger checks if user exists in database and logs in instantly
      signIn: async (email) => {
        if (!supabase) return { error: new Error("Auth not configured") };
        try {
          const { data, error } = await supabase
            .rpc("get_auth_user_by_email", {
              email_to_check: email.trim().toLowerCase(),
            });

          if (error) {
            return { error: new Error(`Lookup failed: ${error.message}`) };
          }

          if (!data || data.length === 0) {
            return { error: new Error("Account does not exist. Please sign up first.") };
          }

          const authUser = data[0];

          // Map the retrieved auth user metadata back to mock user profile format
          const mockDbUser = {
            id: authUser.id,
            auth_user_id: authUser.id,
            email: authUser.email,
            user_name: authUser.user_metadata?.user_name || authUser.email.split("@")[0] || "User",
            location: authUser.user_metadata?.location || "Unknown",
            created_at: authUser.created_at,
          };

          // Cache in localStorage to bypass magic link on login
          localStorage.setItem("verify_rx_mock_user", JSON.stringify(mockDbUser));
          
          setSession({
            access_token: "mock-token",
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "mock-refresh",
            user: {
              id: mockDbUser.auth_user_id || mockDbUser.id,
              email: mockDbUser.email,
              aud: "authenticated",
              role: "authenticated",
              email_confirmed_at: new Date().toISOString(),
              created_at: mockDbUser.created_at,
              app_metadata: {},
              user_metadata: {
                user_name: mockDbUser.user_name,
                location: mockDbUser.location,
              },
            } as any,
          });
          setDbUser(mockDbUser);

          return { error: null };
        } catch (err: any) {
          return { error: err };
        }
      },

      // Default signUp trigger (fallback)
      signUp: async (email) => {
        if (!supabase) return { error: new Error("Auth not configured") };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup`,
          },
        });
        return { error: error as Error | null };
      },

      // OTP Signin (kept for backup, redirects to auth callback)
      signInWithOtp: async (email) => {
        if (!supabase) return { error: new Error("Auth not configured") };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?flow=login`,
          },
        });
        return { error: error as Error | null };
      },

      // OTP Signup - stores username & location inside Supabase user metadata
      signUpWithOtp: async (email, username, location) => {
        if (!supabase) return { error: new Error("Auth not configured") };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?flow=signup`,
            data: {
              user_name: username,
              full_name: username,
              display_name: username,
              location: location,
            },
          },
        });
        return { error: error as Error | null };
      },

      signOut: async () => {
        localStorage.removeItem("verify_rx_mock_user");
        setDbUser(null);
        setSession(null);
        if (supabase) {
          await supabase.auth.signOut();
        }
      },
      refreshDbUser,
    }),
    [session, loading, dbUser, dbLoading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const x = useContext(Ctx);
  if (!x) throw new Error("useAuth must be used within an AuthProvider");
  return x;
}
