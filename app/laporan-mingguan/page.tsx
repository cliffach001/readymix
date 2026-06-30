"use client";

import { useState, useEffect } from "react";
import { useBackgroundRefresh } from "@/lib/use-background-refresh";
import TabelProduksi from "@/components/laporan-mingguan/TabelProduksi";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  fetchWeeklyTransactions,
  fetchInputAvailableWeeks,
  fetchPlants,
} from "@/lib/supabase-service";
import type { PlantRow, PerPlantTransactions, WeekInfo } from "@/lib/supabase-service";
import { Factory, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFilterBulan, setFilterBulan } from "@/lib/filter-bulan";

const MONTHS = [
  { num: 1, label: "Januari" }, { num: 2, label: "Februari" }, { num: 3, label: "Maret" },
  { num: 4, label: "April" }, { num: 5, label: "Mei" }, { num: 6, label: "Juni" },
  { num: 7, label: "Juli" }, { num: 8, label: "Agustus" }, { num: 9, label: "September" },
  { num: 10, label: "Oktober" }, { num: 11, label: "November" }, { num: 12, label: "Desember" },
];
const CURRENT_YEAR = new Date().getFullYear();

export default function LaporanMingguanPage() {
  const defaultFilter = getFilterBulan();
  const { user } = useAuth();
  const [filterPlant, setFilterPlant] = useState<string>(user?.unitKerja || "kendari");
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [weeklyPlants, setWeeklyPlants] = useState<PerPlantTransactions[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<WeekInfo[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState("");
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(defaultFilter.month);
  const [selectedYear, setSelectedYear] = useState(defaultFilter.year);

  const isMarketingTerbatas = user?.role === "marketing" && user?.unitKerja;

  // Fetch data menggunakan background refresh
  const { data, loading } = useBackgroundRefresh(
    async () => {
      if (!selectedWeekStart) return null;
      const [weekly, plantsData] = await Promise.all([
        fetchWeeklyTransactions(selectedWeekStart, selectedMonth, selectedYear),
        fetchPlants(),
      ]);
      const filteredPlants = isMarketingTerbatas
        ? plantsData.filter((p) => p.id === user!.unitKerja)
        : plantsData;
      return { plants: filteredPlants, weekInfo: weekly.weekInfo, weeklyPlants: weekly.plants };
    },
    [selectedWeekStart, selectedMonth, selectedYear, isMarketingTerbatas],
    30_000
  );

  // Sync data hasil fetch ke state
  useEffect(() => {
    if (data) {
      setPlants(data.plants);
      setWeekInfo(data.weekInfo);
      setWeeklyPlants(data.weeklyPlants);
    }
  }, [data]);

  // Fetch weeks ketika bulan/tahun berubah
  useEffect(() => {
    setFilterBulan(selectedMonth, selectedYear);
    fetchInputAvailableWeeks()
      .then((weeks) => {
        const filtered = weeks.filter((w) => {
          if (!w.startDate) return false;
          const d = new Date(w.startDate + "T00:00:00");
          return d.getMonth() === selectedMonth - 1 && d.getFullYear() === selectedYear;
        });
        setAvailableWeeks(filtered);
        if (filtered.length > 0) {
          setSelectedWeekStart(filtered[0].startDate);
        } else {
          setSelectedWeekStart("");
          setWeeklyPlants([]);
          setWeekInfo(null);
        }
      })
      .catch(console.error);
  }, [selectedMonth, selectedYear]);

  const filteredPlants: PlantRow[] =
    filterPlant === "semua"
      ? plants
      : plants.filter((p) => p.id === filterPlant);

  const getWeeklyData = (plantId: string) =>
    weeklyPlants.find((w) => w.plantCode === plantId);

  const grandTotalSemua = weeklyPlants.reduce(
    (acc, w) => acc + w.transactions.reduce((sum, d) => sum + d.total_harga, 0),
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
              {weekInfo ? weekInfo.periode : "Memuat..."}
            </p>
          </div>

          {/* Filter Bulan & Minggu */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
            >
              {MONTHS.map((m) => (
                <option key={m.num} value={m.num}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
            >
              {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Filter Minggu */}
            <div className="relative w-full sm:w-56">
              <select
                value={selectedWeekStart}
                onChange={(e) => setSelectedWeekStart(e.target.value)}
                className="w-full appearance-none px-3 py-2 pr-8 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] cursor-pointer"
              >
                {availableWeeks.map((w) => (
                  <option key={w.startDate} value={w.startDate}>
                    {w.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Info bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-lg">
              📅
            </div>
            <div>
              <p className="text-xs text-gray-500">Periode</p>
              <p className="text-sm font-semibold text-gray-800">
                {weekInfo ? weekInfo.periode : "-"}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-lg">
              📊
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Pendapatan</p>
              <p className="text-sm font-semibold text-gray-800">
                Rp {grandTotalSemua.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </div>

        {/* Grid Total Pendapatan per Plant */}
        {!loading && weeklyPlants.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {weeklyPlants
              .filter((wp) => !user?.unitKerja || wp.plantCode === user.unitKerja)
              .map((wp) => {
              const plant = plants.find((p) => p.id === wp.plantCode);
              const totalPendapatan = wp.transactions.reduce((sum, d) => sum + d.total_harga, 0);
              const totalVolume = wp.transactions.reduce((sum, d) => sum + d.volume, 0);
              return (
                <div
                  key={wp.plantCode}
                  className="card p-3 sm:p-4 flex flex-col items-center gap-1 border-l-4 border-l-[#F35b04]"
                >
                  <span className="text-lg">{plant?.icon || "🏭"}</span>
                  <p className="text-[10px] sm:text-xs text-gray-500 font-medium text-center leading-tight">
                    {plant?.nama.replace("Ready Mix ", "") || wp.plantCode}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 text-center">
                    Rp {totalPendapatan.toLocaleString("id-ID")}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {totalVolume.toLocaleString("id-ID")} m³
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {plants.map((plant) => (
            <button
              key={plant.id}
              onClick={() => setFilterPlant(plant.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                filterPlant === plant.id
                  ? "bg-gradient-to-r from-[#F35b04] to-orange-700 text-white shadow-sm shadow-orange-200"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
              }`}
            >
              <Factory className="w-3.5 h-3.5 text-current opacity-60" strokeWidth={1.5} />
              <span>{plant.nama.replace("Ready Mix ", "")}</span>
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
            {filteredPlants.length === 0 ? (
              <div className="card p-8 text-center text-sm text-gray-400">
                Belum ada data untuk minggu ini
              </div>
            ) : (
              filteredPlants.map((plant) => {
                const weekly = getWeeklyData(plant.id);
                return (
                  <TabelProduksi
                    key={plant.id}
                    plant={{
                      id: plant.id,
                      nama: plant.nama,
                      lokasi: plant.lokasi,
                      icon: plant.icon,
                    }}
                    weekInfo={
                      weekly?.weekInfo ?? {
                        label: "",
                        periode: "",
                        startDate: "",
                        endDate: "",
                      }
                    }
                    transactions={weekly?.transactions ?? []}
                    userName={user?.namaLengkap}
                  />
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">
            Sumber Data
          </h4>
          <div className="text-xs text-gray-500">
            <p>
              Data transaksi diambil dari input penjualan masing-masing plant.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
