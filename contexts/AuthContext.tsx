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

const CHECK_INTERVAL = 30 * 1000; // cek setiap 30 detik

function getTimeoutByRole(role: string | undefined): number {
  switch (role) {
    case "admin":
      return 4 * 60 * 60 * 1000;    // 4 jam — admin lebih sensitif
    case "manager":
      return 6 * 60 * 60 * 1000;    // 6 jam
    case "marketing":
      return 8 * 60 * 60 * 1000;    // 8 jam (input data)
    case "viewer":
      return 12 * 60 * 60 * 1000;   // 12 jam (hanya melihat)
    default:
      return 8 * 60 * 60 * 1000;
  }
}

// ============================================================
// Auth Context — Login/logout with localStorage persistence
// ============================================================

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (email: string, role: Role, namaLengkap: string, unitKerja?: string, avatar_url?: string) => void;
  logout: () => void;
  /** Update field tertentu di user state + localStorage (misal avatar_url) */
  updateUserField: (fields: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getInitialUser(): AuthUser | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.role === "string") {
      return { role: parsed.role as Role, email: parsed.email ?? "", namaLengkap: parsed.namaLengkap ?? parsed.email ?? "", unitKerja: parsed.unitKerja, avatar_url: parsed.avatar_url ?? undefined };
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

  const login = useCallback((email: string, role: Role, namaLengkap: string, unitKerja?: string, avatar_url?: string) => {
    const authUser: AuthUser = { role, email, namaLengkap, unitKerja, avatar_url };
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

  const updateUserField = useCallback((fields: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      try {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
      } catch {
        // abaikan
      }
      return updated;
    });
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
      const timeout = getTimeoutByRole(user?.role);
      if (elapsed >= timeout) {
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
      value={{ user, isAuthenticated: user !== null, ready, login, logout, updateUserField }}
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
