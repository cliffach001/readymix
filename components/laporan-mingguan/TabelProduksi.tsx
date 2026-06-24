"use client";

import type { InputDataRecord, WeekInfo } from "@/lib/supabase-service";

function formatCurrency(val: number) {
  return val.toLocaleString("id-ID");
}

interface TabelProduksiProps {
  plant: {
    id: string;
    nama: string;
    lokasi: string;
    icon: string;
  };
  weekInfo: WeekInfo;
  transactions: InputDataRecord[];
}

export default function TabelProduksi({
  plant,
  weekInfo,
  transactions,
}: TabelProduksiProps) {
  const totalVolume = transactions.reduce((s, r) => s + r.volume, 0);
  const totalJumlahHarga = transactions.reduce((s, r) => s + r.jumlah_harga, 0);
  const totalSewaCP = transactions.reduce((s, r) => s + r.sewa_cp, 0);
  const totalSemua = transactions.reduce((s, r) => s + r.total_harga, 0);

  const formatDate = (tgl: string) =>
    new Date(tgl + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="card overflow-hidden">
      {/* Header Plant */}
      <div className="card-header flex items-center gap-3">
        <span className="text-xl">{plant.icon}</span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {plant.nama}
          </h3>
          <p className="text-xs text-gray-500">
            {plant.lokasi} &middot; {weekInfo.periode} &middot;{" "}
            {transactions.length} transaksi
          </p>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Tanggal</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Pelanggan</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Pekerjaan</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Vol (m³)</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Harga Satuan</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Jumlah Harga</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Sewa CP</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Tidak ada transaksi untuk minggu ini
                </td>
              </tr>
            ) : (
              transactions.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-3 py-3 text-gray-900 font-medium whitespace-nowrap text-xs">
                    {formatDate(row.tanggal)}
                  </td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs max-w-[160px] truncate">
                    {row.nama_pelanggan}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs max-w-[140px] truncate">
                    {row.uraian_pekerjaan}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">
                      {row.type || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap text-xs">
                    {row.volume.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                    {formatCurrency(row.harga_satuan)}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                    {formatCurrency(row.jumlah_harga)}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                    {row.sewa_cp > 0 ? formatCurrency(row.sewa_cp) : "-"}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-xs">
                    {formatCurrency(row.total_harga)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {transactions.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-3 py-3 font-bold text-gray-800 text-xs uppercase">
                  Total ({transactions.length} transaksi)
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800 text-xs">
                  {totalVolume.toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-500 text-xs">
                  —
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800 text-xs">
                  {formatCurrency(totalJumlahHarga)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800 text-xs">
                  {formatCurrency(totalSewaCP)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-primary-600 text-xs">
                  {formatCurrency(totalSemua)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
