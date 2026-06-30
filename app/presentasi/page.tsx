"use client";

import { useState, useEffect } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  fetchRKAPRecords,
  fetchRealisasiBulanan,
  fetchPlants,
  fetchInputDataBulanan,
} from "@/lib/supabase-service";
import type { RKAPRecord, RealisasiBulanan, PlantRow, InputDataRecord } from "@/lib/supabase-service";
import { useBackgroundRefresh } from "@/lib/use-background-refresh";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Calendar, Factory, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const COLORS = ["#F35b04", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];
const CURRENT_YEAR = new Date().getFullYear();

function formatCurrency(val: number) {
  return val.toLocaleString("id-ID");
}

export default function PresentasiPage() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [records, setRecords] = useState<RKAPRecord[]>([]);
  const [realisasi, setRealisasi] = useState<RealisasiBulanan[]>([]);
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [dailyData, setDailyData] = useState<InputDataRecord[]>([]);
  const [selectedDailyPlant, setSelectedDailyPlant] = useState("kendari");
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loading, setLoading] = useState(true);

  const { data: initialData, loading: initialLoading } = useBackgroundRefresh(
    () =>
      Promise.all([fetchRKAPRecords(), fetchRealisasiBulanan(), fetchPlants()]).then(
        ([recs, real, plnts]) => {
          const filteredPlants =
            user?.role === "marketing" && user?.unitKerja
              ? plnts.filter((p) => p.id === user.unitKerja)
              : plnts;
          // Auto-select plant untuk marketing
          if (user?.role === "marketing" && user?.unitKerja) {
            setSelectedDailyPlant(user.unitKerja);
          }
          return { records: recs, realisasi: real, plants: filteredPlants };
        }
      ),
    [],
    30_000
  );

  // Sync initial data to state
  useEffect(() => {
    if (initialData) {
      setRecords(initialData.records);
      setRealisasi(initialData.realisasi);
      setPlants(initialData.plants);
    }
    setLoading(initialLoading);
  }, [initialData, initialLoading]);

  // Fetch daily data when plant or month changes
  const { data: dailyResult, loading: dailyResultLoading } = useBackgroundRefresh(
    () => {
      if (!selectedDailyPlant) return Promise.resolve([] as InputDataRecord[]);
      return fetchInputDataBulanan(selectedDailyPlant, selectedMonth, selectedYear);
    },
    [selectedDailyPlant, selectedMonth, selectedYear],
    30_000
  );

  useEffect(() => {
    if (dailyResult) {
      setDailyData(dailyResult);
    }
    setLoadingDaily(dailyResultLoading);
  }, [dailyResult, dailyResultLoading]);

  // ——— Computed Data ———

  const plantCodes = plants.map((p) => p.id);

  /** RKAP target per plant untuk bulan & YTD */
  const getRKAP = (plantCode: string, bulan: number): number => {
    const r = records.find(
      (rec) => rec.plant_code === plantCode && rec.tahun === selectedYear && rec.bulan === bulan
    );
    return r?.target ?? 0;
  };

  /** Realisasi per plant untuk bulan */
  const getRealisasi = (plantCode: string, bulan: number): number => {
    const r = realisasi.find(
      (re) => re.plant_code === plantCode && re.tahun === selectedYear && re.bulan === bulan
    );
    return r?.volume ?? 0;
  };

  /** Data per plant untuk bulan terpilih */
  const monthlyData = plantCodes.map((code) => {
    const rkap = getRKAP(code, selectedMonth);
    const real = getRealisasi(code, selectedMonth);
    const variance = real - rkap;
    const capaian = rkap > 0 ? Math.round((real / rkap) * 100 * 10) / 10 : (real > 0 ? 100 : 0);
    const plant = plants.find((p) => p.id === code);
    return { plantCode: code, plantName: plant?.nama.replace("Ready Mix ", "") ?? code, plantIcon: plant?.icon ?? "🏭", rkap, real, variance, capaian };
  });

  /** Data kumulatif YTD per plant (Jan s.d. selectedMonth) */
  const ytdData = plantCodes.map((code) => {
    let rkap = 0, real = 0;
    for (let m = 1; m <= selectedMonth; m++) {
      rkap += getRKAP(code, m);
      real += getRealisasi(code, m);
    }
    const variance = real - rkap;
    const capaian = rkap > 0 ? Math.round((real / rkap) * 100 * 10) / 10 : (real > 0 ? 100 : 0);
    const plant = plants.find((p) => p.id === code);
    return { plantCode: code, plantName: plant?.nama.replace("Ready Mix ", "") ?? code, plantIcon: plant?.icon ?? "🏭", rkap, real, variance, capaian };
  });

  /** Total seluruh plant */
  const totalMonth = monthlyData.reduce((s, d) => ({ rkap: s.rkap + d.rkap, real: s.real + d.real }), { rkap: 0, real: 0 });
  const totalYTD = ytdData.reduce((s, d) => ({ rkap: s.rkap + d.rkap, real: s.real + d.real }), { rkap: 0, real: 0 });

  // Chart data per plant
  const chartPerPlant = monthlyData.map((d) => ({
    name: d.plantName,
    RKAP: d.rkap,
    Realisasi: d.real,
    capaian: d.capaian,
  }));

  // Chart total YTD
  const chartYTD = [{ name: "Total", RKAP: totalYTD.rkap, Realisasi: totalYTD.real, capaian: totalYTD.rkap > 0 ? Math.round((totalYTD.real / totalYTD.rkap) * 100 * 10) / 10 : (totalYTD.real > 0 ? 100 : 0) }];

  const monthLabel = MONTHS.find((m) => m.num === selectedMonth)?.label ?? "";

  // ── Export Functions (Produksi Harian) ──

  const exportDailyExcel = () => {
    if (!selectedDailyPlant || dailyData.length === 0) return;
    const plantName = plants.find((p) => p.id === selectedDailyPlant)?.nama.replace("Ready Mix ", "") ?? selectedDailyPlant;
    const rows = dailyData.map((r) => ({
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
    XLSX.utils.book_append_sheet(wb, ws, `${plantName}`);
    const colWidths = Object.keys(rows[0]).map(() => ({ wch: 16 }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, `Produksi_Harian_${plantName}_${monthLabel}_${selectedYear}.xlsx`);
  };

  const exportDailyPDF = () => {
    if (!selectedDailyPlant || dailyData.length === 0) return;
    const plantName = plants.find((p) => p.id === selectedDailyPlant)?.nama.replace("Ready Mix ", "") ?? selectedDailyPlant;

    const pdf = new jsPDF("l", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20; // 20mm = 2cm (kiri & kanan)
    let totalPages = 0;

    const now = new Date();
    const tglStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).split("/").join(".");
    const jamStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const namaLengkap = user?.namaLengkap ?? user?.email ?? "unknown";

    const primaryRGB: [number, number, number] = [0xE3, 0x48, 0x03]; // #F35b04 → RGB

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
      pdf.text(`Periode: ${monthLabel} ${selectedYear}  |  Plant: ${plantName}`, pageW / 2, margin + 15, { align: "center" });

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
    const tableRows = dailyData.map((r) => [
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
    const totals = dailyData.reduce(
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

    let tableFinalY = margin + 22;

    // Lebar tersedia: 297mm - 20mm - 20mm = 257mm untuk 10 kolom
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
        if (data.row.index === dailyData.length) {
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
      const sigLeftX = margin + 10; // rata kiri dengan sedikit space
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

    pdf.save(`Produksi_Harian_${plantName}_${monthLabel}_${selectedYear}.pdf`);
  };

  if (loading) {
    return (
      <ProtectedRoute route="presentasi">
        <div className="p-6 space-y-6">
          <div className="h-8 w-64 rounded-lg bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-[350px] rounded-xl bg-gray-100 animate-pulse" />
            <div className="h-[350px] rounded-xl bg-gray-100 animate-pulse" />
          </div>
          <div className="h-96 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute route="presentasi">
      <div className="p-4 sm:p-6 space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Presentasi</h1>
            <p className="text-sm text-gray-500 mt-1">
              Capaian produksi per plant — {monthLabel} {selectedYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
            >
              {MONTHS.map((m) => (
                <option key={m.num} value={m.num}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
            >
              {[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-4 border-l-4 border-l-[#F35b04]">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">RKAP {monthLabel}</p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">{formatCurrency(totalMonth.rkap)} m³</p>
          </div>
          <div className="card p-4 border-l-4 border-l-emerald-500">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Realisasi {monthLabel}</p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">{formatCurrency(totalMonth.real)} m³</p>
          </div>
          <div className="card p-4 border-l-4 border-l-[#F35b04]">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">RKAP s/d {monthLabel}</p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">{formatCurrency(totalYTD.rkap)} m³</p>
          </div>
          <div className="card p-4 border-l-4 border-l-amber-500">
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">Realisasi s/d {monthLabel}</p>
            <p className="text-sm sm:text-lg font-bold text-gray-900">{formatCurrency(totalYTD.real)} m³</p>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Per Plant */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">RKAP vs Realisasi — Per Plant</h3>
              <p className="text-xs text-gray-500">{monthLabel} {selectedYear}</p>
            </div>
            <div className="card-body h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartPerPlant} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} label={{ value: "M3", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#94a3b8" } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#3b82f6" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="RKAP" fill="#F35b04" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Bar yAxisId="left" dataKey="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  <Line yAxisId="right" dataKey="capaian" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#fff", stroke: "#3b82f6", strokeWidth: 2 }} name="Capaian (%)">
                    <LabelList dataKey="capaian" position="top" fontSize={10} fill="#3b82f6" formatter={(v: number) => `${v}%`} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart Total YTD */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-semibold text-gray-900">RKAP vs Realisasi — Total Semua Plant</h3>
              <p className="text-xs text-gray-500">s/d {monthLabel} {selectedYear}</p>
            </div>
            <div className="card-body h-[350px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartYTD} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} label={{ value: "M3", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "#94a3b8" } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#3b82f6" }} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="RKAP" fill="#F35b04" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="Realisasi" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="right" dataKey="capaian" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: "#fff", stroke: "#3b82f6", strokeWidth: 2 }} name="Capaian (%)">
                    <LabelList dataKey="capaian" position="top" fontSize={10} fill="#3b82f6" formatter={(v: number) => `${v}%`} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Tabel Detail ── */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-sm font-semibold text-gray-900">Detail Capaian Plant</h3>
            <p className="text-xs text-gray-500">{monthLabel} {selectedYear}</p>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50 border-b border-orange-200">
                  <th className="text-left px-3 py-3.5 font-bold text-gray-800 text-xs uppercase tracking-wider bg-orange-100/80 border-x border-orange-200" rowSpan={2}>Plant</th>
                  <th className="text-center px-3 py-3.5 font-bold text-gray-800 text-xs uppercase tracking-wider bg-orange-100/80 border-x border-orange-200" colSpan={4}>{monthLabel}</th>
                  <th className="text-center px-3 py-3.5 font-bold text-gray-800 text-xs uppercase tracking-wider bg-orange-100/80 border-x border-orange-200" colSpan={4}>s/d {monthLabel}</th>
                </tr>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-100">RKAP</th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-100">Realisasi</th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-100">Variance</th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-orange-200">%</th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-100">RKAP</th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-100">Realisasi</th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-100">Variance</th>
                  <th className="text-right px-2 py-2.5 font-semibold text-gray-700 text-[11px]">%</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((d, i) => {
                  const ytd = ytdData[i];
                  const warnaBaris = d.capaian >= 100 ? "bg-emerald-50/30" : d.capaian >= 50 ? "" : "bg-red-50/20";
                  return (
                    <tr key={d.plantCode} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${warnaBaris}`}>
                      <td className="px-3 py-3 border-r border-orange-200">
                        <div className="flex items-center gap-2">
                          <span>{d.plantIcon}</span>
                          <span className="font-medium text-gray-900 text-xs">{d.plantName}</span>
                        </div>
                      </td>
                      {/* Bulanan */}
                      <td className="px-2 py-3 text-right tabular-nums text-gray-900 text-xs">{formatCurrency(d.rkap)}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-gray-900 text-xs">{formatCurrency(d.real)}</td>
                      <td className={`px-2 py-3 text-right tabular-nums text-xs font-medium ${d.variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {d.variance >= 0 ? "+" : ""}{formatCurrency(d.variance)}
                      </td>
                      <td className="px-2 py-3 text-right border-r border-orange-200">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] ${d.capaian >= 100 ? "bg-emerald-100 text-emerald-700" : d.capaian >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {d.capaian}%
                        </span>
                      </td>
                      {/* YTD */}
                      <td className="px-2 py-3 text-right tabular-nums text-gray-900 text-xs">{formatCurrency(ytd.rkap)}</td>
                      <td className="px-2 py-3 text-right tabular-nums text-gray-900 text-xs">{formatCurrency(ytd.real)}</td>
                      <td className={`px-2 py-3 text-right tabular-nums text-xs font-medium ${ytd.variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {ytd.variance >= 0 ? "+" : ""}{formatCurrency(ytd.variance)}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] ${ytd.capaian >= 100 ? "bg-emerald-100 text-emerald-700" : ytd.capaian >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                          {ytd.capaian}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer — Total */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-3 py-3 font-bold text-gray-800 text-xs border-r border-orange-200">TOTAL</td>
                  <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">{formatCurrency(totalMonth.rkap)}</td>
                  <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">{formatCurrency(totalMonth.real)}</td>
                  <td className={`px-2 py-3 text-right font-bold tabular-nums text-xs ${totalMonth.real - totalMonth.rkap >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {totalMonth.real - totalMonth.rkap >= 0 ? "+" : ""}{formatCurrency(totalMonth.real - totalMonth.rkap)}
                  </td>
                  <td className="px-2 py-3 text-right border-r border-orange-200">
                    {(() => { const p = totalMonth.rkap > 0 ? Math.round((totalMonth.real / totalMonth.rkap) * 100 * 10) / 10 : (totalMonth.real > 0 ? 100 : 0); return (
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${p >= 100 ? "bg-emerald-100 text-emerald-700" : p >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {p}%
                      </span>
                    ); })()}
                  </td>
                  <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">{formatCurrency(totalYTD.rkap)}</td>
                  <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">{formatCurrency(totalYTD.real)}</td>
                  <td className={`px-2 py-3 text-right font-bold tabular-nums text-xs ${totalYTD.real - totalYTD.rkap >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {totalYTD.real - totalYTD.rkap >= 0 ? "+" : ""}{formatCurrency(totalYTD.real - totalYTD.rkap)}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {(() => { const p = totalYTD.rkap > 0 ? Math.round((totalYTD.real / totalYTD.rkap) * 100 * 10) / 10 : (totalYTD.real > 0 ? 100 : 0); return (
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold ${p >= 100 ? "bg-emerald-100 text-emerald-700" : p >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {p}%
                      </span>
                    ); })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Produksi Harian per Plant ── */}
        {plants.length > 0 && (
          <div className="card">
            <div className="card-header flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Produksi Harian</h3>
                <p className="text-xs text-gray-500">
                  {selectedDailyPlant
                    ? `${plants.find((p) => p.id === selectedDailyPlant)?.nama.replace("Ready Mix ", "") ?? ""} · ${monthLabel} ${selectedYear}`
                    : monthLabel + " " + selectedYear}
                </p>
              </div>
              {selectedDailyPlant && dailyData.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {user?.role !== "marketing" && (
                    <button
                      onClick={exportDailyExcel}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-medium hover:bg-emerald-700 transition-all"
                    >
                      <Download className="w-3 h-3" /> Excel
                    </button>
                  )}
                  <button
                    onClick={exportDailyPDF}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-medium hover:bg-red-700 transition-all"
                  >
                    <Download className="w-3 h-3" /> PDF
                  </button>
                </div>
              )}
            </div>
            <div className="card-body p-4">
              {/* Button Group Plant */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {plants.map((plant) => {
                  const isActive = selectedDailyPlant === plant.id;
                  return (
                    <button
                      key={plant.id}
                      onClick={() => setSelectedDailyPlant(plant.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-[#F35b04] to-orange-700 text-white shadow-sm shadow-orange-200"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <Factory className="w-3.5 h-3.5 text-current opacity-60" strokeWidth={1.5} />
                      <span>{plant.nama.replace("Ready Mix ", "")}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tabel Harian */}
              {loadingDaily ? (
                <div className="py-8 text-center text-sm text-gray-400">Memuat data...</div>
              ) : dailyData.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {selectedDailyPlant ? "Tidak ada data untuk plant ini" : "Pilih plant untuk melihat data harian"}
                </div>
              ) : (
                <div className="overflow-x-auto" id="daily-table-wrap">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-2 py-3 font-medium text-gray-600 text-[11px]">Tanggal</th>
                        <th className="text-left px-2 py-3 font-medium text-gray-600 text-[11px]">Pelanggan</th>
                        <th className="text-left px-2 py-3 font-medium text-gray-600 text-[11px]">Pekerjaan</th>
                        <th className="text-left px-2 py-3 font-medium text-gray-600 text-[11px]">Type</th>
                        <th className="text-right px-2 py-3 font-medium text-gray-600 text-[11px]">Vol (m³)</th>
                        <th className="text-right px-2 py-3 font-medium text-gray-600 text-[11px]">Harga Satuan</th>
                        <th className="text-right px-2 py-3 font-medium text-gray-600 text-[11px]">Jumlah Harga</th>
                        <th className="text-right px-2 py-3 font-medium text-gray-600 text-[11px]">Sewa CP</th>
                        <th className="text-right px-2 py-3 font-medium text-gray-600 text-[11px]">Total</th>
                        <th className="text-left px-2 py-3 font-medium text-gray-600 text-[11px]">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyData.map((row, i) => {
                        const tgl = new Date(row.tanggal + "T00:00:00");
                        const formatted = tgl.toLocaleDateString("id-ID", {
                          day: "numeric", month: "short", year: "numeric",
                        });
                        return (
                          <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${i === 0 ? "bg-orange-50/40" : ""}`}>
                            <td className="px-2 py-3 text-gray-900 font-medium whitespace-nowrap text-xs">{formatted}</td>
                            <td className="px-2 py-3 text-gray-700 whitespace-nowrap text-xs max-w-[140px] truncate">{row.nama_pelanggan}</td>
                            <td className="px-2 py-3 text-gray-600 whitespace-nowrap text-xs max-w-[120px] truncate">{row.uraian_pekerjaan}</td>
                            <td className="px-2 py-3 whitespace-nowrap text-xs">
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">{row.type || "-"}</span>
                            </td>
                            <td className="px-2 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-xs">{row.volume.toLocaleString("id-ID")}</td>
                            <td className="px-2 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">{formatCurrency(row.harga_satuan)}</td>
                            <td className="px-2 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">{formatCurrency(row.jumlah_harga)}</td>
                            <td className="px-2 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">{row.sewa_cp > 0 ? formatCurrency(row.sewa_cp) : "-"}</td>
                            <td className="px-2 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-xs">{formatCurrency(row.total_harga)}</td>
                            <td className="px-2 py-3 text-gray-500 text-xs max-w-[100px] truncate">{row.keterangan || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="px-2 py-3 font-bold text-gray-800 text-xs" colSpan={4}>Total</td>
                        <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">
                          {dailyData.reduce((s, r) => s + r.volume, 0).toLocaleString("id-ID")}
                        </td>
                        <td className="px-2 py-3 text-right font-bold text-gray-800 text-xs"></td>
                        <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">
                          Rp {formatCurrency(dailyData.reduce((s, r) => s + r.jumlah_harga, 0))}
                        </td>
                        <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">
                          Rp {formatCurrency(dailyData.reduce((s, r) => s + r.sewa_cp, 0))}
                        </td>
                        <td className="px-2 py-3 text-right font-bold text-gray-800 tabular-nums text-xs">
                          Rp {formatCurrency(dailyData.reduce((s, r) => s + r.total_harga, 0))}
                        </td>
                        <td className="px-2 py-3 text-gray-500 text-xs"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
