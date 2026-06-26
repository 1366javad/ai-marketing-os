const PROVIDER_RENDERERS = Object.freeze({
  pollinations: renderPollinationsPrompt,
  flux: renderFluxPrompt,
  openai: renderOpenAIPrompt,
  imagen: renderImagenPrompt,
  gemini: renderGeminiImagePrompt,
  gpt_image: renderOpenAIPrompt,
});

function buildImagePrompt(visualDirection, provider = "pollinations", options = {}) {
  const renderer = PROVIDER_RENDERERS[provider];
  if (!renderer) {
    throw new Error(`No image prompt renderer registered for "${provider}".`);
  }

  const spec = buildProviderPromptSpec(visualDirection);
  return renderer(spec, options);
}

function buildProviderPromptSpec(direction = {}) {
  const scene = direction.scene || {};
  const camera = direction.camera || {};
  const lighting = direction.lighting || {};
  const brand = direction.brand || {};

  return {
    subject: clean(scene.primarySubject) || "campaign customer",
    action: normalizePhotographableAction(scene.action),
    environment:
      clean(scene.setting) ||
      "a realistic workspace with relevant physical campaign materials",
    hero: clean(direction.hero) || "printed checklist",
    props: normalizeProps(direction.props, direction.hero, direction.complexity),
    state: normalizeVisibleState(direction.state),
    camera: {
      angle: clean(camera.angle) || "three-quarter",
      shot: clean(camera.shot) || "medium",
      focus: clean(camera.focus) || "subject and hero object",
    },
    lighting: {
      type: clean(lighting.type) || "soft daylight",
      accent: clean(lighting.accent) || "warm practical accent",
    },
    mood: clean(direction.mood) || "confident and calm",
    style: "realistic editorial commercial photography",
    brand: {
      palette: normalizeList(brand.palette).slice(0, 4),
      negativeSpace: clean(brand.negativeSpace || brand.negative_space) || "top-right",
      logo: brand.logo === true,
    },
    negative: normalizeNegative(direction.negative),
  };
}

function renderPollinationsPrompt(spec, options = {}) {
  spec = ensurePromptSpec(spec);
  const text = naturalPhotographyPrompt(spec, {
    maxWords: options.retry ? 78 : 110,
    includeStyle: true,
  });
  return createPromptResult("pollinations", text, spec, "pollinations-spec-v1");
}

function renderFluxPrompt(spec) {
  spec = ensurePromptSpec(spec);
  const text = naturalPhotographyPrompt(spec, {
    maxWords: 145,
    includeStyle: true,
  });
  return createPromptResult("flux", text, spec, "flux-spec-v1");
}

function renderOpenAIPrompt(spec) {
  spec = ensurePromptSpec(spec);
  const text = naturalPhotographyPrompt(spec, {
    maxWords: 220,
    includeStyle: true,
    includeNegativeSentence: true,
  });
  return createPromptResult("openai", text, spec, "openai-spec-v1");
}

function renderImagenPrompt(spec) {
  spec = ensurePromptSpec(spec);
  const text = naturalPhotographyPrompt(spec, {
    maxWords: 170,
    includeStyle: true,
  });
  return createPromptResult("imagen", text, spec, "imagen-spec-v1");
}

function renderGeminiImagePrompt(spec) {
  spec = ensurePromptSpec(spec);
  const text = naturalPhotographyPrompt(spec, {
    maxWords: 190,
    includeStyle: true,
    includeNegativeSentence: true,
  });
  return createPromptResult("gemini", text, spec, "gemini-image-spec-v1");
}

function ensurePromptSpec(value) {
  if (value?.subject && value?.environment && value?.camera) return value;
  return buildProviderPromptSpec(value);
}

function naturalPhotographyPrompt(
  spec,
  { maxWords, includeStyle, includeNegativeSentence = false },
) {
  const supportingProps = spec.props
    .filter((item) => item !== spec.hero)
    .slice(0, 5);
  const visibleState = formatVisibleState(spec.state);
  const palette = spec.brand.palette.length
    ? `with subtle ${spec.brand.palette.join(", ")} color accents`
    : "";

  const sentences = [
    includeStyle ? `${spec.style} of ${spec.subject} ${spec.action}.` : "",
    `The scene takes place in ${spec.environment}, with ${spec.hero} as the clear hero object.`,
    supportingProps.length
      ? `Supporting props include ${joinHumanList(supportingProps)}.`
      : "",
    visibleState ? `Visible state: ${visibleState}.` : "",
    `Use a ${spec.camera.angle} ${spec.camera.shot} shot focused on ${spec.camera.focus}.`,
    `Lighting is ${spec.lighting.type} with ${spec.lighting.accent}, creating a ${spec.mood} mood.`,
    palette,
    `Reserve clean negative space in the ${spec.brand.negativeSpace}.`,
    includeNegativeSentence
      ? `Avoid ${joinHumanList(spec.negative.slice(0, 10))}.`
      : `No ${spec.negative.slice(0, 10).join(", ")}.`,
  ];

  return limitWords(compactSentences(sentences), maxWords);
}

function createPromptResult(provider, text, spec, version) {
  return {
    provider,
    text,
    spec,
    negativePrompt: [...spec.negative],
    version,
    wordCount: countWords(text),
  };
}

function normalizePhotographableAction(value) {
  const action = clean(value);
  if (!action || isAbstractAction(action)) {
    return "reviewing and organizing the hero object";
  }

  return action
    .replace(/\b(transforming|unlocking|empowering|optimizing|accelerating)\b/gi, "reviewing")
    .replace(/\bjourney|roadmap|pathway|funnel\b/gi, "materials")
    .trim();
}

function isAbstractAction(value) {
  return /\b(transform|unlock|empower|optimi[sz]e|accelerate|convert|scale|journey|pathway|roadmap|clarity|confidence)\b/i.test(
    value,
  );
}

function normalizeProps(value, hero, complexity) {
  const limits = { low: 4, medium: 5, high: 6 };
  const limit = limits[complexity] || 4;
  const props = normalizeList(value)
    .filter((item) => !isBannedPromptContent(item))
    .slice(0, limit);

  return unique([hero, ...props].filter(Boolean)).slice(0, limit + 1);
}

function normalizeVisibleState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [normalizeKey(key), clean(item)])
      .filter(([, item]) => item && !isAbstractState(item)),
  );
}

function isAbstractState(value) {
  return /\b(confidence|trust|growth|readiness|success|awareness|conversion)\b/i.test(
    value,
  );
}

function normalizeNegative(value) {
  return unique([
    ...normalizeList(value),
    "dashboard",
    "ui",
    "mobile app",
    "phone interface",
    "text",
    "flowchart",
    "diagram",
    "buttons",
    "forms",
    "tiny icons",
    "watermark",
    "distorted anatomy",
  ]);
}

function isBannedPromptContent(value) {
  return /\b(caption|cta|headline|audience|offer|marketing goal|campaign summary|creative concept|visual notes|metadata|brand description)\b/i.test(
    value,
  );
}

function formatVisibleState(state) {
  if (!state || typeof state !== "object") return "";
  return Object.entries(state)
    .map(([key, value]) => `${key.replace(/_/g, " ")} ${value}`)
    .join(", ");
}

function joinHumanList(items) {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

function compactSentences(parts) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/\r?\n|,|;/).map(clean).filter(Boolean);
  }
  return [];
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function limitWords(value, maximum) {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maximum)
    .join(" ");
}

function countWords(value) {
  return String(value || "").split(/\s+/).filter(Boolean).length;
}

function clean(value) {
  return String(value || "").trim();
}

module.exports = {
  buildFluxPrompt: renderFluxPrompt,
  buildImagePrompt,
  buildImagenPrompt: renderImagenPrompt,
  buildOpenAIPrompt: renderOpenAIPrompt,
  buildPollinationsPrompt: renderPollinationsPrompt,
  buildProviderPromptSpec,
  renderGeminiImagePrompt,
};
