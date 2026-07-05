"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess } from "@/lib/auth-config";
import type { RouteKey } from "@/lib/auth-types";
import ErrorBoundary from "@/components/ErrorBoundary";

interface ProtectedRouteProps {
  route: RouteKey;
  children: React.ReactNode;
}

export default function ProtectedRoute({
  route,
  children,
}: ProtectedRouteProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Hooks harus dipanggil sebelum early return (rules of hooks)
  useEffect(() => {
    if (user && !canAccess(user.role, route)) {
      router.replace("/dashboard");
    }
  }, [user, user?.role, route, router]);

  // User null — biarkan ClientLayout menangani LoginScreen
  if (!user) return null;

  if (!canAccess(user.role, route)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
            <span className="text-3xl">🚫</span>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Akses Dibatasi
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Mengalihkan ke dashboard...
          </p>
        </div>
      </div>
    );
  }

  return <ErrorBoundary name={route}>{children}</ErrorBoundary>;
}
