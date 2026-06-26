"use client";

import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/app/lib/context/NavigationContext";
import React from "react";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import GlassCard from "../ui/GlassCard";

export default function EmptyProjectsState({
  type = "projects",
  open,
  setOpen,
}) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();
  function handleClick() {
    if (type === "dashboard") {
      startNavigation();
      router.push("/dashboard/projects");
      return;
    }

    if (setOpen) {
      setOpen(true);
    }
  }
  return (
    <GlassCard className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3B3CFF]/10 to-[#FF6B6B]/10 flex items-center justify-center mx-auto mb-4">
        <FileText className="w-8 h-8 text-[#3B3CFF]" />
      </div>
      <h3
        className="
          font-semibold mb-1
          dark:text-slate-50  text-slate-900,
        "
      >
        No projects yet
      </h3>
      <p className="text-sm mb-4 dark:text-slate-500 text-slate-400">
        Create your first AI-generated content
      </p>
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B3CFF] text-white text-sm font-medium hover:bg-[#3030E0] transition-colors"
        onClick={handleClick}
      >
        <Plus className="w-4 h-4" /> Get Started
      </button>
    </GlassCard>
  );
}
