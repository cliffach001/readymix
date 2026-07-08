// ============================================================
// Dashboard Constants — Single source of truth for plants & colors
// ============================================================

export interface PlantConfig {
  key: string;
  label: string;
  color: string;
}

export const PLANTS: PlantConfig[] = [
  { key: "pangkep", label: "Pangkep", color: "#F35b04" },
  { key: "makassar", label: "Makassar", color: "#ef4444" },
  { key: "pinrang", label: "Pinrang", color: "#10b981" },
  { key: "kendari", label: "Kendari", color: "#f59e0b" },
  { key: "toraja", label: "Toraja", color: "#8b5cf6" },
  { key: "masamba", label: "Masamba", color: "#ec4899" },
];

// Warna untuk chart styles (Tailwind classes)
export const PLANT_COLORS = [
  { bar: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-100" },
  { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-100" },
  { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-100" },
  { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-100" },
  { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-100" },
  { bar: "bg-pink-500", text: "text-pink-700", bg: "bg-pink-100" },
];

export const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export const MONTHS = [
  { num: 1, label: "Januari" },
  { num: 2, label: "Februari" },
  { num: 3, label: "Maret" },
  { num: 4, label: "April" },
  { num: 5, label: "Mei" },
  { num: 6, label: "Juni" },
  { num: 7, label: "Juli" },
  { num: 8, label: "Agustus" },
  { num: 9, label: "September" },
  { num: 10, label: "Oktober" },
  { num: 11, label: "November" },
  { num: 12, label: "Desember" },
];

// Helper: filter plant list berdasarkan plantCode
export function filterPlants(plantCode?: string): PlantConfig[] {
  if (plantCode) {
    return PLANTS.filter((p) => p.key === plantCode);
  }
  return PLANTS;
}
