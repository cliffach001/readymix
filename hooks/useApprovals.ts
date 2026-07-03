"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchPendingApprovals,
  approveRequest as approveInDb,
  rejectRequest as rejectInDb,
  fetchPendingPasswordApprovals,
  approvePasswordApproval,
  rejectPasswordApproval,
  fetchApprovalRequestsByRequester,
} from "@/lib/supabase-service";
import type { ApprovalRequestRecord, PasswordApprovalRecord } from "@/lib/supabase-service";
import { useAuth } from "@/contexts/AuthContext";

/** Kirim push notification ke user */
async function notifyUser(username: string, title: string, body: string, url?: string) {
  try {
    await fetch("/api/notifications/send-to-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, title, body, url }),
    });
  } catch {
    // silent
  }
}

const SEEN_KEY = "rm-pkm-notif-seen";

function getSeenIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(ids)));
}

export function useApprovals() {
  const { user } = useAuth();
  const [pending, setPending] = useState<ApprovalRequestRecord[]>([]);
  const [pendingPasswords, setPendingPasswords] = useState<PasswordApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State untuk Marketing — melihat status permintaan sendiri
  const [myRequests, setMyRequests] = useState<ApprovalRequestRecord[]>([]);
  const [myRequestsLoading, setMyRequestsLoading] = useState(false);
  const [seenVersion, setSeenVersion] = useState(0); // force re-render saat clear
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isApprover = user?.role === "admin" || user?.role === "manager";
  const isMarketing = user?.role === "marketing";
  // Hanya admin yang bisa menyetujui password
  const isPasswordApprover = user?.role === "admin";

  // Jumlah pending (untuk approver) + unseen (untuk marketing)
  const myPendingCount = myRequests.filter((r) => r.status === "pending").length;
  const count = isMarketing ? myPendingCount : pending.length + pendingPasswords.length;

  // Hitung yang belum dibaca (untuk marketing): approved/rejected yang belum di-clear
  // seenVersion digunakan agar React re-render saat clearMyNotifications dipanggil
  const unseenCount = (() => {
    if (!isMarketing) return 0;
    const seen = getSeenIds();
    void seenVersion; // referensi untuk memicu re-render
    return myRequests.filter((r) => r.status !== "pending" && !seen.has(r.id)).length;
  })();

  const refresh = useCallback(async () => {
    if (!isApprover) {
      setPending([]);
      setPendingPasswords([]);
      setLoading(false);
      return;
    }
    try {
      const [data, pwdData] = await Promise.all([
        fetchPendingApprovals(),
        isPasswordApprover ? fetchPendingPasswordApprovals() : Promise.resolve([]),
      ]);
      setPending(data);
      setPendingPasswords(pwdData);
      setError("");
    } catch (e) {
      console.error("Gagal memuat notifikasi:", e);
      setError("Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [isApprover, isPasswordApprover]);

  // Fetch my requests (untuk marketing)
  const fetchMyRequests = useCallback(async () => {
    if (!isMarketing || !user?.namaLengkap) return;
    setMyRequestsLoading(true);
    try {
      const data = await fetchApprovalRequestsByRequester(user.namaLengkap);
      setMyRequests(data);
    } catch (e) {
      console.error("Gagal memuat status permintaan:", e);
    } finally {
      setMyRequestsLoading(false);
    }
  }, [isMarketing, user?.namaLengkap]);

  // Clear notifikasi yang sudah dibaca (approved/rejected)
  const clearMyNotifications = useCallback(() => {
    const processed = myRequests.filter((r) => r.status !== "pending");
    const ids = new Set([...Array.from(getSeenIds()), ...processed.map((r) => r.id)]);
    saveSeenIds(ids);
    setSeenVersion((v) => v + 1); // trigger re-render
  }, [myRequests]);

  // Fetch on mount & every 30s
  useEffect(() => {
    refresh();
    fetchMyRequests();
    intervalRef.current = setInterval(() => {
      refresh();
      fetchMyRequests();
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, fetchMyRequests]);

  const approve = useCallback(
    async (id: string, type?: 'data' | 'password') => {
      if (!user?.namaLengkap) return false;

      if (type === 'password') {
        try {
          const record = pendingPasswords.find((r) => r.id === id);
          await approvePasswordApproval(id, user.namaLengkap);
          setPendingPasswords((prev) => prev.filter((r) => r.id !== id));
          // Notifikasi ke pemohon
          if (record) {
            notifyUser(record.nama_lengkap,
              "✅ Reset Password Disetujui",
              `Admin menyetujui permintaan reset password Anda`,
              "/profil"
            );
          }
          return true;
        } catch (e) {
          console.error("Gagal menyetujui password:", e);
          return false;
        }
      }

      try {
        const item = pending.find((r) => r.id === id);
        const updated = await approveInDb(id, user.namaLengkap);

        // Execute the actual action if approved
        if (updated.status === "approved") {
          const record = updated as ApprovalRequestRecord;
          if (record.action_type === "edit" && record.new_data) {
            const { updateInputData } = await import("@/lib/supabase-service");
            await updateInputData(record.record_id, record.new_data as any);
          } else if (record.action_type === "delete") {
            const { deleteInputData } = await import("@/lib/supabase-service");
            await deleteInputData(record.record_id);
          }
        }

        setPending((prev) => prev.filter((r) => r.id !== id));
        // Notifikasi ke pemohon
        if (item) {
          const actionLabel = item.action_type === "edit" ? "perubahan data" : "penghapusan data";
          notifyUser(item.requested_by,
            `✅ ${item.action_type === "edit" ? "Edit" : "Hapus"} Data Disetujui`,
            `${user.namaLengkap} menyetujui permintaan ${actionLabel} di ${item.plant_code}`,
            `/plant/${item.plant_code}`
          );
        }
        return true;
      } catch (e) {
        console.error("Gagal menyetujui:", e);
        return false;
      }
    },
    [user?.namaLengkap, pending, pendingPasswords]
  );

  const reject = useCallback(
    async (id: string, type?: 'data' | 'password') => {
      if (!user?.namaLengkap) return false;

      if (type === 'password') {
        try {
          const record = pendingPasswords.find((r) => r.id === id);
          await rejectPasswordApproval(id, user.namaLengkap);
          setPendingPasswords((prev) => prev.filter((r) => r.id !== id));
          // Notifikasi ke pemohon
          if (record) {
            notifyUser(record.nama_lengkap,
              "❌ Reset Password Ditolak",
              `Admin menolak permintaan reset password Anda`,
              "/profil"
            );
          }
          return true;
        } catch (e) {
          console.error("Gagal menolak password:", e);
          return false;
        }
      }

      try {
        const item = pending.find((r) => r.id === id);
        await rejectInDb(id, user.namaLengkap);
        setPending((prev) => prev.filter((r) => r.id !== id));
        // Notifikasi ke pemohon
        if (item) {
          const actionLabel = item.action_type === "edit" ? "perubahan data" : "penghapusan data";
          notifyUser(item.requested_by,
            `❌ ${item.action_type === "edit" ? "Edit" : "Hapus"} Data Ditolak`,
            `${user.namaLengkap} menolak permintaan ${actionLabel} di ${item.plant_code}`,
            `/plant/${item.plant_code}`
          );
        }
        return true;
      } catch (e) {
        console.error("Gagal menolak:", e);
        return false;
      }
    },
    [user?.namaLengkap, pending, pendingPasswords]
  );

  return {
    pending,
    pendingPasswords,
    myRequests,
    myRequestsLoading,
    seenVersion,
    count,
    unseenCount,
    loading,
    error,
    refresh,
    fetchMyRequests,
    clearMyNotifications,
    approve,
    reject,
    isApprover,
    isMarketing,
    isPasswordApprover,
  };
}
