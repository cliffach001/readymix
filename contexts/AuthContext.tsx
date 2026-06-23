"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Role, AuthUser } from "@/lib/auth-types";
import { STORAGE_KEY_AUTH } from "@/lib/auth-config";

// ============================================================
// Auth Context — Login/logout with localStorage persistence
// ============================================================

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  ready: boolean;
  login: (email: string, role: Role, unitKerja?: string) => void;
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
      return { role: parsed.role as Role, email: parsed.email ?? "", unitKerja: parsed.unitKerja };
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

  const login = useCallback((email: string, role: Role, unitKerja?: string) => {
    const authUser: AuthUser = { role, email, unitKerja };
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
