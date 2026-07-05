"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  fetchPlants,
  fetchInputData,
  fetchPlantMonthlyAggregation,
  fetchRKAPTargetByPlant,
  createInputData,
  updateInputData,
  deleteInputData,
  createApprovalRequest,
} from "@/lib/supabase-service";
import type { PlantRow, InputDataRecord, AggregatedRow } from "@/lib/supabase-service";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Calendar, Package, DollarSign, Plus, X, Save, RotateCcw, Pencil, Trash2, Check, AlertTriangle, Download } from "lucide-react";
import InputHistori from "@/components/InputHistori";
import { notifyAdmin } from "@/lib/notify-admin";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [rkapTarget, setRkapTarget] = useState(0);
  const [editingInputId, setEditingInputId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // ── Inline Editing (Admin) ──
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [originalRowData, setOriginalRowData] = useState<InputDataRecord | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string>("");
  const [dialogTrigger, setDialogTrigger] = useState<"save" | "switch">("save");

  const MONTHS = [
    { num: 1, label: "Januari" }, { num: 2, label: "Februari" }, { num: 3, label: "Maret" },
    { num: 4, label: "April" }, { num: 5, label: "Mei" }, { num: 6, label: "Juni" },
    { num: 7, label: "Juli" }, { num: 8, label: "Agustus" }, { num: 9, label: "September" },
    { num: 10, label: "Oktober" }, { num: 11, label: "November" }, { num: 12, label: "Desember" },
  ];
  const CURRENT_YEAR = new Date().getFullYear();
  const CURRENT_MONTH = new Date().getMonth() + 1;
  const [filterStartMonth, setFilterStartMonth] = useState(CURRENT_MONTH);
  const [filterEndMonth, setFilterEndMonth] = useState(CURRENT_MONTH);
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);

  // Distinct field values for input history
  const fieldHistories = {
    namaPelanggan: Array.from(new Set(inputData.map((d) => d.nama_pelanggan).filter(Boolean))),
    uraianPekerjaan: Array.from(new Set(inputData.map((d) => d.uraian_pekerjaan).filter(Boolean))),
    type: Array.from(new Set(inputData.map((d) => d.type).filter(Boolean))),
    keterangan: Array.from(new Set(inputData.map((d) => d.keterangan ?? '').filter(Boolean))),
  };

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
      fetchRKAPTargetByPlant(plantCode),
    ])
      .then(([plants, input, monthly, rkap]) => {
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
        setRkapTarget(rkap);
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

  // Auto-redirect ke dashboard jika akses ditolak (marketing buka plant lain)
  useEffect(() => {
    if (error?.includes("Akses ditolak")) {
      router.replace("/dashboard");
    }
  }, [error, router]);

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
            notifyAdmin({
              title: "✏️ Permintaan Edit Data",
              body: `${user?.namaLengkap || "Marketing"} mengajukan perubahan data di ${plantCode}`,
              url: `/plant/${plantCode}`,
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
        if (!isAdmin && !isMarketing) {
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
        notifyAdmin({
          title: "🗑️ Permintaan Hapus Data",
          body: `${user?.namaLengkap || "Marketing"} mengajukan penghapusan data "${pelanggan}"`,
          url: `/plant/${plantCode}`,
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

  // ── Inline Edit Handlers (Admin) ──
  const startInlineEdit = useCallback((row: InputDataRecord) => {
    if (editingRowId !== null) return; // already editing
    setEditForm({
      tanggal: row.tanggal,
      namaPelanggan: row.nama_pelanggan,
      uraianPekerjaan: row.uraian_pekerjaan,
      type: row.type ?? "",
      volume: String(row.volume),
      hargaSatuan: String(row.harga_satuan),
      sewaCP: String(row.sewa_cp),
      keterangan: row.keterangan ?? "",
    });
    setOriginalRowData(row);
    setEditingRowId(row.id);
  }, [editingRowId]);

  const handleCellClick = (row: InputDataRecord) => {
    if (!isAdmin) return;
    if (editingRowId === null) {
      startInlineEdit(row);
      return;
    }
    if (editingRowId === row.id) return;
    // Klik baris berbeda → muncul popup konfirmasi
    setDialogTrigger("switch");
    setPendingRowId(row.id);
    setShowSaveDialog(true);
  };

  const handleSaveClick = () => {
    // Klik icon centang → muncul popup konfirmasi simpan
    setDialogTrigger("save");
    setShowSaveDialog(true);
  };

  const confirmSaveInline = async () => {
    if (!editingRowId) return;
    const vol = parseFloat(editForm.volume) || 0;
    const hs = parseFloat(editForm.hargaSatuan) || 0;
    const scp = parseFloat(editForm.sewaCP) || 0;
    if (vol <= 0 || hs <= 0) {
      alert("Volume dan Harga Satuan harus lebih dari 0");
      return;
    }
    try {
      await updateInputData(editingRowId, {
        plant_code: plantCode,
        tanggal: editForm.tanggal,
        nama_pelanggan: editForm.namaPelanggan,
        uraian_pekerjaan: editForm.uraianPekerjaan,
        type: editForm.type,
        volume: vol,
        harga_satuan: hs,
        jumlah_harga: vol * hs,
        sewa_cp: scp,
        total_harga: vol * hs + scp,
        keterangan: editForm.keterangan,
      });
      setEditingRowId(null);
      setEditForm({});
      setOriginalRowData(null);
      setShowSaveDialog(false);
      setPendingRowId(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan data");
    }
  };

  const confirmDiscardInline = () => {
    setEditingRowId(null);
    setEditForm({});
    setOriginalRowData(null);
    setShowSaveDialog(false);
    setPendingRowId(null);
  };

  const cancelSwitchRow = () => {
    setShowSaveDialog(false);
    setPendingRowId(null);
  };

  // Derived computed values dari editForm
  const editVol = parseFloat(editForm.volume) || 0;
  const editHS = parseFloat(editForm.hargaSatuan) || 0;
  const editSCP = parseFloat(editForm.sewaCP) || 0;
  const editJumlahHarga = editVol * editHS;
  const editTotal = editJumlahHarga + editSCP;

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
            <p className="text-gray-400">
              {error?.includes("Akses ditolak")
                ? "Mengalihkan ke dashboard..."
                : error || "Plant tidak ditemukan"}
            </p>
            {!error?.includes("Akses ditolak") && (
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-medium hover:from-[#F35b04] hover:to-orange-800"
              >
                <ArrowLeft className="w-4 h-4" />
                Kembali ke Dashboard
              </button>
            )}
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Filter: Bulan (range) + Tahun + Search
  const availableYears = Array.from(new Set(inputData.map((d) => new Date(d.tanggal + "T00:00:00").getFullYear()))).sort((a, b) => b - a);
  const searchLower = searchTerm.toLowerCase();
  const monthRangeData = inputData.filter((row) => {
    const tgl = new Date(row.tanggal + "T00:00:00");
    const m = tgl.getMonth() + 1;
    const matchMonth = m >= filterStartMonth && m <= filterEndMonth;
    const matchYear = tgl.getFullYear() === filterYear;
    return matchMonth && matchYear;
  });
  const filteredData = monthRangeData.filter((row) => {
    return (
      row.nama_pelanggan.toLowerCase().includes(searchLower) ||
      row.uraian_pekerjaan.toLowerCase().includes(searchLower) ||
      (row.type || "").toLowerCase().includes(searchLower)
    );
  });
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

  // ── Export Functions ──
  const monthLabel = `${MONTHS.find((m) => m.num === filterStartMonth)?.label}_${MONTHS.find((m) => m.num === filterEndMonth)?.label}`;
  const plantExportName = plant?.nama.replace("Ready Mix ", "") ?? plantCode;

  const exportPlantExcel = () => {
    if (filteredData.length === 0) return;
    const rows = filteredData.map((r) => ({
      Tanggal: r.tanggal,
      Pelanggan: r.nama_pelanggan,
      Pekerjaan: r.uraian_pekerjaan,
      Type: r.type || "-",
      "Vol (m³)": r.volume,
      "Harga Satuan": r.harga_satuan,
      "Jumlah Harga": r.jumlah_harga,
      "Sewa CP": r.sewa_cp,
      "Total Harga": r.total_harga,
      Keterangan: r.keterangan || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${plantExportName}`);
    const colWidths = Object.keys(rows[0]).map(() => ({ wch: 16 }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, `Penjualan_${plantExportName}_${monthLabel}_${filterYear}.xlsx`);
  };

  const exportPlantPDF = () => {
    if (filteredData.length === 0) return;

    const pdf = new jsPDF("l", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let totalPages = 0;

    const now = new Date();
    const tglStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).split("/").join(".");
    const jamStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const namaLengkap = user?.namaLengkap ?? user?.email ?? "unknown";

    const primaryRGB: [number, number, number] = [0xE3, 0x48, 0x03];

    const filterLabel = `${MONTHS.find((m) => m.num === filterStartMonth)?.label} - ${MONTHS.find((m) => m.num === filterEndMonth)?.label} ${filterYear}`;

    // ── Header setiap halaman ──
    const addHeader = () => {
      pdf.setFillColor(...primaryRGB);
      pdf.rect(0, 0, pageW, 3.5, "F");

      pdf.setTextColor(60);
      pdf.setFontSize(15);
      pdf.setFont("helvetica", "bold");
      pdf.text("Penjualan Ready Mix", pageW / 2, margin + 2, { align: "center" });

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100);
      pdf.text("PT. Prima Karya Manunggal", pageW / 2, margin + 9, { align: "center" });

      pdf.setFontSize(8);
      pdf.setTextColor(130);
      pdf.text(`Periode: ${filterLabel}  |  Plant: ${plantExportName}`, pageW / 2, margin + 15, { align: "center" });

      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, margin + 18.5, pageW - margin, margin + 18.5);
    };

    // ── Footer setiap halaman ──
    const addFooter = (pageNum: number) => {
      const fy = pageH - 8;
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150);
      pdf.text(`© 2026 Penjualan Ready Mix — design by NUI6184`, margin, fy, { align: "left" });
      pdf.text(`Hal. ${pageNum} dari ${totalPages}`, pageW / 2, fy, { align: "center" });
      pdf.text(`Diekspor pada: ${tglStr} ${jamStr} — Oleh: ${namaLengkap}`, pageW - margin, fy, { align: "right" });
    };

    addHeader();

    // ── Tabel ──
    const tableRows = filteredData.map((r) => [
      r.tanggal,
      r.nama_pelanggan,
      r.uraian_pekerjaan,
      r.type || "-",
      r.volume.toLocaleString("id-ID"),
      `Rp ${formatCurrency(r.harga_satuan)}`,
      `Rp ${formatCurrency(r.jumlah_harga)}`,
      r.sewa_cp > 0 ? `Rp ${formatCurrency(r.sewa_cp)}` : "-",
      `Rp ${formatCurrency(r.total_harga)}`,
      r.keterangan || "",
    ]);

    // Hitung total keseluruhan
    const totals = filteredData.reduce(
      (acc, r) => ({
        volume: acc.volume + r.volume,
        jumlah_harga: acc.jumlah_harga + r.jumlah_harga,
        sewa_cp: acc.sewa_cp + r.sewa_cp,
        total_harga: acc.total_harga + r.total_harga,
      }),
      { volume: 0, jumlah_harga: 0, sewa_cp: 0, total_harga: 0 }
    );

    // Row total di akhir tabel
    tableRows.push([
      "TOTAL",
      "",
      "",
      "",
      totals.volume.toLocaleString("id-ID"),
      "",
      `Rp ${formatCurrency(totals.jumlah_harga)}`,
      totals.sewa_cp > 0 ? `Rp ${formatCurrency(totals.sewa_cp)}` : "-",
      `Rp ${formatCurrency(totals.total_harga)}`,
      "",
    ]);

    // ── Auto Table ──
    autoTable(pdf, {
      head: [["Tanggal", "Pelanggan", "Pekerjaan", "Type", "Volume", "Harga Satuan", "Jumlah Harga", "Sewa CP", "Total", "Ket."]],
      body: tableRows,
      startY: margin + 22,
      margin: { left: margin, right: margin, top: margin + 24, bottom: 18 },
      tableWidth: "auto",
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        lineColor: [210, 210, 210],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: primaryRGB,
        textColor: 255,
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "center",
      },
      bodyStyles: {
        textColor: 60,
      },
      alternateRowStyles: {
        fillColor: [246, 246, 246],
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 34 },
        2: { cellWidth: 34 },
        3: { cellWidth: 18 },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 28, halign: "right" },
        6: { cellWidth: 28, halign: "right" },
        7: { cellWidth: 22, halign: "right" },
        8: { cellWidth: 25, halign: "right" },
        9: { cellWidth: 22 },
      },
      didDrawPage: (data: any) => {
        totalPages = pdf.getNumberOfPages();
        addFooter(data.pageNumber);
      },
      didParseCell: (data: any) => {
        if (data.row.index === filteredData.length) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [255, 237, 224];
          data.cell.styles.textColor = primaryRGB;
        }
      },
    });

    // ── Signature block di halaman terakhir ──
    totalPages = pdf.getNumberOfPages();
    const lastAutoTable = (pdf as any).lastAutoTable;
    const finalY = lastAutoTable ? lastAutoTable.finalY + 8 : margin + 22;

    const drawSignature = (sigY: number) => {
      const sigLeftX = margin + 10;
      const sigW = 70;
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.3);
      pdf.line(sigLeftX, sigY, sigLeftX + sigW, sigY);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(150);
      pdf.text("Approved by", sigLeftX, sigY + 8, { align: "left" });
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(60);
      pdf.text("Seksi Penjualan Ready Mix", sigLeftX, sigY + 17, { align: "left" });
    };

    const sigSpace = 30;
    if (finalY + sigSpace > pageH - 18) {
      pdf.addPage();
      addHeader();
      addFooter(totalPages + 1);
      totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addFooter(i);
      }
      pdf.setPage(totalPages);
      drawSignature(margin + 22);
    } else {
      drawSignature(finalY);
    }

    // Final pass: perbaiki footer dengan total halaman yang benar
    totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      addFooter(i);
    }

    pdf.save(`Penjualan_${plantExportName}_${monthLabel}_${filterYear}.pdf`);
  };

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
          <div className="card p-4 sm:p-5 flex items-center gap-3 border-l-4 border-l-[#F35b04]">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[#F35b04]" />
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
              <p className="text-[10px] sm:text-xs text-gray-500 font-medium">
                Capaian s/d {monthlyData.length > 0
                  ? `${monthlyData[monthlyData.length - 1].bulan} ${monthlyData[monthlyData.length - 1].tahun}`
                  : new Date().toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
              </p>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">
                {rkapTarget > 0
                  ? `${Math.min(100, Math.round((totalVolumeMonthly / rkapTarget) * 100))}%`
                  : `${totalVolumeMonthly.toLocaleString("id-ID")} m³`}
              </p>
              <p className="text-[10px] text-gray-400">
                {rkapTarget > 0 ? `RKAP ${rkapTarget.toLocaleString("id-ID")} m³` : "RKAP belum diinput"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Tabel Data Inputan ── */}
        <div className="card">
          <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Data Penjualan{plant ? ` ${plant.nama.replace("Ready Mix ", "")}` : ""}
              </h3>
              <p className="text-xs text-gray-500">
                {filteredData.length} transaksi{searchTerm || filterStartMonth || filterEndMonth || filterYear ? ` — ${MONTHS.find((m) => m.num === filterStartMonth)?.label} - ${MONTHS.find((m) => m.num === filterEndMonth)?.label} ${filterYear}${searchTerm ? `, cari "${searchTerm}"` : ""}${filteredData.length !== inputData.length ? ` (dari ${inputData.length})` : ""}` : ""}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full sm:w-auto">
              {/* Baris 1: Filter bulan + tahun */}
              <div className="flex items-center gap-2">
                <select
                  value={filterStartMonth}
                  onChange={(e) => { setFilterStartMonth(Number(e.target.value)); setCurrentPage(1); }}
                  disabled={editingRowId !== null}
                  className={`px-2 py-2 rounded-xl border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] ${
                    editingRowId !== null ? "bg-gray-100 cursor-not-allowed" : "border-gray-200"
                  }`}
                >
                  {MONTHS.map((m) => (
                    <option key={m.num} value={m.num}>{m.label}</option>
                  ))}
                </select>
                <span className="text-gray-400 text-xs font-medium shrink-0">—</span>
                <select
                  value={filterEndMonth}
                  onChange={(e) => { setFilterEndMonth(Number(e.target.value)); setCurrentPage(1); }}
                  disabled={editingRowId !== null}
                  className={`px-2 py-2 rounded-xl border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] ${
                    editingRowId !== null ? "bg-gray-100 cursor-not-allowed" : "border-gray-200"
                  }`}
                >
                  {MONTHS.map((m) => (
                    <option key={m.num} value={m.num}>{m.label}</option>
                  ))}
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => { setFilterYear(Number(e.target.value)); setCurrentPage(1); }}
                  disabled={editingRowId !== null}
                  className={`px-2 py-2 rounded-xl border text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] ${
                    editingRowId !== null ? "bg-gray-100 cursor-not-allowed" : "border-gray-200"
                  }`}
                >
                  {availableYears.length > 0 ? availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  )) : (
                    <option value={CURRENT_YEAR}>{CURRENT_YEAR}</option>
                  )}
                </select>
              </div>
              {/* Baris 2: Search full-width mobile */}
              <div className="relative w-full sm:w-auto sm:min-w-[180px]">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  disabled={editingRowId !== null}
                  placeholder={editingRowId ? "Selesaikan edit terlebih dahulu..." : "Cari pelanggan, pekerjaan, type..."}
                  className={`w-full px-3 py-2 pl-8 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] transition-all ${
                    editingRowId !== null
                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                      : "border-gray-200"
                  }`}
                />
                <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {/* Baris 3: Tombol action dalam 1 baris */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {user?.role !== "marketing" && monthRangeData.length > 0 && (
                  <button
                    onClick={exportPlantExcel}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-700 transition-all"
                  >
                    <Download className="w-3 h-3" /> Excel
                  </button>
                )}
                {monthRangeData.length > 0 && (
                  <button
                    onClick={exportPlantPDF}
                    className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-red-600 text-white text-[10px] font-medium hover:bg-red-700 transition-all"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </button>
                )}
                {(isAdmin || isMarketing) && (
                  <button
                    onClick={() => {
                      if (editingRowId !== null) {
                        setEditingRowId(null);
                        setEditForm({});
                        setOriginalRowData(null);
                      }
                      resetForm();
                      setShowModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-xs font-medium hover:from-[#F35b04] hover:to-orange-800 transition-all shadow-sm btn-glow btn-shimmer btn-scale"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Input Data</span>
                  </button>
                )}
              </div>
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
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Vol (m³)</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Harga Satuan</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Jumlah Harga</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Sewa CP</th>
                  <th className="text-right px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs">Total</th>
                  <th className="text-left px-2 sm:px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-[11px] sm:text-xs ">Keterangan</th>
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
                    const isEditing = editingRowId === row.id;
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-100 transition-colors ${
                          i === 0 && !isEditing ? "bg-orange-50/40" : ""
                        } ${
                          isEditing
                            ? "bg-blue-50/60 ring-2 ring-inset ring-[#F35b04]/20"
                            : editingRowId === null && isAdmin
                              ? "hover:bg-gray-50/50 cursor-pointer"
                              : ""
                        }`}
                        onClick={() => {
                          if (!isEditing && isAdmin) handleCellClick(row);
                        }}
                      >
                        {/* Tanggal */}
                        <td className={`px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm ${isEditing ? "p-0.5 sm:p-1" : ""}`}>
                          {isEditing ? (
                            <input type="date" value={editForm.tanggal}
                              onChange={(e) => setEditForm((prev) => ({...prev, tanggal: e.target.value}))}
                              className="w-full min-w-[90px] px-1 py-1 border border-[#F35b04] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white"
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{formatted}</span>
                          )}
                        </td>
                        {/* Pelanggan */}
                        <td className={`px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm max-w-[120px] sm:max-w-[200px] ${isEditing ? "p-0.5 sm:p-1" : ""}`}>
                          {isEditing ? (
                            <input type="text" value={editForm.namaPelanggan}
                              onChange={(e) => setEditForm((prev) => ({...prev, namaPelanggan: e.target.value}))}
                              className="w-full min-w-[80px] px-1 py-1 border border-[#F35b04] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white"
                            />
                          ) : (
                            <span className="text-gray-700 truncate block">{row.nama_pelanggan}</span>
                          )}
                        </td>
                        {/* Pekerjaan */}
                        <td className={`px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm max-w-[100px] sm:max-w-[180px] ${isEditing ? "p-0.5 sm:p-1" : ""}`}>
                          {isEditing ? (
                            <input type="text" value={editForm.uraianPekerjaan}
                              onChange={(e) => setEditForm((prev) => ({...prev, uraianPekerjaan: e.target.value}))}
                              className="w-full min-w-[80px] px-1 py-1 border border-[#F35b04] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white"
                            />
                          ) : (
                            <span className="text-gray-600 truncate block">{row.uraian_pekerjaan}</span>
                          )}
                        </td>
                        {/* Type */}
                        <td className={`px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm ${isEditing ? "p-0.5 sm:p-1" : ""}`}>
                          {isEditing ? (
                            <input type="text" value={editForm.type}
                              onChange={(e) => setEditForm((prev) => ({...prev, type: e.target.value}))}
                              className="w-full min-w-[70px] px-1 py-1 border border-[#F35b04] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white"
                            />
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] sm:text-xs bg-gray-100 text-gray-600">
                              {row.type || "-"}
                            </span>
                          )}
                        </td>
                        {/* Volume */}
                        <td className={`px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm ${isEditing ? "p-0.5 sm:p-1" : "text-right"}`}>
                          {isEditing ? (
                            <input type="number" value={editForm.volume} min="0" step="0.01"
                              onChange={(e) => setEditForm((prev) => ({...prev, volume: e.target.value}))}
                              className="w-full min-w-[60px] px-1 py-1 border border-[#F35b04] rounded-md text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white tabular-nums"
                            />
                          ) : (
                            <span className="font-medium text-gray-900 tabular-nums">{row.volume.toLocaleString("id-ID")}</span>
                          )}
                        </td>
                        {/* Harga Satuan */}
                        <td className={`px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm ${isEditing ? "p-0.5 sm:p-1" : "text-right"}`}>
                          {isEditing ? (
                            <input type="number" value={editForm.hargaSatuan} min="0" step="1"
                              onChange={(e) => setEditForm((prev) => ({...prev, hargaSatuan: e.target.value}))}
                              className="w-full min-w-[80px] px-1 py-1 border border-[#F35b04] rounded-md text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white tabular-nums"
                            />
                          ) : (
                            <span className="text-gray-600 tabular-nums">{formatCurrency(row.harga_satuan)}</span>
                          )}
                        </td>
                        {/* Jumlah Harga (computed — tidak bisa diedit) */}
                        <td className="px-2 sm:px-4 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {isEditing ? formatCurrency(editJumlahHarga) : formatCurrency(row.jumlah_harga)}
                        </td>
                        {/* Sewa CP */}
                        <td className={`px-2 sm:px-4 py-3 whitespace-nowrap text-xs sm:text-sm ${isEditing ? "p-0.5 sm:p-1" : "text-right"}`}>
                          {isEditing ? (
                            <input type="number" value={editForm.sewaCP} min="0" step="1000"
                              onChange={(e) => setEditForm((prev) => ({...prev, sewaCP: e.target.value}))}
                              className="w-full min-w-[70px] px-1 py-1 border border-[#F35b04] rounded-md text-xs text-right focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white tabular-nums"
                            />
                          ) : (
                            <span className="text-gray-600 tabular-nums">{row.sewa_cp > 0 ? formatCurrency(row.sewa_cp) : "-"}</span>
                          )}
                        </td>
                        {/* Total (computed — tidak bisa diedit) */}
                        <td className="px-2 sm:px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-xs sm:text-sm">
                          {isEditing ? formatCurrency(editTotal) : formatCurrency(row.total_harga)}
                        </td>
                        {/* Keterangan */}
                        <td className={`px-2 sm:px-4 py-3 text-xs max-w-[120px] ${isEditing ? "p-0.5 sm:p-1" : ""}`}>
                          {isEditing ? (
                            <input type="text" value={editForm.keterangan}
                              onChange={(e) => setEditForm((prev) => ({...prev, keterangan: e.target.value}))}
                              className="w-full min-w-[80px] px-1 py-1 border border-[#F35b04] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-[#F35b04]/30 bg-white"
                            />
                          ) : (
                            <span className="text-gray-500 truncate block">{row.keterangan || "—"}</span>
                          )}
                        </td>
                        {/* Aksi */}
                        {(isAdmin || isMarketing) && (
                          <td className="px-2 sm:px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {isMarketing && (
                                <button
                                  onClick={() => openEditInput(row)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {isEditing ? (
                                <button
                                  onClick={handleSaveClick}
                                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-all"
                                  title="Simpan"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    if (editingRowId) {
                                      setEditingRowId(null);
                                      setEditForm({});
                                      setOriginalRowData(null);
                                    }
                                    handleDeleteInput(row.id, row.nama_pelanggan);
                                  }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                  title="Hapus"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
                  <tr className="bg-orange-50 border-t-2 border-[#F35b04]/30">
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
                    <td className="px-2 sm:px-4 py-3 text-right font-bold text-[#F35b04] tabular-nums whitespace-nowrap text-xs sm:text-sm">
                      {formatCurrency(filteredTotal)}
                    </td>
                    {(isAdmin || isMarketing) && <td className="px-2 sm:px-4 py-3"></td>}
                  </tr>
                </tfoot>
              )}
            </table>
            {/* Pagination */}
            {filteredData.length > ITEMS_PER_PAGE && (
              <div className={`flex items-center justify-between px-4 py-3 border-t border-gray-100 ${editingRowId !== null ? "opacity-50" : ""}`}>
                <p className="text-xs text-gray-500">
                  {startRow}–{endRow} dari {filteredData.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || editingRowId !== null}
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
                        disabled={editingRowId !== null}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          page === currentPage
                            ? "bg-gradient-to-r from-[#F35b04] to-orange-700 text-white border-[#F35b04]"
                            : "border-gray-200 hover:bg-gray-50"
                        } disabled:opacity-30 disabled:cursor-not-allowed`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || editingRowId !== null}
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
              Produksi Bulanan{plant ? ` ${plant.nama.replace("Ready Mix ", "")}` : ""}
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

      {/* ── Dialog Konfirmasi Simpan ── */}
      {showSaveDialog && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={dialogTrigger === "switch" ? cancelSwitchRow : confirmDiscardInline} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-[#F35b04]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Konfirmasi</h3>
              <p className="text-sm text-gray-600 mb-6">
                Apakah ingin menyimpan data ini?
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={confirmSaveInline}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-medium rounded-xl hover:from-[#F35b04] hover:to-orange-800 transition-all shadow-sm"
                >
                  Ya
                </button>
                <button
                  onClick={confirmDiscardInline}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Tidak
                </button>
                {dialogTrigger === "switch" && (
                  <button
                    onClick={cancelSwitchRow}
                    className="px-5 py-2.5 text-sm font-medium text-[#F35b04] bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all"
                  >
                    Lanjut Mengedit
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

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
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]" required />
                  </div>
                  <InputHistori
                    value={form.namaPelanggan}
                    onChange={(v) => updateForm("namaPelanggan", v)}
                    suggestions={fieldHistories.namaPelanggan}
                    label="Nama Pelanggan"
                    placeholder="Cth: PT. ABC Mandiri"
                    required
                  />
                </div>

                {/* Uraian Pekerjaan */}
                <InputHistori
                  value={form.uraianPekerjaan}
                  onChange={(v) => updateForm("uraianPekerjaan", v)}
                  suggestions={fieldHistories.uraianPekerjaan}
                  label="Uraian Pekerjaan"
                  placeholder="Cth: Pengecoran Jalan Taman Sari"
                  multiline
                  required
                />

                {/* Type + Volume + Harga Satuan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <InputHistori
                    value={form.type}
                    onChange={(v) => updateForm("type", v)}
                    suggestions={fieldHistories.type}
                    label="Type"
                    placeholder="Cth: K300, FC-25, dll"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Volume (m³) <span className="text-red-500">*</span></label>
                    <input type="number" value={form.volume} onChange={(e) => updateForm("volume", e.target.value)}
                      placeholder="0" min="0" step="0.01"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Harga Satuan (Rp) <span className="text-red-500">*</span></label>
                    <input type="number" value={form.hargaSatuan} onChange={(e) => updateForm("hargaSatuan", e.target.value)}
                      placeholder="0" min="0" step="1"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]" required />
                  </div>
                </div>

                {/* Sewa CP */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sewa CP / Pompa (Rp)</label>
                  <input type="number" value={form.sewaCP} onChange={(e) => updateForm("sewaCP", e.target.value)}
                    placeholder="0" min="0" step="1000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]" />
                </div>

                {/* Kalkulasi */}
                {(parseFloat(form.volume) || 0) > 0 && (parseFloat(form.hargaSatuan) || 0) > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kalkulasi</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] text-gray-500">Jumlah Harga</p>
                        <p className="text-sm font-bold text-[#F35b04]">Rp {formatCurrency((parseFloat(form.volume) || 0) * (parseFloat(form.hargaSatuan) || 0))}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] text-gray-500">Sewa CP</p>
                        <p className="text-sm font-bold text-emerald-600">Rp {formatCurrency(parseFloat(form.sewaCP) || 0)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border-2 border-[#F35b04]/20 bg-[#F35b04]/5 col-span-2 sm:col-span-1">
                        <p className="text-[10px] text-gray-500">Total</p>
                        <p className="text-sm font-bold text-gray-900">
                          Rp {formatCurrency(((parseFloat(form.volume) || 0) * (parseFloat(form.hargaSatuan) || 0)) + (parseFloat(form.sewaCP) || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Keterangan */}
                <InputHistori
                  value={form.keterangan}
                  onChange={(v) => updateForm("keterangan", v)}
                  suggestions={fieldHistories.keterangan}
                  label="Keterangan"
                  placeholder="Cth: Pembayaran termin 1, Catatan khusus, dll"
                  multiline
                />

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-medium rounded-xl hover:from-[#F35b04] hover:to-orange-800 transition-all disabled:opacity-50 shadow-sm">
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
