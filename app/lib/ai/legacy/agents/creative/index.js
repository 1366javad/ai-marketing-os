import { AGENT_TYPES } from "../../core/agentTypes";
import { createAgentResult } from "../../core/createAgentResult";
import { parseJsonResponse } from "../../core/parseJsonResponse";
import {
  buildMarketingBrief,
  buildCreativePrompt,
  buildMarketingStrategy,
  checkMarketingOutput,
  formatCreativeOutput,
} from "../../marketing";
import { runGemini } from "../../providers/gemini";
import { runPollinationsImage } from "../../providers/pollinations";

const VALID_MODES = new Set(["post", "carousel", "reel", "package"]);

export async function runCreativeAgent({
  mode = "post",
  prompt,
  platform = "instagram",
  brief = null,
  strategy = null,
  campaign = null,
  plan = null,
}) {
  if (campaign) {
    return runCampaignCreativeAgent({ campaign, plan });
  }

  if (!VALID_MODES.has(mode)) {
    throw new Error("Invalid creative mode.");
  }

  if (!prompt || prompt.trim().length < 10) {
    throw new Error("Prompt must be at least 10 characters long.");
  }

  if (mode === "package") {
    return generatePackage({ prompt, platform, brief, strategy });
  }

  if (mode === "post") {
    return generatePost({ prompt, platform, brief, strategy });
  }

  if (mode === "carousel") {
    return generateCarousel({ prompt, platform, brief, strategy });
  }

  return generateReel({ prompt, platform, brief, strategy });
}

async function runCampaignCreativeAgent({ campaign, plan }) {
  const items = plan?.outputs?.creative || [];
  const outputs = [];

  for (const item of items) {
    const prompt = [
      plan?.strategy?.coreMessage,
      item.title,
      item.goal,
      campaign.name,
    ]
      .filter(Boolean)
      .join(" ");
    const platform = item.platform || "instagram";
    const briefResult = buildMarketingBrief({
      prompt,
      platform,
      module: "creative",
      campaign,
      overrides: {
        industry: campaign.industry,
        goal: item.goal || campaign.goal,
        audience: plan?.targetAudience || campaign.target_audience,
        valueProposition: campaign.brand_description,
      },
    });
    const strategy = buildMarketingStrategy({
      brief: briefResult.brief,
      module: "creative",
      mode: item.type || "post",
    });
    const generated = await generatePost({
      prompt,
      platform,
      brief: briefResult.brief,
      strategy,
    });

    outputs.push({
      category: "creative",
      outputType: item.type,
      title: generated.title,
      content: generated.caption || generated.title,
      metadata: {
        platform,
        prompt,
        imageUrl: generated.imageUrl,
        imagePrompt: generated.imagePrompt,
        brief: generated.metadata?.brief,
        strategy: generated.metadata?.strategy,
        quality: generated.metadata?.quality || generated.quality,
      },
    });
  }

  return createAgentResult({
    agent: AGENT_TYPES.CREATIVE,
    input: {
      campaignId: campaign.id,
      items,
    },
    output: {
      outputs,
    },
  });
}

async function generatePost({ prompt, platform, brief, strategy }) {
  const result = await generateStructuredCreative({
    mode: "post",
    platform,
    prompt,
    brief,
    strategy,
    schema: `
{
  "type": "post",
  "title": "",
  "caption": "",
  "cta": "",
  "hashtags": [],
  "imagePrompt": ""
}
`,
  });

  const image = await createImageAsset(
    enhanceImagePrompt(result.imagePrompt, brief, strategy),
  );

  const output = {
    type: "post",
    title: result.title || "Image Post",
    caption: result.caption || "",
    cta: result.cta || "",
    hashtags: Array.isArray(result.hashtags) ? result.hashtags : [],
    imagePrompt: result.imagePrompt || "",
    imageUrl: image.src,
    image,
  };

  return withQuality(output, { brief, strategy });
}

async function generateCarousel({ prompt, platform, brief, strategy }) {
  const result = await generateStructuredCreative({
    mode: "carousel",
    platform,
    prompt,
    brief,
    strategy,
    schema: `
{
  "type": "carousel",
  "slides": [
    {
      "headline": "",
      "body": "",
      "image_prompt": ""
    }
  ]
}
`,
  });

  const slides = normalizeList(result.slides).slice(0, 5);

  while (slides.length < 5) {
    slides.push({
      headline: `Slide ${slides.length + 1}`,
      body: "",
      image_prompt: `${prompt}, social media carousel slide ${slides.length + 1}`,
    });
  }

  const output = {
    type: "carousel",
    slides: await mapSequential(slides, async (slide, index) => {
      const image = await createImageAsset(
        enhanceImagePrompt(
          slide.image_prompt ||
            `${prompt}, carousel slide ${index + 1}, clean marketing design`,
          brief,
          strategy,
        ),
      );

      return {
        headline: slide.headline || `Slide ${index + 1}`,
        body: slide.body || "",
        image_prompt: slide.image_prompt || "",
        generated_image: image.src,
        image,
      };
    }),
  };

  return withQuality(output, { brief, strategy });
}

async function generateReel({ prompt, platform, brief, strategy }) {
  const result = await generateStructuredCreative({
    mode: "reel",
    platform,
    prompt,
    brief,
    strategy,
    schema: `
{
  "type": "reel",
  "hook": "",
  "voiceover": "",
  "caption": "",
  "cta": "",
  "hashtags": [],
  "scenes": [
    {
      "title": "",
      "voice": "",
      "image_prompt": ""
    }
  ]
}
`,
  });

  const scenes = normalizeList(result.scenes).slice(0, 5);

  while (scenes.length < 5) {
    scenes.push({
      title: `Scene ${scenes.length + 1}`,
      voice: "",
      image_prompt: `${prompt}, vertical reel scene ${scenes.length + 1}`,
    });
  }

  const output = {
    type: "reel",
    hook: result.hook || "",
    voiceover: result.voiceover || "",
    caption: result.caption || "",
    cta: result.cta || "",
    hashtags: Array.isArray(result.hashtags) ? result.hashtags : [],
    scenes: await mapSequential(scenes, async (scene, index) => {
      const image = await createImageAsset(
        enhanceImagePrompt(
          scene.image_prompt ||
            `${prompt}, reel scene ${index + 1}, vertical social video frame`,
          brief,
          strategy,
        ),
      );

      return {
        title: scene.title || `Scene ${index + 1}`,
        voice: scene.voice || "",
        image_prompt: scene.image_prompt || "",
        generated_image: image.src,
        image,
      };
    }),
  };

  return withQuality(output, { brief, strategy });
}

async function generatePackage({ prompt, platform, brief, strategy }) {
  const [post, carousel, reel] = await Promise.all([
    generatePost({ prompt, platform, brief, strategy }),
    generateCarousel({ prompt, platform, brief, strategy }),
    generateReel({ prompt, platform, brief, strategy }),
  ]);

  const output = {
    type: "package",
    post,
    carousel,
    reel,
  };

  return withQuality(output, { brief, strategy });
}

async function generateStructuredCreative({
  mode,
  platform,
  prompt,
  brief,
  strategy,
  schema,
}) {
  const { systemPrompt, userPrompt } = buildCreativePrompt({
    mode,
    platform,
    prompt,
    brief,
    strategy,
    schema,
  });

  const result = await runGemini({
    systemPrompt,
    userPrompt,
    temperature: 0.75,
  });

  return parseJsonResponse(result.text);
}

function enhanceImagePrompt(prompt, brief, strategy) {
  const basePrompt =
    prompt ||
    "modern marketing social media visual, clean composition, high quality";

  if (!brief) return basePrompt;

  const context = [
    brief.creativeDirection,
    ...(strategy?.creative?.visualGuidelines || []),
    brief.offer ? `offer: ${brief.offer}` : "",
    brief.audience ? `target audience: ${brief.audience}` : "",
    brief.platform ? `${brief.platform} ready` : "",
    brief.tone ? `tone: ${brief.tone}` : "",
    strategy?.primaryAngle ? `marketing angle: ${strategy.primaryAngle}` : "",
  ].filter(Boolean);

  return [basePrompt, ...context].join(", ");
}

async function createImageAsset(prompt) {
  const image = await runPollinationsImage({
    prompt:
      prompt ||
      "modern marketing social media visual, clean composition, high quality",
  });

  return {
    provider: image.provider,
    prompt,
    imageData: image.imageData,
    mimeType: image.mimeType,
    remoteUrl: image.imageUrl,
    src: `data:${image.mimeType};base64,${image.imageData}`,
  };
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function withQuality(output, { brief, strategy }) {
  const quality = checkMarketingOutput({
    module: "creative",
    output,
    brief,
    strategy,
  });

  return formatCreativeOutput({
    output: {
      ...output,
      quality,
    },
    brief,
    strategy,
    quality,
  });
}

async function mapSequential(items, mapper) {
  const results = [];

  for (let index = 0; index < items.length; index += 1) {
    results.push(await mapper(items[index], index));
  }

  return results;
}
