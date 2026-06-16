"use client";

import React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Search,
  TrendingUp,
  FileText,
  Palette,
  Video,
  Megaphone,
  BookTemplate,
  BarChart2,
  Settings,
  Activity,
  Sparkles,
} from "lucide-react";
import { cn } from "@/app/lib/utils/utils";
import { usePathname } from "next/navigation";
import Logo from "../landing/Logo";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campaigns", href: "/dashboard/campaings", icon: FolderKanban },
  { name: "Research", href: "/dashboard/research", icon: Search },
  { name: "SEO", href: "/dashboard/seo", icon: TrendingUp },
  { name: "Content", href: "/dashboard/content", icon: FileText },
  { name: "Creative", href: "/dashboard/creative", icon: Palette },
  { name: "Video", href: "/dashboard/videoStudio", icon: Video },
  { name: "Ads", href: "/dashboard/ads", icon: Megaphone },
  { name: "Templates", href: "/dashboard/templates", icon: BookTemplate },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
  { name: "Usage", href: "/dashboard/usage", icon: Activity },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar({ currentPageName }) {
  const pathname = usePathname();

  const isActive = (href) => {
    const pageName = href.replace("/", "");
    return (
      pathname === href ||
      pathname === `/${pageName}` ||
      currentPageName === pageName
    );
  };

  return (
    <aside className="w-[290px] h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-white/[0.06] flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-white/[0.06] block hover:opacity-80 transition-opacity">
        <Logo />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm",
                active
                  ? "bg-[#3B3CFF]/10 text-[#3B3CFF] dark:bg-[#3B3CFF]/15 dark:text-indigo-400 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-900 dark:hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active
                    ? "text-[#3B3CFF] dark:text-indigo-400"
                    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300",
                )}
              />
              <span>{item.name}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3B3CFF] dark:bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-white/[0.06]">
        <div className="px-3 py-3 rounded-xl bg-gradient-to-br from-[#3B3CFF]/10 to-[#7B5CFF]/10 dark:from-[#3B3CFF]/15 dark:to-[#7B5CFF]/15">
          <p className="text-xs font-semibold text-gray-800 dark:text-white mb-0.5">
            ✨ AI Marketing OS
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
            Build & launch campaigns with AI
          </p>
        </div>
      </div>
    </aside>
  );
}
