import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/app/lib/utils/utils";
import { Send, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTheme } from "../theme/ThemeProvider";
import LoadingDots from "../ui/LoadingDots";
import {
  INITIAL_ASSISTANT_MESSAGES,
  buildAssistantPrompt,
  createMessage,
} from "@/app/lib/utils/assistantHelpers";

const assistantClassNames = {
  floatingButton:
    "fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-assistant-primary to-assistant-accent text-white shadow-2xl shadow-indigo-500/30 transition-all duration-200 hover:scale-105 hover:shadow-indigo-500/50 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14",
  panel:
    "fixed inset-x-3 bottom-3 z-50 flex h-[min(76vh,520px)] flex-col overflow-hidden rounded-2xl border sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[520px] sm:w-[380px]",
  panelDark:
    "bg-assistant-surfaceDark/95 border-white/[0.08] shadow-2xl shadow-black/50",
  panelLight: "bg-white/95 border-slate-200 shadow-2xl shadow-slate-300/50",
  headerIcon:
    "w-7 h-7 rounded-lg bg-gradient-to-br from-assistant-primary to-assistant-accent flex items-center justify-center",
  iconButton: "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
  messageBubble: "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
  userMessage: "bg-assistant-primary text-white rounded-br-md",
  assistantMessageDark: "bg-white/[0.06] text-slate-300 rounded-bl-md",
  assistantMessageLight: "bg-slate-100 text-slate-700 rounded-bl-md",
  sendButton:
    "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
  sendButtonActive:
    "bg-assistant-primary text-white hover:bg-assistant-primaryHover",
};

export default function AIAssistant() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_ASSISTANT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);
  const isDark = theme === "dark";
  const trimmedInput = input.trim();
  const canSend = Boolean(trimmedInput) && !loading;

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (canSend) {
      const userMessage = createMessage("user", trimmedInput);
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setInput("");
      setLoading(true);

      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: buildAssistantPrompt(nextMessages),
        });

        setMessages((prev) => [...prev, createMessage("assistant", response)]);
      } catch (error) {
        console.error("Failed to send assistant message:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const assistantContent = open ? (
    <div
      className={cn(
        assistantClassNames.panel,
        isDark ? assistantClassNames.panelDark : assistantClassNames.panelLight,
        "backdrop-blur-xl",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 border-b shrink-0",
          isDark ? "border-white/[0.06]" : "border-slate-100",
        )}
      >
        <div className="flex items-center gap-2">
          <div className={assistantClassNames.headerIcon}>
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span
            className={cn(
              "text-sm font-semibold",
              isDark ? "text-white" : "text-slate-900",
            )}
          >
            AI Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Close AI assistant"
            onClick={() => setOpen(false)}
            className={cn(
              assistantClassNames.iconButton,
              isDark
                ? "hover:bg-white/[0.08] text-slate-400"
                : "hover:bg-slate-100 text-slate-500",
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                assistantClassNames.messageBubble,
                message.role === "user"
                  ? assistantClassNames.userMessage
                  : isDark
                    ? assistantClassNames.assistantMessageDark
                    : assistantClassNames.assistantMessageLight,
              )}
            >
              {message.role === "assistant" ? (
                <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0">
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div
              className={cn(
                "rounded-2xl rounded-bl-md px-4 py-3",
                isDark ? "bg-white/[0.06]" : "bg-slate-100",
              )}
            >
              <LoadingDots />
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      <div
        className={cn(
          "px-3 py-3 border-t shrink-0",
          isDark ? "border-white/[0.06]" : "border-slate-100",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl",
            isDark ? "bg-white/[0.06]" : "bg-slate-50",
          )}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && sendMessage()}
            placeholder="Ask me anything..."
            className={cn(
              "flex-1 bg-transparent outline-none text-sm",
              isDark
                ? "text-white placeholder:text-slate-600"
                : "text-slate-900 placeholder:text-slate-400",
            )}
          />
          <button
            type="button"
            aria-label="Send message"
            onClick={sendMessage}
            disabled={!canSend}
            className={cn(
              assistantClassNames.sendButton,
              trimmedInput
                ? assistantClassNames.sendButtonActive
                : isDark
                  ? "bg-white/[0.06] text-slate-600"
                  : "bg-slate-200 text-slate-400",
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  ) : (
    <button
      type="button"
      aria-label="Open AI assistant"
      onClick={() => setOpen(true)}
      className={assistantClassNames.floatingButton}
    >
      <Sparkles className="w-6 h-6" />
    </button>
  );

  return assistantContent;
}
