const STORAGE_KEY = "rm-pkm-filter-bulan";

export interface FilterBulan {
  month: number; // 1-12
  year: number;
}

export function getFilterBulan(): FilterBulan {
  if (typeof window === "undefined") {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.month === "number" && typeof parsed.year === "number") {
        return parsed;
      }
    }
  } catch {}
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function setFilterBulan(month: number, year: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ month, year }));
  } catch {}
}
