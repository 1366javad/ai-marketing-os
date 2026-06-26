"use client";

import Link from "next/link";
import {
  BadgeCheck,
  CreditCard,
  Info,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { useThemeContext } from "@/app/lib/context/ThemeContext";

function SettingsView({ settings }) {
  const { isDark, mounted, setIsDark } = useThemeContext();

  return (
    <main className="flex-1 p-6">
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="mb-2 text-4xl font-bold text-gray-900 dark:text-white">
              Account
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Manage your profile, interface preferences, billing status, and
              product information.
            </p>
          </div>

          <AccountSection
            id="profile"
            icon={UserRound}
            title="Profile"
            description="Basic account identity used across AI Marketing OS."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <ReadOnlyField label="Name" value={settings?.full_name} />
              <ReadOnlyField label="Email" value={settings?.email} />
              <ReadOnlyField label="Role" value={settings?.role || "User"} />
            </div>
          </AccountSection>

          <AccountSection
            icon={isDark ? Moon : Sun}
            title="Appearance"
            description="This is a local interface preference and does not affect AI generation."
          >
            <div className="max-w-sm">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
              <select
                value={isDark ? "dark" : "light"}
                onChange={(event) => setIsDark(event.target.value === "dark")}
                disabled={!mounted}
                className="w-full cursor-pointer rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </AccountSection>

          <AccountSection
            icon={CreditCard}
            title="Billing"
            description="Billing is not configured yet. Usage is tracked separately on the Usage page."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <ReadOnlyField label="Current Plan" value="Not configured" />
              <ReadOnlyField label="Credits" value="Tracked in Usage" />
              <ReadOnlyField label="Renewal" value="Not configured" />
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
              Billing controls will appear here after subscriptions are enabled.
            </div>
          </AccountSection>

          <AccountSection
            icon={Info}
            title="About"
            description="Product and policy information."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <ReadOnlyField label="Version" value="V1" />
              <LinkField label="Terms" href="/terms" />
              <LinkField label="Privacy" href="/privacy" />
            </div>
          </AccountSection>
        </div>
      </div>
    </main>
  );
}

function AccountSection({ id, icon: Icon, title, description, children }) {
  return (
    <section
      id={id}
      className="mb-6 scroll-mt-24 rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <BadgeCheck className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
        {value || "Not set"}
      </p>
    </div>
  );
}

function LinkField({ label, href }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-gray-100 bg-gray-50 p-4 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400/30 dark:hover:bg-indigo-400/10"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <ShieldCheck className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        View {label}
      </p>
    </Link>
  );
}

export default SettingsView;
