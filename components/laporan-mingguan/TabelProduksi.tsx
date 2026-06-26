"use client";

import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { InputDataRecord, WeekInfo } from "@/lib/supabase-service";
import { Download } from "lucide-react";

function formatCurrency(val: number) {
  return val.toLocaleString("id-ID");
}

interface TabelProduksiProps {
  plant: {
    id: string;
    nama: string;
    lokasi: string;
    icon: string;
  };
  weekInfo: WeekInfo;
  transactions: InputDataRecord[];
  userName?: string;
}

export default function TabelProduksi({
  plant,
  weekInfo,
  transactions,
  userName,
}: TabelProduksiProps) {
  const totalVolume = transactions.reduce((s, r) => s + r.volume, 0);
  const totalJumlahHarga = transactions.reduce((s, r) => s + r.jumlah_harga, 0);
  const totalSewaCP = transactions.reduce((s, r) => s + r.sewa_cp, 0);
  const totalSemua = transactions.reduce((s, r) => s + r.total_harga, 0);

  const formatDate = (tgl: string) =>
    new Date(tgl + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleDownloadPDF = useCallback(() => {
    if (transactions.length === 0) return;

    const pdf = new jsPDF("l", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let totalPages = 0;

    const now = new Date();
    const tglStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" }).split("/").join(".");
    const jamStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const primaryRGB: [number, number, number] = [0xE3, 0x48, 0x03];

    // Header setiap halaman
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
      pdf.text(`Periode: ${weekInfo.periode}  |  Plant: ${plant.nama.replace("Ready Mix ", "")}`, pageW / 2, margin + 15, { align: "center" });

      pdf.setDrawColor(200);
      pdf.setLineWidth(0.5);
      pdf.line(margin, margin + 18.5, pageW - margin, margin + 18.5);
    };

    // Footer setiap halaman
    const addFooter = (pageNum: number) => {
      const fy = pageH - 8;
      pdf.setFontSize(6.5);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(150);
      pdf.text(`© 2026 Penjualan Ready Mix — design by NUI6184`, margin, fy, { align: "left" });
      pdf.text(`Hal. ${pageNum} dari ${totalPages}`, pageW / 2, fy, { align: "center" });
      pdf.text(`Diekspor pada: ${tglStr} ${jamStr} — Oleh: ${userName || "unknown"}`, pageW - margin, fy, { align: "right" });
    };

    addHeader();

    // Data tabel
    const tableRows = transactions.map((r) => [
      formatDate(r.tanggal),
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

    // Row total
    tableRows.push([
      "TOTAL",
      "",
      "",
      "",
      totalVolume.toLocaleString("id-ID"),
      "",
      `Rp ${formatCurrency(totalJumlahHarga)}`,
      totalSewaCP > 0 ? `Rp ${formatCurrency(totalSewaCP)}` : "-",
      `Rp ${formatCurrency(totalSemua)}`,
      "",
    ]);

    autoTable(pdf, {
      head: [["Tanggal", "Pelanggan", "Pekerjaan", "Type", "Volume", "Harga Satuan", "Jumlah Harga", "Sewa CP", "Total", "Ket."]],
      body: tableRows,
      startY: margin + 22,
      margin: { left: margin, right: margin, top: margin + 24, bottom: 18 },
      tableWidth: "auto",
      styles: { fontSize: 7, cellPadding: 2.5, lineColor: [210, 210, 210], lineWidth: 0.2 },
      headStyles: { fillColor: primaryRGB, textColor: 255, fontStyle: "bold", fontSize: 7.5, halign: "center" },
      bodyStyles: { textColor: 60 },
      alternateRowStyles: { fillColor: [246, 246, 246] },
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
        if (data.row.index === transactions.length) {
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

    pdf.save(`Laporan_${plant.nama.replace("Ready Mix ", "")}_${weekInfo.periode}.pdf`);
  }, [transactions, plant, weekInfo, totalVolume, totalJumlahHarga, totalSewaCP, totalSemua]);

  return (
    <div className="card overflow-hidden">
      {/* Header Plant */}
      <div className="card-header flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl shrink-0">{plant.icon}</span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">
              {plant.nama}
            </h3>
            <p className="text-xs text-gray-500">
              {plant.lokasi} &middot; {weekInfo.periode} &middot;{" "}
              {transactions.length} transaksi
            </p>
          </div>
        </div>
        {transactions.length > 0 && (
          <button
            onClick={handleDownloadPDF}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-xs font-medium hover:from-[#F35b04] hover:to-orange-800 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        )}
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Tanggal</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Pelanggan</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Pekerjaan</th>
              <th className="text-left px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Vol (m³)</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Harga Satuan</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Jumlah Harga</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Sewa CP</th>
              <th className="text-right px-3 py-3 font-semibold text-gray-600 text-[11px] uppercase tracking-wider whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Tidak ada transaksi untuk minggu ini
                </td>
              </tr>
            ) : (
              transactions.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-3 py-3 text-gray-900 font-medium whitespace-nowrap text-xs">
                    {formatDate(row.tanggal)}
                  </td>
                  <td className="px-3 py-3 text-gray-700 whitespace-nowrap text-xs max-w-[160px] truncate">
                    {row.nama_pelanggan}
                  </td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs max-w-[140px] truncate">
                    {row.uraian_pekerjaan}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">
                      {row.type || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap text-xs">
                    {row.volume.toLocaleString("id-ID")}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                    {formatCurrency(row.harga_satuan)}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                    {formatCurrency(row.jumlah_harga)}
                  </td>
                  <td className="px-3 py-3 text-right text-gray-600 tabular-nums whitespace-nowrap text-xs">
                    {row.sewa_cp > 0 ? formatCurrency(row.sewa_cp) : "-"}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-xs">
                    {formatCurrency(row.total_harga)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {transactions.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-3 py-3 font-bold text-gray-800 text-xs uppercase">
                  Total ({transactions.length} transaksi)
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800 text-xs">
                  {totalVolume.toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-gray-500 text-xs">
                  —
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800 text-xs">
                  {formatCurrency(totalJumlahHarga)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-gray-800 text-xs">
                  {formatCurrency(totalSewaCP)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-bold text-primary-600 text-xs">
                  {formatCurrency(totalSemua)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
