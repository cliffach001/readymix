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
import { fetchProduksiHarian } from "@/lib/supabase-service";
import type { ProduksiHarianRow } from "@/lib/supabase-service";

const COLORS = [
  "#FF6600", // orange (brand)
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
];

const PLANTS = [
  { key: "pangkep", label: "Pangkep", color: COLORS[0] },
  { key: "makassar", label: "Makassar", color: COLORS[1] },
  { key: "pinrang", label: "Pinrang", color: COLORS[2] },
  { key: "kendari", label: "Kendari", color: COLORS[3] },
  { key: "toraja", label: "Toraja", color: COLORS[4] },
  { key: "masamba", label: "Masamba", color: COLORS[5] },
];

export default function ProduksiHarianChart() {
  const [data, setData] = useState<ProduksiHarianRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduksiHarian()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          Volume produksi 14 hari terakhir (m³)
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
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              {PLANTS.map((plant) => (
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
