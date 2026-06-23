"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { ready, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [ready, isAuthenticated, router]);

  // Loading — biarkan LayoutContent menangani spinner
  if (!ready) return null;

  // Sudah siap tapi belum login — biarkan LoginScreen tampil
  if (!isAuthenticated) return null;

  // Lagi redirect ke dashboard
  return (
    <div className="flex items-center justify-center min-h-[60vh] text-sm text-gray-400">
      Mengalihkan...
    </div>
  );
}
