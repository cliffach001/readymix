"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchInputBulanan } from "@/lib/supabase-service";
import type { ProduksiBulananRow } from "@/lib/supabase-service";
import { filterPlants, MONTH_NAMES } from "@/lib/dashboard-constants";
import { logger } from "@/lib/logger";

interface Props {
  month: number;
  year: number;
  plantCode?: string;
}

export default function ProduksiBulananChart({ month, year, plantCode }: Props) {
  const [allData, setAllData] = useState<ProduksiBulananRow[]>([]);
  const [loading, setLoading] = useState(true);

  const filteredPlants = filterPlants(plantCode);

  useEffect(() => {
    setLoading(true);
    fetchInputBulanan()
      .then(setAllData)
      .catch(() => logger.error("Gagal memuat produksi bulanan", { tag: "Dashboard" }))
      .finally(() => setLoading(false));
  }, []);

  // Buat array lengkap Jan s.d. selected month, isi 0 untuk bulan tanpa data
  const monthIndex = month - 1; // 0-based (Jan=0, Feb=1, ...)
  const chartData: ProduksiBulananRow[] = [];
  for (let i = 0; i <= monthIndex; i++) {
    const bulan = MONTH_NAMES[i + 1]; // +1 karena MONTH_NAMES[0] = ""
    const existing = allData.find((r) => r.bulan === bulan);
    chartData.push(
      existing ?? {
        bulan,
        pangkep: 0,
        makassar: 0,
        pinrang: 0,
        kendari: 0,
        toraja: 0,
        masamba: 0,
      }
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">Produksi Bulanan</h3>
        </div>
        <div className="card-body h-[350px] flex items-center justify-center">
          <p className="text-sm text-gray-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-base font-semibold text-gray-900">
          Produksi Bulanan {year}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Volume produksi per bulan — s.d. {MONTH_NAMES[month]} {year}
        </p>
      </div>
      <div className="card-body">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="bulan"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                label={{
                  value: "m³",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#94a3b8" },
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              {filteredPlants.map((plant) => (
                <Bar
                  key={plant.key}
                  dataKey={plant.key}
                  name={plant.label}
                  fill={plant.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
