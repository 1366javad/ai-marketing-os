import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

const sections = [
  {
    title: "1. Introduction",
    body: [
      "AI Marketing OS helps teams plan, create, and launch campaign assets from a campaign-centric workspace. This Privacy Policy explains what information we collect, why we collect it, and how it is used to provide the service.",
      "This policy applies to account data, campaign data, generated outputs, uploaded assets, usage events, and related product activity inside AI Marketing OS.",
    ],
  },
  {
    title: "2. Information We Collect",
    body: [
      "We may collect account information such as your name, email address, authentication provider, profile image, role, and basic workspace preferences.",
      "We also process product activity such as campaigns created, modules used, outputs generated, approval status, asset actions, usage events, provider metadata, and support-related communications.",
    ],
  },
  {
    title: "3. Campaign Data",
    body: [
      "Campaign data may include campaign goals, audiences, offers, industries, categories, channels, recommended workflows, research tasks, SEO tasks, content tasks, creative tasks, ads tasks, and campaign strategy information that you enter or generate.",
      "We use campaign data to build context, generate requested outputs, maintain campaign memory, display assets, calculate readiness, and help you continue work across modules.",
    ],
  },
  {
    title: "4. AI Generated Content",
    body: [
      "The service may generate research, SEO plans, content drafts, creative directions, ad copy, image prompts, analytics summaries, and other campaign-related outputs.",
      "Generated content may be inaccurate, incomplete, outdated, or unsuitable for your specific use case. You are responsible for reviewing and approving outputs before publication, commercial use, legal use, or external distribution.",
    ],
  },
  {
    title: "5. Authentication Data",
    body: [
      "Authentication is used to create and protect your account, manage sessions, prevent unauthorized access, and connect profile information to your workspace.",
      "If you sign in with a third-party identity provider, we may receive basic profile information such as your name, email address, and avatar, depending on the provider and your permissions.",
    ],
  },
  {
    title: "6. Cookies and Local Storage",
    body: [
      "We may use cookies, session storage, and local storage to keep you signed in, remember interface preferences such as theme, secure the product, and improve reliability.",
      "You can control cookies through your browser settings, but disabling them may prevent some features from working correctly.",
    ],
  },
  {
    title: "7. Third-party Providers",
    body: [
      "To fulfill your requests, campaign context and prompts may be sent to third-party infrastructure, authentication, storage, analytics, or AI model providers.",
      "Depending on the feature used, limited campaign data may be processed by AI providers for text generation, image generation, or related AI tasks. We aim to send only the information reasonably necessary to complete the requested action.",
    ],
  },
  {
    title: "8. Data Retention",
    body: [
      "We retain account, campaign, generated output, asset, memory, and usage data for as long as needed to provide the service, maintain audit history, support product functionality, comply with obligations, and resolve disputes.",
      "Some records, such as approval history, usage events, or deleted asset tombstones, may be retained internally for audit, security, reliability, or billing purposes.",
    ],
  },
  {
    title: "9. Security",
    body: [
      "We use technical and organizational safeguards designed to protect account and campaign data against unauthorized access, loss, misuse, or alteration.",
      "No online service can guarantee absolute security. You should keep your login credentials safe and avoid submitting highly sensitive personal, financial, medical, or regulated information unless the product explicitly supports that use case.",
    ],
  },
  {
    title: "10. User Rights",
    body: [
      "Depending on your location, you may have rights to access, correct, export, delete, or restrict certain personal information.",
      "To make a privacy request, contact us through your account support channel. We may need to verify your identity before acting on the request.",
    ],
  },
  {
    title: "11. Contact",
    body: [
      "For privacy questions, data requests, or concerns about how information is handled, contact the AI Marketing OS team through your account support channel.",
    ],
  },
];

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500 dark:text-white/50">
              Last Updated: June 26, 2026
            </p>
            <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
              This policy is intended to clearly explain how AI Marketing OS
              handles account, campaign, AI, usage, and asset data. It is a
              practical product privacy policy for the current service and may
              be updated as the product, providers, or legal requirements
              evolve.
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
