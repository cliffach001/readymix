"use client";

import { useState, useEffect } from "react";
import { fetchRKAPKumulatif } from "@/lib/supabase-service";
import type { RKAPRow } from "@/lib/supabase-service";
import { MONTH_NAMES } from "@/lib/dashboard-constants";
import { logger } from "@/lib/logger";

// Warna progress bar — menggunakan HEX inline style
const BAR_COLORS = [
  "#F35b04", // orange-500
  "#ef4444", // red-500
  "#10b981", //-emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
];

// Warna badge — menggunakan HEX inline style
const BADGE_BG_COLORS = [
  "#ff7a2b", // orange-300
  "#fca5a5", // red-300
  "#6ee7b7", // emerald-300
  "#fcd34d", // amber-300
  "#c4b5fd", // violet-300
  "#f9a8d4", // pnk-300
];

const BADGE_TEXT_COLORS = [
  "#9a3412", // orange-800
  "#991b1b", // red-800
  "#065f46", // emerald-800
  "#92400e", // amber-800
  "#5b21b6", // violet-800
  "#86198f", // pink-800
];

function ProgressBar({
  value,
  colorIndex,
}: {
  value: number;
  colorIndex: number;
}) {
  const clamped = Math.min(value, 100);
  const barColor = BAR_COLORS[colorIndex % BAR_COLORS.length];

  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${clamped}%`, backgroundColor: barColor }}
      />
    </div>
  );
}

interface Props {
  year: number;
  month: number;
}

export default function CapaianRKAPChart({ year, month }: Props) {
  const [data, setData] = useState<RKAPRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchRKAPKumulatif(year, month)
      .then(setData)
      .catch(() => logger.error("Gagal memuat capaian RKAP", { tag: "Dashboard" }))
      .finally(() => setLoading(false));
  }, [year, month]);

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
        {data.map((item, index) => {
          const badgeBg = BADGE_BG_COLORS[index % BADGE_BG_COLORS.length];
          const badgeText = BADGE_TEXT_COLORS[index % BADGE_TEXT_COLORS.length];
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
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: badgeBg, color: badgeText }}
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
