"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchPendingApprovals,
  approveRequest as approveInDb,
  rejectRequest as rejectInDb,
  fetchPendingPasswordApprovals,
  approvePasswordApproval,
  rejectPasswordApproval,
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

export function useApprovals() {
  const { user } = useAuth();
  const [pending, setPending] = useState<ApprovalRequestRecord[]>([]);
  const [pendingPasswords, setPendingPasswords] = useState<PasswordApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isApprover = user?.role === "admin" || user?.role === "manager";
  // Hanya admin yang bisa menyetujui password
  const isPasswordApprover = user?.role === "admin";
  const count = pending.length + pendingPasswords.length;

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

  // Fetch on mount & every 30s
  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

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
    count,
    loading,
    error,
    refresh,
    approve,
    reject,
    isApprover,
    isPasswordApprover,
  };
}
