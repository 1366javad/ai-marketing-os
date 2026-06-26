import { FaSearch } from "react-icons/fa";

import Profile from "./Profile";
import ThemeToggle from "../layout/ThemeToggle";

function SearchBar({ user, profile }) {
  return (
    <header className="h-16 border-b border-base bg-card/80 backdrop-blur-sm sticky top-0 z-30 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Mobile menu button if needed */}
        <div className="md:hidden">☰</div>
        <form className=" bg-indigo-300/10 relative w-60 md:w-96 rounded-lg ">
          <input
            type="text"
            placeholder="Search projects, templates..."
            className=" text-xs md:text-lg outline-none bg-inherit w-full rounded-xl px-4 py-2  focus:outline-none focus:ring-2 focus:ring-indigo-600/40"
          />
          <button className="top-3 w-5 h-5 right-3 hidden md:block absolute">
            <FaSearch className="w-5 h-5 text-slate-400 " />
          </button>
        </form>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Profile initialUser={user} initialProfile={profile} />
      </div>
    </header>
  );
}

export default SearchBar;
