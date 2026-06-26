import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const sections = [
  {
    title: "1. Agreement to These Terms",
    body: [
      "By accessing or using AI Marketing OS, you agree to these Terms of Service. If you do not agree, you should not use the service.",
      "These terms apply to your use of the website, dashboard, campaign workspace, AI agents, generated outputs, assets, exports, and related product features.",
    ],
  },
  {
    title: "2. Product Description",
    body: [
      "AI Marketing OS is a campaign-centric workspace for planning, creating, reviewing, and launching campaign assets across research, SEO, content, creative, ads, assets, usage, and campaign intelligence workflows.",
      "The product may use AI systems and third-party providers to generate text, image-related outputs, strategy artifacts, recommendations, and other campaign materials based on your inputs and approved campaign memory.",
    ],
  },
  {
    title: "3. Account Responsibility",
    body: [
      "You are responsible for maintaining the confidentiality of your account credentials, sessions, and workspace access.",
      "You are responsible for all activity under your account, including prompts submitted, campaign data uploaded, outputs generated, assets exported, and actions taken by users with access to your workspace.",
    ],
  },
  {
    title: "4. Acceptable Use",
    body: [
      "You may use the service only for lawful business, marketing, creative, research, and campaign planning purposes.",
      "You may not use the service to create unlawful, harmful, deceptive, infringing, abusive, discriminatory, or unauthorized content, or to violate the rights of others.",
      "You may not attempt to reverse engineer, disrupt, overload, scrape, bypass limits, abuse providers, or interfere with the security or availability of the service.",
    ],
  },
  {
    title: "5. Campaign Data and User Content",
    body: [
      "You must only submit campaign data, files, prompts, brand materials, customer information, and other content that you have the right to use.",
      "You retain responsibility for the content you submit and for ensuring that your use of campaign assets complies with applicable laws, platform policies, advertising rules, and third-party rights.",
    ],
  },
  {
    title: "6. AI-generated Outputs",
    body: [
      "AI-generated outputs may contain errors, unsupported assumptions, outdated information, inaccurate claims, biased language, or content that does not fit your brand, legal obligations, or publishing standards.",
      "You are responsible for reviewing, editing, approving, and validating all AI-generated outputs before publishing, exporting, sending to customers, running ads, or using them commercially.",
      "AI Marketing OS does not provide legal, financial, medical, compliance, or professional advice. Outputs should not be treated as a substitute for qualified human review.",
    ],
  },
  {
    title: "7. Third-party Providers",
    body: [
      "Some features depend on third-party services, including authentication, hosting, storage, analytics, AI text providers, AI image providers, and other infrastructure providers.",
      "Provider availability, latency, quality, rate limits, model behavior, and output quality may vary. We may change providers, models, routing, fallback behavior, or feature availability over time.",
    ],
  },
  {
    title: "8. Plans, Credits, and Usage Limits",
    body: [
      "The service may include free and paid plans, credit limits, rate limits, module limits, export limits, provider limits, or fair-use controls.",
      "Credits, limits, and plan features may change as the product evolves. If a generation request exceeds available credits or limits, the request may be blocked until credits reset or the account is upgraded.",
    ],
  },
  {
    title: "9. Ownership and Licenses",
    body: [
      "You retain ownership of your submitted campaign data and user content, subject to the rights needed for us to operate, secure, improve, and provide the service.",
      "Subject to your compliance with these terms, you may use generated outputs for your business purposes. You are responsible for determining whether outputs are suitable, original, non-infringing, and compliant for your intended use.",
    ],
  },
  {
    title: "10. Beta Features and Availability",
    body: [
      "Some features may be experimental, incomplete, in beta, or subject to change. This may include AI agents, provider routing, image generation, analytics, exports, usage tracking, and campaign intelligence.",
      "We may modify, suspend, or discontinue features at any time, including when needed for reliability, security, provider changes, product direction, or legal compliance.",
    ],
  },
  {
    title: "11. Disclaimers",
    body: [
      "The service is provided on an as-is and as-available basis. We do not guarantee that the service will be uninterrupted, error-free, secure, or that generated outputs will be accurate, complete, or fit for a particular purpose.",
      "You should independently verify claims, facts, market research, legal compliance, ad policy compliance, and any business-critical output before use.",
    ],
  },
  {
    title: "12. Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, AI Marketing OS and its operators will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including lost profits, lost data, campaign losses, ad spend losses, or business interruption.",
      "Your use of the service is at your own risk, especially when using generated outputs in public, commercial, regulated, or paid advertising contexts.",
    ],
  },
  {
    title: "13. Termination",
    body: [
      "We may suspend or terminate access if you violate these terms, create risk for the service or other users, abuse providers, violate applicable law, or use the product in a harmful or unauthorized way.",
      "You may stop using the service at any time. Certain records may be retained as described in the Privacy Policy for audit, security, billing, or legal purposes.",
    ],
  },
  {
    title: "14. Changes to These Terms",
    body: [
      "We may update these terms as the product, providers, plans, or legal requirements evolve. The Last Updated date will indicate when the terms were most recently changed.",
      "Continued use of the service after changes become effective means you accept the updated terms.",
    ],
  },
  {
    title: "15. Contact",
    body: [
      "For questions about these terms, contact the AI Marketing OS team through your account support channel.",
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50 px-6 pb-20 pt-32 text-slate-900 dark:bg-dark-bg dark:text-white">
        <section className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B3CFF] dark:text-indigo-300">
              AI Marketing OS
            </p>
            <h1 className="mt-3 text-4xl font-bold text-slate-950 dark:text-white">
              Terms of Service
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-white/50">
              Last Updated: June 26, 2026
            </p>
            <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              These terms define how AI Marketing OS may be used, how AI
              outputs should be reviewed, and what responsibilities apply when
              creating, approving, exporting, or publishing campaign assets.
            </p>
          </div>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
              >
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-3">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
