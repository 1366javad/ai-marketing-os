import {
  Facebook,
  Linkedin,
  PackageCheck,
  Search,
  Video,
} from "lucide-react";

export const ADS_TASKS = [
  {
    id: "google_ads",
    label: "Google Ads",
    title: "Google Ads",
    description:
      "Create responsive search headlines, descriptions, CTAs, and extensions.",
    icon: Search,
    iconColor: "text-blue-500 dark:text-blue-400",
  },
  {
    id: "meta_ads",
    label: "Instagram Ad",
    title: "Instagram Ad",
    description:
      "Create Instagram-ready primary text, headlines, conversion angles, and CTAs.",
    icon: Facebook,
    iconColor: "text-indigo-500 dark:text-indigo-400",
  },
  {
    id: "linkedin_ads",
    label: "LinkedIn Ads",
    title: "LinkedIn Ads",
    description:
      "Create professional sponsored content for decision-makers and lead generation.",
    icon: Linkedin,
    iconColor: "text-sky-500 dark:text-sky-400",
  },
  {
    id: "tiktok_ads",
    label: "TikTok Ads",
    title: "TikTok Ads",
    description:
      "Create native hooks, short-form scripts, ad text, and direct-response CTAs.",
    icon: Video,
    iconColor: "text-pink-500 dark:text-pink-400",
  },
  {
    id: "campaign_package",
    label: "Campaign Package",
    title: "Ads Campaign Package",
    description:
      "Create one coordinated advertising package adapted across all core platforms.",
    icon: PackageCheck,
    iconColor: "text-fuchsia-500 dark:text-fuchsia-400",
  },
];

export const PLATFORM_TASK_IDS = [
  "google_ads",
  "meta_ads",
  "linkedin_ads",
  "tiktok_ads",
];
