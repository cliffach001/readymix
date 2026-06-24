-- ============================================================
-- MIGRASI: Tambah kolom keterangan ke tabel input_data
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom keterangan ke tabel input_data
ALTER TABLE input_data ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '';

-- 2. Update data lama agar kolom keterangan tidak NULL
UPDATE input_data SET keterangan = '' WHERE keterangan IS NULL;
