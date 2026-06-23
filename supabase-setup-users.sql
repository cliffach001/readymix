-- ============================================================
-- Users Table — Kelola Pengguna
-- Jalankan di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer',
  unit_kerja TEXT REFERENCES plants(code),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON users FOR ALL USING (true);

-- Seed data (password: "123456" dalam demo)
INSERT INTO users (username, password, nama_lengkap, role, unit_kerja) VALUES
  ('admin', '123456', 'Administrator', 'admin', NULL),
  ('manager', '123456', 'Manager Utama', 'manager', NULL),
  ('marketing_pangkep', '123456', 'Marketing Pangkep', 'marketing', 'pangkep'),
  ('marketing_makassar', '123456', 'Marketing Makassar', 'marketing', 'makassar'),
  ('marketing_pinrang', '123456', 'Marketing Pinrang', 'marketing', 'pinrang'),
  ('marketing_kendari', '123456', 'Marketing Kendari', 'marketing', 'kendari'),
  ('marketing_toraja', '123456', 'Marketing Toraja', 'marketing', 'toraja'),
  ('marketing_masamba', '123456', 'Marketing Masamba', 'marketing', 'masamba'),
  ('viewer', '123456', 'Viewer', 'viewer', NULL)
ON CONFLICT (username) DO NOTHING;
