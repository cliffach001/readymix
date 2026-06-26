"use client";

import { useState, useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import LoginScreen from "@/components/LoginScreen";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotifikasiBell from "@/components/NotifikasiBell";
import { Menu, X, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { ROLE_LABELS, getPlantName } from "@/lib/auth-config";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Tutup sidebar & profil popup saat ganti halaman
  useEffect(() => {
    setMobileOpen(false);
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

  return (
    <>
      <Sidebar
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((prev) => !prev)}
      />

      <div className="lg:ml-[var(--sidebar-width)] min-h-screen flex flex-col">
        {/* ── Sticky Header ── */}
        <header className="sticky top-0 z-20 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
          {/* Kiri: Hamburger + Brand */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen((prev) => !prev)}
              className="flex lg:hidden items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
              aria-label="Buka menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
                  {/* User Info */}
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
                  {/* Actions */}
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
