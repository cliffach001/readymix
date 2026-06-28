import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Validasi password:
 * - Minimal 8 karakter
 * - Mengandung huruf BESAR
 * - Mengandung huruf kecil
 * - Mengandung angka
 * Mengembalikan pesan error jika tidak valid, atau null jika valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) return "Password harus diisi";
  if (password.length < 8) return "Password minimal 8 karakter";
  if (!/[A-Z]/.test(password)) return "Password harus mengandung huruf besar (A-Z)";
  if (!/[a-z]/.test(password)) return "Password harus mengandung huruf kecil (a-z)";
  if (!/[0-9]/.test(password)) return "Password harus mengandung angka (0-9)";
  return null;
}
