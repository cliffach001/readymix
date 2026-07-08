"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchInputHarianBulanan } from "@/lib/supabase-service";
import type { ProduksiHarianRow } from "@/lib/supabase-service";
import { filterPlants } from "@/lib/dashboard-constants";
import { logger } from "@/lib/logger";

interface Props {
  month: number;
  year: number;
  plantCode?: string;
}

export default function ProduksiHarianChart({ month, year, plantCode }: Props) {
  const [data, setData] = useState<ProduksiHarianRow[]>([]);
  const [loading, setLoading] = useState(true);

  const filteredPlants = filterPlants(plantCode);

  useEffect(() => {
    setLoading(true);
    fetchInputHarianBulanan(month, year)
      .then(setData)
      .catch((err) => logger.error("Gagal memuat produksi harian", { tag: "Dashboard" }))
      .finally(() => setLoading(false));
  }, [month, year]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-base font-semibold text-gray-900">Produksi Harian</h3>
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
          Produksi Harian
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Volume produksi per hari —{" "}
          {data.length > 0
            ? `${data[0].tanggal} s.d. ${data[data.length - 1].tanggal}`
            : `${String(month).padStart(2, "0")}/${year}`}
        </p>
      </div>
      <div className="card-body">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="tanggal"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                tickFormatter={(val) => val.split("-").pop()?.replace(/^0/, "") ?? ""}
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
                <Line
                  key={plant.key}
                  type="monotone"
                  dataKey={plant.key}
                  name={plant.label}
                  stroke={plant.color}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 2 }}
                  activeDot={{ r: 5, strokeWidth: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
