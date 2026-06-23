"use client";

import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import LoginScreen from "@/components/LoginScreen";
import ErrorBoundary from "@/components/ErrorBoundary";

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
      <main className="lg:ml-[var(--sidebar-width)] min-h-screen pb-24 lg:pb-0">
        {children}
      </main>
    </>
  );
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LayoutContent>{children}</LayoutContent>
      </AuthProvider>
    </ErrorBoundary>
  );
}
