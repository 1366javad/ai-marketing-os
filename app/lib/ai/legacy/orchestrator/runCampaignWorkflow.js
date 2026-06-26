import { runPlannerAgent } from "../agents/planner";
import { runResearchAgent } from "../agents/research";
import { runSeoAgent } from "../agents/seo";
import { runContentAgent } from "../agents/content";
import { runCreativeAgent } from "../agents/creative";
import { runVideoAgent } from "../agents/video";
import { runAdsAgent } from "../agents/ads";

export async function runCampaignWorkflow({ campaign, brief }) {
  const results = [];

  // Planner
  const plannerResult = await runPlannerAgent({
    campaign,
    brief,
  });

  results.push(plannerResult);

  const plan = plannerResult.output;

  // Research
  const researchResult = await runResearchAgent({
    campaign,
    plan,
  });

  results.push(researchResult);

  // SEO
  const seoResult = await runSeoAgent({
    campaign,
    plan,
  });

  results.push(seoResult);

  // Content
  const contentResult = await runContentAgent({
    campaign,
    plan,
  });

  results.push(contentResult);

  // Creative
  const creativeResult = await runCreativeAgent({
    campaign,
    plan,
  });

  results.push(creativeResult);

  // Video
  const videoResult = await runVideoAgent({
    campaign,
    plan,
  });

  results.push(videoResult);

  // Ads
  const adsResult = await runAdsAgent({
    campaign,
    plan,
  });

  results.push(adsResult);

  return {
    success: true,
    campaignId: campaign.id,
    results,
  };
}
