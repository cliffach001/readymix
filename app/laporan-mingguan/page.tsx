"use client";

import { useState, useEffect } from "react";
import TabelProduksi from "@/components/laporan-mingguan/TabelProduksi";
import ProtectedRoute from "@/components/ProtectedRoute";
import { fetchLaporanMingguan, fetchPlants } from "@/lib/supabase-service";
import type { PlantRow } from "@/lib/supabase-service";
import type { LaporanMingguan } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";

// Info minggu
const tglMulai = "16 Juni 2026";
const tglSelesai = "22 Juni 2026";
const mingguKe = "Minggu III";
const bulanLaporan = "Juni 2026";

export default function LaporanMingguanPage() {
  const { user } = useAuth();
  const [filterPlant, setFilterPlant] = useState<string>("semua");
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, LaporanMingguan[]>>({});
  const [loading, setLoading] = useState(true);

  const isMarketingTerbatas = user?.role === "marketing" && user?.unitKerja;
  const plantCodes = isMarketingTerbatas
    ? [user!.unitKerja!]
    : ["pangkep", "makassar", "pinrang", "kendari", "toraja", "masamba"];

  useEffect(() => {
    const fetchers = plantCodes.map((code) => fetchLaporanMingguan(code));

    Promise.all([
      fetchPlants(),
      ...fetchers,
    ])
      .then(([plantsData, ...allData]) => {
        // Filter plants jika marketing
        const filteredPlants = isMarketingTerbatas
          ? plantsData.filter((p) => p.id === user!.unitKerja)
          : plantsData;
        setPlants(filteredPlants);

        const map: Record<string, LaporanMingguan[]> = {};
        plantCodes.forEach((code, i) => {
          map[code] = allData[i];
        });
        setDataMap(map);
        if (isMarketingTerbatas) setFilterPlant("semua");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isMarketingTerbatas, user?.unitKerja]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPlants: PlantRow[] =
    filterPlant === "semua"
      ? plants
      : plants.filter((p) => p.id === filterPlant);

  // Hitung grand total semua plant
  const grandTotalSemua = Object.values(dataMap).reduce(
    (acc, data) => acc + data.reduce((sum, d) => sum + d.total, 0),
    0
  );

  return (
    <ProtectedRoute route="laporan-mingguan">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Laporan Produksi Mingguan
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {mingguKe} — {tglMulai} s.d. {tglSelesai}
            </p>
          </div>
        </div>

        {/* Info bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-lg">
              📅
            </div>
            <div>
              <p className="text-xs text-gray-500">Periode</p>
              <p className="text-sm font-semibold text-gray-800">
                {mingguKe}, {bulanLaporan}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 text-lg">
              🏭
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Plant</p>
              <p className="text-sm font-semibold text-gray-800">
                {plants.length} Plant Aktif
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-lg">
              📊
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Produksi</p>
              <p className="text-sm font-semibold text-gray-800">
                {grandTotalSemua.toLocaleString("id-ID")} m³
              </p>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterPlant("semua")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterPlant === "semua"
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Semua Plant
          </button>
          {plants.map((plant) => (
            <button
              key={plant.id}
              onClick={() => setFilterPlant(plant.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterPlant === plant.id
                  ? "bg-primary-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {plant.icon} {plant.nama.replace("Ready Mix ", "")}
            </button>
          ))}
        </div>

        {/* Loading / Tabel */}
        {loading ? (
          <div className="card p-8 text-center text-sm text-gray-400">
            Memuat data...
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPlants.map((plant, index) => (
              <TabelProduksi
                key={plant.id}
                plant={{
                  id: plant.id,
                  nama: plant.nama,
                  lokasi: plant.lokasi,
                  icon: plant.icon,
                }}
                data={dataMap[plant.id] ?? []}
                no={index + 1}
              />
            ))}
          </div>
        )}

        {/* Footer keterangan */}
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Keterangan
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-sky-600" />
              <span>Shift 1: 07:00 – 15:00 WITA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Shift 2: 15:00 – 23:00 WITA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Shift 3: 23:00 – 07:00 WITA</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
            <p>
              Laporan ini dihasilkan secara otomatis dari sistem. Data dapat
              berubah jika ada koreksi dari masing-masing plant.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
