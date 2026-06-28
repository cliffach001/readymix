// ============================================================
// Role-based Access Control — Type Definitions
// ============================================================

export type Role = "admin" | "manager" | "marketing" | "viewer";

export type RouteKey = "dashboard" | "laporan-mingguan" | "kelola-pengguna" | "rkap" | "presentasi";

export interface AuthUser {
  role: Role;
  email: string;
  namaLengkap: string;
  unitKerja?: string; // plant_code — khusus untuk role marketing
  avatar_url?: string;
}
