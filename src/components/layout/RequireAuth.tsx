import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate(`/login?next=${encodeURIComponent(location)}`, { replace: true });
  }, [loading, user, location, navigate]);

  if (loading) {
    return (
      <div className="container space-y-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}
