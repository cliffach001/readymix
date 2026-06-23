"use client";

import { useState, useEffect } from "react";
import { fetchPlants } from "@/lib/supabase-service";
import type { PlantRow } from "@/lib/supabase-service";
import { useInputData } from "@/hooks/useInputData";
import FormInputDataComponent from "@/components/input-data/FormInputData";
import TabelRiwayatInput from "@/components/input-data/TabelRiwayatInput";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { getPlantName, PLANTS } from "@/lib/auth-config";

export default function InputDataPage() {
  const { user } = useAuth();
  const [plants, setPlants] = useState<PlantRow[]>([]);
  const [activePlant, setActivePlant] = useState("pangkep");
  const [loading, setLoading] = useState(true);

  // Untuk role marketing, hanya tampilkan plant sesuai unit_kerja
  const isMarketingTerbatas = user?.role === "marketing" && user?.unitKerja;

  useEffect(() => {
    fetchPlants()
      .then((data) => {
        // Filter jika marketing dengan unit kerja tertentu
        const filtered = isMarketingTerbatas
          ? data.filter((p) => p.id === user!.unitKerja)
          : data;
        setPlants(filtered);
        if (filtered.length > 0) setActivePlant(filtered[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isMarketingTerbatas, user]);

  const activePlantInfo = plants.find((p) => p.id === activePlant);

  const {
    form,
    plantData,
    editingId,
    loading: dataLoading,
    computed,
    updateForm,
    resetForm,
    submitData,
    editData,
    deleteData,
  } = useInputData(activePlant);

  return (
    <ProtectedRoute route="input-data">
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Input Data Produksi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Input data produksi harian per pelanggan
          {isMarketingTerbatas
            ? ` — ${getPlantName(user!.unitKerja!)}`
            : " — semua plant"}
        </p>
      </div>

      {/* Plant Selector */}
      {loading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-28 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plants.length === 1 && isMarketingTerbatas ? (
            // Marketing — tampilkan badge statis
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary-50 text-primary-700 border border-primary-200">
              <span>{plants[0].icon}</span>
              <span>{plants[0].nama}</span>
              <span className="text-[10px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-full">
                Unit Kerja
              </span>
            </div>
          ) : (
            // Admin/Manager — bisa pilih plant
            plants.map((plant) => {
              const isActive = activePlant === plant.id;
              return (
                <button
                  key={plant.id}
                  onClick={() => {
                    if (editingId) {
                      if (!confirm("Edit data akan dibatalkan. Lanjutkan?")) return;
                      resetForm();
                    }
                    setActivePlant(plant.id);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20 ring-1 ring-primary-700"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <span>{plant.icon}</span>
                  <span>{plant.nama.replace("Ready Mix ", "")}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Form + Tabel */}
      {activePlantInfo && (
        <div className="space-y-6">
          <FormInputDataComponent
            plant={{
              id: activePlantInfo.id,
              nama: activePlantInfo.nama,
              lokasi: activePlantInfo.lokasi,
              icon: activePlantInfo.icon,
            }}
            form={form}
            computed={computed}
            editingId={editingId}
            updateForm={updateForm}
            resetForm={resetForm}
            submitData={submitData}
          />

          {dataLoading ? (
            <div className="card p-8 text-center text-sm text-gray-400">
              Memuat data...
            </div>
          ) : (
            <TabelRiwayatInput
              data={plantData}
              onEdit={editData}
              onDelete={deleteData}
            />
          )}
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}
