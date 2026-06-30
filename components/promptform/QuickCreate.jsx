import Link from "next/link";
import { DropdownMenuRadioGroupDemo } from "../dashboard/DropdownMenuRadioGroupDemo";
import Filtrs from "../templates/Filtest";

function QuickCreate({ onClose }) {
  return (
    <main className="flex-1 p-3 sm:p-6">
      <div className="border rounded-lg border-base mb-2 max-w-20 px-2 py-1 text-base">
        <button onClick={onClose}>&larr; Back</button>
      </div>
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Content Settings */}
            <div className="space-y-4 rounded-2xl border border-base p-4 shadow-lg backdrop-blur-xl transition-all duration-200 hover:bg-white hover:border-slate-400/60 hover:shadow-xl dark:hover:bg-gray-800/30 sm:p-6">
              <h3 className="font-semibold text-sm md:text-lg flex items-center gap-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-file-text w-4 h-4 text-[#3B3CFF]"
                >
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                  <path d="M10 9H8" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                </svg>
                Content Settings
              </h3>

              <input
                placeholder="Content title"
                className="w-full rounded-xl px-4 py-3 text-sm md:text-base outline-none transition-all duration-200 border border-base dark:bg-indigo-400/5 placeholder:text-slate-400 focus:border-indigo-300 focus:shadow-sm"
                defaultValue=""
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Filtrs
                  options={[
                    " English",
                    "Spanish",
                    "French",
                    "German",
                    "Portuguese",
                    "Arabic",
                    "Chinese",
                  ]}
                  labels="Language"
                  className={"dark:bg-indigo-400/5 py-2 "}
                />
                <Filtrs
                  options={[
                    "Professional",
                    "Casual",
                    "Creative",
                    "Academic",
                    "Persuasive",
                    "Friendly",
                    "Formal",
                  ]}
                  labels="Tone"
                  className={"dark:bg-indigo-400/5 py-2"}
                />
              </div>

              <textarea
                placeholder="Content instructions (optional)..."
                rows={2}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200 border border-base dark:bg-indigo-400/5 text-slate-900 placeholder:text-slate-400 focus:border-indigo-300 focus:shadow-sm resize-none"
              />
            </div>

            {/* Prompt */}
            <div className="space-y-4 rounded-2xl border border-base p-4 shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-slate-400/60 hover:shadow-xl dark:hover:bg-gray-800/30 sm:p-6">
              <h3 className="font-semibold text-sm md:text- lg flex items-center gap-2 ">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-sparkles w-4 h-4 text-[#FF6B6B]"
                >
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                  <path d="M20 3v4" />
                  <path d="M22 5h-4" />
                  <path d="M4 17v2" />
                  <path d="M5 18H3" />
                </svg>
                Prompt
              </h3>

              <textarea
                placeholder="Write your prompt here... Be specific about what you want the AI to generate."
                rows={6}
                className="w-full rounded-xl px-4 py-3 text-sm md:text-lg outline-none transition-all duration-200 border border-base dark:bg-indigo-400/5  placeholder:text-slate-400 focus:border-indigo-300 focus:shadow-sm resize-none"
              />

              <div className="flex items-center gap-3">
                <button
                  disabled
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 bg-slate-300  dark:bg-cyan-950 cursor-not-allowed"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-sparkles w-4 h-4"
                  >
                    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
                    <path d="M20 3v4" />
                    <path d="M22 5h-4" />
                    <path d="M4 17v2" />
                    <path d="M5 18H3" />
                  </svg>
                  Generate
                </button>
              </div>
            </div>
          </div>

          {/* Output Preview */}
          <div>
            <div className="flex min-h-[420px] flex-col rounded-2xl border border-base p-4 shadow-lg backdrop-blur-xl transition-all duration-200 hover:border-slate-400/60 hover:shadow-xl dark:hover:bg-gray-800/30 sm:min-h-[500px] sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-slate-900">
                  Output Preview
                </h3>
              </div>

              <div className="flex-1">
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 ">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-file-text w-8 h-8 text-blue-700/60"
                    >
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      <path d="M10 9H8" />
                      <path d="M16 13H8" />
                      <path d="M16 17H8" />
                    </svg>
                  </div>

                  <p className="text-sm md:text-lg font-medium mb-1 ">
                    Your AI output will appear here
                  </p>
                  <p className="text-xs md:text-base">
                    Write a prompt and hit Generate to get started
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuRadioGroupDemo />
          </div>
        </div>

        {/* Floating Action Button */}
        <button className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B3CFF] to-[#7B5CFF] text-white shadow-2xl shadow-indigo-500/30 transition-all duration-200 hover:scale-105 hover:shadow-indigo-500/50 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-sparkles w-6 h-6"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
          </svg>
        </button>
      </div>
    </main>
  );
}

export default QuickCreate;
