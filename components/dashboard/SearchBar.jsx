import { Menu } from "lucide-react";
import { FaSearch } from "react-icons/fa";

import Profile from "./Profile";
import ThemeToggle from "../layout/ThemeToggle";

function SearchBar({ user, profile, onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-base bg-card/80 px-3 py-3 backdrop-blur-sm sm:px-4 lg:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-base bg-card text-muted transition-colors hover:text-foreground md:hidden"
          aria-label="Open dashboard menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <form className="relative min-w-0 flex-1 rounded-lg bg-indigo-300/10 sm:max-w-96">
          <input
            type="text"
            placeholder="Search projects, templates..."
            className="w-full rounded-xl bg-inherit px-3 py-2 text-sm outline-none focus:outline-none focus:ring-2 focus:ring-indigo-600/40 sm:px-4 md:text-base"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 md:block"
          >
            <FaSearch className="h-5 w-5 text-slate-400" />
          </button>
        </form>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <ThemeToggle />
        <Profile initialUser={user} initialProfile={profile} />
      </div>
    </header>
  );
}

export default SearchBar;
