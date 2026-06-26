"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ClipboardList,
  ChevronDown,
  Users,
  Factory,
  Target,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getAccessibleRoutes, ROLE_LABELS, getPlantName, PLANTS } from "@/lib/auth-config";
import type { RouteKey } from "@/lib/auth-types";


const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Lap. Mingguan",
    href: "/laporan-mingguan",
    icon: ClipboardList,
  },
  {
    title: "Presentasi",
    href: "/presentasi",
    icon: BarChart3,
  },
  {
    title: "RKAP",
    href: "/rkap",
    icon: Target,
  },
  {
    title: "Pengguna",
    href: "/kelola-pengguna",
    icon: Users,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
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

  const sidebarContent = (
    <>
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center p-1.5">
          <Image
            src="/logo.png"
            alt="Logo PKM"
            width={0}
            height={0}
            sizes="36px"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold leading-tight truncate text-white">{user.namaLengkap}</h1>
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
        {(() => {
          const dashboardItem = filteredItems.find((i) => i.href === "/dashboard");
          const otherItems = filteredItems.filter((i) => i.href !== "/dashboard");
          return (
            <>
              {/* Dashboard always first */}
              {dashboardItem && (() => {
                const isActive = pathname === dashboardItem.href;
                const Icon = dashboardItem.icon;
                return (
                  <Link
                    key={dashboardItem.href}
                    href={dashboardItem.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/75 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-white/55")} />
                    <span>{dashboardItem.title}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </Link>
                );
              })()}

              {/* Ready Mix — collapsible (after Dashboard) */}
              {accessibleRoutes.includes("dashboard" as RouteKey) && (
                <div>
                  <button
                    onClick={() => setShowPlants(!showPlants)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white/80 transition-all"
                  >
                    <Factory className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Ready Mix
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
                      {(user?.role === "marketing" && user?.unitKerja
                        ? PLANTS.filter((p) => p.code === user.unitKerja)
                        : PLANTS
                      ).map((plant) => {
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
                            {isPlantActive && <div className="ml-auto w-1 h-1 rounded-full bg-white" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Other menu items */}
              {otherItems.map((item) => {
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
                    <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-white" : "text-white/55")} />
                    <span>{item.title}</span>
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </Link>
                );
              })}
            </>
          );
        })()}
      </nav>
    </>
  );

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] bg-[#F35b04] text-white flex-col hidden lg:flex">
      {sidebarContent}
    </aside>
  );
}
