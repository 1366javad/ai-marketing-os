import Link from "next/link";

function FAQSection({
  primaryCta = { href: "/signup", label: "Start Free Today" },
}) {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#3B3CFF] to-[#7B5CFF] p-12 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />

          <div className="relative z-10">
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl">
              Ready to build your next campaign?
            </h2>

            <p className="mx-auto mb-8 max-w-2xl text-xl text-indigo-100">
              Start with one campaign brief. Let AI Marketing OS turn it into
              research, SEO, content, creative, ads, and launch readiness.
            </p>

            <Link
              href={primaryCta.href}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-[#3B3CFF] transition-all duration-200 hover:scale-105 hover:shadow-2xl hover:shadow-white/20"
            >
              {primaryCta.label === "Dashboard" ? "Go to Dashboard" : "Start Free Today"}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-5 w-5 transition-transform group-hover:translate-x-1"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQSection;
