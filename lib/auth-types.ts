// ============================================================
// Role-based Access Control — Type Definitions
// ============================================================

export type Role = "admin" | "manager" | "marketing" | "viewer";

export type RouteKey = "dashboard" | "laporan-mingguan" | "input-data" | "kelola-pengguna";

export interface AuthUser {
  role: Role;
  email: string;
  unitKerja?: string; // plant_code — khusus untuk role marketing
}
