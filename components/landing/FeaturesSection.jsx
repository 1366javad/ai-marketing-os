import {
  BarChart3,
  FileText,
  Image,
  Megaphone,
  Search,
  Target,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Research",
    description:
      "Understand your audience, competitors, pain points, market signals, and campaign opportunities.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Target,
    title: "SEO",
    description:
      "Turn approved research into keyword, topic, and content strategy for your campaign.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: FileText,
    title: "Content",
    description:
      "Generate campaign-aware blogs, emails, landing pages, newsletters, and social posts.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: Image,
    title: "Creative",
    description:
      "Create creative briefs, visual directions, image prompts, and campaign-ready assets.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Megaphone,
    title: "Ads",
    description:
      "Generate Google, Meta, LinkedIn, and TikTok ad copy from approved campaign memory.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: BarChart3,
    title: "Campaign Intelligence",
    description:
      "Track readiness, approvals, risks, missing steps, assets, and the next deterministic action.",
    gradient: "from-green-500 to-teal-500",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">
            One campaign workflow,{" "}
            <span className="bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] bg-clip-text text-transparent">
              connected by memory
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-xl text-slate-600 dark:text-slate-300">
            Research feeds SEO, SEO feeds content, content feeds creative and
            ads, and every approved output becomes part of the campaign.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all duration-300 hover:-translate-y-2 hover:border-slate-300/60 hover:shadow-xl dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.1] dark:hover:bg-white/[0.04]"
            >
              <div
                className={`mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br transition-transform group-hover:scale-110 ${feature.gradient}`}
              >
                <feature.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
