"use client";

import React, { useState, useRef, useEffect } from "react";

import {
  Globe,
  Users,
  TrendingUp,
  Lightbulb,
  AlertCircle,
  Search,
  Sparkles,
  Eye,
  RefreshCw,
  Loader2,
  Copy,
  Download,
} from "lucide-react";

import GlassCard from "@/components/ui/GlassCard";
import ReactMarkdown from "react-markdown";

const sections = [
  {
    id: "market",
    title: "Market Research",
    icon: Globe,
    desc: "Market size, trends, and opportunities.",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    id: "competitor",
    title: "Competitor Analysis",
    icon: Search,
    desc: "Top competitors and their positioning.",
    color: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  },
  {
    id: "audience",
    title: "Audience Analysis",
    icon: Users,
    desc: "Demographics, psychographics, pain points.",
    color:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    id: "trends",
    title: "Trend Analysis",
    icon: TrendingUp,
    desc: "Current and emerging market trends.",
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  {
    id: "painpoints",
    title: "Pain Points",
    icon: AlertCircle,
    desc: "Key customer pain points to address.",
    color:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
  {
    id: "opportunities",
    title: "Opportunities",
    icon: Lightbulb,
    desc: "Growth and differentiation opportunities.",
    color:
      "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
];

export default function ResearchTab({ campaign }) {
  const viewerRef = useRef(null);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [selectedSection, setSelectedSection] = useState(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  useEffect(() => {
    if (!selectedSection) return;

    viewerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [selectedSection]);

  const generateSection = async (sectionId) => {
    setLoading((prev) => ({
      ...prev,
      [sectionId]: true,
    }));

    try {
      const response = await fetch(
        `/api/campaigns/${campaign.id}/research/generate`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            section: sectionId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setResults((prev) => ({
        ...prev,
        [sectionId]: data.output.content,
      }));
    } finally {
      setLoading((prev) => ({
        ...prev,
        [sectionId]: false,
      }));
    }
  };

  const generateAll = async () => {
    setGeneratingAll(true);

    for (const section of sections) {
      await generateSection(section.id);
    }

    setGeneratingAll(false);
  };

  const activeContent = selectedSection ? results[selectedSection] : null;

  const activeTitle =
    sections.find((s) => s.id === selectedSection)?.title || "";

  const copyContent = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
  };

  const exportTxt = () => {
    if (!activeContent) return;

    const blob = new Blob([activeContent], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = `${activeTitle}.txt`;

    a.click();
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="p-5 rounded-2xl border flex items-center justify-between bg-white border-gray-100 dark:bg-white/[0.03] dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Market Intelligence
          </h3>

          <p className="text-xs text-gray-500 mt-0.5">
            AI-powered research across market, competitors, audience and trends.
          </p>
        </div>

        <button
          onClick={generateAll}
          disabled={generatingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#3B3CFF] to-[#7B5CFF] text-white text-sm font-medium"
        >
          {generatingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate All
        </button>
      </div>

      {/* CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => {
          const Icon = section.icon;

          const generated = !!results[section.id];

          return (
            <GlassCard
              key={section.id}
              className={`p-5 h-[220px] flex flex-col ${
                selectedSection === section.id ? "ring-2 ring-[#3B3CFF]" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${section.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h3>
              </div>

              <p className="text-xs text-gray-500 flex-1">{section.desc}</p>

              <div className="mt-4">
                {loading[section.id] ? (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </div>
                ) : generated ? (
                  <div className="space-y-2">
                    <p className="text-xs text-emerald-500 font-medium">
                      ✓ Generated
                    </p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSection(section.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg dark:bg-primary-800 dark:text-primary-300 text-xs md:text-base font-medium bg-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>

                      <button
                        onClick={() => generateSection(section.id)}
                        className="flex items-center justify-center px-3 py-2 rounded-lg border text-xs"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => generateSection(section.id)}
                    className="w-full px-3 py-2 rounded-lg dark:bg-primary-800 dark:text-primary-300 text-xs md:text-base font-medium bg-primary-100 hover:bg-primary-200/80 dark:hover:bg-primary-700"
                  >
                    Generate
                  </button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* VIEWER */}
      <div ref={viewerRef}>
        <GlassCard className="p-6 min-h-[400px]">
          {!activeContent ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">
              Select a generated section to view the report
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {activeTitle}
                </h3>

                <div className="flex gap-2">
                  <button
                    onClick={copyContent}
                    className="p-2 rounded-lg border"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button onClick={exportTxt} className="p-2 rounded-lg border">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{activeContent}</ReactMarkdown>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
