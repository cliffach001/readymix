"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchPlants,
  fetchInputData,
  fetchPlantMonthlyAggregation,
  createInputData,
  updateInputData,
  deleteInputData,
  createApprovalRequest,
} from "@/lib/supabase-service";
import type { PlantRow, InputDataRecord, AggregatedRow } from "@/lib/supabase-service";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calendar, Package, DollarSign, Plus, X, Save, RotateCcw, Pencil, Trash2 } from "lucide-react";

function formatCurrency(val: number) {
  return val.toLocaleString("id-ID");
}

export default function PlantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const plantCode = params?.code as string;

  const { user } = useAuth();
  const isMarketing = user?.role === "marketing";
  const isAdmin = user?.role === "admin";
  const [plant, setPlant] = useState<PlantRow | null>(null);
  const [inputData, setInputData] = useState<InputDataRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<AggregatedRow[]>([]);
  const [editingInputId, setEditingInputId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

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
    keterangan: "",
  });

  const loadData = useCallback(() => {
    if (!plantCode) return;
    setLoading(true);
    setError("");

    Promise.all([
      fetchPlants(),
      fetchInputData(plantCode),
      fetchPlantMonthlyAggregation(plantCode),
    ])
      .then(([plants, input, monthly]) => {
        const found = plants.find((p) => p.id === plantCode);
        if (!found) {
          setError("Plant tidak ditemukan");
          return;
        }
        // Cegah marketing akses plant lain
        if (isMarketing && user?.unitKerja && user.unitKerja !== plantCode) {
          setError("Akses ditolak: Anda hanya dapat mengakses plant " + user.unitKerja);
          return;
        }
        setPlant(found);
        setInputData(input);
        setMonthlyData(monthly);
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
      keterangan: "",
    });
    setEditingInputId(null);
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
    const payload = {
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
      keterangan: form.keterangan,
    };
    try {
      if (editingInputId) {
        if (!isAdmin) {
          if (isMarketing) {
            // Marketing → buat approval request
            const original = inputData.find((r) => r.id === editingInputId);
            await createApprovalRequest({
              action_type: "edit",
              table_name: "input_data",
              record_id: editingInputId,
              plant_code: plantCode,
              requested_by: user?.namaLengkap || "Unknown",
              status: "pending",
              original_data: original as any,
              new_data: payload as any,
              notes: "",
            });
            alert("Permintaan perubahan telah dikirim ke Admin untuk disetujui");
          } else {
            alert("Anda tidak memiliki izin untuk mengubah data");
            resetForm();
            setShowModal(false);
            return;
          }
        } else {
          await updateInputData(editingInputId, payload);
        }
      } else {
        if (!isAdmin) {
          alert("Anda tidak memiliki izin untuk menambahkan data");
          resetForm();
          setShowModal(false);
          return;
        }
        await createInputData(payload as any);
      }
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

  const openEditInput = (row: InputDataRecord) => {
    setForm({
      tanggal: row.tanggal,
      namaPelanggan: row.nama_pelanggan,
      uraianPekerjaan: row.uraian_pekerjaan,
      type: row.type,
      volume: String(row.volume),
      hargaSatuan: String(row.harga_satuan),
      sewaCP: String(row.sewa_cp),
      keterangan: row.keterangan ?? "",
    });
    setEditingInputId(row.id);
    setShowModal(true);
  };

  const handleDeleteInput = async (id: string, pelanggan: string) => {
    if (!confirm(`Yakin ingin menghapus transaksi "${pelanggan}"?`)) return;
    if (!isAdmin) {
      if (isMarketing) {
        try {
        const original = inputData.find((r) => r.id === id);
        await createApprovalRequest({
          action_type: "delete",
          table_name: "input_data",
          record_id: id,
          plant_code: plantCode,
          requested_by: user?.namaLengkap || "Unknown",
          status: "pending",
          original_data: original as any,
          new_data: null,
          notes: "",
        });
        alert("Permintaan penghapusan telah dikirim ke Manager/Admin untuk disetujui");
        loadData();
      } catch (e) {
        console.error(e);
        alert("Gagal mengirim permintaan penghapusan");
      }
      return;
    } else {
      alert("Anda tidak memiliki izin untuk menghapus data");
      return;
    }
    }
    try {
      await deleteInputData(id);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus data");
    }
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

  // Search & Pagination
  const searchLower = searchTerm.toLowerCase();
  const filteredData = inputData.filter(
    (row) =>
      row.nama_pelanggan.toLowerCase().includes(searchLower) ||
      row.uraian_pekerjaan.toLowerCase().includes(searchLower) ||
      (row.type || "").toLowerCase().includes(searchLower)
  );
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ITEMS_PER_PAGE));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const startRow = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endRow = Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length);

  // ── Total dari hasil pencarian ──
  const filteredVolume = filteredData.reduce((sum, d) => sum + d.volume, 0);
  const filteredJumlahHarga = filteredData.reduce((sum, d) => sum + d.jumlah_harga, 0);
  const filteredSewaCP = filteredData.reduce((sum, d) => sum + d.sewa_cp, 0);
  const filteredTotal = filteredData.reduce((sum, d) => sum + d.total_harga, 0);

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
          <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Data Penjualan
              </h3>
              <p className="text-xs text-gray-500">
                {filteredData.length} transaksi{searchTerm ? ` (filter dari ${inputData.length})` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Cari pelanggan, pekerjaan, type..."
                  className="w-48 sm:w-56 px-3 py-2 pl-8 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]"
                />
                <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {(isAdmin || isMarketing) && (
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
              )}
            </div>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Tanggal</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Pelanggan</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Pekerjaan</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Type</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs hidden md:table-cell">Keterangan</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Vol (m³)</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Harga Satuan</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Jumlah Harga</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Sewa CP</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Total</th>
                  {(isAdmin || isMarketing) && <th className="text-center px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin || isMarketing ? 11 : 10} className="px-4 py-8 text-center text-gray-400">
                      {searchTerm ? "Pencarian tidak ditemukan" : "Belum ada data penjualan"}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, i) => {
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
                        <td className="px-2 sm:px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate hidden md:table-cell">
                          {row.keterangan || "—"}
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
                        {(isAdmin || isMarketing) && (
                          <td className="px-2 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEditInput(row)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteInput(row.id, row.nama_pelanggan)}
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
                  })
                )}
              </tbody>
              {searchTerm.length > 0 && filteredData.length > 0 && (
                <tfoot>
                  <tr className="bg-orange-50 border-t-2 border-[#FF6600]/30">
                    <td colSpan={5} className="px-2 sm:px-4 py-3 text-gray-900 font-bold whitespace-nowrap text-xs sm:text-sm">
                      Total Pencarian
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                      {filteredVolume.toLocaleString("id-ID")}
                    </td>
                    <td className="px-2 sm:px-4 py-3"></td>
                    <td className="px-2 sm:px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                      {formatCurrency(filteredJumlahHarga)}
                    </td>
                    <td className={`px-2 sm:px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap text-xs sm:text-sm ${filteredSewaCP > 0 ? "text-gray-900" : "text-gray-400"}`}>
                      {filteredSewaCP > 0 ? formatCurrency(filteredSewaCP) : "-"}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-right font-bold text-[#FF6600] tabular-nums whitespace-nowrap text-xs sm:text-sm">
                      {formatCurrency(filteredTotal)}
                    </td>
                    {(isAdmin || isMarketing) && <td className="px-2 sm:px-4 py-3"></td>}
                  </tr>
                </tfoot>
              )}
            </table>
            {/* Pagination */}
            {filteredData.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {startRow}–{endRow} dari {filteredData.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const startPage = Math.max(1, currentPage - 2);
                    const page = startPage + i;
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          page === currentPage
                            ? "bg-[#FF6600] text-white border-[#FF6600]"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Tabel Produksi Bulanan (dari input_data) ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-base font-semibold text-gray-900">
              Produksi Bulanan
            </h3>
            <p className="text-xs text-gray-500">
              {monthlyData.length > 0
                ? `Tahun ${monthlyData[monthlyData.length - 1].tahun}`
                : "Tahun " + new Date().getFullYear()}
            </p>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Bulan</th>
                  <th className="text-right px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Volume (m³)</th>
                  <th className="text-right px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Jumlah Harga</th>
                  <th className="text-right px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Sewa CP</th>
                  <th className="text-right px-3 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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
                      <td className="px-3 sm:px-4 py-3 text-right tabular-nums whitespace-nowrap text-gray-900">
                        Rp {formatCurrency(row.jumlah_harga)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right tabular-nums whitespace-nowrap text-gray-600">
                        {row.sewa_cp > 0 ? `Rp ${formatCurrency(row.sewa_cp)}` : "-"}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                        Rp {formatCurrency(row.total_harga)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthlyData.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-3 sm:px-4 py-3 font-bold text-gray-900 whitespace-nowrap">Total</td>
                    <td className="px-3 sm:px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      {monthlyData.reduce((s, r) => s + r.volume, 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      Rp {formatCurrency(monthlyData.reduce((s, r) => s + r.jumlah_harga, 0))}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      Rp {formatCurrency(monthlyData.reduce((s, r) => s + r.sewa_cp, 0))}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-right font-bold text-gray-900 tabular-nums whitespace-nowrap">
                      Rp {formatCurrency(monthlyData.reduce((s, r) => s + r.total_harga, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

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
                  {editingInputId ? "Edit Data — " : "Input Data — "}{plant?.nama.replace("Ready Mix ", "")}
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
                    <input type="text" value={form.type} onChange={(e) => updateForm("type", e.target.value)}
                      placeholder="Cth: K300, FC-25, dll"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600]" />
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

                {/* Keterangan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                  <textarea value={form.keterangan} onChange={(e) => updateForm("keterangan", e.target.value)}
                    placeholder="Cth: Pembayaran termin 1, Catatan khusus, dll" rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6600]/20 focus:border-[#FF6600] resize-none" />
                </div>

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
