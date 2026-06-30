"use client";

import { useState } from "react";
import { X } from "lucide-react";

import SearchBar from "../dashboard/SearchBar";
import Sidebar from "./Sidebar";

export default function MobileDashboardShell({ children, user, profile }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-72 shrink-0 border-r border-base md:block">
        <Sidebar />
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            aria-label="Close dashboard menu"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-[min(86vw,320px)] overflow-hidden border-r border-base bg-card shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-base bg-card text-muted transition-colors hover:text-foreground"
              aria-label="Close dashboard menu"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar mobile onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <SearchBar
          user={user}
          profile={profile}
          onMenuClick={() => setOpen(true)}
        />
        {children}
      </div>
    </div>
  );
}
