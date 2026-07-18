const { runTextProvider } = require("../../providers");
const { getProviderMetadata } = require("../../providers/providerMetadata");

const ACTIVE_VIDEO_TASKS = new Set(["video_script", "storyboard"]);

async function runVideoPlanning({ brief, executionPlan }) {
  const task = normalizeVideoTask(brief?.task || executionPlan?.task);
  if (!ACTIVE_VIDEO_TASKS.has(task)) {
    throw new Error(`Video task "${task}" is planned for Phase 2.`);
  }

  const { systemPrompt, userPrompt } = buildVideoPlanningPrompt({
    brief,
    task,
  });
  const providerResult = await runTextProvider({
    systemPrompt,
    userPrompt,
    temperature: 0.6,
    maxTokens: 2400,
    responseFormat: "json_object",
  });

  return normalizeVideoPlanningOutput(providerResult, { brief, task });
}

function buildVideoPlanningPrompt({ brief, task }) {
  const isStoryboard = task === "storyboard";
  const systemPrompt = [
    "You are the Video Planning capability for AI Marketing OS.",
    "This is not final video generation. Produce campaign-specific text planning only.",
    "Use the supplied campaign context and approved memory. Do not invent product claims.",
    "Return only valid JSON.",
    "",
    "JSON shape:",
    JSON.stringify({
      type: task,
      title: "",
      summary: "",
      hook: "",
      visualStyle: "",
      scenes: [
        {
          scene: 1,
          duration: "",
          visual: "",
          voiceover: "",
          onScreenText: "",
        },
      ],
      cta: "",
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    }),
  ].join("\n");

  const userPrompt = [
    `Task: ${isStoryboard ? "Storyboard" : "Video Script"}`,
    `Campaign: ${brief.campaignName || "Not specified"}`,
    `Goal: ${brief.goal || "Not specified"}`,
    `Audience: ${brief.audience || "Not specified"}`,
    `Offer: ${brief.offer || "Not specified"}`,
    `Platform: ${brief.platform || "Not specified"}`,
    `Duration: ${brief.duration || "30 seconds"}`,
    `CTA: ${brief.cta || "Not specified"}`,
    brief.visualStyle ? `Visual style: ${brief.visualStyle}` : "",
    brief.direction ? `Direction: ${brief.direction}` : "",
    brief.relevantEvents?.length
      ? `Approved memory:\n${brief.relevantEvents
          .slice(0, 6)
          .map(
            (event) =>
              `- ${event.module}/${event.artifact}: ${event.summary}`,
          )
          .join("\n")}`
      : "Approved memory: none.",
    "",
    isStoryboard
      ? "Create 5-7 production-ready visual scenes. Emphasize composition, action, transitions, on-screen text, voiceover, and duration."
      : "Create a strong hook and 5-7 scene script with voiceover, visual direction, on-screen text, timing, and a clear CTA.",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt };
}

function normalizeVideoPlanningOutput(providerResult, { brief, task }) {
  const parsed = parseJson(providerResult?.text || "");
  const scenes = normalizeScenes(parsed?.scenes);
  const summary =
    clean(parsed?.summary) ||
    clean(parsed?.hook) ||
    scenes.map((scene) => scene.visual).filter(Boolean).join(" ").slice(0, 500);

  return {
    type: task,
    title:
      clean(parsed?.title) ||
      `${brief?.campaignName || brief?.offer || "Campaign"} ${
        task === "storyboard" ? "Storyboard" : "Video Script"
      }`,
    summary,
    hook: clean(parsed?.hook),
    visualStyle: clean(parsed?.visualStyle || parsed?.visual_style),
    scenes,
    cta: clean(parsed?.cta) || clean(brief?.cta),
    metadata: {
      ...getProviderMetadata(providerResult),
      provider: providerResult?.provider || "unknown",
      warning: providerResult?.warning || "",
      lowConfidenceProvider:
        providerResult?.lowConfidenceProvider ||
        providerResult?.provider === "pollinations",
      confidence: normalizeConfidence(parsed?.metadata?.confidence, scenes),
      generatedAt: new Date().toISOString(),
    },
  };
}

function toVideoMemoryEvent(output) {
  return {
    eventType: output.type,
    module: "video",
    artifact: output.type,
    summary: output.summary,
    payload: {
      ...output,
      body: formatVideoPlanningText(output),
      generatedAt: output.metadata.generatedAt,
      provider: output.metadata.provider,
      confidence: output.metadata.confidence,
    },
    suggestedRiskLevel: "medium",
  };
}

function formatVideoPlanningText(output) {
  return [
    `# ${output.title}`,
    "",
    "## Summary",
    output.summary,
    output.hook ? `\n## Hook\n${output.hook}` : "",
    output.visualStyle ? `\n## Visual Style\n${output.visualStyle}` : "",
    "",
    "## Scenes",
    ...output.scenes.flatMap((scene) => [
      `### Scene ${scene.scene}`,
      scene.duration ? `Duration: ${scene.duration}` : "",
      scene.visual ? `Visual: ${scene.visual}` : "",
      scene.voiceover ? `Voiceover: ${scene.voiceover}` : "",
      scene.onScreenText ? `On-screen text: ${scene.onScreenText}` : "",
      "",
    ]),
    output.cta ? `## CTA\n${output.cta}` : "",
  ]
    .filter(Boolean)
    .join("\n")
    .trim();
}

function normalizeVideoTask(value) {
  const task = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const aliases = {
    script: "video_script",
    video_scripts: "video_script",
    storyboards: "storyboard",
    reels: "reel_package",
    reel: "reel_package",
    tiktok: "tiktok_video",
    youtube_shorts: "youtube_short",
    campaign_video_package: "campaign_package",
  };
  return aliases[task] || task || "video_script";
}

function normalizeScenes(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          scene: index + 1,
          duration: "",
          visual: item.trim(),
          voiceover: "",
          onScreenText: "",
        };
      }
      if (!item || typeof item !== "object") return null;
      return {
        scene: Number(item.scene || item.number || index + 1),
        duration: clean(item.duration),
        visual: clean(item.visual || item.visualDirection || item.visual_direction),
        voiceover: clean(item.voiceover || item.narration),
        onScreenText: clean(
          item.onScreenText || item.on_screen_text || item.text,
        ),
      };
    })
    .filter(Boolean);
}

function parseJson(text) {
  const trimmed = String(text || "").trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(),
    trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return {};
}

function normalizeConfidence(value, scenes) {
  const number = Number(value);
  if (Number.isFinite(number) && number >= 0 && number <= 1) return number;
  return scenes.length >= 5 ? 0.85 : scenes.length >= 3 ? 0.65 : 0.35;
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = {
  ACTIVE_VIDEO_TASKS,
  formatVideoPlanningText,
  normalizeVideoPlanningOutput,
  normalizeVideoTask,
  runVideoPlanning,
  toVideoMemoryEvent,
};
