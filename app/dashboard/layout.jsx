import MobileDashboardShell from "@/components/layout/MobileDashboardShell";
import { getUserAndProfile } from "@/app/lib/db/getUserData";

export default async function DashboardLayout({ children }) {
  const { user, profile } = await getUserAndProfile();

  return (
    <MobileDashboardShell user={user} profile={profile}>
      <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:px-6 lg:py-8">
        <div className="mx-auto w-full max-w-screen-2xl space-y-6 lg:space-y-10">
          {children}
        </div>
      </main>
    </MobileDashboardShell>
  );
}
