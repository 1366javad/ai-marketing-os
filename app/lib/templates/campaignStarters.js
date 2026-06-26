import {
  AppWindow,
  Blocks,
  BriefcaseBusiness,
  GraduationCap,
  Laptop,
  Megaphone,
  Presentation,
  Rocket,
  ShoppingBag,
  Store,
} from "lucide-react";

export const CAMPAIGN_STARTERS = [
  {
    id: "saas-launch",
    name: "SaaS Launch",
    icon: Laptop,
    iconStyle:
      "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-300",
    bestFor: "Early-stage SaaS companies",
    description:
      "Build demand, validate positioning, and acquire the first wave of product users.",
    goal: "Acquire the first 1,000 qualified users and validate product-market messaging.",
    audience:
      "Professionals and small teams actively looking for a better way to solve the core problem.",
    offer: "Free trial or founder-led onboarding for the SaaS product.",
    industry: "SaaS",
    channels: ["Google Ads", "LinkedIn", "SEO", "Email"],
    successMetrics: [
      "Qualified signups",
      "Trial-to-paid conversion",
      "Cost per acquisition",
      "Activation rate",
    ],
    recommendedWorkflow: [
      workflow("research", "market", "Market Research"),
      workflow("research", "audience", "Audience Analysis"),
      workflow("research", "competitor", "Competitor Analysis"),
      workflow("seo", "keyword_research", "Keyword Research"),
      workflow("seo", "topic_clusters", "Topic Clusters"),
      workflow("content", "landing_page", "Landing Page"),
      workflow("creative", "ad_creative", "Ad Creative"),
      workflow("ads", "google_ads", "Google Ads"),
      workflow("ads", "linkedin_ads", "LinkedIn Ads"),
    ],
  },
  {
    id: "product-launch",
    name: "Product Launch",
    icon: Rocket,
    iconStyle:
      "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300",
    bestFor: "New products and major feature releases",
    description:
      "Coordinate research, launch messaging, creative assets, and paid distribution.",
    goal: "Generate awareness, qualified demand, and first-month product adoption.",
    audience:
      "Problem-aware buyers who are evaluating new solutions in the category.",
    offer: "Launch access, introductory pricing, or a limited early-adopter package.",
    industry: "Technology",
    channels: ["SEO", "Email", "Meta Ads", "Google Ads"],
    successMetrics: [
      "Launch registrations",
      "Product demos",
      "Conversion rate",
      "Revenue generated",
    ],
    recommendedWorkflow: [
      workflow("research", "market", "Market Research"),
      workflow("research", "audience", "Audience Analysis"),
      workflow("research", "opportunities", "Opportunities"),
      workflow("seo", "seo_strategy", "SEO Strategy"),
      workflow("content", "landing_page", "Landing Page"),
      workflow("content", "email", "Launch Email"),
      workflow("creative", "campaign_package", "Campaign Creative Package"),
      workflow("ads", "campaign_package", "Ads Campaign Package"),
    ],
  },
  {
    id: "black-friday",
    name: "Black Friday",
    icon: ShoppingBag,
    iconStyle:
      "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    bestFor: "E-commerce and subscription brands",
    description:
      "Plan a time-sensitive promotional campaign across retention and acquisition channels.",
    goal: "Maximize seasonal sales while protecting margin and customer trust.",
    audience:
      "Existing customers, warm prospects, cart abandoners, and price-sensitive new buyers.",
    offer: "Limited-time Black Friday discount or value-added bundle.",
    industry: "E-commerce",
    channels: ["Meta Ads", "Email", "Google Ads"],
    successMetrics: [
      "Campaign revenue",
      "Return on ad spend",
      "Average order value",
      "Email conversion rate",
    ],
    recommendedWorkflow: [
      workflow("research", "pain_points", "Pain Points"),
      workflow("research", "opportunities", "Opportunities"),
      workflow("content", "email", "Promotional Email"),
      workflow("content", "landing_page", "Offer Page"),
      workflow("creative", "banner", "Promotional Banner"),
      workflow("creative", "carousel", "Offer Carousel"),
      workflow("ads", "meta_ads", "Meta Ads"),
      workflow("ads", "google_ads", "Google Ads"),
    ],
  },
  {
    id: "lead-generation",
    name: "Lead Generation",
    icon: BriefcaseBusiness,
    iconStyle:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
    bestFor: "B2B services and high-consideration offers",
    description:
      "Create a focused acquisition system for attracting and nurturing qualified leads.",
    goal: "Generate qualified sales leads from target decision makers.",
    audience:
      "Decision makers and buying committee members with an active business need.",
    offer: "Lead magnet, consultation, assessment, or product demonstration.",
    industry: "B2B Services",
    channels: ["LinkedIn", "Email", "Google Ads"],
    successMetrics: [
      "Marketing-qualified leads",
      "Cost per lead",
      "Booked meetings",
      "Lead-to-opportunity rate",
    ],
    recommendedWorkflow: [
      workflow("research", "audience", "Audience Analysis"),
      workflow("research", "competitor", "Competitor Analysis"),
      workflow("seo", "keyword_research", "Keyword Research"),
      workflow("content", "lead_magnet", "Lead Magnet"),
      workflow("content", "email_sequence", "Email Sequence"),
      workflow("creative", "ad_creative", "Lead Ad Creative"),
      workflow("ads", "linkedin_ads", "LinkedIn Ads"),
      workflow("ads", "google_ads", "Google Ads"),
    ],
  },
  {
    id: "webinar-funnel",
    name: "Webinar Funnel",
    icon: Presentation,
    iconStyle:
      "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
    bestFor: "Expert-led and B2B education campaigns",
    description:
      "Drive registrations, attendance, and post-event conversion with one coordinated funnel.",
    goal: "Generate qualified webinar registrations and convert attendees into sales conversations.",
    audience:
      "Professionals seeking practical guidance on a high-value problem.",
    offer: "Free live webinar with actionable training and a relevant next-step offer.",
    industry: "Professional Education",
    channels: ["LinkedIn", "Email", "Meta Ads"],
    successMetrics: [
      "Registrations",
      "Attendance rate",
      "Cost per registration",
      "Post-webinar conversions",
    ],
    recommendedWorkflow: [
      workflow("research", "audience", "Audience Analysis"),
      workflow("research", "pain_points", "Pain Points"),
      workflow("content", "landing_page", "Registration Page"),
      workflow("content", "email_sequence", "Reminder Sequence"),
      workflow("creative", "image_post", "Speaker Image Post"),
      workflow("creative", "carousel", "Webinar Carousel"),
      workflow("ads", "linkedin_ads", "LinkedIn Ads"),
      workflow("ads", "meta_ads", "Meta Ads"),
    ],
  },
  {
    id: "course-launch",
    name: "Course Launch",
    icon: GraduationCap,
    iconStyle:
      "border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-300",
    bestFor: "Creators, coaches, and education businesses",
    description:
      "Turn audience insight into a complete enrollment campaign for a course or cohort.",
    goal: "Fill the next course cohort with qualified, motivated students.",
    audience:
      "Learners who want a structured transformation and are comparing education options.",
    offer: "Course enrollment with a clear outcome, curriculum, and launch incentive.",
    industry: "Online Education",
    channels: ["Email", "Meta Ads", "SEO"],
    successMetrics: [
      "Enrollments",
      "Application conversion",
      "Revenue per subscriber",
      "Launch email revenue",
    ],
    recommendedWorkflow: [
      workflow("research", "audience", "Audience Analysis"),
      workflow("research", "pain_points", "Pain Points"),
      workflow("research", "competitor", "Competitor Analysis"),
      workflow("seo", "topic_clusters", "Topic Clusters"),
      workflow("content", "landing_page", "Course Sales Page"),
      workflow("content", "email_sequence", "Launch Email Sequence"),
      workflow("creative", "campaign_package", "Course Creative Package"),
      workflow("ads", "meta_ads", "Meta Ads"),
    ],
  },
  {
    id: "mobile-app-launch",
    name: "Mobile App Launch",
    icon: AppWindow,
    iconStyle:
      "border-cyan-200 bg-cyan-50 text-cyan-600 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-300",
    bestFor: "Consumer and productivity apps",
    description:
      "Build an acquisition playbook around app discovery, adoption, and repeat usage.",
    goal: "Drive qualified app installs and establish a repeatable activation funnel.",
    audience:
      "Mobile-first users who experience the target problem frequently.",
    offer: "Free app download with a compelling first-use experience or premium trial.",
    industry: "Mobile Apps",
    channels: ["TikTok Ads", "Meta Ads", "SEO", "Email"],
    successMetrics: [
      "Qualified installs",
      "Cost per install",
      "Day-seven retention",
      "Trial activation",
    ],
    recommendedWorkflow: [
      workflow("research", "market", "Market Research"),
      workflow("research", "audience", "Audience Analysis"),
      workflow("research", "trends", "Trend Analysis"),
      workflow("seo", "keyword_research", "App Keyword Research"),
      workflow("content", "landing_page", "App Landing Page"),
      workflow("creative", "carousel", "Feature Carousel"),
      workflow("ads", "tiktok_ads", "TikTok Ads"),
      workflow("ads", "meta_ads", "Meta Ads"),
    ],
  },
  {
    id: "ecommerce-promotion",
    name: "E-commerce Promotion",
    icon: Store,
    iconStyle:
      "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10 dark:text-fuchsia-300",
    bestFor: "Online stores and DTC brands",
    description:
      "Create a focused product promotion across search, social, email, and creative.",
    goal: "Increase product sales and acquire profitable new customers.",
    audience:
      "Category shoppers with clear purchase intent and warm returning visitors.",
    offer: "Featured product, bundle, free shipping, or limited promotional incentive.",
    industry: "E-commerce",
    channels: ["Google Ads", "Meta Ads", "Email", "SEO"],
    successMetrics: [
      "Revenue",
      "Return on ad spend",
      "Conversion rate",
      "Average order value",
    ],
    recommendedWorkflow: [
      workflow("research", "competitor", "Competitor Analysis"),
      workflow("research", "pain_points", "Pain Points"),
      workflow("seo", "keyword_clusters", "Keyword Clusters"),
      workflow("content", "email", "Product Promotion Email"),
      workflow("creative", "product_mockup", "Product Mockup"),
      workflow("creative", "ad_creative", "Ad Creative"),
      workflow("ads", "google_ads", "Google Ads"),
      workflow("ads", "meta_ads", "Meta Ads"),
    ],
  },
  {
    id: "local-business-growth",
    name: "Local Business Growth",
    icon: Megaphone,
    iconStyle:
      "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-300",
    bestFor: "Local services, clinics, and venues",
    description:
      "Capture nearby demand and build a consistent local lead-generation engine.",
    goal: "Increase qualified local inquiries, calls, bookings, and store visits.",
    audience:
      "Nearby customers actively searching for a trusted local provider.",
    offer: "Introductory service, consultation, booking incentive, or local promotion.",
    industry: "Local Services",
    channels: ["Google Ads", "SEO", "Meta Ads"],
    successMetrics: [
      "Calls and bookings",
      "Local search visibility",
      "Cost per lead",
      "Store visits",
    ],
    recommendedWorkflow: [
      workflow("research", "audience", "Local Audience Analysis"),
      workflow("research", "competitor", "Local Competitor Analysis"),
      workflow("seo", "keyword_research", "Local Keyword Research"),
      workflow("seo", "seo_strategy", "Local SEO Strategy"),
      workflow("content", "landing_page", "Service Landing Page"),
      workflow("creative", "image_post", "Local Image Post"),
      workflow("ads", "google_ads", "Google Ads"),
      workflow("ads", "meta_ads", "Meta Ads"),
    ],
  },
  {
    id: "b2b-outreach",
    name: "B2B Outreach",
    icon: Blocks,
    iconStyle:
      "border-teal-200 bg-teal-50 text-teal-600 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-300",
    bestFor: "SaaS, agencies, and professional services",
    description:
      "Clarify account-level messaging and create a coordinated outbound campaign.",
    goal: "Start qualified conversations with high-value target accounts.",
    audience:
      "Specific decision makers inside companies that match the ideal customer profile.",
    offer: "Relevant audit, consultation, demo, or account-specific business case.",
    industry: "B2B",
    channels: ["LinkedIn", "Email", "Google Ads"],
    successMetrics: [
      "Positive reply rate",
      "Qualified meetings",
      "Opportunity value",
      "Account engagement",
    ],
    recommendedWorkflow: [
      workflow("research", "audience", "Decision-Maker Analysis"),
      workflow("research", "competitor", "Competitor Analysis"),
      workflow("research", "opportunities", "Account Opportunities"),
      workflow("content", "email_sequence", "Outbound Email Sequence"),
      workflow("content", "landing_page", "Account Landing Page"),
      workflow("creative", "ad_creative", "B2B Ad Creative"),
      workflow("ads", "linkedin_ads", "LinkedIn Ads"),
      workflow("ads", "google_ads", "Google Ads"),
    ],
  },
];

function workflow(module, task, label) {
  return { module, task, label };
}
