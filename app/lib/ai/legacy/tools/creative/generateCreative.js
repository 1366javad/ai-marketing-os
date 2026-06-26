import { runPollinationsImage } from "@/app/lib/ai/providers/pollinations";

const PROMPTS = {
  blog_cover:
    "Create a professional blog cover image for this marketing campaign.",

  social_media:
    "Create a modern social media marketing image for this campaign.",

  ad_creative: "Create a high-converting advertisement creative.",

  product_mockup: "Create a realistic product mockup image.",

  banner: "Create a professional marketing banner.",
};

export async function generateCreative({ campaign, category }) {
  const prompt = `
Campaign: ${campaign.name}

Industry: ${campaign.industry || ""}

Target Audience:
${campaign.target_audience || ""}

${PROMPTS[category]}
`;

  const result = await runPollinationsImage({
    prompt,
  });

  return {
    type: category,

    title: category,

    prompt,

    imageData: result.imageData,
    mimeType: result.mimeType,
    imageUrl: result.imageUrl,
  };
}
