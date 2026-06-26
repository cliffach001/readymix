"use client";

import { useState, useEffect } from "react";
import {
  fetchRKAPRecords,
  createRKAPRecord,
  updateRKAPRecord,
  deleteRKAPRecord,
  fetchRealisasiBulanan,
  fetchPlants,
} from "@/lib/supabase-service";
import type { RKAPRecord, RealisasiBulanan, PlantRow } from "@/lib/supabase-service";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Plus, Pencil, Trash2, X, Check, Factory } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

function formatCurrency(val: number) {
  return val.toLocaleString("id-ID");
}

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

export default function RKAPPage() {
  const { user } = useAuth();
  const isMarketing = user?.role === "marketing";
  const isAdmin = user?.role === "admin";
  const unitKerja = user?.unitKerja;
  const [records, setRecords] = useState<RKAPRecord[]>([]);
  const [realisasi, setRealisasi] = useState<RealisasiBulanan[]>([]);
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterTahun, setFilterTahun] = useState(String(CURRENT_YEAR));
  const [filterPlant, setFilterPlant] = useState(unitKerja || "kendari");

  // Form state
  const [formPlant, setFormPlant] = useState("");
  const [formTahun, setFormTahun] = useState(String(CURRENT_YEAR));
  const [formBulan, setFormBulan] = useState("1");
  const [formTarget, setFormTarget] = useState("");

  const loadData = () => {
    Promise.all([fetchRKAPRecords(), fetchRealisasiBulanan(), fetchPlants()])
      .then(([recs, real, plnts]) => {
        setRecords(recs);
        setRealisasi(real);
        setPlants(isMarketing && unitKerja ? plnts.filter((p) => p.id === unitKerja) : plnts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormPlant("");
    setFormTahun(String(CURRENT_YEAR));
    setFormBulan("1");
    setFormTarget("");
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (rec: RKAPRecord) => {
    setFormPlant(rec.plant_code);
    setFormTahun(String(rec.tahun));
    setFormBulan(String(rec.bulan));
    setFormTarget(String(rec.target));
    setEditingId(rec.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlant) return alert("Pilih plant");
    if (!formTahun) return alert("Isi tahun");
    if (!formBulan) return alert("Pilih bulan");
    if (formTarget === "" || isNaN(parseFloat(formTarget)) || parseFloat(formTarget) < 0) return alert("Target harus diisi");

    const duplikat = records.find(
      (r) =>
        r.plant_code === formPlant &&
        r.tahun === parseInt(formTahun) &&
        r.bulan === parseInt(formBulan) &&
        r.id !== editingId
    );
    if (duplikat) return alert("Data untuk plant, tahun, dan bulan tersebut sudah ada");

    setSaving(true);
    try {
      if (editingId) {
        await updateRKAPRecord(editingId, {
          plant_code: formPlant,
          tahun: parseInt(formTahun),
          bulan: parseInt(formBulan),
          target: parseFloat(formTarget),
        });
      } else {
        await createRKAPRecord({
          plant_code: formPlant,
          tahun: parseInt(formTahun),
          bulan: parseInt(formBulan),
          target: parseFloat(formTarget),
        });
      }
      resetForm();
      loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, info: string) => {
    if (!confirm(`Yakin ingin menghapus RKAP untuk ${info}?`)) return;
    try {
      await deleteRKAPRecord(id);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus data");
    }
  };

  const getPlantName = (code: string) =>
    plants.find((p) => p.id === code)?.nama ?? code;

  const getPlantIcon = (code: string) =>
    plants.find((p) => p.id === code)?.icon ?? "🏭";

  const getBulanLabel = (num: number) =>
    MONTHS.find((m) => m.num === num)?.label ?? `Bulan ${num}`;

  // Filter by year
  const filteredRecords = records.filter((r) => String(r.tahun) === filterTahun);

  // Group by plant
  const plantsWithData = plants
    .map((p) => {
      const plantRecords = filteredRecords.filter((r) => r.plant_code === p.id);
      if (plantRecords.length === 0) return null;
      // sort by bulan
      plantRecords.sort((a, b) => a.bulan - b.bulan);

      const totalTarget = plantRecords.reduce((s, r) => s + r.target, 0);
      const plantRealisasi = realisasi
        .filter((r) => r.plant_code === p.id && String(r.tahun) === filterTahun)
        .reduce((s, r) => s + r.volume, 0);
      const persentase =
        totalTarget > 0
          ? Math.round((plantRealisasi / totalTarget) * 100 * 10) / 10
          : 0;

      return {
        plant: p,
        records: plantRecords,
        totalTarget,
        plantRealisasi,
        persentase,
      };
    })
    .filter(Boolean);

  // Tahun tersedia
  const availableYears = Array.from(new Set(records.map((r) => r.tahun))).sort(
    (a, b) => b - a
  );

  // Cari realisasi per bulan untuk suatu plant
  const getRealisasi = (plantCode: string, tahun: number, bulan: number) => {
    const r = realisasi.find(
      (re) =>
        re.plant_code === plantCode && re.tahun === tahun && re.bulan === bulan
    );
    return r?.volume ?? 0;
  };

  return (
    <ProtectedRoute route="rkap">
      <div className="p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              RKAP — Rencana Kerja & Anggaran Perusahaan
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Target & realisasi produksi bulanan per plant
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
            >
              {availableYears.length > 0
                ? availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))
                : <option value={CURRENT_YEAR}>{CURRENT_YEAR}</option>}
            </select>
            {isAdmin && (
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F35b04] text-white text-sm font-medium hover:bg-orange-700 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Tambah Data
              </button>
            )}
          </div>
        </div>

        {/* ── Stat Cards ── */}
        {!loading && plantsWithData.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="card p-2 sm:p-4 flex items-center gap-2 sm:gap-3 border-l-4 border-l-[#F35b04] min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-sm sm:text-lg">
                🎯
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Total Target</p>
                <p className="text-xs sm:text-lg font-bold text-gray-900 truncate">
                  {plantsWithData.reduce((s, p) => s + p!.totalTarget, 0).toLocaleString("id-ID")} m³
                </p>
              </div>
            </div>
            <div className="card p-2 sm:p-4 flex items-center gap-2 sm:gap-3 border-l-4 border-l-emerald-500 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-sm sm:text-lg">
                📊
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Total Realisasi</p>
                <p className="text-xs sm:text-lg font-bold text-gray-900 truncate">
                  {plantsWithData.reduce((s, p) => s + p!.plantRealisasi, 0).toLocaleString("id-ID")} m³
                </p>
              </div>
            </div>
            <div className="card p-2 sm:p-4 flex items-center gap-2 sm:gap-3 border-l-4 border-l-[#F35b04] min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 text-sm sm:text-lg">
                📈
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">Pencapaian</p>
                <p className="text-xs sm:text-lg font-bold text-gray-900 truncate">
                  {(() => {
                    const totalT = plantsWithData.reduce((s, p) => s + p!.totalTarget, 0);
                    const totalR = plantsWithData.reduce((s, p) => s + p!.plantRealisasi, 0);
                    return totalT > 0
                      ? Math.round((totalR / totalT) * 100 * 10) / 10
                      : 0;
                  })()}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabel Tahunan ── */}
        {!loading && plantsWithData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-base font-semibold text-gray-900">
                Target & Realisasi Tahunan {filterTahun}
              </h3>
              <p className="text-xs text-gray-500">
                Rekapitulasi tahunan per plant
              </p>
            </div>
            <div className="card-body p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Plant</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Target (m³)</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Realisasi (m³)</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">% Capaian</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Sisa (m³)</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plantsWithData.map((ps) => {
                    const isTercapai = ps!.persentase >= 100;
                    const sisa = Math.max(0, ps!.totalTarget - ps!.plantRealisasi);
                    return (
                      <tr
                        key={ps!.plant.id}
                        className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                          isTercapai ? "bg-emerald-50/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span>{ps!.plant.icon}</span>
                            <span className="font-medium text-gray-900">
                              {ps!.plant.nama.replace("Ready Mix ", "")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                          {ps!.totalTarget.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                          {ps!.plantRealisasi.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              isTercapai
                                ? "bg-emerald-100 text-emerald-700"
                                : ps!.persentase >= 50
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {ps!.persentase}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                          {isTercapai ? "0" : sisa.toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isTercapai ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              ✓ Tercapai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                              ◐ Dalam Proses
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-4 py-3 font-bold text-gray-800">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                      {plantsWithData
                        .reduce((s, p) => s + p!.totalTarget, 0)
                        .toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                      {plantsWithData
                        .reduce((s, p) => s + p!.plantRealisasi, 0)
                        .toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      {(() => {
                        const totalT = plantsWithData.reduce((s, p) => s + p!.totalTarget, 0);
                        const totalR = plantsWithData.reduce((s, p) => s + p!.plantRealisasi, 0);
                        return totalT > 0
                          ? Math.round((totalR / totalT) * 100 * 10) / 10 + "%"
                          : "0%";
                      })()}
                    </td>
                    <td colSpan={2} className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Filter Plant (Button Group) ── */}
        {!loading && plantsWithData.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {plantsWithData.map((ps) => (
              <button
                key={ps!.plant.id}
                onClick={() => setFilterPlant(ps!.plant.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filterPlant === ps!.plant.id
                    ? "bg-[#F35b04] text-white shadow-sm shadow-orange-200"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                <Factory className="w-3.5 h-3.5 text-current opacity-60" strokeWidth={1.5} />
                <span>{ps!.plant.nama.replace("Ready Mix ", "")}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filtered plants */}
        {(() => {
          // Fallback ke plant pertama jika plant terpilih tidak punya data
          const displayed = plantsWithData.filter((ps) => ps!.plant.id === filterPlant);
          const finalDisplay = displayed.length > 0 ? displayed : plantsWithData.slice(0, 1);

          if (finalDisplay.length === 0) {
            return (
              <div className="card p-8 text-center text-sm text-gray-400">
                {records.length === 0
                  ? "Belum ada data RKAP. Klik 'Tambah Data' untuk memulai."
                  : `Belum ada data RKAP untuk tahun ${filterTahun}.`}
              </div>
            );
          }

          return finalDisplay.map((ps) => {
            const isTercapaiTahunan = ps!.persentase >= 100;
            return (
              <div key={ps!.plant.id} className="card">
                <div className="card-header flex items-center gap-3">
                  <span className="text-xl">{ps!.plant.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900">
                      {ps!.plant.nama.replace("Ready Mix ", "")}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Target: {ps!.totalTarget.toLocaleString("id-ID")} m³ · Realisasi:{" "}
                      {ps!.plantRealisasi.toLocaleString("id-ID")} m³ · Capaian:{" "}
                      <span
                        className={`font-semibold ${
                          isTercapaiTahunan ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        {ps!.persentase}%
                      </span>
                    </p>
                  </div>
                </div>
                <div className="card-body p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Bulan</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Target</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Realisasi</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">%</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Sisa</th>
                        {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {ps!.records.map((rec) => {
                        const volRealisasi = getRealisasi(
                          rec.plant_code,
                          rec.tahun,
                          rec.bulan
                        );
                        const pct =
                          rec.target > 0
                            ? Math.round((volRealisasi / rec.target) * 100 * 10) / 10
                            : 0;
                        const tercapai = volRealisasi >= rec.target;
                        const sisa = Math.max(0, rec.target - volRealisasi);

                        return (
                          <tr
                            key={rec.id}
                            className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                              tercapai ? "bg-emerald-50/30" : ""
                            }`}
                          >
                            <td className="px-4 py-3 text-gray-900 font-medium">
                              {getBulanLabel(rec.bulan)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                              {rec.target.toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-900">
                              {volRealisasi.toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  tercapai
                                    ? "bg-emerald-100 text-emerald-700"
                                    : pct >= 50
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {pct}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                              {tercapai ? (
                                <span className="text-emerald-600 text-xs font-medium">
                                  ✓
                                </span>
                              ) : (
                                sisa.toLocaleString("id-ID")
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => openEdit(rec)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                    title="Edit"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDelete(
                                        rec.id,
                                        `${ps!.plant.nama.replace("Ready Mix ", "")} ${getBulanLabel(rec.bulan)} ${rec.tahun}`
                                      )
                                    }
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="px-4 py-3 font-bold text-gray-800 text-xs uppercase">
                          Total
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                          {ps!.records
                            .reduce((s, r) => s + r.target, 0)
                            .toLocaleString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">
                          {ps!.records
                            .reduce(
                              (s, r) =>
                                s +
                                getRealisasi(r.plant_code, r.tahun, r.bulan),
                              0
                            )
                            .toLocaleString("id-ID")}
                        </td>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right font-bold text-gray-800"
                        >
                          {ps!.persentase >= 100 ? (
                            <span className="text-emerald-600">✓ Tercapai</span>
                          ) : (
                            <span className="text-amber-600">
                              {ps!.persentase}% — sisa{" "}
                              {Math.max(
                                0,
                                ps!.totalTarget - ps!.plantRealisasi
                              ).toLocaleString("id-ID")}{" "}
                              m³
                            </span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          });
        })()}

        {/* ── Form Modal ── */}
        {showForm && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={resetForm}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? "Edit RKAP Bulanan" : "Tambah RKAP Bulanan"}
                  </h2>
                  <button
                    onClick={resetForm}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plant <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formPlant}
                        onChange={(e) => setFormPlant(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] bg-white"
                        required
                      >
                        <option value="">-- Pilih Plant --</option>
                        {plants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.icon} {p.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tahun <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formTahun}
                        onChange={(e) => setFormTahun(e.target.value)}
                        min={2020}
                        max={2050}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bulan <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formBulan}
                        onChange={(e) => setFormBulan(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] bg-white"
                        required
                      >
                        {MONTHS.map((m) => (
                          <option key={m.num} value={m.num}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target (m³) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formTarget}
                        onChange={(e) => setFormTarget(e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="Contoh: 15000.50"
                        onKeyDown={(e) => {
                          if (e.key === "-" || e.key === "e") e.preventDefault();
                        }}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F35b04] text-white text-sm font-medium hover:bg-orange-700 transition-all disabled:opacity-50 shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
