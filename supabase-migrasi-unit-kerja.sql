-- ============================================================
-- Migrasi: Tambah kolom unit_kerja ke tabel users
-- Jalankan jika sudah ada tabel users tanpa kolom unit_kerja
-- ============================================================

-- 1. Tambah kolom unit_kerja (nullable — hanya diisi untuk role marketing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit_kerja TEXT REFERENCES plants(code);

-- 2. Hapus user marketing lama dan buat ulang per plant
DELETE FROM users WHERE role = 'marketing';

INSERT INTO users (username, password, nama_lengkap, role, unit_kerja) VALUES
  ('marketing_pangkep',  '123456', 'Marketing Pangkep',  'marketing', 'pangkep'),
  ('marketing_makassar', '123456', 'Marketing Makassar', 'marketing', 'makassar'),
  ('marketing_pinrang',  '123456', 'Marketing Pinrang',  'marketing', 'pinrang'),
  ('marketing_kendari',  '123456', 'Marketing Kendari',  'marketing', 'kendari'),
  ('marketing_toraja',   '123456', 'Marketing Toraja',   'marketing', 'toraja'),
  ('marketing_masamba',  '123456', 'Marketing Masamba',  'marketing', 'masamba')
ON CONFLICT (username) DO NOTHING;
