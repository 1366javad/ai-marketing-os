"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/app/lib/utils/utils";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

import {
  FileText,
  Mail,
  Newspaper,
  Globe,
  BookOpen,
  Linkedin,
  Instagram,
  Sparkles,
  Download,
  Save,
  Loader2,
  Copy,
  Check,
} from "lucide-react";

const CONTENT_TYPES = [
  {
    id: "blog",
    label: "Blog Post",
    icon: FileText,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  {
    id: "newsletter",
    label: "Newsletter",
    icon: Newspaper,
    color:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    id: "landing",
    label: "Landing Page",
    icon: Globe,
    color:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  },
  {
    id: "case_study",
    label: "Case Study",
    icon: BookOpen,
    color: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
  },
  {
    id: "linkedin",
    label: "LinkedIn Post",
    icon: Linkedin,
    color: "bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-400",
  },
  {
    id: "instagram",
    label: "Instagram Caption",
    icon: Instagram,
    color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
  },
];

export default function ContentTab({ campaign, outputs = [] }) {
  const searchParams = useSearchParams();
  const streamRef = useRef(null);
  const { toast } = useToast();

  const initialType = searchParams.get("type") || "blog";

  const latestOutput = outputs?.[0];

  const [selectedType, setSelectedType] = useState(
    latestOutput?.type || initialType,
  );
  const [prompt, setPrompt] = useState(latestOutput?.prompt || "");
  const [content, setContent] = useState(latestOutput?.content || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (streamRef.current) clearTimeout(streamRef.current);
    };
  }, []);

  const streamText = (fullText) => {
    const words = fullText.split(" ");
    let i = 0;

    setContent("");

    const tick = () => {
      if (i >= words.length) {
        setIsGenerating(false);
        return;
      }

      const chunk = words.slice(i, i + 2).join(" ");
      i += 2;

      setContent((prev) => (prev ? `${prev} ${chunk}` : chunk));

      streamRef.current = setTimeout(tick, 90 + Math.random() * 80);
    };

    tick();
  };

  const currentType = CONTENT_TYPES.find((t) => t.id === selectedType);

  const generate = async () => {
    try {
      if (!prompt.trim()) return;

      if (streamRef.current) clearTimeout(streamRef.current);

      setIsGenerating(true);
      setContent("");

      const response = await fetch(
        `/api/campaigns/${campaign.id}/content/generate`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            type: selectedType,

            title: `${campaign.name} ${currentType?.label}`,

            prompt,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      streamText(data.output.content);
    } catch (error) {
      console.error(error);

      toast({
        variant: "destructive",
        title: "Error in creating content",
        description:
          "There was a problem connecting to Model. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportTxt = () => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign.name}-${currentType.label}.txt`;
    a.click();
  };

  const inputCls =
    "w-full px-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B3CFF]/20 focus:border-[#3B3CFF]/50 transition-all resize-none";

  return (
    <div className="space-y-5">
      {/* Content type selector */}
      <div
        className="p-4 rounded-2xl border
      dark:bg-white/[0.03] dark:border-white/[0.06]
            bg-white border-gray-100"
      >
        <p className="text-xs font-medium text-gray-500 mb-3">
          Select Content Type
        </p>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TYPES.map((type) => {
            const Icon = type.icon;
            const active = selectedType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border",
                  active
                    ? "border-[#3B3CFF]/30 bg-[#3B3CFF]/10 text-[#3B3CFF] dark:bg-[#3B3CFF]/20 dark:text-indigo-400"
                    : cn(
                        "border-gray-200 dark:border-white/[0.06]",
                        type.color,
                      ),
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input Panel */}
        <div className="p-5 rounded-2xl border space-y-4 bg-white border-gray-100 dark:bg-white/[0.03] dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            {currentType &&
              React.createElement(currentType.icon, {
                className: cn("w-4 h-4", currentType.color.split(" ")[1]),
              })}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {currentType?.label} Brief
            </h3>
          </div>
          <textarea
            rows={6}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe what you want in this ${currentType?.label}. Include key points, angle, and any specific requirements...`}
            className={inputCls}
          />
          <button
            onClick={generate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#7B5CFF] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate {currentType?.label}
              </>
            )}
          </button>
        </div>

        {/* Output Panel */}
        <div className="p-5 rounded-2xl border bg-white border-gray-100 flex flex-col dark:bg-white/[0.03] dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              AI Output
            </h3>
            {content && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#3B3CFF] transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={exportTxt}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#3B3CFF] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>
            )}
          </div>
          {isGenerating ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-[#3B3CFF] animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Generating {currentType?.label}...
                </p>
              </div>
            </div>
          ) : content ? (
            <div className="flex-1 overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                <ReactMarkdown>{content}</ReactMarkdown>
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#3B3CFF]/10 to-[#7B5CFF]/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-[#3B3CFF]" />
                </div>
                <p className="text-sm text-gray-500">
                  Your generated content will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
