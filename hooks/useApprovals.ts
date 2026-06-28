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
          await approvePasswordApproval(id, user.namaLengkap);
          setPendingPasswords((prev) => prev.filter((r) => r.id !== id));
          return true;
        } catch (e) {
          console.error("Gagal menyetujui password:", e);
          return false;
        }
      }

      try {
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
        return true;
      } catch (e) {
        console.error("Gagal menyetujui:", e);
        return false;
      }
    },
    [user?.namaLengkap]
  );

  const reject = useCallback(
    async (id: string, type?: 'data' | 'password') => {
      if (!user?.namaLengkap) return false;

      if (type === 'password') {
        try {
          await rejectPasswordApproval(id, user.namaLengkap);
          setPendingPasswords((prev) => prev.filter((r) => r.id !== id));
          return true;
        } catch (e) {
          console.error("Gagal menolak password:", e);
          return false;
        }
      }

      try {
        await rejectInDb(id, user.namaLengkap);
        setPending((prev) => prev.filter((r) => r.id !== id));
        return true;
      } catch (e) {
        console.error("Gagal menolak:", e);
        return false;
      }
    },
    [user?.namaLengkap]
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
