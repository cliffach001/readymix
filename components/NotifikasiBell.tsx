"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, X, Edit3, Trash2, Loader2, KeyRound, Eye, EyeOff, Clock, AlertCircle, CheckCircle2, Eraser } from "lucide-react";
import { useApprovals } from "@/hooks/useApprovals";

function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}j`;
  return `${Math.floor(diff / 86400)}h`;
}

function formatCurrency(val: number) {
  return "Rp " + val.toLocaleString("id-ID");
}

/** Badge status untuk marketing */
function StatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
        <Clock className="w-2.5 h-2.5" /> Proses
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-2.5 h-2.5" /> Disetujui
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
      <AlertCircle className="w-2.5 h-2.5" /> Ditolak
    </span>
  );
}

function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l5-5-5-5m6 10l5-5-5-5" />
    </svg>
  );
}

export default function NotifikasiBell() {
  const {
    pending, pendingPasswords, myRequests, myRequestsLoading, seenVersion,
    count, unseenCount, loading, approve, reject,
    isApprover, isMarketing, isPasswordApprover, clearMyNotifications, fetchMyRequests,
  } = useApprovals();
  const [open, setOpen] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showNewPwd, setShowNewPwd] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Refresh ketika modal dibuka
  useEffect(() => {
    if (open) {
      fetchMyRequests();
    }
  }, [open, fetchMyRequests]);

  // Sembunyikan jika bukan approver dan bukan marketing
  if (!isApprover && !isMarketing) return null;

  const handleApprove = async (id: string, type?: 'data' | 'password') => {
    setProcessing(`approve-${id}`);
    await approve(id, type);
    setProcessing(null);
  };

  const handleReject = async (id: string, type?: 'data' | 'password') => {
    setProcessing(`reject-${id}`);
    await reject(id, type);
    setProcessing(null);
  };

  // Badge count: marketing lihat pending + unseen (approved/rejected yg belum dibaca)
  const myPendingCount = myRequests.filter((r) => r.status === "pending").length;
  const badgeCount = isMarketing ? unseenCount + myPendingCount : count;

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all"
        title={isMarketing ? "Status Permintaan Saya" : "Notifikasi Persetujuan"}
      >
        <Bell className="w-5 h-5" />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full ring-2 ring-[#F35b04]">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel — modal tengah layar via portal */}
      {open && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()} ref={modalRef}>
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#F35b04]" />
                <h3 className="text-base font-semibold text-gray-900">
                  {isMarketing ? "Status Permintaan" : "Persetujuan"}
                </h3>
                {badgeCount > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                    {badgeCount} {isMarketing ? "baru" : "menunggu"}
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Content scroll ── */}
            <div className="overflow-y-auto flex-1 p-5">
              {loading || myRequestsLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : isMarketing ? (
                /* ══════ MARKETING VIEW: Status Permintaan Saya ══════ */
                myRequests.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-gray-400">
                    <Check className="w-8 h-8 mb-2 text-green-400" />
                    <p className="text-sm font-medium">Belum ada permintaan</p>
                    <p className="text-xs mt-0.5">Pengajuan edit/hapus data akan muncul di sini</p>
                  </div>
                ) : (
                  <>
                    {/* Tombol Clear di atas */}
                    {myRequests.filter((r) => r.status !== "pending").length > 0 && (
                      <div className="mb-3 flex justify-end">
                        <button
                          onClick={() => { clearMyNotifications(); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-700 transition-all"
                        >
                          <Eraser className="w-3 h-3" />
                          Bersihkan Notifikasi
                        </button>
                      </div>
                    )}
                    <div className="divide-y divide-gray-50">
                      {myRequests.map((req) => {
                        // Cek apakah belum dibaca (reaktif terhadap seenVersion)
                        let isUnseen = false;
                        if (req.status !== "pending") {
                          try {
                            const raw = localStorage.getItem("rm-pkm-notif-seen");
                            const seen = new Set(raw ? JSON.parse(raw) : []);
                            isUnseen = !seen.has(req.id) || false;
                            void seenVersion; // trigger re-render saat clear
                          } catch { /* skip */ }
                        }
                        return (
                          <div key={req.id} className={`px-4 py-3 hover:bg-gray-50/50 transition-colors ${isUnseen ? "bg-orange-50/40 -mx-2 px-6 rounded-lg" : ""}`}>
                            {/* Header request */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {req.action_type === "edit" ? (
                                  <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                )}
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${req.action_type === "edit" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                                  {req.action_type === "edit" ? "Edit" : "Hapus"}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">{req.plant_code}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <StatusBadge status={req.status} />
                                <span className="text-[10px] text-gray-400">{timeAgo(req.requested_at)}</span>
                              </div>
                            </div>

                            {/* Info */}
                            <p className="text-xs text-gray-600 mb-1">
                              {req.action_type === "edit"
                                ? `Mengubah data: ${(req.original_data as any)?.nama_pelanggan || ""}`
                                : `Menghapus data: ${(req.original_data as any)?.nama_pelanggan || ""}`}
                            </p>

                            {/* Detail data (untuk edit) */}
                            {req.action_type === "edit" && req.original_data && req.new_data && (
                              <div className="bg-gray-50 rounded-lg p-2 mb-1 space-y-1 text-[10px]">
                                {["nama_pelanggan", "uraian_pekerjaan", "type", "volume", "harga_satuan", "sewa_cp"].map((field) => {
                                  const oldVal = (req.original_data as any)?.[field];
                                  const newVal = (req.new_data as any)?.[field];
                                  if (String(oldVal) === String(newVal)) return null;
                                  const label = field.replace(/_/g, " ");
                                  return (
                                    <div key={field} className="flex items-start gap-1">
                                      <span className="text-gray-500 capitalize min-w-[70px]">{label}:</span>
                                      <span className="text-gray-400 line-through">{oldVal ?? "—"}</span>
                                      <ArrowRight className="w-2.5 h-2.5 text-gray-300 shrink-0 mt-0.5" />
                                      <span className="text-gray-900 font-medium">{newVal ?? "—"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Info delete */}
                            {req.action_type === "delete" && req.original_data && (
                              <div className="bg-red-50 rounded-lg p-2 mb-1 text-[10px] text-red-700">
                                Data akan dihapus: <span className="font-semibold">{(req.original_data as any)?.nama_pelanggan || ""}</span>
                              </div>
                            )}

                            {/* Reviewed by */}
                            {req.status !== "pending" && req.reviewed_by && (
                              <p className="text-[10px] text-gray-400 mt-1">
                                {req.status === "approved" ? "Disetujui" : "Ditolak"} oleh: {req.reviewed_by}
                                {req.reviewed_at ? ` (${timeAgo(req.reviewed_at)})` : ""}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                  </>
                )
              ) : (
                /* ══════ ADMIN/MANAGER VIEW: Approve/Reject ══════ */
                count === 0 ? (
                  <div className="flex flex-col items-center py-10 text-gray-400">
                    <Check className="w-8 h-8 mb-2 text-green-400" />
                    <p className="text-sm font-medium">Tidak ada permintaan</p>
                    <p className="text-xs mt-0.5">Semua sudah diproses</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {/* ── Password Approval Requests ── */}
                    {isPasswordApprover && pendingPasswords.length > 0 && (
                      <>
                        <div className="px-1 py-2">
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5" />
                            Reset Password
                          </p>
                        </div>
                        {pendingPasswords.map((req) => (
                          <div key={req.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <KeyRound className="w-3.5 h-3.5 text-[#F35b04] shrink-0" />
                                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Reset Password</span>
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(req.requested_at)}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1.5">
                              Oleh: <span className="font-medium text-gray-800">{req.nama_lengkap}</span>
                              <span className="text-gray-400 ml-1">(@{req.username})</span>
                            </p>
                            <div className="bg-gray-50 rounded-lg p-2 mb-2 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-gray-500">Password baru:</span>
                                <button onClick={() => setShowNewPwd((prev) => ({ ...prev, [req.id]: !prev[req.id] }))} className="p-0.5 rounded text-gray-400 hover:text-gray-600 transition-all">
                                  {showNewPwd[req.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                              <p className="text-xs font-mono font-semibold text-gray-900">
                                {showNewPwd[req.id] ? req.new_password : "••••••••"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApprove(req.id, 'password')} disabled={processing === `approve-${req.id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50">
                                {processing === `approve-${req.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Setujui
                              </button>
                              <button onClick={() => handleReject(req.id, 'password')} disabled={processing === `reject-${req.id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50">
                                <X className="w-3 h-3" /> Tolak
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}

                    {/* ── Data Approval Requests ── */}
                    {pending.length > 0 && (
                      <>
                        {(isPasswordApprover && pendingPasswords.length > 0) && (
                          <div className="px-1 pt-3 pb-2">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Data Produksi</p>
                          </div>
                        )}
                        {pending.map((req) => (
                          <div key={req.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {req.action_type === "edit" ? <Edit3 className="w-3.5 h-3.5 text-blue-500 shrink-0" /> : <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${req.action_type === "edit" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                                  {req.action_type === "edit" ? "Edit" : "Hapus"}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">{req.plant_code}</span>
                              </div>
                              <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(req.requested_at)}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-1.5">
                              Oleh: <span className="font-medium text-gray-800">{req.requested_by}</span>
                            </p>
                            {req.action_type === "edit" && req.original_data && req.new_data && (
                              <div className="bg-gray-50 rounded-lg p-2 mb-2 space-y-1 text-[10px]">
                                {["nama_pelanggan", "uraian_pekerjaan", "type", "volume", "harga_satuan", "sewa_cp", "keterangan"].map((field) => {
                                  const oldVal = (req.original_data as any)?.[field];
                                  const newVal = (req.new_data as any)?.[field];
                                  if (String(oldVal) === String(newVal)) return null;
                                  const label = field.replace(/_/g, " ");
                                  return (
                                    <div key={field} className="flex items-start gap-1">
                                      <span className="text-gray-500 capitalize min-w-[80px]">{label}:</span>
                                      <span className="text-gray-400 line-through">{oldVal ?? "—"}</span>
                                      <ArrowRight className="w-2.5 h-2.5 text-gray-300 shrink-0 mt-0.5" />
                                      <span className="text-gray-900 font-medium">{newVal ?? "—"}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {req.action_type === "delete" && req.original_data && (
                              <div className="bg-red-50 rounded-lg p-2 mb-2 text-[10px] text-red-700">
                                Menghapus data: <span className="font-semibold">{(req.original_data as any)?.nama_pelanggan || req.record_id.slice(0, 8) + "..."}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleApprove(req.id)} disabled={processing === `approve-${req.id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all disabled:opacity-50">
                                {processing === `approve-${req.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Setujui
                              </button>
                              <button onClick={() => handleReject(req.id)} disabled={processing === `reject-${req.id}`} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all disabled:opacity-50">
                                <X className="w-3 h-3" /> Tolak
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
              <p className="text-[10px] text-gray-400 text-center">Notifikasi diperbarui setiap 30 detik</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
