import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, dbUser, loading, dbLoading } = useAuth();
  const location = useLocation();

  // Show a professional, premium loading spinner while checking auth session or database profile
  if (loading || dbLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="relative h-12 w-12">
          {/* Outer glowing ring */}
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-20"></div>
          {/* Inner spinner */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-brand-600"></div>
        </div>
        <p className="mt-4 text-sm font-medium text-slate-500 animate-pulse">
          Verifying secure session...
        </p>
      </div>
    );
  }

  // If no auth session or the db user profile is missing, redirect to login
  if (!user || !dbUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
