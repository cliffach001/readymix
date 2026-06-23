export interface InputData {
  id: string;
  plantId: string;
  tanggal: string; // YYYY-MM-DD
  namaPelanggan: string;
  uraianPekerjaan: string;
  type: string;
  volume: number;
  hargaSatuan: number;
  jumlahHarga: number; // volume * hargaSatuan
  sewaCP: number;
  totalHarga: number; // jumlahHarga + sewaCP
  createdAt: string; // ISO timestamp
}
