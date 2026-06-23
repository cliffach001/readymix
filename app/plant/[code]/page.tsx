"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchPlants,
  fetchInputData,
  fetchPlantMonthlyProduction,
  fetchLaporanMingguan,
  createInputData,
} from "@/lib/supabase-service";
import type { PlantRow, InputDataRecord } from "@/lib/supabase-service";
import type { LaporanMingguan } from "@/lib/data";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ArrowLeft, Calendar, Package, DollarSign, Plus, X, Save, RotateCcw } from "lucide-react";

function formatCurrency(val: number) {
  return val.toLocaleString("id-ID");
}

export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plantCode = params?.code as string;

  const [plant, setPlant] = useState<PlantRow | null>(null);
  const [inputData, setInputData] = useState<InputDataRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ bulan: string; tahun: number; volume: number }[]>([]);
  const [weeklyData, setWeeklyData] = useState<LaporanMingguan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Modal Input Data ──
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    namaPelanggan: "",
    uraianPekerjaan: "",
    type: "",
    volume: "",
    hargaSatuan: "",
    sewaCP: "0",
  });

  const loadData = useCallback(() => {
    if (!plantCode) return;
    setLoading(true);
    setError("");

    Promise.all([
      fetchPlants(),
      fetchInputData(plantCode),
      fetchPlantMonthlyProduction(plantCode),
      fetchLaporanMingguan(plantCode).catch(() => [] as LaporanMingguan[]),
    ])
      .then(([plants, input, monthly, weekly]) => {
        const found = plants.find((p) => p.id === plantCode);
        if (!found) {
          setError("Plant tidak ditemukan");
          return;
        }
        setPlant(found);
        setInputData(input);
        setMonthlyData(monthly);
        setWeeklyData(weekly);
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal memuat data plant");
      })
      .finally(() => setLoading(false));
  }, [plantCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setForm({
      tanggal: new Date().toISOString().split("T")[0],
      namaPelanggan: "",
      uraianPekerjaan: "",
      type: "",
      volume: "",
      hargaSatuan: "",
      sewaCP: "0",
    });
  };

  const handleSubmit = async () => {
    if (!form.tanggal || !form.namaPelanggan || !form.uraianPekerjaan || !form.volume || !form.hargaSatuan) {
      alert("Harap isi semua field yang wajib");
      return;
    }
    const vol = parseFloat(form.volume) || 0;
    const hs = parseFloat(form.hargaSatuan) || 0;
    const scp = parseFloat(form.sewaCP) || 0;
    if (vol <= 0 || hs <= 0) {
      alert("Volume dan Harga Satuan harus lebih dari 0");
      return;
    }
    setSaving(true);
    try {
      await createInputData({
        plant_code: plantCode,
        tanggal: form.tanggal,
        nama_pelanggan: form.namaPelanggan,
        uraian_pekerjaan: form.uraianPekerjaan,
        type: form.type,
        volume: vol,
        harga_satuan: hs,
        jumlah_harga: vol * hs,
        sewa_cp: scp,
        total_harga: vol * hs + scp,
      });
      resetForm();
      setShowModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Loading ──
  if (loading) {
    return (
      <ProtectedRoute route="dashboard">
        <div className="p-6 space-y-6">
          <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </ProtectedRoute>
    );
  }

  // ── Error ──
  if (error || !plant) {
    return (
      <ProtectedRoute route="dashboard">
        <div className="p-6">
          <div className="card p-8 text-center">
            <p className="text-gray-400">{error || "Plant tidak ditemukan"}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6600] text-white text-sm font-medium hover:bg-orange-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const totalVolume = inputData.reduce((sum, d) => sum + d.volume, 0);
  const totalHarga = inputData.reduce((sum, d) => sum + d.total_harga, 0);
  const totalVolumeMonthly = monthlyData.reduce((sum, d) => sum + d.volume, 0);
  const totalTransaksi = inputData.length;

  return (
    <ProtectedRoute route="dashboard">
      <div className="p-4 sm:p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{plant.icon}</span>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {plant.nama}
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 ml-1">
              {plant.lokasi}
            </p>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="card p-4 sm:p-5 flex items-center gap-3 border-l-4 border-l-[#FF6600]">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[#FF6600]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total Volume</p>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                {totalVolume.toLocaleString("id-ID")} m³
              </p>
              <p className="text-[10px] text-gray-400">{totalTransaksi} transaksi</p>
            </div>
          </div>
          <div className="card p-4 sm:p-5 flex items-center gap-3 border-l-4 border-l-emerald-500">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Total Harga</p>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                Rp {formatCurrency(totalHarga)}
              </p>
              <p className="text-[10px] text-gray-400">keseluruhan</p>
            </div>
          </div>
          <div className="card p-4 sm:p-5 flex items-center gap-3 border-l-4 border-l-blue-500">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Produksi Bulanan</p>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                {totalVolumeMonthly.toLocaleString("id-ID")} m³
              </p>
              <p className="text-[10px] text-gray-400">{monthlyData.length} bulan</p>
            </div>
          </div>
        </div>

        {/* ── Tabel Data Inputan ── */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Data Penjualan
              </h3>
              <p className="text-xs text-gray-500">
                {inputData.length} transaksi
              </p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FF6600] text-white text-xs sm:text-sm font-medium hover:bg-orange-700 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Input Data</span>
            </button>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Tanggal</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Pelanggan</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Pekerjaan</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Type</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Vol (m³)</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Harga Satuan</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Jumlah Harga</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Sewa CP</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {inputData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      Belum ada data penjualan
                    </td>
                  </tr>
                ) : (
                  inputData.map((row, i) => {
                    const tgl = new Date(row.tanggal + "T00:00:00");
                    const formatted = tgl.toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                          i === 0 ? "bg-orange-50/40" : ""
                        }`}
                      >
                        <td className="px-2 sm:px-4 py-3 text-gray-900 font-medium whitespace-nowrap text-xs sm:text-sm">
                          {formatted}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-gray-700 whitespace-nowrap text-xs sm:text-sm max-w-[120px] sm:max-w-[200px] truncate">
                          {row.nama_pelanggan}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-gray-600 whitespace-nowrap text-xs sm:text-sm max-w-[100px] sm:max-w-[180px] truncate">
                          {row.uraian_pekerjaan}
                        </td>
                        <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm">
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-gray-100 text-gray-600">
                            {row.type || "-"}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {row.volume.toLocaleString("id-ID")}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {formatCurrency(row.harga_satuan)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {formatCurrency(row.jumlah_harga)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {row.sewa_cp > 0 ? formatCurrency(row.sewa_cp) : "-"}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {formatCurrency(row.total_harga)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tabel Produksi Bulanan ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900">
              Produksi Bulanan
            </h3>
            <p className="text-xs text-gray-500">Tahun 2026</p>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Bulan</th>
                  <th className="text-right px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Volume (m³)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                      Belum ada data produksi bulanan
                    </td>
                  </tr>
                ) : (
                  monthlyData.map((row, i) => (
                    <tr
                      key={`${row.bulan}-${row.tahun}`}
                      className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${
                        i === monthlyData.length - 1 ? "bg-emerald-50/50" : ""
                      }`}
                    >
                      <td className="px-3 sm:px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                        {row.bulan} {row.tahun}
                        {i === monthlyData.length - 1 && (
                          <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">
                            Terakhir
                          </span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        {row.volume.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tabel Laporan Mingguan ── */}
        {weeklyData.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-base font-semibold text-gray-900">
                Laporan Mingguan
              </h3>
              <p className="text-xs text-gray-500">Minggu III (16-22 Juni 2026)</p>
            </div>
            <div className="card-body p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-2 sm:px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Hari</th>
                    <th className="text-right px-2 sm:px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Shift 1</th>
                    <th className="text-right px-2 sm:px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Shift 2</th>
                    <th className="text-right px-2 sm:px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Shift 3</th>
                    <th className="text-right px-2 sm:px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Total</th>
                    <th className="text-left px-2 sm:px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Ket.</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((row) => (
                    <tr
                      key={row.hari}
                      className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-2 sm:px-3 py-3 font-medium text-gray-900 whitespace-nowrap text-xs sm:text-sm">{row.hari}</td>
                      <td className="px-2 sm:px-3 py-3 text-right tabular-nums whitespace-nowrap text-xs sm:text-sm">{row.shift1.toLocaleString("id-ID")}</td>
                      <td className="px-2 sm:px-3 py-3 text-right tabular-nums whitespace-nowrap text-xs sm:text-sm">{row.shift2.toLocaleString("id-ID")}</td>
                      <td className="px-2 sm:px-3 py-3 text-right tabular-nums whitespace-nowrap text-xs sm:text-sm">{row.shift3.toLocaleString("id-ID")}</td>
                      <td className="px-2 sm:px-3 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">{row.total.toLocaleString("id-ID")}</td>
                      <td className="px-2 sm:px-3 py-3 text-gray-500 text-[11px] sm:text-xs max-w-[100px] truncate">{row.keterangan || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Input Data ── */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  Input Data — {plant?.nama.replace("Ready Mix ", "")}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                className="p-5 space-y-4"
              >
                {/* Tanggal + Pelanggan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal <span className="text-red-500">*</span></label>
                    <input type="date" value={form.tanggal} onChange={(e) => updateForm("tanggal", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Pelanggan <span className="text-red-500">*</span></label>
                    <input type="text" value={form.namaPelanggan} onChange={(e) => updateForm("namaPelanggan", e.target.value)}
                      placeholder="Cth: PT. ABC Mandiri"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]" required />
                  </div>
                </div>

                {/* Uraian Pekerjaan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uraian Pekerjaan <span className="text-red-500">*</span></label>
                  <textarea value={form.uraianPekerjaan} onChange={(e) => updateForm("uraianPekerjaan", e.target.value)}
                    placeholder="Cth: Pengecoran Jalan Taman Sari" rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] resize-none" required />
                </div>

                {/* Type + Volume + Harga Satuan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select value={form.type} onChange={(e) => updateForm("type", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] bg-white">
                      <option value="">-- Pilih --</option>
                      <option value="Ready Mix K225">K225</option>
                      <option value="Ready Mix K250">K250</option>
                      <option value="Ready Mix K300">K300</option>
                      <option value="Ready Mix K350">K350</option>
                      <option value="Ready Mix K400">K400</option>
                      <option value="Ready Mix K450">K450</option>
                      <option value="Ready Mix K500">K500</option>
                      <option value="Beton Mass">Beton Mass</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume (m³) <span className="text-red-500">*</span></label>
                    <input type="number" value={form.volume} onChange={(e) => updateForm("volume", e.target.value)}
                      placeholder="0" min="0" step="0.01"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harga Satuan (Rp) <span className="text-red-500">*</span></label>
                    <input type="number" value={form.hargaSatuan} onChange={(e) => updateForm("hargaSatuan", e.target.value)}
                      placeholder="0" min="0" step="100"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]" required />
                  </div>
                </div>

                {/* Sewa CP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sewa CP / Pompa (Rp)</label>
                  <input type="number" value={form.sewaCP} onChange={(e) => updateForm("sewaCP", e.target.value)}
                    placeholder="0" min="0" step="1000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]" />
                </div>

                {/* Kalkulasi */}
                {(parseFloat(form.volume) || 0) > 0 && (parseFloat(form.hargaSatuan) || 0) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kalkulasi</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] text-gray-500">Jumlah Harga</p>
                        <p className="text-sm font-bold text-[#FF6600]">Rp {formatCurrency((parseFloat(form.volume) || 0) * (parseFloat(form.hargaSatuan) || 0))}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] text-gray-500">Sewa CP</p>
                        <p className="text-sm font-bold text-emerald-600">Rp {formatCurrency(parseFloat(form.sewaCP) || 0)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border-2 border-[#FF6600]/20 bg-[#FF6600]/5 col-span-2 sm:col-span-1">
                        <p className="text-[10px] text-gray-500">Total</p>
                        <p className="text-sm font-bold text-gray-900">
                          Rp {formatCurrency(((parseFloat(form.volume) || 0) * (parseFloat(form.hargaSatuan) || 0)) + (parseFloat(form.sewaCP) || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6600] text-white text-sm font-medium rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50 shadow-sm">
                    <Save className="w-4 h-4" />
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                  <button type="button" onClick={() => { resetForm(); setShowModal(false); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                    <RotateCcw className="w-4 h-4" />
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </ProtectedRoute>
  );
}
