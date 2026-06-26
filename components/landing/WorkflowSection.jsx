"use client";

import { motion } from "framer-motion";
import { BarChart3, Check, FileText, Image, Search } from "lucide-react";

const campaign = [
  "Campaign-centric workspace — everything tied to one goal",
  "AI agents that read approved campaign memory",
  "Research feeds SEO, SEO feeds content, content feeds creative and ads",
  "Approval flow before outputs become final assets",
  "Readiness and next actions in one place",
];

const rightStats = [
  {
    icon: Search,
    label: "Research Memory",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: FileText,
    label: "Content Drafts",
    color: "from-indigo-500 to-purple-500",
  },
  {
    icon: Image,
    label: "Creative Assets",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: BarChart3,
    label: "Launch Readiness",
    color: "from-green-500 to-teal-500",
  },
];

function WorkflowSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">
              Unify your{" "}
              <span className="bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] bg-clip-text text-transparent">
                campaign workflow
              </span>
            </h2>

            <p className="mb-8 text-lg font-semibold text-slate-600 dark:text-slate-300">
              Stop jumping between separate AI tools. Marketing OS keeps
              research, strategy, content, creative, ads, assets, and campaign
              intelligence connected to one campaign memory.
            </p>

            <div className="space-y-4">
              {campaign.map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileInView={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#3B3CFF] to-[#5B5CFF]">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-base text-slate-700 dark:text-slate-300">
                    {item}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, x: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            {rightStats.map(({ icon: Icon, label, color }) => (
              <motion.div
                key={label}
                whileHover={{ scale: 1.04 }}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-6 text-center shadow-sm dark:border-white/[0.06] dark:bg-white/[0.03]"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color}`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {label}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default WorkflowSection;
