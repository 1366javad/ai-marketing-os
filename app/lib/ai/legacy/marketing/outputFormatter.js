export function formatMarketingOutput({
  module,
  output,
  title = "",
  type = "",
  brief = null,
  strategy = null,
  quality = null,
  metadata = {},
} = {}) {
  if (module === "creative") {
    return formatCreativeOutput({
      output,
      brief,
      strategy,
      quality,
      metadata,
    });
  }

  if (module === "ads" && output && typeof output === "object") {
    return {
      title,
      type,
      content: formatStructuredAdCopy(output),
      raw: output,
      metadata: buildMetadata({ brief, strategy, quality, metadata }),
    };
  }

  const formattedContent =
    module === "content" && !brief?.cta
      ? stripGenericTrailingCta(formatMarkdown(output))
      : formatMarkdown(output);

  return {
    title,
    type,
    content: formattedContent,
    metadata: buildMetadata({ brief, strategy, quality, metadata }),
  };
}

export function formatMarkdown(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatCreativeOutput({
  output,
  brief = null,
  strategy = null,
  quality = null,
  metadata = {},
} = {}) {
  const normalized = normalizeCreativeOutput(output);

  return {
    ...normalized,
    metadata: buildMetadata({
      brief,
      strategy,
      quality: quality || normalized.quality,
      metadata,
    }),
  };
}

export function formatStructuredAdCopy(copy = {}) {
  const lines = [];

  if (copy.platform) {
    lines.push(`## ${copy.platform}`);
  }

  appendList(lines, "Headlines", copy.headlines);
  appendList(lines, "Descriptions", copy.descriptions);
  appendList(lines, "CTAs", copy.ctas);

  return formatMarkdown(lines.join("\n\n"));
}

function normalizeCreativeOutput(output = {}) {
  if (output.type === "post") return normalizePost(output);
  if (output.type === "carousel") return normalizeCarousel(output);
  if (output.type === "reel") return normalizeReel(output);
  if (output.type === "package") return normalizePackage(output);

  return output;
}

function normalizePost(output) {
  return {
    ...output,
    title: cleanText(output.title) || "Image Post",
    caption: cleanText(output.caption),
    cta: cleanText(output.cta),
    hashtags: normalizeHashtags(output.hashtags),
    imagePrompt: cleanText(output.imagePrompt),
  };
}

function normalizeCarousel(output) {
  return {
    ...output,
    slides: normalizeList(output.slides).map((slide, index) => ({
      ...slide,
      headline: cleanText(slide.headline) || `Slide ${index + 1}`,
      body: cleanText(slide.body),
      image_prompt: cleanText(slide.image_prompt),
    })),
  };
}

function normalizeReel(output) {
  return {
    ...output,
    hook: cleanText(output.hook),
    voiceover: cleanText(output.voiceover),
    caption: cleanText(output.caption),
    cta: cleanText(output.cta),
    hashtags: normalizeHashtags(output.hashtags),
    scenes: normalizeList(output.scenes).map((scene, index) => ({
      ...scene,
      title: cleanText(scene.title) || `Scene ${index + 1}`,
      voice: cleanText(scene.voice),
      image_prompt: cleanText(scene.image_prompt),
    })),
  };
}

function normalizePackage(output) {
  return {
    ...output,
    post: output.post ? normalizePost(output.post) : null,
    carousel: output.carousel ? normalizeCarousel(output.carousel) : null,
    reel: output.reel ? normalizeReel(output.reel) : null,
  };
}

function buildMetadata({ brief, strategy, quality, metadata }) {
  return {
    ...metadata,
    brief,
    strategy,
    quality,
    formattedAt: new Date().toISOString(),
  };
}

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeHashtags(value) {
  return normalizeList(value)
    .map((hashtag) => cleanText(hashtag))
    .filter(Boolean)
    .map((hashtag) => (hashtag.startsWith("#") ? hashtag : `#${hashtag}`));
}

function appendList(lines, title, items) {
  const list = normalizeList(items).map(cleanText).filter(Boolean);

  if (!list.length) return;

  lines.push(`### ${title}`);
  lines.push(list.map((item) => `- ${item}`).join("\n"));
}

function stripGenericTrailingCta(content) {
  return content
    .replace(/\n{0,2}(?:\*\*)?learn more(?:\*\*)?\.?\s*$/i, "")
    .trim();
}
