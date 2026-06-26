"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import Logo from "../landing/Logo";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/app/lib/utils/utils";

import Profile from "@/components/dashboard/Profile";

const navLink = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Campaigns", href: "/dashboard/campaings" },
  { name: "Research", href: "/dashboard/research" },
  { name: "Campaign Starters", href: "/dashboard/templates" },
  { name: "Analytics", href: "/dashboard/analytics" },
];

function NavbarClient({ user, profile }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "border-b border-slate-200/60 backdrop-blur-xl dark:border-white/10",
      )}
    >
      <div className="max-w-8xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Logo />

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-12">
            {navLink.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-sm md:text-base font-medium hover:text-[#3B3CFF] transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Desktop Auth */}
            {user ? (
              <div className="hidden md:flex">
                <Profile initialUser={user} initialProfile={profile} />
              </div>
            ) : (
              <div className="hidden md:flex gap-3">
                <Link href="/signin">
                  <Button variant="outline" className="rounded-xl ">
                    Login
                  </Button>
                </Link>

                <Link href="/signup">
                  <Button className="rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF] ">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden p-2 rounded-xl "
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          className={cn(
            "md:hidden absolute top-full left-0 w-full border-base ",
            "animate-slide-down  transition-all duration-300",
            " border-b backdrop-blur-xl p-6 dark:bg-white/10 dark:text-blue-300 shadow-lg animate-fade-in",
          )}
        >
          <div className="flex flex-col items-end space-y-4">
            {navLink.map((link, index) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "text-lg font-medium hover:text-[#3B3CFF] transition-colors transform opacity-0 translate-x-",
                  "animate-slide-in-right",
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-row justify-end mt-4 gap-4 ">
            {user ? (
              <Profile initialUser={user} initialProfile={profile} />
            ) : (
              <>
                <Link href="/signin">
                  <Button variant="outline" className="rounded-xl ">
                    Login
                  </Button>
                </Link>

                <Link href="/signup">
                  <Button className="rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF] ">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

export default NavbarClient;
