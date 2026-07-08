"use client";

import { useState, useEffect } from "react";
import { fetchRKAPKumulatif } from "@/lib/supabase-service";
import type { RKAPRow } from "@/lib/supabase-service";
import { PLANT_COLORS, MONTH_NAMES } from "@/lib/dashboard-constants";
import { logger } from "@/lib/logger";

function ProgressBar({
  value,
  colorIndex,
}: {
  value: number;
  colorIndex: number;
}) {
  const clamped = Math.min(value, 100);
  const color = PLANT_COLORS[colorIndex % PLANT_COLORS.length];

  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${color.bar}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

interface Props {
  year: number;
  month: number;
  plantCode?: string;
}

export default function CapaianRKAPChart({ year, month, plantCode }: Props) {
  const [data, setData] = useState<RKAPRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRKAPKumulatif(year, month)
      .then(setData)
      .catch(() => logger.error("Gagal memuat capaian RKAP", { tag: "Dashboard" }))
      .finally(() => setLoading(false));
  }, [year, month]);

  // Filter data jika plantCode diberikan
  const filteredData = plantCode
    ? data.filter((d) => d.plant.toLowerCase().includes(plantCode.toLowerCase()))
    : data;

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">
            Capaian terhadap RKAP
          </h3>
        </div>
        <div className="card-body flex items-center justify-center h-[200px]">
          <p className="text-sm text-gray-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-base font-semibold text-gray-900">
          Capaian terhadap RKAP
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Realisasi s.d. {MONTH_NAMES[month]} {year}
        </p>
      </div>
      <div className="card-body space-y-6">
        {filteredData.map((item, index) => {
          const color = PLANT_COLORS[index % PLANT_COLORS.length];
          const remaining = item.target - item.realisasi;
          const remainingFormatted =
            remaining > 0
              ? `Sisa ${remaining.toLocaleString("id-ID")} m³`
              : "Target tercapai";

          return (
            <div key={item.plant} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {item.plant}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}
                >
                  {item.persentase}%
                </span>
              </div>

              <ProgressBar value={item.persentase} colorIndex={index} />

              <div className="flex justify-between text-xs text-gray-500 pt-0.5">
                <span>
                  {item.realisasi.toLocaleString("id-ID")} m³ /{" "}
                  {item.target.toLocaleString("id-ID")} m³
                </span>
                <span>{remainingFormatted}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
