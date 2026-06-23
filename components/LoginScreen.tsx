"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authenticateUser } from "@/lib/supabase-service";
import Image from "next/image";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Silakan masukkan username");
      return;
    }
    if (!password.trim()) {
      setError("Silakan masukkan password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await authenticateUser(username.trim(), password);

      if (!result.ok) {
        setError(result.message);
        setLoading(false);
        return;
      }

      login(result.data.username, result.data.role as any, result.data.unit_kerja ?? undefined);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan yang tidak terduga");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Logo PKM"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            PENJUALAN READY MIX
          </h1>
          <p className="text-sm text-gray-500">
            PT. Prima Karya Manunggal
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-8 space-y-5"
        >
          {/* Title */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Masuk ke Akun
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Masukkan kredensial untuk melanjutkan
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6600] to-orange-500 text-white text-sm font-semibold shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? "Memverifikasi..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
