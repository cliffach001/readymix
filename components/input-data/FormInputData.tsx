"use client";

import type { FormInputData } from "@/hooks/useInputData";
import { InfoPlant } from "@/lib/data";
import { Save, RotateCcw, Edit3 } from "lucide-react";

interface FormInputDataProps {
  plant: InfoPlant;
  form: FormInputData;
  computed: {
    volume: number;
    hargaSatuan: number;
    jumlahHarga: number;
    sewaCP: number;
    totalHarga: number;
  };
  editingId: string | null;
  updateForm: (field: keyof FormInputData, value: string) => void;
  resetForm: () => void;
  submitData: () => Promise<boolean>;
}

export default function FormInputDataComponent({
  plant,
  form,
  computed,
  editingId,
  updateForm,
  resetForm,
  submitData,
}: FormInputDataProps) {
  const formatCurrency = (val: number) =>
    val.toLocaleString("id-ID");

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{plant.icon}</span>
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {editingId ? "Edit Data" : "Input Data"} — {plant.nama}
            </h3>
            <p className="text-xs text-gray-500">{plant.lokasi}</p>
          </div>
        </div>
        {editingId && (
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
            <Edit3 className="w-3 h-3" />
            Mode Edit
          </span>
        )}
      </div>

      <div className="card-body">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await submitData();
          }}
          className="space-y-5"
        >
          {/* Row 1: Tanggal + Pelanggan + Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tanggal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.tanggal}
                onChange={(e) => updateForm("tanggal", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                required
              />
            </div>

            {/* Nama Pelanggan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Pelanggan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.namaPelanggan}
                onChange={(e) => updateForm("namaPelanggan", e.target.value)}
                placeholder="Cth: PT. ABC Mandiri"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => updateForm("type", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition bg-white"
              >
                <option value="">-- Pilih Type --</option>
                <option value="Ready Mix K225">Ready Mix K225</option>
                <option value="Ready Mix K250">Ready Mix K250</option>
                <option value="Ready Mix K300">Ready Mix K300</option>
                <option value="Ready Mix K350">Ready Mix K350</option>
                <option value="Ready Mix K400">Ready Mix K400</option>
                <option value="Ready Mix K450">Ready Mix K450</option>
                <option value="Ready Mix K500">Ready Mix K500</option>
                <option value="Beton Mass">Beton Mass</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>

          {/* Row 2: Uraian Pekerjaan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uraian Pekerjaan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.uraianPekerjaan}
              onChange={(e) => updateForm("uraianPekerjaan", e.target.value)}
              placeholder="Cth: Pengecoran Jalan Taman Sari"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none"
              required
            />
          </div>

          {/* Row 3: Volume + Harga Satuan + Sewa CP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Volume */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Volume (m³) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.volume}
                onChange={(e) => updateForm("volume", e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                required
              />
            </div>

            {/* Harga Satuan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Satuan (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.hargaSatuan}
                onChange={(e) => updateForm("hargaSatuan", e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                required
              />
            </div>

            {/* Sewa CP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sewa CP / Pompa (Rp)
              </label>
              <input
                type="number"
                value={form.sewaCP}
                onChange={(e) => updateForm("sewaCP", e.target.value)}
                placeholder="0"
                min="0"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
              />
            </div>
          </div>

          {/* Auto Calculation Preview */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Kalkulasi Otomatis
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-0.5">Jumlah Harga</p>
                <p className="text-lg font-bold text-primary-600">
                  Rp {formatCurrency(computed.jumlahHarga)}
                </p>
                <p className="text-[10px] text-gray-400">
                  {computed.volume} m³ × Rp {formatCurrency(computed.hargaSatuan)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-100">
                <p className="text-xs text-gray-500 mb-0.5">Sewa CP</p>
                <p className="text-lg font-bold text-emerald-600">
                  Rp {formatCurrency(computed.sewaCP)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-3 border-2 border-primary-100 bg-primary-50/30">
                <p className="text-xs text-gray-500 mb-0.5">Total Harga</p>
                <p className="text-lg font-bold text-gray-900">
                  Rp {formatCurrency(computed.totalHarga)}
                </p>
                <p className="text-[10px] text-gray-400">
                  Rp {formatCurrency(computed.jumlahHarga)} + Rp{" "}
                  {formatCurrency(computed.sewaCP)}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              {editingId ? "Simpan Perubahan" : "Simpan Data"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
