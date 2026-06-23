"use client";

import { type LaporanMingguan, type InfoPlant } from "@/lib/data";

interface TabelProduksiProps {
  plant: InfoPlant;
  data: LaporanMingguan[];
  no?: number;
}

export default function TabelProduksi({
  plant,
  data,
  no = 1,
}: TabelProduksiProps) {
  // Hitung total
  const totalShift1 = data.reduce((acc, d) => acc + d.shift1, 0);
  const totalShift2 = data.reduce((acc, d) => acc + d.shift2, 0);
  const totalShift3 = data.reduce((acc, d) => acc + d.shift3, 0);
  const grandTotal = data.reduce((acc, d) => acc + d.total, 0);
  const hariKerja = data.filter((d) => d.total > 0).length;
  const rataRata = hariKerja > 0 ? Math.round(grandTotal / hariKerja) : 0;

  return (
    <div className="card overflow-hidden">
      {/* Header Plant */}
      <div className="card-header flex items-center gap-3">
        <span className="text-xl">{plant.icon}</span>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {plant.nama}
          </h3>
          <p className="text-xs text-gray-500">{plant.lokasi}</p>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Hari
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Shift 1
                <span className="block text-[10px] font-normal text-gray-400">
                  07:00–15:00
                </span>
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Shift 2
                <span className="block text-[10px] font-normal text-gray-400">
                  15:00–23:00
                </span>
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Shift 3
                <span className="block text-[10px] font-normal text-gray-400">
                  23:00–07:00
                </span>
              </th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Total (m³)
              </th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Keterangan
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((row) => (
              <tr
                key={row.hari}
                className={`hover:bg-gray-50/50 transition-colors ${
                  row.total === 0 ? "bg-gray-50/30 text-gray-400" : ""
                }`}
              >
                <td className="px-4 py-3 font-medium text-gray-700">
                  {row.hari}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {row.shift1 > 0
                    ? row.shift1.toLocaleString("id-ID")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {row.shift2 > 0
                    ? row.shift2.toLocaleString("id-ID")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                  {row.shift3 > 0
                    ? row.shift3.toLocaleString("id-ID")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                  {row.total > 0
                    ? row.total.toLocaleString("id-ID")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {row.keterangan && row.keterangan !== "-"
                    ? row.keterangan
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Footer: Total per shift */}
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-4 py-3 font-bold text-gray-800 text-xs uppercase">
                Total
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-800">
                {totalShift1.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-800">
                {totalShift2.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-800">
                {totalShift3.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-primary-600">
                {grandTotal.toLocaleString("id-ID")}
              </td>
              <td className="px-4 py-3"></td>
            </tr>
            <tr className="bg-gray-50/50 border-t border-gray-100">
              <td
                colSpan={6}
                className="px-4 py-2 text-xs text-gray-500"
              >
                Rata-rata produksi:{" "}
                <span className="font-semibold text-gray-700">
                  {rataRata.toLocaleString("id-ID")} m³/hari
                </span>{" "}
                · Hari kerja: {hariKerja} hari
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
