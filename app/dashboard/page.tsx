"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProduksiHarianChart from "@/components/dashboard/ProduksiHarianChart";
import ProduksiBulananChart from "@/components/dashboard/ProduksiBulananChart";
import CapaianRKAPChart from "@/components/dashboard/CapaianRKAPChart";
import { Factory, Calendar } from "lucide-react";
import { fetchRKAPBulanan, fetchVolumePerPlantBulanan, fetchPlants } from "@/lib/supabase-service";
import type { PlantRow } from "@/lib/supabase-service";
import ProtectedRoute from "@/components/ProtectedRoute";
import { setFilterBulan } from "@/lib/filter-bulan";
import { useAuth } from "@/contexts/AuthContext";

const MONTHS = [
  { num: 1, label: "Januari" },
  { num: 2, label: "Februari" },
  { num: 3, label: "Maret" },
  { num: 4, label: "April" },
  { num: 5, label: "Mei" },
  { num: 6, label: "Juni" },
  { num: 7, label: "Juli" },
  { num: 8, label: "Agustus" },
  { num: 9, label: "September" },
  { num: 10, label: "Oktober" },
  { num: 11, label: "November" },
  { num: 12, label: "Desember" },
];

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

function PlantCard({
  id,
  nama,
  realisasi,
  target,
}: {
  id: string;
  nama: string;
  realisasi: number;
  target: number;
}) {
  return (
    <Link
      href={`/plant/${id}`}
      className="card p-5 flex items-center gap-4 border-l-4 border-l-[#FF6600] hover:shadow-md hover:border-l-[#e55a00] transition-all group"
    >
      <Factory className="size-8 text-[#FF6600]" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{nama.replace("Ready Mix ", "")}</p>
        <p className="text-xl font-bold text-gray-900">
          {realisasi.toLocaleString("id-ID")}
        </p>
        <p className="text-xs text-gray-400">
          Target RKAP: {target.toLocaleString("id-ID")}
        </p>
      </div>
      {/* Persentase Capaian */}
      <div className="flex flex-col items-center shrink-0">
        {target > 0 ? (
          <>
            <span className="text-lg font-bold text-gray-900">
              {Math.round((realisasi / target) * 100)}%
            </span>
            <span className="text-[10px] text-gray-400">capaian</span>
          </>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isMarketing = user?.role === "marketing";
  const unitKerja = user?.unitKerja;
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [plantRealisasi, setPlantRealisasi] = useState<Record<string, number>>({});
  const [plantRKAP, setPlantRKAP] = useState<Record<string, number>>({});
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchVolumePerPlantBulanan(selectedMonth, selectedYear),
      fetchRKAPBulanan(selectedMonth, selectedYear),
      fetchPlants(),
    ])
      .then(([volumes, targets, plantsData]) => {
        const volMap: Record<string, number> = {};
        volumes.forEach((v) => (volMap[v.plant_code] = v.volume));
        setPlantRealisasi(volMap);
        const rkapMap: Record<string, number> = {};
        targets.forEach((t) => (rkapMap[t.plant_code] = t.target));
        setPlantRKAP(rkapMap);
        setPlants(plantsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedMonth, selectedYear]);

  // Simpan filter ke localStorage untuk digunakan halaman lain
  useEffect(() => {
    setFilterBulan(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear]);

  const monthLabel = MONTHS.find((m) => m.num === selectedMonth)?.label ?? "";

  // Filter grafik Produksi Harian saja untuk marketing
  const plantCode = isMarketing && unitKerja ? unitKerja : undefined;

  return (
    <ProtectedRoute route="dashboard">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ringkasan produksi Ready Mix seluruh plant
            </p>
          </div>

          {/* Filter Bulan */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
            >
              {MONTHS.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
            >
              {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RKAP Bulanan per Packing Plant */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Target RKAP {monthLabel} {selectedYear}
          </h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plants.map((plant) => (
                <PlantCard
                  key={plant.id}
                  id={plant.id}
                  nama={plant.nama}
                  realisasi={plantRealisasi[plant.id] ?? 0}
                  target={plantRKAP[plant.id] ?? 0}
                />
              ))}
            </div>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProduksiHarianChart month={selectedMonth} year={selectedYear} plantCode={plantCode} />
          </div>
          <div className="lg:col-span-1">
            <CapaianRKAPChart year={selectedYear} month={selectedMonth} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <ProduksiBulananChart year={selectedYear} month={selectedMonth} />
        </div>
      </div>
    </ProtectedRoute>
  );
}
