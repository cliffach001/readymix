"use client";

import type { InputData } from "@/lib/types-input";
import { Pencil, Trash2, Search, AlertCircle } from "lucide-react";
import { useState, useMemo } from "react";

interface TabelRiwayatInputProps {
  data: InputData[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TabelRiwayatInput({
  data,
  onEdit,
  onDelete,
}: TabelRiwayatInputProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (d) =>
        d.namaPelanggan.toLowerCase().includes(q) ||
        d.uraianPekerjaan.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.keterangan.toLowerCase().includes(q) ||
        d.tanggal.includes(q)
    );
  }, [data, search]);

  const formatCurrency = (val: number) =>
    "Rp " + val.toLocaleString("id-ID");

  const formatDate = (tgl: string) => {
    const d = new Date(tgl + "T00:00:00");
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (data.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">
            Riwayat Data
          </h3>
        </div>
        <div className="card-body flex flex-col items-center justify-center py-12 text-gray-400">
          <AlertCircle className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">Belum ada data</p>
          <p className="text-xs mt-1">
            Input data melalui form di atas untuk memulai
          </p>
        </div>
      </div>
    );
  }

  const totalJumlahHarga = filtered.reduce((acc, d) => acc + d.jumlahHarga, 0);
  const totalSewaCP = filtered.reduce((acc, d) => acc + d.sewaCP, 0);
  const totalSemua = filtered.reduce((acc, d) => acc + d.totalHarga, 0);
  const totalVolume = filtered.reduce((acc, d) => acc + d.volume, 0);

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Riwayat Data
            </h3>
            <p className="text-xs text-gray-500">
              {data.length} data · ditampilkan {filtered.length}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari data..."
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition w-full sm:w-56"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                No
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Tanggal
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Pelanggan
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Pekerjaan
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Type
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Keterangan
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Vol (m³)
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Harga Satuan
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Jumlah Harga
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Sewa CP
              </th>
              <th className="text-right px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Total
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-600 text-xs uppercase">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((item, idx) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-3 py-2.5 text-gray-400 text-xs">
                  {idx + 1}
                </td>
                <td className="px-3 py-2.5 text-gray-700 font-medium whitespace-nowrap">
                  {formatDate(item.tanggal)}
                </td>
                <td className="px-3 py-2.5 text-gray-700">
                  {item.namaPelanggan}
                </td>
                <td className="px-3 py-2.5 text-gray-600 max-w-[180px] truncate">
                  {item.uraianPekerjaan}
                </td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                  {item.type || "—"}
                </td>
                <td className="px-3 py-2.5 text-gray-500 max-w-[150px] truncate text-xs">
                  {item.keterangan || "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 font-medium">
                  {item.volume.toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                  {formatCurrency(item.hargaSatuan)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-primary-600 font-semibold">
                  {formatCurrency(item.jumlahHarga)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                  {item.sewaCP > 0
                    ? formatCurrency(item.sewaCP)
                    : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-900 font-bold">
                  {formatCurrency(item.totalHarga)}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(item.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Footer */}
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50/80">
              <td
                colSpan={6}
                className="px-3 py-3 font-bold text-gray-700 text-xs uppercase text-left"
              >
                Total
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800">
                {totalVolume.toLocaleString("id-ID")} m³
              </td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-right tabular-nums font-bold text-primary-700">
                {formatCurrency(totalJumlahHarga)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-700">
                {formatCurrency(totalSewaCP)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-900 text-base">
                {formatCurrency(totalSemua)}
              </td>
              <td className="px-3 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
