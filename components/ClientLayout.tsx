"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import LoginScreen from "@/components/LoginScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotifikasiBell from "@/components/NotifikasiBell";
import Link from "next/link";
import { LayoutDashboard, ClipboardList, BarChart3, Target, Users, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ROLE_LABELS, getPlantName, getAccessibleRoutes } from "@/lib/auth-config";
import type { RouteKey } from "@/lib/auth-types";

const menuItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Laporan", href: "/laporan-mingguan", icon: ClipboardList },
  { title: "Presentasi", href: "/presentasi", icon: BarChart3 },
  { title: "RKAP", href: "/rkap", icon: Target },
  { title: "Pengguna", href: "/kelola-pengguna", icon: Users },
];

/** Global error handler untuk menangkap error di luar React tree */
function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.warn("[GlobalErrorHandler]", event.error?.message || event.message);
      event.preventDefault();
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      console.warn("[UnhandledRejection]", event.reason?.message || event.reason);
      event.preventDefault();
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { ready, isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const [showProfile, setShowProfile] = useState(false);

  // Tutup profil popup saat ganti halaman
  useEffect(() => {
    setShowProfile(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#F35b04] animate-pulse" />
          <p className="text-sm text-gray-400">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const roleMeta = user ? ROLE_LABELS[user.role] : null;

  // Filter menu berdasarkan role
  const accessibleRoutes = user
    ? getAccessibleRoutes(user.role)
    : ([] as RouteKey[]);
  const filteredItems = menuItems.filter((item) =>
    accessibleRoutes.includes(item.href.replace("/", "") as RouteKey)
  );

  return (
    <>
      <Sidebar />

      <div className="lg:ml-[var(--sidebar-width)] min-h-screen flex flex-col pb-16 lg:pb-0">
        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
          {/* Kiri: Brand */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-900">Penjualan Ready Mix</span>
          </div>

          {/* Kanan: Notifikasi + Profil */}
          <div className="flex items-center gap-4 relative">
            <NotifikasiBell />
            <button
              onClick={() => setShowProfile((prev) => !prev)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-orange-100 text-[#F35b04] hover:bg-orange-200 transition-all"
              aria-label="Profil"
            >
              <span className="text-xs font-bold">
                {(user?.namaLengkap?.charAt(0) || user?.email?.charAt(0) || "?").toUpperCase()}
              </span>
            </button>

            {/* ── Dropdown Profil ── */}
            {showProfile && user && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl shadow-black/10 overflow-hidden">
                  <div className="p-4 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F35b04] to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(user.namaLengkap?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.namaLengkap}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {roleMeta?.icon} {roleMeta?.label}
                      </p>
                      {user.unitKerja && (
                        <span className="text-[10px] text-gray-400">
                          {getPlantName(user.unitKerja).replace("Ready Mix ", "")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { setShowProfile(false); logout(); }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>

        <footer className="text-right text-[10px] text-gray-400 px-3 py-2 border-t border-gray-100">
          © 2026 PT. Prima Karya Manunggal — design by NUI6184
        </footer>
      </div>

      {/* ── Bottom Nav (Mobile Only) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden items-center justify-around bg-[#F35b04] shadow-[0_-4px_20px_rgba(0,0,0,0.15)] px-2 py-1 safe-area-bottom">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0",
                isActive
                  ? "text-white"
                  : "text-white/60 hover:text-white/90"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-white/50")} />
              <span className="text-[10px] font-medium leading-tight">{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary name="AppRoot">
      <GlobalErrorHandler />
      <AuthProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthProvider>
    </ErrorBoundary>
  );
}
