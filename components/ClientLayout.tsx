"use client";

import { useEffect, type ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import LoginScreen from "@/components/LoginScreen";
import ErrorBoundary from "@/components/ErrorBoundary";

/** Global error handler untuk menangkap error di luar React tree */
function GlobalErrorHandler() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.warn("[GlobalErrorHandler]", event.error?.message || event.message);
      // Cegah default biar halaman tidak langsung blank total
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
  const { ready, isAuthenticated } = useAuth();

  // Tampilkan spinner sampai localStorage selesai dibaca
  // (cocok dengan loading fallback dari dynamic() di layout)
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#FF6600] animate-pulse" />
          <p className="text-sm text-gray-400">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <>
      <Sidebar />
      <div className="lg:ml-[var(--sidebar-width)] min-h-screen flex flex-col pb-16 lg:pb-0">
        <main className="flex-1 pb-4">
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
