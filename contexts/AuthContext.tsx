"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { Role, AuthUser } from "@/lib/auth-types";
import { STORAGE_KEY_AUTH } from "@/lib/auth-config";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 menit
const CHECK_INTERVAL = 30 * 1000; // cek setiap 30 detik

// ============================================================
// Auth Context — Login/logout with localStorage persistence
// ============================================================

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (email: string, role: Role, namaLengkap: string, unitKerja?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getInitialUser(): AuthUser | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.role === "string") {
      return { role: parsed.role as Role, email: parsed.email ?? "", namaLengkap: parsed.namaLengkap ?? parsed.email ?? "", unitKerja: parsed.unitKerja };
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Load user setelah mount (client-only, hindari hydration mismatch)
  useEffect(() => {
    setUser(getInitialUser());
    setReady(true);
  }, []);

  const login = useCallback((email: string, role: Role, namaLengkap: string, unitKerja?: string) => {
    const authUser: AuthUser = { role, email, namaLengkap, unitKerja };
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authUser));
    } catch {
      // localStorage penuh atau tidak tersedia
    }
    setUser(authUser);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } catch {
      // abaikan
    }
    setUser(null);
  }, []);

  // ── Inactivity auto-logout ──
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return; // hanya jalan saat user terautentikasi

    const events = ["mousemove", "mousedown", "click", "keydown", "keyup", "scroll", "touchstart", "touchmove", "wheel"];

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Register event listeners
    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    // Periodic check every 30 detik
    const intervalId = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT) {
        logout();
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      clearInterval(intervalId);
    };
  }, [user, logout]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: user !== null, ready, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
