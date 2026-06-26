"use client";

import { useState, useEffect } from "react";
import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/supabase-service";
import type { UserRecord } from "@/lib/supabase-service";
import { ROLE_LABELS, PLANTS, getPlantName } from "@/lib/auth-config";
import type { Role } from "@/lib/auth-types";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

type RoleKey = keyof typeof ROLE_LABELS;

export default function KelolaPenggunaPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [role, setRole] = useState<string>("viewer");
  const [unitKerja, setUnitKerja] = useState<string>("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadUsers = () => {
    fetchUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setNamaLengkap("");
    setRole("viewer");
    setUnitKerja("");
    setActive(true);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (user: UserRecord) => {
    setUsername(user.username);
    setPassword("");
    setNamaLengkap(user.nama_lengkap);
    setRole(user.role);
    setUnitKerja(user.unit_kerja ?? "");
    setActive(user.active);
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return alert("Username harus diisi");
    if (!editingId && !password.trim()) return alert("Password harus diisi");

    setSaving(true);
    try {
      if (editingId) {
        const data: Partial<Omit<UserRecord, "id" | "created_at">> = {
          username: username.trim(),
          nama_lengkap: namaLengkap,
          role,
          unit_kerja: role === "marketing" ? unitKerja || null : null,
          active,
        };
        if (password.trim()) data.password = password.trim();
        await updateUser(editingId, data);
      } else {
        await createUser({
          username: username.trim(),
          password: password.trim(),
          nama_lengkap: namaLengkap,
          role,
          unit_kerja: role === "marketing" ? unitKerja || null : null,
          active,
        });
      }
      resetForm();
      loadUsers();
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Yakin ingin menghapus pengguna "${username}"?`)) return;
    try {
      await deleteUser(id);
      loadUsers();
    } catch (e) {
      console.error(e);
      alert("Gagal menghapus data");
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    try {
      await updateUser(user.id, { active: !user.active });
      loadUsers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ProtectedRoute route="kelola-pengguna">
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Kelola Pengguna
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manajemen akun pengguna sistem
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F35b04] text-white text-sm font-medium hover:bg-orange-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengguna
        </button>
      </div>

      {/* Form Tambah/Edit — Popup */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={resetForm}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingId ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                </h2>
                <button onClick={resetForm} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
                placeholder="Username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {!editingId && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
                placeholder={editingId ? "Kosongkan jika tidak diubah" : "Password"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04]"
                placeholder="Nama lengkap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (e.target.value !== "marketing") setUnitKerja("");
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] bg-white"
              >
                {Object.entries(ROLE_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.icon} {val.label}</option>
                ))}
              </select>
            </div>
            {role === "marketing" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Kerja (Plant) <span className="text-red-500">*</span>
                </label>
                <select
                  value={unitKerja}
                  onChange={(e) => setUnitKerja(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F35b04]/20 focus:border-[#F35b04] bg-white"
                >
                  <option value="">-- Pilih Plant --</option>
                  {PLANTS.map((p) => (
                    <option key={p.code} value={p.code}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#F35b04] focus:ring-[#F35b04]/20"
                />
                <span className="text-sm text-gray-700">Aktif</span>
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F35b04] text-white text-sm font-medium hover:bg-orange-700 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all"
              >
                Batal
              </button>
            </div>
          </form>
            </div>
          </div>
        </>
      )}

      {/* Tabel Pengguna */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Username</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Lengkap</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Unit Kerja</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    Belum ada pengguna
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const roleMeta = ROLE_LABELS[user.role as RoleKey] ?? {
                    label: user.role,
                    description: "",
                    icon: "👤",
                  };
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                      <td className="px-4 py-3 text-gray-600">{user.nama_lengkap || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                          {roleMeta.icon} {roleMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.unit_kerja ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                            {PLANTS.find((p) => p.code === user.unit_kerja)?.icon}{" "}
                            {getPlantName(user.unit_kerja).replace("Ready Mix ", "")}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(user)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
