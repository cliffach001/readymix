"use client";

import { useState, useEffect } from "react";
import { fetchRKAPKumulatif } from "@/lib/supabase-service";
import type { RKAPRow } from "@/lib/supabase-service";

const COLORS = [
  { bar: "bg-[#FF6600]", text: "text-[#FF6600]", bg: "bg-orange-100" },
  { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-100" },
  { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-100" },
  { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-100" },
  { bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-100" },
  { bar: "bg-pink-500", text: "text-pink-700", bg: "bg-pink-100" },
];

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: (typeof COLORS)[number];
}) {
  const clamped = Math.min(value, 100);

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
      .catch(console.error)
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
        {(plantCode ? data.filter((d) => d.plant === plantCode) : data).map((item, index) => {
          const color = COLORS[index % COLORS.length];
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

              <ProgressBar value={item.persentase} color={color} />

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
