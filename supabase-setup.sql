-- ============================================================
-- RM PKM — Database Setup for Supabase
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. PLANTS (Master data plant)
CREATE TABLE IF NOT EXISTS plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  icon TEXT DEFAULT '🏭',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PRODUKSI HARIAN
CREATE TABLE IF NOT EXISTS produksi_harian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  plant_code TEXT NOT NULL REFERENCES plants(code),
  volume NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUKSI BULANAN
CREATE TABLE IF NOT EXISTS produksi_bulanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan TEXT NOT NULL,
  tahun INTEGER NOT NULL,
  plant_code TEXT NOT NULL REFERENCES plants(code),
  volume NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RKAP (Rencana Kerja & Anggaran Perusahaan)
CREATE TABLE IF NOT EXISTS rkap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_code TEXT NOT NULL REFERENCES plants(code),
  tahun INTEGER NOT NULL,
  target NUMERIC(15,2) NOT NULL,
  realisasi NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LAPORAN MINGGUAN
CREATE TABLE IF NOT EXISTS laporan_mingguan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_code TEXT NOT NULL REFERENCES plants(code),
  hari TEXT NOT NULL,
  shift_1 NUMERIC(10,2) DEFAULT 0,
  shift_2 NUMERIC(10,2) DEFAULT 0,
  shift_3 NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  keterangan TEXT DEFAULT '-',
  minggu_mulai DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. INPUT DATA (Data produksi dari user)
CREATE TABLE IF NOT EXISTS input_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_code TEXT NOT NULL REFERENCES plants(code),
  tanggal DATE NOT NULL,
  nama_pelanggan TEXT NOT NULL,
  uraian_pekerjaan TEXT NOT NULL,
  type TEXT NOT NULL,
  volume NUMERIC(10,2) NOT NULL,
  harga_satuan NUMERIC(15,2) NOT NULL,
  jumlah_harga NUMERIC(15,2) NOT NULL,
  sewa_cp NUMERIC(15,2) DEFAULT 0,
  total_harga NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security (boleh diakses semua user untuk demo)
-- ============================================================
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE produksi_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE produksi_bulanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE rkap ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_mingguan ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON plants FOR ALL USING (true);
CREATE POLICY "Allow all" ON produksi_harian FOR ALL USING (true);
CREATE POLICY "Allow all" ON produksi_bulanan FOR ALL USING (true);
CREATE POLICY "Allow all" ON rkap FOR ALL USING (true);
CREATE POLICY "Allow all" ON laporan_mingguan FOR ALL USING (true);
CREATE POLICY "Allow all" ON input_data FOR ALL USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Plants
INSERT INTO plants (code, name, location, icon) VALUES
  ('pangkep', 'Ready Mix Pangkep', 'Pangkajene Kepulauan', '🏭'),
  ('makassar', 'Ready Mix Makassar', 'Kota Makassar', '🏭'),
  ('pinrang', 'Ready Mix Pinrang', 'Kab. Pinrang', '🏭'),
  ('kendari', 'Ready Mix Kendari', 'Kota Kendari', '🏭'),
  ('toraja', 'Ready Mix Toraja', 'Tana Toraja', '🏭'),
  ('masamba', 'Ready Mix Masamba', 'Kab. Luwu Utara', '🏭')
ON CONFLICT (code) DO NOTHING;

-- Produksi Harian (14 hari terakhir)
INSERT INTO produksi_harian (tanggal, plant_code, volume) VALUES
  ('2026-06-09', 'pangkep', 320), ('2026-06-09', 'makassar', 480), ('2026-06-09', 'pinrang', 180), ('2026-06-09', 'kendari', 210), ('2026-06-09', 'toraja', 140), ('2026-06-09', 'masamba', 90),
  ('2026-06-10', 'pangkep', 350), ('2026-06-10', 'makassar', 510), ('2026-06-10', 'pinrang', 200), ('2026-06-10', 'kendari', 230), ('2026-06-10', 'toraja', 160), ('2026-06-10', 'masamba', 110),
  ('2026-06-11', 'pangkep', 280), ('2026-06-11', 'makassar', 460), ('2026-06-11', 'pinrang', 170), ('2026-06-11', 'kendari', 195), ('2026-06-11', 'toraja', 130), ('2026-06-11', 'masamba', 85),
  ('2026-06-12', 'pangkep', 390), ('2026-06-12', 'makassar', 530), ('2026-06-12', 'pinrang', 220), ('2026-06-12', 'kendari', 250), ('2026-06-12', 'toraja', 175), ('2026-06-12', 'masamba', 120),
  ('2026-06-13', 'pangkep', 340), ('2026-06-13', 'makassar', 490), ('2026-06-13', 'pinrang', 190), ('2026-06-13', 'kendari', 215), ('2026-06-13', 'toraja', 155), ('2026-06-13', 'masamba', 100),
  ('2026-06-14', 'pangkep', 310), ('2026-06-14', 'makassar', 475), ('2026-06-14', 'pinrang', 185), ('2026-06-14', 'kendari', 205), ('2026-06-14', 'toraja', 145), ('2026-06-14', 'masamba', 95),
  ('2026-06-15', 'pangkep', 370), ('2026-06-15', 'makassar', 520), ('2026-06-15', 'pinrang', 210), ('2026-06-15', 'kendari', 240), ('2026-06-15', 'toraja', 165), ('2026-06-15', 'masamba', 115),
  ('2026-06-16', 'pangkep', 300), ('2026-06-16', 'makassar', 450), ('2026-06-16', 'pinrang', 165), ('2026-06-16', 'kendari', 190), ('2026-06-16', 'toraja', 125), ('2026-06-16', 'masamba', 80),
  ('2026-06-17', 'pangkep', 360), ('2026-06-17', 'makassar', 505), ('2026-06-17', 'pinrang', 205), ('2026-06-17', 'kendari', 225), ('2026-06-17', 'toraja', 160), ('2026-06-17', 'masamba', 105),
  ('2026-06-18', 'pangkep', 410), ('2026-06-18', 'makassar', 550), ('2026-06-18', 'pinrang', 240), ('2026-06-18', 'kendari', 260), ('2026-06-18', 'toraja', 185), ('2026-06-18', 'masamba', 130),
  ('2026-06-19', 'pangkep', 330), ('2026-06-19', 'makassar', 485), ('2026-06-19', 'pinrang', 195), ('2026-06-19', 'kendari', 220), ('2026-06-19', 'toraja', 150), ('2026-06-19', 'masamba', 98),
  ('2026-06-20', 'pangkep', 380), ('2026-06-20', 'makassar', 515), ('2026-06-20', 'pinrang', 215), ('2026-06-20', 'kendari', 245), ('2026-06-20', 'toraja', 170), ('2026-06-20', 'masamba', 108),
  ('2026-06-21', 'pangkep', 290), ('2026-06-21', 'makassar', 445), ('2026-06-21', 'pinrang', 175), ('2026-06-21', 'kendari', 200), ('2026-06-21', 'toraja', 135), ('2026-06-21', 'masamba', 88),
  ('2026-06-22', 'pangkep', 400), ('2026-06-22', 'makassar', 540), ('2026-06-22', 'pinrang', 230), ('2026-06-22', 'kendari', 255), ('2026-06-22', 'toraja', 180), ('2026-06-22', 'masamba', 125);

-- Produksi Bulanan (Jan - Jun 2026)
INSERT INTO produksi_bulanan (bulan, tahun, plant_code, volume) VALUES
  ('Jan', 2026, 'pangkep', 8500), ('Jan', 2026, 'makassar', 12500), ('Jan', 2026, 'pinrang', 4800), ('Jan', 2026, 'kendari', 5600), ('Jan', 2026, 'toraja', 3800), ('Jan', 2026, 'masamba', 2400),
  ('Feb', 2026, 'pangkep', 9200), ('Feb', 2026, 'makassar', 13200), ('Feb', 2026, 'pinrang', 5100), ('Feb', 2026, 'kendari', 5900), ('Feb', 2026, 'toraja', 4100), ('Feb', 2026, 'masamba', 2600),
  ('Mar', 2026, 'pangkep', 8800), ('Mar', 2026, 'makassar', 12800), ('Mar', 2026, 'pinrang', 4950), ('Mar', 2026, 'kendari', 5750), ('Mar', 2026, 'toraja', 3950), ('Mar', 2026, 'masamba', 2500),
  ('Apr', 2026, 'pangkep', 9600), ('Apr', 2026, 'makassar', 13800), ('Apr', 2026, 'pinrang', 5300), ('Apr', 2026, 'kendari', 6100), ('Apr', 2026, 'toraja', 4300), ('Apr', 2026, 'masamba', 2750),
  ('Mei', 2026, 'pangkep', 10100), ('Mei', 2026, 'makassar', 14200), ('Mei', 2026, 'pinrang', 5600), ('Mei', 2026, 'kendari', 6400), ('Mei', 2026, 'toraja', 4600), ('Mei', 2026, 'masamba', 2900),
  ('Jun', 2026, 'pangkep', 9400), ('Jun', 2026, 'makassar', 13500), ('Jun', 2026, 'pinrang', 5200), ('Jun', 2026, 'kendari', 6200), ('Jun', 2026, 'toraja', 4200), ('Jun', 2026, 'masamba', 2650);

-- RKAP
INSERT INTO rkap (plant_code, tahun, target, realisasi) VALUES
  ('pangkep', 2026, 180000, 55600),
  ('makassar', 2026, 260000, 80500),
  ('pinrang', 2026, 100000, 30950),
  ('kendari', 2026, 120000, 37950),
  ('toraja', 2026, 85000, 25150),
  ('masamba', 2026, 55000, 15900);
