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
  bulan INTEGER NOT NULL,  -- 1=Jan, 2=Feb, ..., 12=Des
  target NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plant_code, tahun, bulan)
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
  keterangan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. APPROVAL REQUESTS (Marketing → Manager/Admin)
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  table_name TEXT NOT NULL DEFAULT 'input_data',
  record_id UUID NOT NULL,
  plant_code TEXT NOT NULL REFERENCES plants(code),
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  original_data JSONB,
  new_data JSONB,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requested_at ON approval_requests(requested_at DESC);

-- ============================================================
-- Row Level Security (boleh diakses semua user untuk demo)
-- ============================================================
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE produksi_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE produksi_bulanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE rkap ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_mingguan ENABLE ROW LEVEL SECURITY;
ALTER TABLE input_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON plants FOR ALL USING (true);
CREATE POLICY "Allow all" ON produksi_harian FOR ALL USING (true);
CREATE POLICY "Allow all" ON produksi_bulanan FOR ALL USING (true);
CREATE POLICY "Allow all" ON rkap FOR ALL USING (true);
CREATE POLICY "Allow all" ON laporan_mingguan FOR ALL USING (true);
CREATE POLICY "Allow all" ON input_data FOR ALL USING (true);
CREATE POLICY "Allow all" ON approval_requests FOR ALL USING (true);

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

-- RKAP Bulanan (target per plant per bulan)
INSERT INTO rkap (plant_code, tahun, bulan, target) VALUES
  -- Pangkep: yearly ~180.000 → ~15.000/bln
  ('pangkep', 2026, 1, 14000), ('pangkep', 2026, 2, 14500), ('pangkep', 2026, 3, 15000),
  ('pangkep', 2026, 4, 15500), ('pangkep', 2026, 5, 16000), ('pangkep', 2026, 6, 15000),
  ('pangkep', 2026, 7, 15500), ('pangkep', 2026, 8, 15000), ('pangkep', 2026, 9, 14500),
  ('pangkep', 2026, 10, 15000), ('pangkep', 2026, 11, 14000), ('pangkep', 2026, 12, 13000),
  -- Makassar: yearly ~260.000 → ~21.666/bln
  ('makassar', 2026, 1, 20000), ('makassar', 2026, 2, 21000), ('makassar', 2026, 3, 21500),
  ('makassar', 2026, 4, 22000), ('makassar', 2026, 5, 23000), ('makassar', 2026, 6, 22000),
  ('makassar', 2026, 7, 22500), ('makassar', 2026, 8, 22000), ('makassar', 2026, 9, 21000),
  ('makassar', 2026, 10, 21500), ('makassar', 2026, 11, 20000), ('makassar', 2026, 12, 19500),
  -- Pinrang: yearly ~100.000 → ~8.333/bln
  ('pinrang', 2026, 1, 7500), ('pinrang', 2026, 2, 8000), ('pinrang', 2026, 3, 8200),
  ('pinrang', 2026, 4, 8500), ('pinrang', 2026, 5, 8800), ('pinrang', 2026, 6, 8500),
  ('pinrang', 2026, 7, 8600), ('pinrang', 2026, 8, 8400), ('pinrang', 2026, 9, 8000),
  ('pinrang', 2026, 10, 8200), ('pinrang', 2026, 11, 7800), ('pinrang', 2026, 12, 7500),
  -- Kendari: yearly ~120.000 → ~10.000/bln
  ('kendari', 2026, 1, 9000), ('kendari', 2026, 2, 9500), ('kendari', 2026, 3, 9800),
  ('kendari', 2026, 4, 10000), ('kendari', 2026, 5, 10500), ('kendari', 2026, 6, 10200),
  ('kendari', 2026, 7, 10300), ('kendari', 2026, 8, 10000), ('kendari', 2026, 9, 9800),
  ('kendari', 2026, 10, 10000), ('kendari', 2026, 11, 9500), ('kendari', 2026, 12, 9200),
  -- Toraja: yearly ~85.000 → ~7.083/bln
  ('toraja', 2026, 1, 6500), ('toraja', 2026, 2, 6800), ('toraja', 2026, 3, 7000),
  ('toraja', 2026, 4, 7200), ('toraja', 2026, 5, 7500), ('toraja', 2026, 6, 7200),
  ('toraja', 2026, 7, 7300), ('toraja', 2026, 8, 7100), ('toraja', 2026, 9, 6800),
  ('toraja', 2026, 10, 7000), ('toraja', 2026, 11, 6500), ('toraja', 2026, 12, 6000),
  -- Masamba: yearly ~55.000 → ~4.583/bln
  ('masamba', 2026, 1, 4200), ('masamba', 2026, 2, 4400), ('masamba', 2026, 3, 4500),
  ('masamba', 2026, 4, 4700), ('masamba', 2026, 5, 4800), ('masamba', 2026, 6, 4600),
  ('masamba', 2026, 7, 4700), ('masamba', 2026, 8, 4500), ('masamba', 2026, 9, 4400),
  ('masamba', 2026, 10, 4500), ('masamba', 2026, 11, 4300), ('masamba', 2026, 12, 4000);
