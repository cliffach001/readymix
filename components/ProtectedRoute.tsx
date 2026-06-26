"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess, ROLE_LABELS } from "@/lib/auth-config";
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

  // User null — biarkan ClientLayout menangani LoginScreen
  if (!user) return null;

  // Role tidak punya akses — tampilkan halaman terlarang
  if (!canAccess(user.role, route)) {
    const meta = ROLE_LABELS[user.role];
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
            Role <strong>{meta.label}</strong> tidak memiliki izin untuk
            mengakses halaman ini.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F35b04] text-white text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <ErrorBoundary name={route}>{children}</ErrorBoundary>;
}
