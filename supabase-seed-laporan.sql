-- ============================================================
-- Seed data untuk Laporan Mingguan
-- Minggu III: 16 - 22 Juni 2026
-- ============================================================

-- Pangkep
INSERT INTO laporan_mingguan (plant_code, hari, shift_1, shift_2, shift_3, total, keterangan, minggu_mulai) VALUES
  ('pangkep', 'Senin', 120, 95, 40, 255, '-', '2026-06-16'),
  ('pangkep', 'Selasa', 135, 100, 45, 280, 'Produksi optimal', '2026-06-16'),
  ('pangkep', 'Rabu', 110, 90, 35, 235, '-', '2026-06-16'),
  ('pangkep', 'Kamis', 140, 105, 50, 295, '-', '2026-06-16'),
  ('pangkep', 'Jumat', 125, 98, 42, 265, '-', '2026-06-16'),
  ('pangkep', 'Sabtu', 0, 0, 0, 0, 'Libur', '2026-06-16'),
  ('pangkep', 'Minggu', 0, 0, 0, 0, 'Libur', '2026-06-16');

-- Makassar
INSERT INTO laporan_mingguan (plant_code, hari, shift_1, shift_2, shift_3, total, keterangan, minggu_mulai) VALUES
  ('makassar', 'Senin', 175, 140, 65, 380, '-', '2026-06-16'),
  ('makassar', 'Selasa', 190, 150, 70, 410, 'Proyek besar', '2026-06-16'),
  ('makassar', 'Rabu', 165, 130, 60, 355, '-', '2026-06-16'),
  ('makassar', 'Kamis', 200, 155, 75, 430, '-', '2026-06-16'),
  ('makassar', 'Jumat', 180, 0, 0, 180, 'Shift 1 saja', '2026-06-16'),
  ('makassar', 'Sabtu', 170, 135, 55, 360, '-', '2026-06-16'),
  ('makassar', 'Minggu', 0, 0, 0, 0, 'Libur', '2026-06-16');

-- Pinrang
INSERT INTO laporan_mingguan (plant_code, hari, shift_1, shift_2, shift_3, total, keterangan, minggu_mulai) VALUES
  ('pinrang', 'Senin', 70, 55, 20, 145, '-', '2026-06-16'),
  ('pinrang', 'Selasa', 80, 60, 25, 165, '-', '2026-06-16'),
  ('pinrang', 'Rabu', 65, 50, 20, 135, '-', '2026-06-16'),
  ('pinrang', 'Kamis', 85, 65, 30, 180, '-', '2026-06-16'),
  ('pinrang', 'Jumat', 75, 55, 0, 130, '-', '2026-06-16'),
  ('pinrang', 'Sabtu', 70, 50, 0, 120, '-', '2026-06-16'),
  ('pinrang', 'Minggu', 0, 0, 0, 0, 'Libur', '2026-06-16');

-- Kendari
INSERT INTO laporan_mingguan (plant_code, hari, shift_1, shift_2, shift_3, total, keterangan, minggu_mulai) VALUES
  ('kendari', 'Senin', 85, 65, 25, 175, '-', '2026-06-16'),
  ('kendari', 'Selasa', 95, 70, 30, 195, '-', '2026-06-16'),
  ('kendari', 'Rabu', 80, 60, 25, 165, '-', '2026-06-16'),
  ('kendari', 'Kamis', 100, 75, 35, 210, '-', '2026-06-16'),
  ('kendari', 'Jumat', 90, 65, 0, 155, '-', '2026-06-16'),
  ('kendari', 'Sabtu', 85, 60, 0, 145, '-', '2026-06-16'),
  ('kendari', 'Minggu', 0, 0, 0, 0, 'Libur', '2026-06-16');

-- Toraja
INSERT INTO laporan_mingguan (plant_code, hari, shift_1, shift_2, shift_3, total, keterangan, minggu_mulai) VALUES
  ('toraja', 'Senin', 55, 40, 15, 110, '-', '2026-06-16'),
  ('toraja', 'Selasa', 60, 45, 20, 125, '-', '2026-06-16'),
  ('toraja', 'Rabu', 50, 38, 15, 103, '-', '2026-06-16'),
  ('toraja', 'Kamis', 65, 48, 20, 133, '-', '2026-06-16'),
  ('toraja', 'Jumat', 58, 42, 0, 100, '-', '2026-06-16'),
  ('toraja', 'Sabtu', 55, 40, 0, 95, '-', '2026-06-16'),
  ('toraja', 'Minggu', 0, 0, 0, 0, 'Libur', '2026-06-16');

-- Masamba
INSERT INTO laporan_mingguan (plant_code, hari, shift_1, shift_2, shift_3, total, keterangan, minggu_mulai) VALUES
  ('masamba', 'Senin', 35, 28, 10, 73, '-', '2026-06-16'),
  ('masamba', 'Selasa', 40, 30, 12, 82, '-', '2026-06-16'),
  ('masamba', 'Rabu', 32, 25, 10, 67, '-', '2026-06-16'),
  ('masamba', 'Kamis', 42, 32, 15, 89, '-', '2026-06-16'),
  ('masamba', 'Jumat', 38, 28, 0, 66, '-', '2026-06-16'),
  ('masamba', 'Sabtu', 35, 25, 0, 60, '-', '2026-06-16'),
  ('masamba', 'Minggu', 0, 0, 0, 0, 'Libur', '2026-06-16');
