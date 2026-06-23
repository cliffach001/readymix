import { createClient } from "@supabase/supabase-js";

const _supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const _supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Validasi env vars di awal — error jelas jika tidak ter set
if (!_supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL tidak ditemukan. " +
    "Pastikan file .env.local sudah berisi NEXT_PUBLIC_SUPABASE_URL"
  );
}
if (!_supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan. " +
    "Pastikan file .env.local sudah berisi NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Lazy init — hindari error localStorage saat SSR/static generation
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(_supabaseUrl, _supabaseAnonKey, {
      auth: {
        persistSession: false, // hindari akses localStorage di server
        autoRefreshToken: false,
      },
    });
  }
  return _supabase;
}
