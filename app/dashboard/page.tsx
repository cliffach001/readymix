"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ProduksiHarianChart from "@/components/dashboard/ProduksiHarianChart";
import ProduksiBulananChart from "@/components/dashboard/ProduksiBulananChart";
import CapaianRKAPChart from "@/components/dashboard/CapaianRKAPChart";
import { Factory, ChevronRight } from "lucide-react";
import { fetchProduksiBulanan, fetchPlants } from "@/lib/supabase-service";
import type { ProduksiBulananRow, PlantRow } from "@/lib/supabase-service";

function PlantCard({
  id,
  nama,
  value,
}: {
  id: string;
  nama: string;
  value: number;
}) {
  return (
    <Link
      href={`/plant/${id}`}
      className="card p-5 flex items-center gap-4 border-l-4 border-l-[#FF6600] hover:shadow-md hover:border-l-[#e55a00] transition-all group"
    >
      <Factory className="size-8 text-[#FF6600]" strokeWidth={1.5} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 font-medium">{nama}</p>
        <p className="text-xl font-bold text-gray-900">
          {value.toLocaleString("id-ID")}
        </p>
        <p className="text-xs text-gray-400">m³</p>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#FF6600] transition-colors shrink-0" />
    </Link>
  );
}

export default function DashboardPage() {
  const [bulanIni, setBulanIni] = useState<ProduksiBulananRow | null>(null);
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchProduksiBulanan(), fetchPlants()])
      .then(([bulanan, plantsData]) => {
        setBulanIni(bulanan[bulanan.length - 1] ?? null);
        setPlants(plantsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Ringkasan produksi Ready Mix seluruh plant
        </p>
      </div>

      {/* Produksi Bulanan per Packing Plant */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Produksi Bulanan {bulanIni ? `— ${bulanIni.bulan} 2026` : ""}
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
                value={bulanIni ? (bulanIni[plant.id as keyof typeof bulanIni] as number) : 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Charts Row 1: Produksi Harian + Capaian RKAP */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProduksiHarianChart />
        </div>
        <div className="lg:col-span-1">
          <CapaianRKAPChart />
        </div>
      </div>

      {/* Charts Row 2: Produksi Bulanan */}
      <div className="grid grid-cols-1 gap-6">
        <ProduksiBulananChart />
      </div>
    </div>
  );
}
