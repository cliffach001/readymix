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

export async function fetchRKAP(): Promise<RKAPRow[]> {
  const { data: plants, error: plantErr } = await getSupabase()
    .from("plants")
    .select("code, name")
    .order("code")
    .returns<{ code: string; name: string }[]>();

  if (plantErr) throw plantErr;

  const { data: rkap, error: rkapErr } = await getSupabase()
    .from("rkap")
    .select("plant_code, target, realisasi")
    .returns<{ plant_code: string; target: number; realisasi: number }[]>();

  if (rkapErr) throw rkapErr;

  return (plants ?? []).map((p) => {
    const d = (rkap ?? []).find((r) => r.plant_code === p.code);
    const target = d?.target ?? 0;
    const realisasi = d?.realisasi ?? 0;
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

export async function fetchPlantMonthlyProduction(
  plantCode: string
): Promise<{ bulan: string; tahun: number; volume: number }[]> {
  const { data, error } = await getSupabase()
    .from("produksi_bulanan")
    .select("bulan, tahun, volume")
    .eq("plant_code", plantCode)
    .order("tahun", { ascending: true })
    .order("bulan", { ascending: true })
    .returns<{ bulan: string; tahun: number; volume: number }[]>();

  if (error) throw error;
  return data ?? [];
}
