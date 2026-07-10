"use client";

import { useRouter } from "next/navigation";
import { useNavigationProgress } from "@/app/lib/context/NavigationContext";

import { Sparkles, FolderKanban, ChevronDown } from "lucide-react";

import EmptyState from "@/components/ui/EmptyState";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function CampaignPicker({
  campaigns = [],
  tab = "overview",
  label = "Select Campaign",
  type = null,
  className = "",
}) {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();

  const handleSelect = (campaign) => {
    const url = type
      ? `/dashboard/campaings/${campaign.id}?tab=${tab.toLowerCase()}&type=${type}`
      : `/dashboard/campaings/${campaign.id}?tab=${tab.toLowerCase()}`;

    startNavigation();
    router.push(url);
  };

 

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium border transition-all
            bg-campaign-primary/5 border-campaign-primary/20 text-campaign-primary
            hover:bg-primary-100
            dark:bg-dark-surface
            dark:border-primary-900
            dark:text-indigo-400
            dark:hover:bg-primary-950
            ${className}`}
        >
          <Sparkles className="w-3 h-3" />
          {label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-48 p-0 overflow-hidden backdrop-blur border-dark-surface"
      >
        {campaigns.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={FolderKanban}
              title="No campaigns yet"
              description="Create a campaign first"
              variant="compact"
            />
          </div>
        ) : (
          <div className="max-h-[320px] overflow-y-auto py-1">
            {campaigns.map((campaign) => (
              <DropdownMenuItem
                key={campaign.id}
                onClick={() => handleSelect(campaign)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
              >
                <span className="text-xl shrink-0">🚀</span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {campaign.name}
                  </p>

                  {campaign.industry && (
                    <p className="text-xs text-muted-foreground truncate">
                      {campaign.industry}
                    </p>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
