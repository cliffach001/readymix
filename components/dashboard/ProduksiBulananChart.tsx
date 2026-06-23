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
import { fetchProduksiBulanan } from "@/lib/supabase-service";
import type { ProduksiBulananRow } from "@/lib/supabase-service";

const COLORS = [
  "#FF6600",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

const PLANTS = [
  { key: "pangkep", label: "Pangkep", color: COLORS[0] },
  { key: "makassar", label: "Makassar", color: COLORS[1] },
  { key: "pinrang", label: "Pinrang", color: COLORS[2] },
  { key: "kendari", label: "Kendari", color: COLORS[3] },
  { key: "toraja", label: "Toraja", color: COLORS[4] },
  { key: "masamba", label: "Masamba", color: COLORS[5] },
];

export default function ProduksiBulananChart() {
  const [data, setData] = useState<ProduksiBulananRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduksiBulanan()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          Produksi Bulanan
        </h3>
        <p className="text-sm text-gray-500 mt-0.5">
          Volume produksi per bulan (m³)
        </p>
      </div>
      <div className="card-body">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
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
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              {PLANTS.map((plant) => (
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
