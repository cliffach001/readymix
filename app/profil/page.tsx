"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { logger } from "@/lib/logger";
import {
  fetchUserByUsername,
  updateUser,
  uploadAvatar,
  createPasswordApproval,
} from "@/lib/supabase-service";
import type { UserRecord } from "@/lib/supabase-service";
import { getPlantName, ROLE_LABELS, PLANTS } from "@/lib/auth-config";
import { validatePassword } from "@/lib/utils";
import { notifyAdmin } from "@/lib/notify-admin";
import {
  Eye,
  EyeOff,
  Mail,
  Smartphone,
  Building2,
  User,
  Lock,
  KeyRound,
  Save,
  X,
  Loader2,
  ChevronLeft,
  ShieldCheck,
  Badge,
  Pencil,
  Camera,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const { user, updateUserField } = useAuth();
  const [profile, setProfile] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Reset password modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  // Edit profile modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nama_lengkap: "",
    email: "",
    no_handphone: "",
    no_pegawai: "",
    unit_kerja: "",
    alamat: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      try {
        const data = await fetchUserByUsername(user.email);
        setProfile(data);
      } catch (err) {
        logger.error("Gagal memuat profil", { tag: "Profile" });
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const openEditModal = () => {
    if (!profile) return;
    setEditForm({
      nama_lengkap: profile.nama_lengkap || "",
      email: profile.email || "",
      no_handphone: profile.no_handphone || "",
      no_pegawai: profile.no_pegawai || "",
      unit_kerja: profile.unit_kerja || "",
      alamat: profile.alamat || "",
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditError("");
    setEditSuccess(false);
    setShowEditModal(true);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      setEditError("Hanya file gambar yang diperbolehkan");
      return;
    }
    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setEditError("Ukuran gambar maksimal 5MB");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setEditError("");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditSuccess(false);

    if (!editForm.nama_lengkap.trim()) {
      setEditError("Nama lengkap harus diisi");
      return;
    }

    const userRole = user?.role;
    if (!userRole) return;

    setSaving(true);
    try {
      const updates: Partial<Omit<UserRecord, "id" | "created_at">> = {
        nama_lengkap: editForm.nama_lengkap.trim(),
        email: editForm.email.trim(),
        no_handphone: editForm.no_handphone.trim(),
        no_pegawai: editForm.no_pegawai.trim(),
        alamat: editForm.alamat.trim(),
        unit_kerja:
          userRole === "marketing"
            ? editForm.unit_kerja || null
            : profile?.unit_kerja || null,
      };

      // Upload avatar jika ada file baru
      let uploadedUrl: string | undefined;
      if (avatarFile) {
        uploadedUrl = await uploadAvatar(profile!.id, avatarFile);
        updates.avatar_url = uploadedUrl;
      }

      const updated = await updateUser(profile!.id, updates);
      setProfile(updated);
      setEditSuccess(true);

      // Update auth context & localStorage agar header langsung berubah
      updateUserField({
        namaLengkap: updated.nama_lengkap,
        avatar_url: uploadedUrl || updated.avatar_url || undefined,
      });

      setTimeout(() => {
        setShowEditModal(false);
        setEditSuccess(false);
      }, 1500);
    } catch (err: any) {
      logger.error("Edit profil gagal", { tag: "Profile" });
      setEditError(err?.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess(false);

    const pwdErr = validatePassword(newPassword);
    if (pwdErr) {
      setResetError(pwdErr);
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Konfirmasi password tidak cocok");
      return;
    }

    setResetting(true);
    try {
      if (!user || user.role === "admin") {
        // Admin: langsung update
        await updateUser(profile!.id, { password: newPassword.trim() });
        setResetSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess(false);
        }, 1500);
      } else {
        // Manager/Marketing: buat approval request ke admin
        await createPasswordApproval({
          user_id: profile!.id,
          username: profile!.username || user?.email || "",
          nama_lengkap: profile!.nama_lengkap || user?.namaLengkap || "",
          old_password: profile!.password,
          new_password: newPassword.trim(),
          status: "pending",
        });
        notifyAdmin({
          title: "🔑 Permintaan Reset Password",
          body: `${user?.namaLengkap || "User"} meminta reset password akun`,
          url: "/dashboard",
        });
        setResetSuccess(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowResetModal(false);
          setResetSuccess(false);
        }, 3000);
      }
    } catch (err) {
      logger.error("Reset password gagal", { tag: "Profile" });
      setResetError("Gagal mereset password");
    } finally {
      setResetting(false);
    }
  };

  if (!user) return null;

  const roleMeta = ROLE_LABELS[user.role];
  const initial = (
    profile?.nama_lengkap ||
    user.namaLengkap ||
    user.email ||
    "?"
  ).charAt(0).toUpperCase();

  const avatarSrc =
    avatarPreview || profile?.avatar_url || null;

  // ── Password criteria checklist ──
  const pwdCriteria = [
    { key: "min", label: "Minimal 8 karakter", test: (v: string) => v.length >= 8 },
    { key: "upper", label: "Huruf besar (A-Z)", test: (v: string) => /[A-Z]/.test(v) },
    { key: "lower", label: "Huruf kecil (a-z)", test: (v: string) => /[a-z]/.test(v) },
    { key: "number", label: "Angka (0-9)", test: (v: string) => /[0-9]/.test(v) },
  ];

  const isPasswordValid = pwdCriteria.every((c) => c.test(newPassword));

  return (
    <ProtectedRoute route="dashboard">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-50">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-orange-400/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-orange-600/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#F35b04] transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Dashboard
          </Link>

          {/* ── Loading ── */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F35b04] to-orange-700 animate-pulse" />
                <p className="text-sm text-gray-400">Memuat profil...</p>
              </div>
            </div>
          ) : (
            <>
              {/* ═══ Profile Header Card ═══ */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#F35b04] via-orange-600 to-orange-700 rounded-2xl shadow-lg shadow-orange-500/20 mb-6">
                <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-xl" />

                <div className="relative px-6 sm:px-10 py-8 sm:py-10 flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-8">
                  {/* Avatar — klik untuk memperbesar */}
                  <div
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/40 flex items-center justify-center shadow-xl shrink-0 overflow-hidden cursor-pointer group relative"
                    onClick={() => avatarSrc && setShowPhotoModal(true)}
                  >
                    {avatarSrc ? (
                      <>
                        <img
                          src={avatarSrc}
                          alt={profile?.nama_lengkap || "Avatar"}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                          <span className="text-white/0 group-hover:text-white/90 text-xs font-medium transition-all duration-300">
                            Perbesar
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-4xl sm:text-5xl font-bold text-white drop-shadow-sm">
                        {initial}
                      </span>
                    )}
                  </div>

                  {/* User info */}
                  <div className="text-center sm:text-left flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-sm">
                      {profile?.nama_lengkap || user.namaLengkap}
                    </h1>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                        {roleMeta?.icon} {roleMeta?.label}
                      </span>
                      {profile?.unit_kerja && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                          <Building2 className="w-3.5 h-3.5" />
                          {getPlantName(profile.unit_kerja).replace(
                            "Ready Mix ",
                            ""
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge status */}
                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span className="text-xs font-medium text-white">
                      {profile?.active ? "Akun Aktif" : "Akun Nonaktif"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ═══ Main Content Grid ═══ */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left Column ── */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Profile Details Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-gray-900">
                        Informasi Profil
                      </h2>
                      <button
                        onClick={openEditModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-[#F35b04] text-xs font-semibold hover:bg-orange-100 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit Profil
                      </button>
                    </div>
                    <div className="p-6 space-y-5">
                      {/* Nama Lengkap */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Nama Lengkap
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {profile?.nama_lengkap || user.namaLengkap || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* Email */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <Mail className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Email
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {profile?.email || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* No. Pegawai */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <Badge className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            No. Pegawai
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {profile?.no_pegawai || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* No. Handphone */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            No. Handphone
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {profile?.no_handphone || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* Unit Kerja */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Unit Kerja
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {profile?.unit_kerja
                              ? getPlantName(profile.unit_kerja)
                              : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* Alamat */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Alamat
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {profile?.alamat || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h2 className="text-base font-semibold text-gray-900">
                        Keamanan Akun
                      </h2>
                    </div>
                    <div className="p-6 space-y-5">
                      {/* Username */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <KeyRound className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Username
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {profile?.username || user.email || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-gray-100" />

                      {/* Password */}
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-[#F35b04]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Password
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-semibold text-gray-900 tracking-wider">
                              {showPassword
                                ? profile?.password || "********"
                                : "••••••••"}
                            </span>
                            <button
                              onClick={() => setShowPassword(!showPassword)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#F35b04] hover:bg-orange-50 transition-all"
                              title={
                                showPassword
                                  ? "Sembunyikan password"
                                  : "Tampilkan password"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Reset Password Button */}
                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                            <Lock className="w-5 h-5 text-[#F35b04]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Reset Password
                            </p>
                            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                              Anda dapat mereset password akun Anda. Pastikan
                              password baru cukup kuat dan tidak mudah ditebak.
                            </p>
                            <button
                              onClick={() => {
                                setShowResetModal(true);
                                setResetSuccess(false);
                                setResetError("");
                                setNewPassword("");
                                setConfirmPassword("");
                                setShowNewPassword(false);
                                setShowConfirmPassword(false);
                              }}
                              className="mt-3 py-2 px-4 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 flex items-center justify-center gap-2"
                            >
                              <Lock className="w-4 h-4" />
                              Reset Password
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Right Column ── */}
                <div className="space-y-6">
                  {/* Quick Info Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                      <h2 className="text-base font-semibold text-gray-900">
                        Info Akun
                      </h2>
                    </div>
                    <div className="p-6 space-y-4">
                      {/* Role */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Role</span>
                        <span className="text-sm font-medium text-gray-900">
                          {roleMeta?.icon} {roleMeta?.label}
                        </span>
                      </div>
                      <div className="border-t border-gray-100" />

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Status</span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            profile?.active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              profile?.active ? "bg-green-500" : "bg-red-500"
                            }`}
                          />
                          {profile?.active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <div className="border-t border-gray-100" />

                      {/* Created At */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Bergabung</span>
                        <span className="text-sm font-medium text-gray-900">
                          {profile?.created_at
                            ? new Date(profile.created_at).toLocaleDateString(
                                "id-ID",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }
                              )
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ════════════════════════════════════════ */}
        {/* Edit Profil Modal */}
        {/* ════════════════════════════════════════ */}
        {showEditModal && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => !saving && setShowEditModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 animate-[slideUp_0.3s_ease-out] overflow-y-auto max-h-[95vh]">
                <style>{`
                  @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>

                {/* Header */}
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                      <Pencil className="w-4 h-4 text-[#F35b04]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Edit Profil
                      </h3>
                      <p className="text-xs text-gray-400">
                        {profile?.username || user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !saving && setShowEditModal(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                  {/* Success */}
                  {editSuccess && (
                    <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Profil berhasil diperbarui!</span>
                    </div>
                  )}

                  {/* Error */}
                  {editError && (
                    <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                      <X className="w-4 h-4 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  {/* ── Photo Upload ── */}
                  <div className="flex flex-col items-center gap-3 pb-4 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Foto Profil
                    </p>
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-full border-4 border-orange-100 overflow-hidden bg-gray-100 flex items-center justify-center">
                        {avatarPreview || profile?.avatar_url ? (
                          <img
                            src={avatarPreview || profile!.avatar_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-orange-50 to-orange-100">
                            <Camera className="w-8 h-8 text-orange-300" />
                          </div>
                        )}
                      </div>

                      {/* Hover overlay */}
                      <div
                        className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-[#F35b04] font-medium hover:underline"
                    >
                      {avatarPreview || profile?.avatar_url
                        ? "Ganti Foto"
                        : "Upload Foto"}
                    </button>
                    <p className="text-[10px] text-gray-400">
                      Maks 5MB · Format JPEG, PNG, WebP
                    </p>
                  </div>

                  {/* ── Form Fields ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nama Lengkap */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.nama_lengkap}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            nama_lengkap: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-[#F35b04] focus:bg-white focus:ring-4 focus:ring-[#F35b04]/10 outline-none transition-all"
                        placeholder="Nama lengkap"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-[#F35b04] focus:bg-white focus:ring-4 focus:ring-[#F35b04]/10 outline-none transition-all"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    {/* No. Pegawai */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        No. Pegawai
                      </label>
                      <div className="relative">
                        <Badge className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editForm.no_pegawai}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              no_pegawai: e.target.value,
                            }))
                          }
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-[#F35b04] focus:bg-white focus:ring-4 focus:ring-[#F35b04]/10 outline-none transition-all"
                          placeholder="Nomor pegawai"
                        />
                      </div>
                    </div>

                    {/* No. Handphone */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        No. Handphone
                      </label>
                      <div className="relative">
                        <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="tel"
                          value={editForm.no_handphone}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              no_handphone: e.target.value,
                            }))
                          }
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-[#F35b04] focus:bg-white focus:ring-4 focus:ring-[#F35b04]/10 outline-none transition-all"
                          placeholder="08xxxxxxxxxx"
                        />
                      </div>
                    </div>

                    {/* Alamat */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Alamat
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                        <textarea
                          value={editForm.alamat}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              alamat: e.target.value,
                            }))
                          }
                          rows={2}
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-[#F35b04] focus:bg-white focus:ring-4 focus:ring-[#F35b04]/10 outline-none transition-all resize-none"
                          placeholder="Alamat lengkap"
                        />
                      </div>
                    </div>

                    {/* Unit Kerja — hanya lihat, tidak bisa diubah */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                        Unit Kerja
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={
                            profile?.unit_kerja
                              ? getPlantName(profile.unit_kerja)
                              : "-"
                          }
                          disabled
                          className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-100 text-sm text-gray-500 cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <button
                      type="submit"
                      disabled={saving || editSuccess}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : editSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Tersimpan!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Simpan Perubahan
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════ */}
        {/* Lightbox Foto Profil — klik avatar untuk memperbesar */}
        {/* ════════════════════════════════════════ */}
        {showPhotoModal && avatarSrc && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowPhotoModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="relative max-w-lg w-full animate-[fadeIn_0.25s_ease-out]">
                <style>{`
                  @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                  }
                `}</style>

                {/* Close button */}
                <button
                  onClick={() => setShowPhotoModal(false)}
                  className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Image */}
                <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80">
                  <img
                    src={avatarSrc}
                    alt={profile?.nama_lengkap || "Foto Profil"}
                    className="w-full h-auto max-h-[75vh] object-contain bg-gray-100"
                  />
                </div>

                {/* Caption */}
                <p className="text-center text-sm text-white/70 mt-3 font-medium">
                  {profile?.nama_lengkap || "Foto Profil"}
                </p>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════ */}
        {/* Reset Password Modal */}
        {/* ════════════════════════════════════════ */}
        {showResetModal && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => !resetting && setShowResetModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 animate-[slideUp_0.3s_ease-out] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
                      <Lock className="w-4 h-4 text-[#F35b04]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Reset Password
                      </h3>
                      <p className="text-xs text-gray-400">
                        {profile?.username || user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => !resetting && setShowResetModal(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                  {resetSuccess && (
                    <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>
                        {!user || user.role === "admin"
                          ? "Password berhasil diubah!"
                          : "Permintaan reset password telah dikirim ke Admin untuk disetujui"}
                      </span>
                    </div>
                  )}

                  {resetError && (
                    <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm">
                      <X className="w-4 h-4 shrink-0" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  {/* Password Baru */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Password Baru
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-[#F35b04] focus:bg-white focus:ring-4 focus:ring-[#F35b04]/10 outline-none transition-all"
                        placeholder="Masukkan password baru"
                        disabled={resetting || resetSuccess}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Password Criteria Checklist ── */}
                  {newPassword && (
                    <div className="bg-gradient-to-br from-gray-50 to-orange-50/40 rounded-xl border border-gray-100 p-4 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                      <style>{`
                        @keyframes fadeIn {
                          from { opacity: 0; transform: translateY(-4px); }
                          to { opacity: 1; transform: translateY(0); }
                        }
                      `}</style>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Kriteria Password
                      </p>
                      {pwdCriteria.map((c) => {
                        const passed = c.test(newPassword);
                        return (
                          <div key={c.key} className="flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                passed
                                  ? "bg-green-500 shadow-sm shadow-green-200"
                                  : "bg-gray-200"
                              }`}
                            >
                              {passed ? (
                                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              )}
                            </div>
                            <span
                              className={`text-xs font-medium transition-all duration-200 ${
                                passed ? "text-green-700" : "text-gray-400"
                              }`}
                            >
                              {c.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Konfirmasi Password */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2.5 border-2 rounded-xl bg-gray-50 text-sm focus:ring-4 outline-none transition-all placeholder:text-gray-300"
                        style={{
                          borderColor: !confirmPassword
                            ? "#e5e7eb"
                            : confirmPassword === newPassword && isPasswordValid
                            ? "#22c55e"
                            : "#ef4444",
                          backgroundColor: !confirmPassword ? "" : confirmPassword === newPassword && isPasswordValid ? "#f0fdf4" : "#fef2f2",
                          boxShadow: !confirmPassword
                            ? "none"
                            : confirmPassword === newPassword && isPasswordValid
                            ? "0 0 0 4px rgba(34,197,94,0.1)"
                            : "0 0 0 4px rgba(239,68,68,0.1)",
                        }}
                        placeholder="Ketik ulang password baru"
                        disabled={resetting || resetSuccess}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Match indicator */}
                    {confirmPassword && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {confirmPassword === newPassword && isPasswordValid ? (
                          <>
                            <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span className="text-[11px] font-medium text-green-600">Password cocok</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <span className="text-[11px] font-medium text-red-400">Password tidak cocok</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Strength bar */}
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => {
                          const filled =
                            (newPassword.length >= 4 && level <= 1) ||
                            (newPassword.length >= 6 && level <= 2) ||
                            (isPasswordValid && level <= 3) ||
                            (isPasswordValid && newPassword.length >= 10 && level <= 4);
                          return (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                filled
                                  ? newPassword.length >= 10 && isPasswordValid
                                    ? "bg-green-500"
                                    : isPasswordValid
                                    ? "bg-emerald-400"
                                    : "bg-amber-400"
                                  : "bg-gray-200"
                              }`}
                            />
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-gray-400 text-right">
                        {!newPassword
                          ? ""
                          : newPassword.length < 8
                          ? "Lemah"
                          : isPasswordValid && newPassword.length >= 10
                          ? "Kuat"
                          : isPasswordValid
                          ? "Sedang"
                          : "Kurang"}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={resetting || resetSuccess || !isPasswordValid || !confirmPassword || confirmPassword !== newPassword}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#F35b04] to-orange-700 text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {resetting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Mereset...
                        </>
                      ) : resetSuccess ? (
                        <>
                          <Save className="w-4 h-4" />
                          Berhasil!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {!user || user.role === "admin" ? "Simpan Password" : "Kirim Permintaan"}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      disabled={resetting}
                      className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
