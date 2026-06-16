import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/app/lib/utils/utils";

import GlassCard from "@/components/ui/GlassCard";
import ReactMarkdown from "react-markdown";

import {
  TrendingUp,
  Hash,
  Layers,
  Map,
  FileText,
  HelpCircle,
  Sparkles,
  Eye,
  RefreshCw,
  Loader2,
  Copy,
  Download,
} from "lucide-react";

const PlaceholderCard = ({ icon: Icon, title, desc, color, badge }) => {
  return (
    <div className="p-5 rounded-2xl border bg-white border-gray-100 dark:bg-white/[0.03] dark:border-white/[0.06]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              color,
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        {badge && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">{desc}</p>
      <div className="space-y-1.5">
        {[80, 65, 50, 70, 55].map((w, i) => (
          <div
            key={i}
            className="h-2.5 rounded-full bg-gray-100 dark:bg-white/[0.06]"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>
      <p className="text-[10px] text-gray-400 mt-3 italic">
        Generate SEO plan to populate
      </p>
    </div>
  );
};

const sections = [
  {
    id: "keywords",
    title: "Keyword Research",
    icon: Hash,
    desc: "Target keywords with volume and difficulty.",
    badge: "0 keywords",
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  },
  {
    id: "clusters",
    title: "Keyword Clusters",
    icon: Layers,
    desc: "Grouped keywords by topic and intent.",
    badge: "0 clusters",
    color:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  },
  {
    id: "topics",
    title: "Topic Clusters",
    icon: Map,
    desc: "Pillar pages and supporting content map.",
    badge: "0 topics",
    color:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  {
    id: "strategy",
    title: "SEO Strategy",
    icon: TrendingUp,
    desc: "Prioritized action plan for organic growth.",
    badge: null,
    color:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  },
  {
    id: "meta",
    title: "Meta Descriptions",
    icon: FileText,
    desc: "Optimised meta titles and descriptions.",
    badge: "0 generated",
    color: "bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400",
  },
  {
    id: "faq",
    title: "FAQs",
    icon: HelpCircle,
    desc: "AI-generated FAQ content for search.",
    badge: "0 FAQs",
    color:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
  },
];

export default function SEOTab({ seo, campaign }) {
  const hasSEO = !!seo;
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
        `/api/campaigns/${campaign.id}/seo/generate`,
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
            SEO Planning
          </h3>

          <p className="text-xs text-gray-500 mt-0.5">
            enerate comprehensive SEO strategy with keywords, clusters and
            metadata.
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
                {section.badge && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-primary-980 text-gray-700">
                    {section.badge}
                  </span>
                )}
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
              Select a generated SEO section to view the report
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
