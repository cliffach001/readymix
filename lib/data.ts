// ============================================================
// Data Produksi Harian (contoh 14 hari terakhir)
// ============================================================
export interface ProduksiHarian {
  tanggal: string;
  pangkep: number;
  makassar: number;
  pinrang: number;
  kendari: number;
  toraja: number;
  masamba: number;
}

export const dataProduksiHarian: ProduksiHarian[] = [
  { tanggal: "09 Jun", pangkep: 320, makassar: 480, pinrang: 180, kendari: 210, toraja: 140, masamba: 90 },
  { tanggal: "10 Jun", pangkep: 350, makassar: 510, pinrang: 200, kendari: 230, toraja: 160, masamba: 110 },
  { tanggal: "11 Jun", pangkep: 280, makassar: 460, pinrang: 170, kendari: 195, toraja: 130, masamba: 85 },
  { tanggal: "12 Jun", pangkep: 390, makassar: 530, pinrang: 220, kendari: 250, toraja: 175, masamba: 120 },
  { tanggal: "13 Jun", pangkep: 340, makassar: 490, pinrang: 190, kendari: 215, toraja: 155, masamba: 100 },
  { tanggal: "14 Jun", pangkep: 310, makassar: 475, pinrang: 185, kendari: 205, toraja: 145, masamba: 95 },
  { tanggal: "15 Jun", pangkep: 370, makassar: 520, pinrang: 210, kendari: 240, toraja: 165, masamba: 115 },
  { tanggal: "16 Jun", pangkep: 300, makassar: 450, pinrang: 165, kendari: 190, toraja: 125, masamba: 80 },
  { tanggal: "17 Jun", pangkep: 360, makassar: 505, pinrang: 205, kendari: 225, toraja: 160, masamba: 105 },
  { tanggal: "18 Jun", pangkep: 410, makassar: 550, pinrang: 240, kendari: 260, toraja: 185, masamba: 130 },
  { tanggal: "19 Jun", pangkep: 330, makassar: 485, pinrang: 195, kendari: 220, toraja: 150, masamba: 98 },
  { tanggal: "20 Jun", pangkep: 380, makassar: 515, pinrang: 215, kendari: 245, toraja: 170, masamba: 108 },
  { tanggal: "21 Jun", pangkep: 290, makassar: 445, pinrang: 175, kendari: 200, toraja: 135, masamba: 88 },
  { tanggal: "22 Jun", pangkep: 400, makassar: 540, pinrang: 230, kendari: 255, toraja: 180, masamba: 125 },
];

// ============================================================
// Data Produksi Bulanan (contoh Januari - Juni 2026)
// ============================================================
export interface ProduksiBulanan {
  bulan: string;
  pangkep: number;
  makassar: number;
  pinrang: number;
  kendari: number;
  toraja: number;
  masamba: number;
}

export const dataProduksiBulanan: ProduksiBulanan[] = [
  { bulan: "Jan", pangkep: 8500, makassar: 12500, pinrang: 4800, kendari: 5600, toraja: 3800, masamba: 2400 },
  { bulan: "Feb", pangkep: 9200, makassar: 13200, pinrang: 5100, kendari: 5900, toraja: 4100, masamba: 2600 },
  { bulan: "Mar", pangkep: 8800, makassar: 12800, pinrang: 4950, kendari: 5750, toraja: 3950, masamba: 2500 },
  { bulan: "Apr", pangkep: 9600, makassar: 13800, pinrang: 5300, kendari: 6100, toraja: 4300, masamba: 2750 },
  { bulan: "Mei", pangkep: 10100, makassar: 14200, pinrang: 5600, kendari: 6400, toraja: 4600, masamba: 2900 },
  { bulan: "Jun", pangkep: 9400, makassar: 13500, pinrang: 5200, kendari: 6200, toraja: 4200, masamba: 2650 },
];

// ============================================================
// Data RKAP (Rencana Kerja dan Anggaran Perusahaan)
// ============================================================
export interface CapaianRKAP {
  plant: string;
  target: number; // target tahunan dalam m³
  realisasi: number; // realisasi s.d. Juni dalam m³
  persentase: number;
}

export const dataRKAP: CapaianRKAP[] = [
  {
    plant: "Ready Mix Pangkep",
    target: 180000,
    realisasi: 55600,
    persentase: Math.round((55600 / 180000) * 100 * 10) / 10,
  },
  {
    plant: "Ready Mix Makassar",
    target: 260000,
    realisasi: 80500,
    persentase: Math.round((80500 / 260000) * 100 * 10) / 10,
  },
  {
    plant: "Ready Mix Pinrang",
    target: 100000,
    realisasi: 30950,
    persentase: Math.round((30950 / 100000) * 100 * 10) / 10,
  },
  {
    plant: "Ready Mix Kendari",
    target: 120000,
    realisasi: 37950,
    persentase: Math.round((37950 / 120000) * 100 * 10) / 10,
  },
  {
    plant: "Ready Mix Toraja",
    target: 85000,
    realisasi: 25150,
    persentase: Math.round((25150 / 85000) * 100 * 10) / 10,
  },
  {
    plant: "Ready Mix Masamba",
    target: 55000,
    realisasi: 15900,
    persentase: Math.round((15900 / 55000) * 100 * 10) / 10,
  },
];

// ============================================================
// Data Laporan Mingguan
// ============================================================
export interface LaporanMingguan {
  hari: string;
  shift1: number; // 07:00 - 15:00
  shift2: number; // 15:00 - 23:00
  shift3: number; // 23:00 - 07:00
  total: number;
  keterangan?: string;
}

export const dataMingguanPangkep: LaporanMingguan[] = [
  { hari: "Senin",   shift1: 120, shift2: 95,  shift3: 40,  total: 255, keterangan: "-" },
  { hari: "Selasa",  shift1: 135, shift2: 100, shift3: 45,  total: 280, keterangan: "Produksi optimal" },
  { hari: "Rabu",    shift1: 110, shift2: 90,  shift3: 35,  total: 235, keterangan: "-" },
  { hari: "Kamis",   shift1: 140, shift2: 105, shift3: 50,  total: 295, keterangan: "-" },
  { hari: "Sabtu",   shift1: 125, shift2: 98,  shift3: 42,  total: 265, keterangan: "-" },
  { hari: "Minggu",  shift1: 0,   shift2: 0,   shift3: 0,   total: 0,   keterangan: "Libur" },
];

export const dataMingguanMakassar: LaporanMingguan[] = [
  { hari: "Senin",   shift1: 175, shift2: 140, shift3: 65,  total: 380, keterangan: "-" },
  { hari: "Selasa",  shift1: 190, shift2: 150, shift3: 70,  total: 410, keterangan: "Proyek besar" },
  { hari: "Rabu",    shift1: 165, shift2: 130, shift3: 60,  total: 355, keterangan: "-" },
  { hari: "Kamis",   shift1: 200, shift2: 155, shift3: 75,  total: 430, keterangan: "-" },
  { hari: "Jumat",   shift1: 180, shift2: 0,   shift3: 0,   total: 180, keterangan: "Shift 1 saja" },
  { hari: "Sabtu",   shift1: 170, shift2: 135, shift3: 55,  total: 360, keterangan: "-" },
  { hari: "Minggu",  shift1: 0,   shift2: 0,   shift3: 0,   total: 0,   keterangan: "Libur" },
];

export const dataMingguanPinrang: LaporanMingguan[] = [
  { hari: "Senin",   shift1: 70,  shift2: 55,  shift3: 20,  total: 145, keterangan: "-" },
  { hari: "Selasa",  shift1: 80,  shift2: 60,  shift3: 25,  total: 165, keterangan: "-" },
  { hari: "Rabu",    shift1: 65,  shift2: 50,  shift3: 20,  total: 135, keterangan: "-" },
  { hari: "Kamis",   shift1: 85,  shift2: 65,  shift3: 30,  total: 180, keterangan: "-" },
  { hari: "Jumat",   shift1: 75,  shift2: 55,  shift3: 0,   total: 130, keterangan: "-" },
  { hari: "Sabtu",   shift1: 70,  shift2: 50,  shift3: 0,   total: 120, keterangan: "-" },
  { hari: "Minggu",  shift1: 0,   shift2: 0,   shift3: 0,   total: 0,   keterangan: "Libur" },
];

export const dataMingguanKendari: LaporanMingguan[] = [
  { hari: "Senin",   shift1: 85,  shift2: 65,  shift3: 25,  total: 175, keterangan: "-" },
  { hari: "Selasa",  shift1: 95,  shift2: 70,  shift3: 30,  total: 195, keterangan: "-" },
  { hari: "Rabu",    shift1: 80,  shift2: 60,  shift3: 25,  total: 165, keterangan: "-" },
  { hari: "Kamis",   shift1: 100, shift2: 75,  shift3: 35,  total: 210, keterangan: "-" },
  { hari: "Jumat",   shift1: 90,  shift2: 65,  shift3: 0,   total: 155, keterangan: "-" },
  { hari: "Sabtu",   shift1: 85,  shift2: 60,  shift3: 0,   total: 145, keterangan: "-" },
  { hari: "Minggu",  shift1: 0,   shift2: 0,   shift3: 0,   total: 0,   keterangan: "Libur" },
];

export const dataMingguanToraja: LaporanMingguan[] = [
  { hari: "Senin",   shift1: 55,  shift2: 40,  shift3: 15,  total: 110, keterangan: "-" },
  { hari: "Selasa",  shift1: 60,  shift2: 45,  shift3: 20,  total: 125, keterangan: "-" },
  { hari: "Rabu",    shift1: 50,  shift2: 38,  shift3: 15,  total: 103, keterangan: "-" },
  { hari: "Kamis",   shift1: 65,  shift2: 48,  shift3: 20,  total: 133, keterangan: "-" },
  { hari: "Jumat",   shift1: 58,  shift2: 42,  shift3: 0,   total: 100, keterangan: "-" },
  { hari: "Sabtu",   shift1: 55,  shift2: 40,  shift3: 0,   total: 95,  keterangan: "-" },
  { hari: "Minggu",  shift1: 0,   shift2: 0,   shift3: 0,   total: 0,   keterangan: "Libur" },
];

export const dataMingguanMasamba: LaporanMingguan[] = [
  { hari: "Senin",   shift1: 35,  shift2: 28,  shift3: 10,  total: 73,  keterangan: "-" },
  { hari: "Selasa",  shift1: 40,  shift2: 30,  shift3: 12,  total: 82,  keterangan: "-" },
  { hari: "Rabu",    shift1: 32,  shift2: 25,  shift3: 10,  total: 67,  keterangan: "-" },
  { hari: "Kamis",   shift1: 42,  shift2: 32,  shift3: 15,  total: 89,  keterangan: "-" },
  { hari: "Jumat",   shift1: 38,  shift2: 28,  shift3: 0,   total: 66,  keterangan: "-" },
  { hari: "Sabtu",   shift1: 35,  shift2: 25,  shift3: 0,   total: 60,  keterangan: "-" },
  { hari: "Minggu",  shift1: 0,   shift2: 0,   shift3: 0,   total: 0,   keterangan: "Libur" },
];

// Informasi ringkasan per plant
export interface InfoPlant {
  id: string;
  nama: string;
  lokasi: string;
  icon: string;
}

export const daftarPlant: InfoPlant[] = [
  { id: "pangkep",  nama: "Ready Mix Pangkep",  lokasi: "Pangkajene Kepulauan", icon: "🏭" },
  { id: "makassar", nama: "Ready Mix Makassar", lokasi: "Kota Makassar",        icon: "🏭" },
  { id: "pinrang",  nama: "Ready Mix Pinrang",  lokasi: "Kab. Pinrang",        icon: "🏭" },
  { id: "kendari",  nama: "Ready Mix Kendari",  lokasi: "Kota Kendari",         icon: "🏭" },
  { id: "toraja",   nama: "Ready Mix Toraja",   lokasi: "Tana Toraja",         icon: "🏭" },
  { id: "masamba",  nama: "Ready Mix Masamba",  lokasi: "Kab. Luwu Utara",     icon: "🏭" },
];
