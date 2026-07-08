"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { ready, isAuthenticated } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, router]);

  // Selalu render struktur yang sama server & client untuk menghindari hydration mismatch
  if (!mounted || !ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-sm text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#F35b04] border-t-transparent animate-spin" />
          <p>Memuat...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // ClientLayout akan menampilkan LoginScreen
  }

  // Lagi redirect ke dashboard
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-sm text-gray-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#F35b04] border-t-transparent animate-spin" />
        <p>Mengalihkan...</p>
      </div>
    </div>
  );
}
