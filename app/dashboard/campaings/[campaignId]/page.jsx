import { getCampaignById } from "@/app/lib/db/campaigns";
import { getCampaignResearchOutputs, getResearch } from "@/app/lib/db/research";
import { getCampaignSeoOutputs, getSEO } from "@/app/lib/db/seo";
import { getCampaignContent } from "@/app/lib/db/content";
import { getCampaignCreatives } from "@/app/lib/db/creative";
import { getCampaignVideos } from "@/app/lib/db/video";
import { getCampaignAds } from "@/app/lib/db/ads";
import { getCampaignAssets } from "@/app/lib/db/assets";
import CampaignWorkspace from "@/components/campaing/CampaignWorkspace";

export default async function CampaignIdPage({ params }) {
  const { campaignId } = await params;

  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    return (
      <div className="p-10">
        <h1 className="text-xl font-semibold">Campaign not found</h1>
      </div>
    );
  }

  const [
    research,
    researchOutputs,
    seo,
    seoOutputs,
    contentOutputs,
    creatives,
    videos,
    ads,
    assets,
  ] = await Promise.all([
    getResearch(campaignId),
    getCampaignResearchOutputs(campaignId),
    getSEO(campaignId),
    getCampaignSeoOutputs(campaignId),
    getCampaignContent(campaignId),
    getCampaignCreatives(campaignId),
    getCampaignVideos(campaignId),
    getCampaignAds(campaignId),
    getCampaignAssets(campaignId),
  ]);

  return (
    <CampaignWorkspace
      campaign={campaign}
      research={research}
      researchOutputs={researchOutputs}
      seo={seo}
      seoOutputs={seoOutputs}
      contentOutputs={contentOutputs}
      creatives={creatives}
      videos={videos}
      ads={ads}
      assets={assets}
    />
  );
}
