"use client";

import { useState, useEffect, useCallback } from "react";
import type { InputData } from "@/lib/types-input";
import {
  fetchInputData,
  createInputData,
  updateInputData,
  deleteInputData,
} from "@/lib/supabase-service";
import type { InputDataRecord } from "@/lib/supabase-service";
import { logger } from "@/lib/logger";

// Mapping DB fields ↔ app fields
function dbToApp(rec: InputDataRecord): InputData {
  return {
    id: rec.id,
    plantId: rec.plant_code,
    tanggal: rec.tanggal,
    namaPelanggan: rec.nama_pelanggan,
    uraianPekerjaan: rec.uraian_pekerjaan,
    type: rec.type,
    volume: rec.volume,
    hargaSatuan: rec.harga_satuan,
    jumlahHarga: rec.jumlah_harga,
    sewaCP: rec.sewa_cp,
    totalHarga: rec.total_harga,
    keterangan: rec.keterangan ?? '',
    createdAt: rec.created_at,
  };
}

export interface FormInputData {
  tanggal: string;
  namaPelanggan: string;
  uraianPekerjaan: string;
  type: string;
  volume: string;
  hargaSatuan: string;
  sewaCP: string;
  keterangan: string;
}

const emptyForm: FormInputData = {
  tanggal: new Date().toISOString().split("T")[0],
  namaPelanggan: "",
  uraianPekerjaan: "",
  type: "",
  volume: "",
  hargaSatuan: "",
  sewaCP: "0",
  keterangan: "",
};

export function useInputData(plantId: string) {
  const [allData, setAllData] = useState<InputData[]>([]);
  const [form, setForm] = useState<FormInputData>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data on mount & when plantId changes
  useEffect(() => {
    setLoading(true);
    fetchInputData(plantId)
      .then((records) => setAllData(records.map(dbToApp)))
      .catch(() => logger.error("Gagal memuat data input", { tag: "InputData" }))
      .finally(() => setLoading(false));
  }, [plantId]);

  // Filter & sort
  const plantData = allData
    .filter((d) => d.plantId === plantId)
    .sort(
      (a, b) =>
        new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

  // Distinct field values for input history (from all plants)
  const fieldHistories = {
    namaPelanggan: Array.from(new Set(allData.map((d) => d.namaPelanggan).filter(Boolean))),
    uraianPekerjaan: Array.from(new Set(allData.map((d) => d.uraianPekerjaan).filter(Boolean))),
    type: Array.from(new Set(allData.map((d) => d.type).filter(Boolean))),
    keterangan: Array.from(new Set(allData.map((d) => d.keterangan).filter(Boolean))),
  };

  // Computed values
  const volume = parseFloat(form.volume) || 0;
  const hargaSatuan = parseFloat(form.hargaSatuan) || 0;
  const jumlahHarga = volume * hargaSatuan;
  const sewaCP = parseFloat(form.sewaCP) || 0;
  const totalHarga = jumlahHarga + sewaCP;

  const updateForm = useCallback(
    (field: keyof FormInputData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setForm({ ...emptyForm, tanggal: new Date().toISOString().split("T")[0] });
    setEditingId(null);
  }, []);

  const submitData = useCallback(async () => {
    if (
      !form.tanggal ||
      !form.namaPelanggan ||
      !form.uraianPekerjaan ||
      !form.volume ||
      !form.hargaSatuan
    ) {
      alert("Harap isi semua field yang wajib");
      return false;
    }

    if (volume <= 0 || hargaSatuan <= 0) {
      alert("Volume dan Harga Satuan harus lebih dari 0");
      return false;
    }

    try {
      if (editingId) {
        const updated = await updateInputData(editingId, {
          plant_code: plantId,
          tanggal: form.tanggal,
          nama_pelanggan: form.namaPelanggan,
          uraian_pekerjaan: form.uraianPekerjaan,
          type: form.type,
          volume,
          harga_satuan: hargaSatuan,
          jumlah_harga: jumlahHarga,
          sewa_cp: sewaCP,
          total_harga: totalHarga,
          keterangan: form.keterangan,
        });
        setAllData((prev) =>
          prev.map((d) => (d.id === editingId ? dbToApp(updated) : d))
        );
      } else {
        const created = await createInputData({
          plant_code: plantId,
          tanggal: form.tanggal,
          nama_pelanggan: form.namaPelanggan,
          uraian_pekerjaan: form.uraianPekerjaan,
          type: form.type,
          volume,
          harga_satuan: hargaSatuan,
          jumlah_harga: jumlahHarga,
          sewa_cp: sewaCP,
          total_harga: totalHarga,
          keterangan: form.keterangan,
        });
        setAllData((prev) => [dbToApp(created), ...prev]);
      }

      resetForm();
      return true;
    } catch (e) {
      logger.error("Gagal menyimpan data", { tag: "InputData" });
      alert("Gagal menyimpan data ke database");
      return false;
    }
  }, [
    form,
    plantId,
    volume,
    hargaSatuan,
    jumlahHarga,
    sewaCP,
    totalHarga,
    editingId,
    resetForm,
  ]);

  const editData = useCallback(
    (id: string) => {
      const entry = allData.find((d) => d.id === id);
      if (!entry) return;
      setForm({
        tanggal: entry.tanggal,
        namaPelanggan: entry.namaPelanggan,
        uraianPekerjaan: entry.uraianPekerjaan,
        type: entry.type,
        volume: entry.volume.toString(),
        hargaSatuan: entry.hargaSatuan.toString(),
        sewaCP: entry.sewaCP.toString(),
        keterangan: entry.keterangan,
      });
      setEditingId(id);
    },
    [allData]
  );

  const deleteData = useCallback(
    async (id: string) => {
      if (!confirm("Yakin ingin menghapus data ini?")) return;
      try {
        await deleteInputData(id);
        setAllData((prev) => prev.filter((d) => d.id !== id));
        if (editingId === id) resetForm();
      } catch (e) {
        logger.error("Gagal menghapus data", { tag: "InputData" });
        alert("Gagal menghapus data");
      }
    },
    [editingId, resetForm]
  );

  return {
    form,
    plantData,
    editingId,
    loading,
    computed: { volume, hargaSatuan, jumlahHarga, sewaCP, totalHarga },
    fieldHistories,
    updateForm,
    resetForm,
    submitData,
    editData,
    deleteData,
  };
}
