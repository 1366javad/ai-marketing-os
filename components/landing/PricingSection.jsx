import { Briefcase, Rocket, Users } from "lucide-react";

const audiences = [
  {
    icon: Rocket,
    title: "Founders",
    description: "Turn a product idea into a launch campaign without starting from a blank page.",
    gradient: "from-[#3B3CFF] to-[#7B5CFF]",
  },
  {
    icon: Users,
    title: "Marketing Teams",
    description: "Keep research, content, creative, ads, and approvals in one campaign workflow.",
    gradient: "from-[#FF6B6B] to-[#FF8E53]",
  },
  {
    icon: Briefcase,
    title: "Agencies",
    description: "Generate campaign assets for multiple clients without losing context.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

function PricingSection() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold md:text-5xl">
            Built for teams who{" "}
            <span className="bg-gradient-to-r from-[#3B3CFF] to-[#FF6B6B] bg-clip-text text-transparent">
              ship campaigns fast
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            Whether you are launching a product, managing growth, or serving
            clients, every output stays connected to the campaign.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {audiences.map((audience) => (
            <div
              key={audience.title}
              className="rounded-2xl border border-base p-8 transition-transform duration-300 hover:-translate-y-1 hover:border-slate-300/60 hover:shadow-xl"
            >
              <div
                className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${audience.gradient}`}
              >
                <audience.icon className="h-6 w-6 text-white" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {audience.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                {audience.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PricingSection;
