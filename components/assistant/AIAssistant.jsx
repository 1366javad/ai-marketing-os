import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../theme/ThemeProvider";
import { cn } from "@/lib/utils";
import { Sparkles, X, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LoadingDots from "../ui/LoadingDots";
import ReactMarkdown from "react-markdown";

export default function AIAssistant() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI assistant. Ask me anything about content creation, writing tips, or how to use the studio.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const conversationHistory = [...messages, userMsg]
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful AI content assistant. You help users with writing, content creation, and using the AI Content Studio app. Keep responses concise and helpful.\n\nConversation:\n${conversationHistory}\n\nassistant:`,
    });
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
    setLoading(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3B3CFF] to-[#7B5CFF] text-white shadow-2xl shadow-indigo-500/30 transition-all duration-200 hover:scale-105 hover:shadow-indigo-500/50 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 flex h-[min(76vh,520px)] flex-col overflow-hidden rounded-2xl border sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px]",
        theme === "dark"
          ? "bg-[#13141b]/95 border-white/[0.08] shadow-2xl shadow-black/50"
          : "bg-white/95 border-slate-200 shadow-2xl shadow-slate-300/50",
        "backdrop-blur-xl",
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b shrink-0",
          theme === "dark" ? "border-white/[0.06]" : "border-slate-100",
        )}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3B3CFF] to-[#7B5CFF] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span
            className={cn(
              "text-sm font-semibold",
              theme === "dark" ? "text-white" : "text-slate-900",
            )}
          >
            AI Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(false)}
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
              theme === "dark"
                ? "hover:bg-white/[0.08] text-slate-400"
                : "hover:bg-slate-100 text-slate-500",
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                msg.role === "user"
                  ? "bg-[#3B3CFF] text-white rounded-br-md"
                  : theme === "dark"
                    ? "bg-white/[0.06] text-slate-300 rounded-bl-md"
                    : "bg-slate-100 text-slate-700 rounded-bl-md",
              )}
            >
              {msg.role === "assistant" ? (
                <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0">
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className={cn(
                "rounded-2xl rounded-bl-md px-4 py-3",
                theme === "dark" ? "bg-white/[0.06]" : "bg-slate-100",
              )}
            >
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      {/* Input */}
      <div
        className={cn(
          "px-3 py-3 border-t shrink-0",
          theme === "dark" ? "border-white/[0.06]" : "border-slate-100",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl",
            theme === "dark" ? "bg-white/[0.06]" : "bg-slate-50",
          )}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask me anything..."
            className={cn(
              "flex-1 bg-transparent outline-none text-sm",
              theme === "dark"
                ? "text-white placeholder:text-slate-600"
                : "text-slate-900 placeholder:text-slate-400",
            )}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
              input.trim()
                ? "bg-[#3B3CFF] text-white hover:bg-[#3030E0]"
                : theme === "dark"
                  ? "bg-white/[0.06] text-slate-600"
                  : "bg-slate-200 text-slate-400",
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
