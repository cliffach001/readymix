"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  LogOut,
  User,
  ChevronDown,
  ChevronRight,
  Users,
  Factory,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessibleRoutes, ROLE_LABELS, getPlantName, getRoleGreeting, PLANTS } from "@/lib/auth-config";
import type { RouteKey } from "@/lib/auth-types";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Laporan Mingguan",
    href: "/laporan-mingguan",
    icon: ClipboardList,
  },
  {
    title: "Kelola Pengguna",
    href: "/kelola-pengguna",
    icon: Users,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showPlants, setShowPlants] = useState(false);

  // Filter menu berdasarkan role user
  const accessibleRoutes = user
    ? getAccessibleRoutes(user.role)
    : ([] as RouteKey[]);
  const filteredItems = menuItems.filter((item) =>
    accessibleRoutes.includes(item.href.replace("/", "") as RouteKey)
  );

  if (!user) return null;

  const roleMeta = ROLE_LABELS[user.role];

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] bg-[#FF6600] text-white flex-col hidden lg:flex">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center p-1.5">
            <Image
              src="/logo.png"
              alt="Logo PKM"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight truncate">{user.email}</h1>
            <p className="text-[10px] text-white/70 leading-tight">
              {roleMeta.label}
              {user.unitKerja && (
                <span className="ml-1 inline-flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded-full">
                  {getPlantName(user.unitKerja).replace("Ready Mix ", "")}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/75 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    isActive ? "text-white" : "text-white/55"
                  )}
                />
                <span>{item.title}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </Link>
            );
          })}

          {/* Data Plant — collapsible */}
          {accessibleRoutes.includes("dashboard" as RouteKey) && (
            <div className="pt-3">
              <button
                onClick={() => setShowPlants(!showPlants)}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white/80 transition-all"
              >
                <Factory className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Data Plant
                </span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 ml-auto transition-transform duration-200",
                    showPlants && "rotate-180"
                  )}
                />
              </button>
              {showPlants && (
                <div className="mt-1 space-y-0.5 pl-3 border-l border-white/10 ml-4">
                  {PLANTS.map((plant) => {
                    const isPlantActive = pathname === `/plant/${plant.code}`;
                    return (
                      <Link
                        key={plant.code}
                        href={`/plant/${plant.code}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                          isPlantActive
                            ? "bg-white/15 text-white"
                            : "text-white/65 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span>{plant.icon}</span>
                        <span className="truncate">{plant.name.replace("Ready Mix ", "")}</span>
                        {isPlantActive && (
                          <div className="ml-auto w-1 h-1 rounded-full bg-white" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Footer — Logout */}
        <div className="px-4 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex lg:hidden items-center justify-around bg-[#FF6600] shadow-[0_-4px_20px_rgba(255,102,0,0.3)] px-3 py-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 min-w-16",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6",
                  isActive ? "text-white" : "text-white/70"
                )}
              />
              <span className="text-[10px] font-medium leading-tight">
                {item.title === "Laporan Mingguan" ? "Laporan" : item.title}
              </span>
            </Link>
          );
        })}

        {/* Profile Icon */}
        <button
          onClick={() => setShowProfile(!showProfile)}
          className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all duration-200 min-w-16 text-white/70 hover:bg-white/10 hover:text-white relative"
        >
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xs font-bold text-white">{(user.email.charAt(0) || "?").toUpperCase()}</span>
          </div>
          <span className="text-[10px] font-medium leading-tight">Profil</span>
        </button>
      </nav>

      {/* ── Mobile Profile Popup ── */}
      {showProfile && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 lg:hidden"
            onClick={() => setShowProfile(false)}
          />

          {/* Popup */}
          <div className="fixed bottom-20 left-4 right-4 z-50 lg:hidden bg-white rounded-2xl border border-gray-200 shadow-xl shadow-black/10 overflow-hidden">
            {/* User Info */}
            <div className="p-4 flex items-center gap-3 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-[#FF6600] flex items-center justify-center text-white font-bold text-lg shrink-0">
                {(user.email.charAt(0) || "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {roleMeta.icon} {roleMeta.label}
                  {user.unitKerja && (
                    <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {getPlantName(user.unitKerja).replace("Ready Mix ", "")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400">
                <span>{roleMeta.icon}</span>
                <span className="text-xs">{getRoleGreeting(user.role, user.unitKerja)}</span>
              </div>
              <button
                onClick={() => {
                  setShowProfile(false);
                  logout();
                }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
