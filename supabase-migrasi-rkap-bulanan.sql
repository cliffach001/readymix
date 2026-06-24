-- ============================================================
-- MIGRASI: RKAP Tahunan → RKAP Bulanan
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. Tambah kolom bulan ke tabel rkap
ALTER TABLE rkap ADD COLUMN IF NOT EXISTS bulan INTEGER;

-- 2. Hapus kolom realisasi (sekarang dihitung otomatis dari input_data)
ALTER TABLE rkap DROP COLUMN IF EXISTS realisasi;

-- 3. Isi bulan dengan default 1 untuk data lama (jika ada)
UPDATE rkap SET bulan = 1 WHERE bulan IS NULL;

-- 4. Set NOT NULL constraint
ALTER TABLE rkap ALTER COLUMN bulan SET NOT NULL;

-- 5. Hapus data seed tahunan yang lama
TRUNCATE TABLE rkap;

-- 6. Insert data seed bulanan
INSERT INTO rkap (plant_code, tahun, bulan, target) VALUES
  -- Pangkep
  ('pangkep', 2026, 1, 14000), ('pangkep', 2026, 2, 14500), ('pangkep', 2026, 3, 15000),
  ('pangkep', 2026, 4, 15500), ('pangkep', 2026, 5, 16000), ('pangkep', 2026, 6, 15000),
  ('pangkep', 2026, 7, 15500), ('pangkep', 2026, 8, 15000), ('pangkep', 2026, 9, 14500),
  ('pangkep', 2026, 10, 15000), ('pangkep', 2026, 11, 14000), ('pangkep', 2026, 12, 13000),
  -- Makassar
  ('makassar', 2026, 1, 20000), ('makassar', 2026, 2, 21000), ('makassar', 2026, 3, 21500),
  ('makassar', 2026, 4, 22000), ('makassar', 2026, 5, 23000), ('makassar', 2026, 6, 22000),
  ('makassar', 2026, 7, 22500), ('makassar', 2026, 8, 22000), ('makassar', 2026, 9, 21000),
  ('makassar', 2026, 10, 21500), ('makassar', 2026, 11, 20000), ('makassar', 2026, 12, 19500),
  -- Pinrang
  ('pinrang', 2026, 1, 7500), ('pinrang', 2026, 2, 8000), ('pinrang', 2026, 3, 8200),
  ('pinrang', 2026, 4, 8500), ('pinrang', 2026, 5, 8800), ('pinrang', 2026, 6, 8500),
  ('pinrang', 2026, 7, 8600), ('pinrang', 2026, 8, 8400), ('pinrang', 2026, 9, 8000),
  ('pinrang', 2026, 10, 8200), ('pinrang', 2026, 11, 7800), ('pinrang', 2026, 12, 7500),
  -- Kendari
  ('kendari', 2026, 1, 9000), ('kendari', 2026, 2, 9500), ('kendari', 2026, 3, 9800),
  ('kendari', 2026, 4, 10000), ('kendari', 2026, 5, 10500), ('kendari', 2026, 6, 10200),
  ('kendari', 2026, 7, 10300), ('kendari', 2026, 8, 10000), ('kendari', 2026, 9, 9800),
  ('kendari', 2026, 10, 10000), ('kendari', 2026, 11, 9500), ('kendari', 2026, 12, 9200),
  -- Toraja
  ('toraja', 2026, 1, 6500), ('toraja', 2026, 2, 6800), ('toraja', 2026, 3, 7000),
  ('toraja', 2026, 4, 7200), ('toraja', 2026, 5, 7500), ('toraja', 2026, 6, 7200),
  ('toraja', 2026, 7, 7300), ('toraja', 2026, 8, 7100), ('toraja', 2026, 9, 6800),
  ('toraja', 2026, 10, 7000), ('toraja', 2026, 11, 6500), ('toraja', 2026, 12, 6000),
  -- Masamba
  ('masamba', 2026, 1, 4200), ('masamba', 2026, 2, 4400), ('masamba', 2026, 3, 4500),
  ('masamba', 2026, 4, 4700), ('masamba', 2026, 5, 4800), ('masamba', 2026, 6, 4600),
  ('masamba', 2026, 7, 4700), ('masamba', 2026, 8, 4500), ('masamba', 2026, 9, 4400),
  ('masamba', 2026, 10, 4500), ('masamba', 2026, 11, 4300), ('masamba', 2026, 12, 4000);

-- 7. Tambah unique constraint (plant_code, tahun, bulan)
ALTER TABLE rkap DROP CONSTRAINT IF EXISTS rkap_plant_code_tahun_bulan_key;
ALTER TABLE rkap ADD UNIQUE (plant_code, tahun, bulan);
