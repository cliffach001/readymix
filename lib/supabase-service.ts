import { getSupabase } from "./supabase";
import type { LaporanMingguan } from "./data";

// ============================================================
// Types (sama dengan data.ts untuk kompatibilitas)
// ============================================================

export interface ProduksiHarianRow {
  tanggal: string;
  pangkep: number;
  makassar: number;
  pinrang: number;
  kendari: number;
  toraja: number;
  masamba: number;
}

export interface ProduksiBulananRow {
  bulan: string;
  pangkep: number;
  makassar: number;
  pinrang: number;
  kendari: number;
  toraja: number;
  masamba: number;
}

export interface RKAPRow {
  plant: string;
  target: number;
  realisasi: number;
  persentase: number;
}

export interface PlantRow {
  id: string; // code
  nama: string; // name
  lokasi: string; // location
  icon: string;
}

// ============================================================
// Helper: pivot flat rows ke format per-plant
// ============================================================

const PLANT_CODES = ["pangkep", "makassar", "pinrang", "kendari", "toraja", "masamba"];

function pivotByDate(
  rows: { tanggal: string; plant_code: string; volume: number }[]
) {
  const map = new Map<string, Record<string, number>>();

  for (const r of rows) {
    if (!map.has(r.tanggal)) {
      map.set(r.tanggal, {});
    }
    map.get(r.tanggal)![r.plant_code] = r.volume;
  }

  return Array.from(map.entries())
    .map(([tanggal, plants]) => {
      const row: Record<string, string | number> = { tanggal };
      for (const code of PLANT_CODES) {
        row[code] = plants[code] ?? 0;
      }
      return row as unknown as ProduksiHarianRow;
    })
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

function pivotByBulan(
  rows: { bulan: string; plant_code: string; volume: number }[]
) {
  const map = new Map<string, Record<string, number>>();

  for (const r of rows) {
    if (!map.has(r.bulan)) {
      map.set(r.bulan, {});
    }
    map.get(r.bulan)![r.plant_code] = r.volume;
  }

  return Array.from(map.entries())
    .map(([bulan, plants]) => {
      const row: Record<string, string | number> = { bulan };
      for (const code of PLANT_CODES) {
        row[code] = plants[code] ?? 0;
      }
      return row as unknown as ProduksiBulananRow;
    });
}

// ============================================================
// Data Fetching Functions
// ============================================================

export async function fetchProduksiHarian(): Promise<ProduksiHarianRow[]> {
  const { data, error } = await getSupabase()
    .from("produksi_harian")
    .select("tanggal, plant_code, volume")
    .order("tanggal", { ascending: true })
    .returns<{ tanggal: string; plant_code: string; volume: number }[]>();

  if (error) throw error;
  return pivotByDate(data ?? []);
}

export async function fetchProduksiBulanan(): Promise<ProduksiBulananRow[]> {
  const { data, error } = await getSupabase()
    .from("produksi_bulanan")
    .select("bulan, plant_code, volume")
    .order("bulan", { ascending: true })
    .returns<{ bulan: string; plant_code: string; volume: number }[]>();

  if (error) throw error;
  return pivotByBulan(data ?? []);
}


export interface RKAPRecord {
  id: string;
  plant_code: string;
  tahun: number;
  bulan: number;
  target: number;
  created_at: string;
}

export async function fetchRKAPRecords(): Promise<RKAPRecord[]> {
  const { data, error } = await getSupabase()
    .from("rkap")
    .select("id, plant_code, tahun, bulan, target, created_at")
    .order("tahun", { ascending: false })
    .order("bulan", { ascending: true })
    .order("plant_code", { ascending: true })
    .returns<RKAPRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createRKAPRecord(
  record: Omit<RKAPRecord, "id" | "created_at">
): Promise<RKAPRecord> {
  const { data, error } = await (getSupabase()
    .from("rkap") as any)
    .insert({
      plant_code: record.plant_code,
      tahun: record.tahun,
      bulan: record.bulan,
      target: record.target,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as RKAPRecord;
}

export async function updateRKAPRecord(
  id: string,
  record: Partial<Omit<RKAPRecord, "id" | "created_at">>
): Promise<RKAPRecord> {
  const { data, error } = await (getSupabase()
    .from("rkap") as any)
    .update({
      ...(record.plant_code !== undefined && { plant_code: record.plant_code }),
      ...(record.tahun !== undefined && { tahun: record.tahun }),
      ...(record.bulan !== undefined && { bulan: record.bulan }),
      ...(record.target !== undefined && { target: record.target }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as RKAPRecord;
}

/** Untuk dashboard: hitung target tahunan (sum of monthly) & realisasi per plant */
export async function fetchRKAP(): Promise<RKAPRow[]> {
  const { data: plants, error: plantErr } = await getSupabase()
    .from("plants")
    .select("code, name")
    .order("code")
    .returns<{ code: string; name: string }[]>();

  if (plantErr) throw plantErr;

  const { data: rkap, error: rkapErr } = await getSupabase()
    .from("rkap")
    .select("plant_code, target")
    .returns<{ plant_code: string; target: number }[]>();

  if (rkapErr) throw rkapErr;

  // Hitung realisasi dari input_data
  const { data: inputData, error: inputErr } = await getSupabase()
    .from("input_data")
    .select("plant_code, volume")
    .returns<{ plant_code: string; volume: number }[]>();

  if (inputErr) throw inputErr;

  const targetMap = new Map<string, number>();
  for (const row of rkap ?? []) {
    targetMap.set(row.plant_code, (targetMap.get(row.plant_code) || 0) + Number(row.target));
  }

  const realisasiMap = new Map<string, number>();
  for (const row of inputData ?? []) {
    realisasiMap.set(row.plant_code, (realisasiMap.get(row.plant_code) || 0) + Number(row.volume));
  }

  return (plants ?? []).map((p) => {
    const target = targetMap.get(p.code) ?? 0;
    const realisasi = realisasiMap.get(p.code) ?? 0;
    const persentase = target > 0
      ? Math.round((realisasi / target) * 100 * 10) / 10
      : 0;

    return {
      plant: p.name,
      target,
      realisasi,
      persentase,
    };
  });
}

export async function deleteRKAPRecord(id: string): Promise<void> {
  const { error } = await (getSupabase()
    .from("rkap") as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Realisasi bulanan per plant dari input_data */
export interface RealisasiBulanan {
  plant_code: string;
  tahun: number;
  bulan: number;
  volume: number;
}

export async function fetchRealisasiBulanan(): Promise<RealisasiBulanan[]> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("plant_code, tanggal, volume")
    .returns<{ plant_code: string; tanggal: string; volume: number }[]>();

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const agg: Record<string, RealisasiBulanan> = {};

  for (const row of data) {
    const d = new Date(row.tanggal + "T00:00:00");
    const key = `${row.plant_code}-${d.getFullYear()}-${d.getMonth() + 1}`;
    if (agg[key]) {
      agg[key].volume += Number(row.volume);
    } else {
      agg[key] = {
        plant_code: row.plant_code,
        tahun: d.getFullYear(),
        bulan: d.getMonth() + 1,
        volume: Number(row.volume),
      };
    }
  }

  return Object.values(agg);
}

export async function fetchPlants(): Promise<PlantRow[]> {
  const { data, error } = await getSupabase()
    .from("plants")
    .select("code, name, location, icon")
    .order("code")
    .returns<{ code: string; name: string; location: string; icon: string }[]>();

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.code,
    nama: p.name,
    lokasi: p.location,
    icon: p.icon ?? "🏭",
  }));
}

export async function fetchLaporanMingguan(
  plantCode: string,
  mingguMulai: string = "2026-06-16"
): Promise<LaporanMingguan[]> {
  const { data, error } = await getSupabase()
    .from("laporan_mingguan")
    .select("hari, shift_1, shift_2, shift_3, total, keterangan")
    .eq("plant_code", plantCode)
    .eq("minggu_mulai", mingguMulai)
    .order("hari", { ascending: true })
    .returns<{ hari: string; shift_1: number; shift_2: number; shift_3: number; total: number; keterangan: string }[]>();

  if (error) throw error;

  return (data ?? []).map((r) => ({
    hari: r.hari,
    shift1: Number(r.shift_1),
    shift2: Number(r.shift_2),
    shift3: Number(r.shift_3),
    total: Number(r.total),
    keterangan: r.keterangan ?? "-",
  }));
}

// ============================================================
// Input Data CRUD
// ============================================================

export interface InputDataRecord {
  id: string;
  plant_code: string;
  tanggal: string;
  nama_pelanggan: string;
  uraian_pekerjaan: string;
  type: string;
  volume: number;
  harga_satuan: number;
  jumlah_harga: number;
  sewa_cp: number;
  total_harga: number;
  keterangan?: string;
  created_at: string;
}

export async function fetchInputData(plantCode: string): Promise<InputDataRecord[]> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("*")
    .eq("plant_code", plantCode)
    .order("tanggal", { ascending: false })
    .returns<InputDataRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createInputData(
  record: Omit<InputDataRecord, "id" | "created_at">
): Promise<InputDataRecord> {
  const { data, error } = await (getSupabase()
    .from("input_data") as any)
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data as InputDataRecord;
}

export async function updateInputData(
  id: string,
  record: Partial<Omit<InputDataRecord, "id" | "created_at">>
): Promise<InputDataRecord> {
  const { data, error } = await (getSupabase()
    .from("input_data") as any)
    .update(record)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as InputDataRecord;
}

export async function deleteInputData(id: string): Promise<void> {
  const { error } = await (getSupabase()
    .from("input_data") as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/** Ambil data input untuk plant tertentu dalam bulan tertentu */
export async function fetchInputDataBulanan(
  plantCode: string,
  month: number,
  year: number
): Promise<InputDataRecord[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = toLocalDateString(new Date(year, month, 0));

  const { data, error } = await getSupabase()
    .from("input_data")
    .select("*")
    .eq("plant_code", plantCode)
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
    .returns<InputDataRecord[]>();

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Users CRUD
// ============================================================

export interface UserRecord {
  id: string;
  username: string;
  password: string;
  nama_lengkap: string;
  role: string;
  unit_kerja: string | null;
  active: boolean;
  created_at: string;
}

export async function fetchUsers(): Promise<UserRecord[]> {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<UserRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createUser(
  record: Omit<UserRecord, "id" | "created_at">
): Promise<UserRecord> {
  const { data, error } = await (getSupabase()
    .from("users") as any)
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data as UserRecord;
}

export async function updateUser(
  id: string,
  record: Partial<Omit<UserRecord, "id" | "created_at">>
): Promise<UserRecord> {
  const { data, error } = await (getSupabase()
    .from("users") as any)
    .update(record)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as UserRecord;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await (getSupabase()
    .from("users") as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ============================================================
// Authentication
// ============================================================

export type AuthResult =
  | { ok: true; data: { username: string; role: string; nama_lengkap: string; unit_kerja: string | null } }
  | { ok: false; reason: "not_found" | "db_error"; message: string };

export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResult> {
  try {
    const { data, error } = await getSupabase()
      .from("users")
      .select("username, role, nama_lengkap, unit_kerja")
      .eq("username", username)
      .eq("password", password)
      .eq("active", true)
      .limit(1)
      .returns<{ username: string; role: string; nama_lengkap: string; unit_kerja: string | null }[]>()
      .single();

    if (error) {
      // Kode PGRST116 = no rows found (user tidak ditemukan / password salah)
      if (error.code === "PGRST116") {
        return { ok: false, reason: "not_found", message: "Username atau password salah" };
      }
      return { ok: false, reason: "db_error", message: error.message || "Gagal memeriksa kredensial" };
    }

    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      reason: "db_error",
      message: err?.message || "Gagal terhubung ke database. Periksa koneksi internet Anda.",
    };
  }
}

// ============================================================
// Per-Plant Production Data
// ============================================================

export async function fetchPlantDailyProduction(
  plantCode: string
): Promise<{ tanggal: string; volume: number }[]> {
  const { data, error } = await getSupabase()
    .from("produksi_harian")
    .select("tanggal, volume")
    .eq("plant_code", plantCode)
    .order("tanggal", { ascending: false })
    .limit(14)
    .returns<{ tanggal: string; volume: number }[]>();

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Aggregasi dari input_data untuk Produksi Bulanan & Mingguan
// ============================================================

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Month-based week end:
 *  - Normal: Sunday setelah weekStart
 *  - Merged (akibat akhir bulan Mon-Thu): diperpanjang ke tanggal akhir bulan
 */
function getWeekEnd(weekStart: Date): Date {
  const year = weekStart.getFullYear();
  const month = weekStart.getMonth();
  const lastOfMonth = new Date(year, month + 1, 0);

  // Normal Sunday calculation
  const end = new Date(weekStart);
  const day = weekStart.getDay();
  end.setDate(end.getDate() + (day === 0 ? 7 : 7 - day));

  // Deteksi merged week: jika weekStart+14 hari jatuh di bulan berikutnya
  // dan bulan berakhir Mon-Kamis, berarti minggu terakhir di-merge
  // → weekEnd harus diperpanjang sampai akhir bulan
  const nextNextMonday = new Date(weekStart);
  nextNextMonday.setDate(nextNextMonday.getDate() + 14);
  if (nextNextMonday.getMonth() !== month) {
    const lastDow = lastOfMonth.getDay(); // 0=Sun
    if (lastDow >= 1 && lastDow <= 4) { // Mon(1)-Thu(4)
      return lastOfMonth;
    }
  }

  // Normal: clip ke akhir bulan jika melampaui
  if (end > lastOfMonth) {
    return lastOfMonth;
  }
  return end;
}

/** Month-based week start:
 *  - Minggu 1 mulai tgl 1 (prev month tgl 28-31 not included)
 *  - Jika akhir bulan (28-31) jatuh pd Senin-Kamis → merge ke minggu sebelumnya
 */
function getMonthBasedWeekStart(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  // ISO Monday of the week containing the date
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  const isoMonday = d;
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // --- Start of month: week 1 starts on tgl 1 (previous month tgl 28-31 not included) ---
  if (isoMonday < firstOfMonth) {
    return new Date(year, month, 1);
  }

  // --- End of month: merge Mon-Thu last days (tgl 28-31) into previous week ---
  const nextMonday = new Date(isoMonday);
  nextMonday.setDate(nextMonday.getDate() + 7);
  if (nextMonday.getMonth() !== month) {
    const lastDow = lastOfMonth.getDay(); // 0=Sun, 1=Mon...
    if (lastDow >= 1 && lastDow <= 4) { // Mon(1), Tue(2), Wed(3), Thu(4)
      // Last ISO week extends into next month → merge with previous week
      const prevMonday = new Date(isoMonday);
      prevMonday.setDate(prevMonday.getDate() - 7);
      return prevMonday;
    }
  }

  return isoMonday;
}

function formatDateID(date: Date): string {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Format Date ke YYYY-MM-DD lokal (tanpa timezone offset) */
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekOfMonth(date: Date): number {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const diff = date.getDate() + start.getDay() - 1;
  return Math.ceil(diff / 7);
}

const ROMAN = ["I", "II", "III", "IV", "V"];

export interface AggregatedRow {
  bulan: string;
  tahun: number;
  volume: number;
  jumlah_harga: number;
  sewa_cp: number;
  total_harga: number;
}

/** Ambil semua data input untuk satu plant dan aggregasi per bulan */
export async function fetchPlantMonthlyAggregation(
  plantCode: string
): Promise<AggregatedRow[]> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("tanggal, volume, jumlah_harga, sewa_cp, total_harga")
    .eq("plant_code", plantCode)
    .returns<{ tanggal: string; volume: number; jumlah_harga: number; sewa_cp: number; total_harga: number }[]>();

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const agg = new Map<string, AggregatedRow>();

  for (const row of data) {
    const d = new Date(row.tanggal + "T00:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const existing = agg.get(key);
    if (existing) {
      existing.volume += Number(row.volume);
      existing.jumlah_harga += Number(row.jumlah_harga);
      existing.sewa_cp += Number(row.sewa_cp);
      existing.total_harga += Number(row.total_harga);
    } else {
      agg.set(key, {
        bulan: MONTH_NAMES[d.getMonth()],
        tahun: d.getFullYear(),
        volume: Number(row.volume),
        jumlah_harga: Number(row.jumlah_harga),
        sewa_cp: Number(row.sewa_cp),
        total_harga: Number(row.total_harga),
      });
    }
  }

  return Array.from(agg.values()).sort((a, b) =>
    a.tahun !== b.tahun ? a.tahun - b.tahun : MONTH_NAMES.indexOf(a.bulan) - MONTH_NAMES.indexOf(b.bulan)
  );
}

export interface WeeklyDayRow {
  hari: string;
  tanggal: string;  // YYYY-MM-DD
  volume: number;
  jumlah_harga: number;
  sewa_cp: number;
  total_harga: number;
}

export interface WeekInfo {
  label: string;        // "Minggu III"
  periode: string;      // "16 - 22 Jun 2026"
  startDate: string;    // "2026-06-16"
  endDate: string;      // "2026-06-22"
}

/** Ambil daftar minggu yang tersedia di input_data */
export async function fetchPlantAvailableWeeks(
  plantCode: string
): Promise<WeekInfo[]> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("tanggal")
    .eq("plant_code", plantCode)
    .order("tanggal", { ascending: true })
    .returns<{ tanggal: string }[]>();

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Kumpulkan semua minggu unik
  const seen = new Set<string>();
  const weeks: WeekInfo[] = [];

  for (const row of data) {
    const d = new Date(row.tanggal + "T00:00:00");
    const weekStart = getMonthBasedWeekStart(d);
    const key = toLocalDateString(weekStart);
    if (seen.has(key)) continue;
    seen.add(key);

    const weekEnd = getWeekEnd(weekStart);

    const weekNum = getWeekOfMonth(weekStart);
    const label = `Minggu ${ROMAN[weekNum - 1] || "III"}`;
    const periode = `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

    weeks.push({
      label,
      periode,
      startDate: key,
      endDate: toLocalDateString(weekEnd),
    });
  }

  return weeks.reverse(); // terbaru dulu
}

/** Ambil data mingguan (opsional tentukan weekStart YYYY-MM-DD, default minggu terakhir) */
export async function fetchPlantWeeklyAggregation(
  plantCode: string,
  weekStartDate?: string
): Promise<{ weekInfo: WeekInfo; days: WeeklyDayRow[] } | null> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("tanggal, volume, jumlah_harga, sewa_cp, total_harga")
    .eq("plant_code", plantCode)
    .order("tanggal", { ascending: true })
    .returns<{ tanggal: string; volume: number; jumlah_harga: number; sewa_cp: number; total_harga: number }[]>();

  if (error) throw error;
  if (!data || data.length === 0) return null;

  // Tentukan awal minggu
  let weekStart: Date;
  if (weekStartDate) {
    weekStart = new Date(weekStartDate + "T00:00:00");
  } else {
    // Cari tanggal terakhir
    let latestDate: Date | null = null;
    for (const row of data) {
      const d = new Date(row.tanggal + "T00:00:00");
      if (!latestDate || d > latestDate) latestDate = d;
    }
    if (!latestDate) return null;
    weekStart = getMonthBasedWeekStart(latestDate);
  }

  const weekEnd = getWeekEnd(weekStart);

  const weekStartStr = toLocalDateString(weekStart);
  const weekEndStr = toLocalDateString(weekEnd);

  // Hitung minggu ke-berapa dalam bulan
  const weekNum = getWeekOfMonth(weekStart);
  const label = `Minggu ${ROMAN[weekNum - 1] || "III"}`;
  const periode = `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;

  // Filter data dalam minggu ini dan aggregasi per hari
  const dailyMap = new Map<string, WeeklyDayRow>();

  for (const row of data) {
    const tgl = row.tanggal;
    if (tgl >= weekStartStr && tgl <= weekEndStr) {
      const d = new Date(tgl + "T00:00:00");
      const dayName = DAY_NAMES[d.getDay()];
      const existing = dailyMap.get(dayName);
      if (existing) {
        existing.volume += Number(row.volume);
        existing.jumlah_harga += Number(row.jumlah_harga);
        existing.sewa_cp += Number(row.sewa_cp);
        existing.total_harga += Number(row.total_harga);
      } else {
        dailyMap.set(dayName, {
          hari: dayName,
          tanggal: tgl,
          volume: Number(row.volume),
          jumlah_harga: Number(row.jumlah_harga),
          sewa_cp: Number(row.sewa_cp),
          total_harga: Number(row.total_harga),
        });
      }
    }
  }

  // Urutkan dari Senin
  const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
  const days: WeeklyDayRow[] = dayOrder
    .filter((day) => dailyMap.has(day))
    .map((day) => dailyMap.get(day)!);

  return {
    weekInfo: {
      label,
      periode,
      startDate: weekStartStr,
      endDate: weekEndStr,
    },
    days,
  };
}

// ============================================================
// Aggregasi global dari input_data (Dashboard & Laporan Mingguan)
// ============================================================

/** Harian: aggregasi input_data per tanggal, pivot per plant */
export async function fetchInputHarian(): Promise<ProduksiHarianRow[]> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("tanggal, plant_code, volume")
    .returns<{ tanggal: string; plant_code: string; volume: number }[]>();

  if (error) throw error;
  return pivotByDate(data ?? []);
}

/** Bulanan: aggregasi input_data per bulan, pivot per plant */
export async function fetchInputBulanan(): Promise<ProduksiBulananRow[]> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("tanggal, plant_code, volume")
    .returns<{ tanggal: string; plant_code: string; volume: number }[]>();

  if (error) throw error;
  if (!data || data.length === 0) return [];

  // Kelompokkan per bulan
  const grouped: Record<string, Record<string, number>> = {};
  for (const row of data) {
    const d = new Date(row.tanggal + "T00:00:00");
    const bulan = MONTH_NAMES[d.getMonth()];
    const key = `${bulan}-${d.getFullYear()}`;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][row.plant_code] = (grouped[key][row.plant_code] || 0) + Number(row.volume);
  }

  // Convert ke format { bulan, plant_code, volume } untuk dipivot
  const monthRows: { bulan: string; plant_code: string; volume: number }[] = [];
  Object.keys(grouped).forEach((key) => {
    const bulan = key.split('-')[0];
    const plantMap = grouped[key];
    Object.keys(plantMap).forEach((plant_code) => {
      monthRows.push({ bulan, plant_code, volume: plantMap[plant_code] });
    });
  });

  return pivotByBulan(monthRows);
}

// ============================================================
// Dashboard — Filter Bulanan
// ============================================================

/** Harian per bulan: daily aggregation filtered by month/year */
export async function fetchInputHarianBulanan(
  month: number,
  year: number
): Promise<ProduksiHarianRow[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = toLocalDateString(new Date(year, month, 0));

  const { data, error } = await getSupabase()
    .from("input_data")
    .select("tanggal, plant_code, volume")
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .order("tanggal", { ascending: true })
    .returns<{ tanggal: string; plant_code: string; volume: number }[]>();

  if (error) throw error;
  return pivotByDate(data ?? []);
}

/** Volume per plant untuk bulan tertentu */
export async function fetchVolumePerPlantBulanan(
  month: number,
  year: number
): Promise<{ plant_code: string; volume: number }[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = toLocalDateString(new Date(year, month, 0));

  const { data, error } = await getSupabase()
    .from("input_data")
    .select("plant_code, volume")
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .returns<{ plant_code: string; volume: number }[]>();

  if (error) throw error;

  const agg: Record<string, number> = {};
  for (const row of data ?? []) {
    agg[row.plant_code] = (agg[row.plant_code] || 0) + Number(row.volume);
  }

  return Object.entries(agg).map(([plant_code, volume]) => ({
    plant_code,
    volume,
  }));
}

/** Target RKAP per plant untuk bulan tertentu */
export async function fetchRKAPBulanan(
  month: number,
  year: number
): Promise<{ plant_code: string; target: number }[]> {
  const { data, error } = await getSupabase()
    .from("rkap")
    .select("plant_code, target")
    .eq("tahun", year)
    .eq("bulan", month)
    .returns<{ plant_code: string; target: number }[]>();

  if (error) throw error;
  return data ?? [];
}

/** RKAP dengan realisasi kumulatif sampai bulan tertentu */
export async function fetchRKAPKumulatif(
  year: number,
  upToMonth: number
): Promise<RKAPRow[]> {
  const { data: plants, error: plantErr } = await getSupabase()
    .from("plants")
    .select("code, name")
    .order("code")
    .returns<{ code: string; name: string }[]>();

  if (plantErr) throw plantErr;

  const { data: rkap, error: rkapErr } = await getSupabase()
    .from("rkap")
    .select("plant_code, target")
    .returns<{ plant_code: string; target: number }[]>();

  if (rkapErr) throw rkapErr;

  // Realisasi kumulatif dari Jan s.d. bulan yang dipilih
  const startDate = `${year}-01-01`;
  const endDate = toLocalDateString(new Date(year, upToMonth, 0));

  const { data: inputData, error: inputErr } = await getSupabase()
    .from("input_data")
    .select("plant_code, volume")
    .gte("tanggal", startDate)
    .lte("tanggal", endDate)
    .returns<{ plant_code: string; volume: number }[]>();

  if (inputErr) throw inputErr;

  const targetMap: Record<string, number> = {};
  for (const row of rkap ?? []) {
    targetMap[row.plant_code] = (targetMap[row.plant_code] || 0) + Number(row.target);
  }

  const realisasiMap: Record<string, number> = {};
  for (const row of inputData ?? []) {
    realisasiMap[row.plant_code] = (realisasiMap[row.plant_code] || 0) + Number(row.volume);
  }

  return (plants ?? []).map((p) => {
    const target = targetMap[p.code] ?? 0;
    const realisasi = realisasiMap[p.code] ?? 0;
    const persentase =
      target > 0 ? Math.round((realisasi / target) * 100 * 10) / 10 : 0;
    return { plant: p.name, target, realisasi, persentase };
  });
}

export interface PerPlantWeeklyData {
  plantCode: string;
  weekInfo: WeekInfo;
  days: WeeklyDayRow[];
}

/** Mingguan semua plant: ambil data mingguan dari input_data */
export async function fetchInputWeeklyAllPlants(
  weekStartDate?: string
): Promise<{ weekInfo: WeekInfo; plants: PerPlantWeeklyData[] }> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("plant_code, tanggal, volume, jumlah_harga, sewa_cp, total_harga")
    .order("tanggal", { ascending: true })
    .returns<{ plant_code: string; tanggal: string; volume: number; jumlah_harga: number; sewa_cp: number; total_harga: number }[]>();

  if (error) throw error;
  if (!data || data.length === 0) return { weekInfo: { label: "", periode: "", startDate: "", endDate: "" }, plants: [] };

  // Tentukan minggu
  let weekStart: Date;
  if (weekStartDate) {
    weekStart = new Date(weekStartDate + "T00:00:00");
  } else {
    let latestDate: Date | null = null;
    for (const row of data) {
      const d = new Date(row.tanggal + "T00:00:00");
      if (!latestDate || d > latestDate) latestDate = d;
    }
    if (!latestDate) return { weekInfo: { label: "", periode: "", startDate: "", endDate: "" }, plants: [] };
    weekStart = getMonthBasedWeekStart(latestDate);
  }

  const weekEnd = getWeekEnd(weekStart);
  const weekStartStr = toLocalDateString(weekStart);
  const weekEndStr = toLocalDateString(weekEnd);
  const weekNum = getWeekOfMonth(weekStart);
  const label = `Minggu ${ROMAN[weekNum - 1] || "III"}`;
  const periode = `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
  const weekInfo: WeekInfo = { label, periode, startDate: weekStartStr, endDate: weekEndStr };

  // Kelompokkan per plant (pakai Record agar kompatibel TS tanpa downlevelIteration)
  const plantMap: Record<string, Record<string, WeeklyDayRow>> = {};
  const dayOrder = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  for (const row of data) {
    if (row.tanggal < weekStartStr || row.tanggal > weekEndStr) continue;
    if (!plantMap[row.plant_code]) plantMap[row.plant_code] = {};
    const dayName = DAY_NAMES[new Date(row.tanggal + "T00:00:00").getDay()];
    const existing = plantMap[row.plant_code][dayName];
    if (existing) {
      existing.volume += Number(row.volume);
      existing.jumlah_harga += Number(row.jumlah_harga);
      existing.sewa_cp += Number(row.sewa_cp);
      existing.total_harga += Number(row.total_harga);
    } else {
      plantMap[row.plant_code][dayName] = {
        hari: dayName,
        tanggal: row.tanggal,
        volume: Number(row.volume),
        jumlah_harga: Number(row.jumlah_harga),
        sewa_cp: Number(row.sewa_cp),
        total_harga: Number(row.total_harga),
      };
    }
  }

  const plants: PerPlantWeeklyData[] = [];
  Object.keys(plantMap).forEach((plantCode) => {
    const dayMap = plantMap[plantCode];
    const days = dayOrder.filter((d) => dayMap[d]).map((d) => dayMap[d]);
    plants.push({ plantCode, weekInfo, days });
  });
  plants.sort((a, b) => a.plantCode.localeCompare(b.plantCode));

  return { weekInfo, plants };
}

export interface PerPlantTransactions {
  plantCode: string;
  weekInfo: WeekInfo;
  transactions: InputDataRecord[];
}

/** Ambil transaksi mentah per minggu (untuk tabel laporan mingguan) */
export async function fetchWeeklyTransactions(
  weekStartDate?: string,
  filterMonth?: number,
  filterYear?: number
): Promise<{ weekInfo: WeekInfo; plants: PerPlantTransactions[] }> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("id, plant_code, tanggal, nama_pelanggan, uraian_pekerjaan, type, volume, harga_satuan, jumlah_harga, sewa_cp, total_harga, created_at")
    .order("tanggal", { ascending: true })
    .returns<InputDataRecord[]>();

  if (error) throw error;
  if (!data || data.length === 0) return { weekInfo: { label: "", periode: "", startDate: "", endDate: "" }, plants: [] };

  // Tentukan minggu
  let weekStart: Date;
  if (weekStartDate) {
    weekStart = new Date(weekStartDate + "T00:00:00");
  } else {
    let latestDate: Date | null = null;
    for (const row of data) {
      const d = new Date(row.tanggal + "T00:00:00");
      if (!latestDate || d > latestDate) latestDate = d;
    }
    if (!latestDate) return { weekInfo: { label: "", periode: "", startDate: "", endDate: "" }, plants: [] };
    weekStart = getMonthBasedWeekStart(latestDate);
  }

  const weekEnd = getWeekEnd(weekStart);
  const weekStartStr = toLocalDateString(weekStart);
  const weekEndStr = toLocalDateString(weekEnd);
  const weekNum = getWeekOfMonth(weekStart);
  const label = `Minggu ${ROMAN[weekNum - 1] || "III"}`;
  const periode = `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
  const weekInfo: WeekInfo = { label, periode, startDate: weekStartStr, endDate: weekEndStr };

  // Kelompokkan per plant
  const plantMap: Record<string, InputDataRecord[]> = {};

  for (const row of data) {
    if (row.tanggal < weekStartStr || row.tanggal > weekEndStr) continue;
    // Safety filter: skip rows outside the requested month
    if (filterMonth) {
      const d = new Date(row.tanggal + "T00:00:00");
      if (d.getMonth() !== filterMonth - 1 || d.getFullYear() !== filterYear) continue;
    }
    if (!plantMap[row.plant_code]) plantMap[row.plant_code] = [];
    plantMap[row.plant_code].push(row);
  }

  const plants: PerPlantTransactions[] = Object.keys(plantMap)
    .sort()
    .map((plantCode) => ({
      plantCode,
      weekInfo,
      transactions: plantMap[plantCode],
    }));

  return { weekInfo, plants };
}

/** Daftar minggu yang tersedia dari input_data (semua plant) */
export async function fetchInputAvailableWeeks(): Promise<WeekInfo[]> {
  const { data, error } = await getSupabase()
    .from("input_data")
    .select("tanggal")
    .order("tanggal", { ascending: true })
    .returns<{ tanggal: string }[]>();

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const seen = new Set<string>();
  const weeks: WeekInfo[] = [];

  for (const row of data) {
    const d = new Date(row.tanggal + "T00:00:00");
    const weekStart = getMonthBasedWeekStart(d);
    const key = toLocalDateString(weekStart);
    if (seen.has(key)) continue;
    seen.add(key);

    const weekEnd = getWeekEnd(weekStart);
    const weekNum = getWeekOfMonth(weekStart);
    const label = `Minggu ${ROMAN[weekNum - 1] || "III"}`;
    const periode = `${weekStart.getDate()} - ${weekEnd.getDate()} ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getFullYear()}`;
    weeks.push({ label, periode, startDate: key, endDate: toLocalDateString(weekEnd) });
  }

  return weeks.reverse();
}

// ============================================================
// Approval Requests (Marketing → Manager/Admin)
// ============================================================

export interface ApprovalRequestRecord {
  id: string;
  action_type: 'edit' | 'delete';
  table_name: string;
  record_id: string;
  plant_code: string;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  original_data?: Record<string, unknown>;
  new_data?: Record<string, unknown> | null;
  notes?: string;
}

export async function createApprovalRequest(
  record: Omit<ApprovalRequestRecord, "id" | "requested_at">
): Promise<ApprovalRequestRecord> {
  const { data, error } = await (getSupabase()
    .from("approval_requests") as any)
    .insert(record)
    .select()
    .single();

  if (error) throw error;
  return data as ApprovalRequestRecord;
}

export async function fetchPendingApprovals(): Promise<ApprovalRequestRecord[]> {
  const { data, error } = await getSupabase()
    .from("approval_requests")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .returns<ApprovalRequestRecord[]>();

  if (error) throw error;
  return data ?? [];
}

export async function approveRequest(
  id: string,
  reviewerName: string
): Promise<ApprovalRequestRecord> {
  const { data, error } = await (getSupabase()
    .from("approval_requests") as any)
    .update({
      status: "approved",
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ApprovalRequestRecord;
}

export async function rejectRequest(
  id: string,
  reviewerName: string
): Promise<ApprovalRequestRecord> {
  const { data, error } = await (getSupabase()
    .from("approval_requests") as any)
    .update({
      status: "rejected",
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ApprovalRequestRecord;
}
