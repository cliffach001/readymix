// ============================================================
// Role-based Access Control — Permission Configuration
// ============================================================

import type { Role, RouteKey } from "./auth-types";

/** Mapping setiap route ke role yang diizinkan */
export const ROUTE_PERMISSIONS: Record<RouteKey, Role[]> = {
  dashboard: ["admin", "manager", "marketing", "viewer"],
  "laporan-mingguan": ["admin", "manager", "marketing"],
  "input-data": ["admin", "manager", "marketing"],
  "kelola-pengguna": ["admin"],
};

/** Metadata untuk ditampilkan di LoginScreen & Sidebar */
export const ROLE_LABELS: Record<
  Role,
  { label: string; description: string; icon: string }
> = {
  admin: {
    label: "Admin",
    description: "Akses penuh ke semua fitur",
    icon: "🛡️",
  },
  manager: {
    label: "Manager",
    description: "Melihat laporan dan input data produksi",
    icon: "✏️",
  },
  marketing: {
    label: "Marketing",
    description: "Input data produksi",
    icon: "📊",
  },
  viewer: {
    label: "Viewer",
    description: "Melihat dashboard saja",
    icon: "👁️",
  },
};

/** Daftar plant yang tersedia */
export const PLANTS = [
  { code: "pangkep",  name: "Ready Mix Pangkep",  location: "Pangkajene Kepulauan", icon: "🏭" },
  { code: "makassar", name: "Ready Mix Makassar", location: "Kota Makassar",        icon: "🏭" },
  { code: "pinrang",  name: "Ready Mix Pinrang",  location: "Kab. Pinrang",         icon: "🏭" },
  { code: "kendari",  name: "Ready Mix Kendari",  location: "Kota Kendari",          icon: "🏭" },
  { code: "toraja",   name: "Ready Mix Toraja",   location: "Tana Toraja",          icon: "🏭" },
  { code: "masamba",  name: "Ready Mix Masamba",  location: "Kab. Luwu Utara",      icon: "🏭" },
] as const;

/** Cari nama plant dari kode */
export function getPlantName(code: string): string {
  return PLANTS.find((p) => p.code === code)?.name ?? code;
}

/** Sambutan dinamis berdasarkan role & unit kerja */
export function getRoleGreeting(role: Role, unitKerja?: string): string {
  if (role === "marketing" && unitKerja) {
    return `Selamat datang di Penjualan ${getPlantName(unitKerja)}`;
  }
  return ROLE_LABELS[role]?.description ?? "";
}

/** Cek apakah role tertentu bisa mengakses suatu route */
export function canAccess(role: Role, route: RouteKey): boolean {
  return ROUTE_PERMISSIONS[route]?.includes(role) ?? false;
}

/** Dapatkan daftar route yang bisa diakses oleh role tertentu */
export function getAccessibleRoutes(role: Role): RouteKey[] {
  return (Object.keys(ROUTE_PERMISSIONS) as RouteKey[]).filter((route) =>
    ROUTE_PERMISSIONS[route].includes(role)
  );
}

export const STORAGE_KEY_AUTH = "rm-pkm-auth";
