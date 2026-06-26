const { runTextProvider } = require("../providers");

const DEFAULT_NEGATIVE = Object.freeze([
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
]);

async function runVisualDirector({ creativeStrategy, brief, providerRunner = runTextProvider }) {
  const { systemPrompt, userPrompt } = buildVisualDirectorPrompt({
    creativeStrategy,
    brief,
  });
  const result = await providerRunner({
    systemPrompt,
    userPrompt,
    temperature: 0.45,
    maxTokens: 1200,
  });

  return normalizeVisualDirection(result?.text, { creativeStrategy, brief });
}

function buildVisualDirectorPrompt({ creativeStrategy, brief }) {
  const systemPrompt = [
    "You are the Visual Director for AI Marketing OS.",
    "Translate abstract creative strategy into one concrete, photographable scene.",
    "Image models understand visible subjects, actions, props, states, camera, and light. They do not understand abstract roadmaps, pathways, readiness, transformation diagrams, or software UI.",
    "Choose one explicit hero object. Prefer real physical evidence such as a passport, checklist, calendar, folder, printed documents, acceptance letter, product package, or the person when appropriate.",
    "The primarySubject must be only the living person, product, or main object. Keep the hero separate from primarySubject.",
    "The action must be a natural photographable behavior, not a marketing concept.",
    "The state object must contain only visible physical conditions.",
    "Keep visual complexity low or medium for free image providers.",
    "Return only valid JSON.",
    "",
    JSON.stringify({
      scene: {
        primarySubject: "",
        action: "",
        setting: "",
      },
      props: [""],
      state: {},
      camera: {
        angle: "",
        shot: "",
        focus: "",
      },
      lighting: {
        type: "",
        accent: "",
      },
      mood: "",
      hero: "",
      complexity: "low|medium|high",
      brand: {
        palette: [""],
        negativeSpace: "",
        logo: false,
      },
      negative: [""],
    }),
  ].join("\n");

  const userPrompt = [
    `Campaign: ${brief?.campaignName || brief?.offer || "Campaign"}`,
    `Audience: ${brief?.audience || "Not specified"}`,
    `Platform: ${brief?.platform || "Not specified"}`,
    `Creative concept: ${creativeStrategy?.concept || ""}`,
    `Visual goal: ${creativeStrategy?.strategy?.visualGoal || ""}`,
    `Marketing angle: ${creativeStrategy?.strategy?.marketingAngle || ""}`,
    `Audience insight: ${creativeStrategy?.strategy?.audienceInsight || ""}`,
    `Key message: ${creativeStrategy?.strategy?.keyMessage || ""}`,
    `Desired response: ${creativeStrategy?.strategy?.desiredResponse || ""}`,
    `Brand direction: ${creativeStrategy?.strategy?.brandDirection || ""}`,
    "",
    "Requirements:",
    "- Replace every abstract concept with visible physical evidence.",
    "- Use 3-6 concrete props.",
    "- State must describe visible conditions such as checklist=completed, deadline=approaching, documents=organized.",
    "- Hero must be one concrete visible object or person.",
    "- Primary subject must not include the hero object, offer, audience label, campaign summary, or headline.",
    "- Action must not be abstract, strategic, transformational, or metaphorical.",
    "- Do not use dashboards, UI, diagrams, flowcharts, or generated text.",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

function normalizeVisualDirection(text, { creativeStrategy, brief }) {
  const parsed = parseJson(text);
  const scene = parsed.scene || {};
  const camera = parsed.camera || {};
  const lighting = parsed.lighting || {};
  const brand = parsed.brand || {};
  const props = normalizeList(parsed.props);
  const state = normalizeState(parsed.state);

  return {
    scene: {
      primarySubject:
        normalizePrimarySubject(
          scene.primarySubject || scene.primary_subject,
          brief,
        ) ||
        `${brief?.audience || "A campaign customer"}`,
      action:
        normalizeAction(scene.action) ||
        "organizing concrete materials related to the campaign goal",
      setting:
        clean(scene.setting) ||
        "a clean realistic workspace with physical campaign evidence",
    },
    props:
      props.length > 0
        ? props.slice(0, 6)
        : inferConcreteProps(creativeStrategy, brief),
    state:
      Object.keys(state).length > 0
        ? state
        : {
            materials: "organized",
            next_step: "clear",
          },
    camera: {
      angle: clean(camera.angle) || "three-quarter",
      shot: clean(camera.shot) || "medium",
      focus: clean(camera.focus) || "subject and hero object",
    },
    lighting: {
      type: clean(lighting.type) || "soft daylight",
      accent: clean(lighting.accent) || "warm practical accent",
    },
    mood:
      clean(parsed.mood) ||
      creativeStrategy?.strategy?.desiredResponse ||
      "confidence replacing uncertainty",
    hero:
      clean(parsed.hero) ||
      props[0] ||
      inferConcreteProps(creativeStrategy, brief)[0],
    complexity: normalizeComplexity(parsed.complexity),
    brand: {
      palette: normalizeList(brand.palette).slice(0, 5),
      negativeSpace:
        clean(brand.negativeSpace || brand.negative_space) || "top-right",
      logo: brand.logo === true && brief?.allowGeneratedLogo === true,
    },
    negative: [
      ...new Set([
        ...normalizeList(parsed.negative),
        ...DEFAULT_NEGATIVE,
        "abstract roadmap",
        "abstract pathway",
      ]),
    ],
  };
}

function inferConcreteProps(creativeStrategy, brief) {
  const text = [
    creativeStrategy?.concept,
    creativeStrategy?.strategy?.keyMessage,
    brief?.industry,
    brief?.offer,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/admission|university|student|graduate|application/.test(text)) {
    return [
      "printed admission checklist",
      "passport",
      "university folder",
      "calendar with highlighted deadline",
      "organized application documents",
    ];
  }
  if (/saas|software|marketing|campaign/.test(text)) {
    return [
      "printed campaign brief",
      "channel cards",
      "calendar",
      "organized research notes",
      "colored markers",
    ];
  }
  if (/commerce|product|shop|retail/.test(text)) {
    return [
      "physical product package",
      "shipping box",
      "order card",
      "branded color swatches",
    ];
  }

  return [
    "printed checklist",
    "calendar",
    "organized folder",
    "relevant physical documents",
  ];
}

function normalizeState(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, item]) => [normalizeKey(key), clean(item)])
      .filter(([, item]) => item && !isAbstractState(item)),
  );
}

function normalizePrimarySubject(value, brief) {
  const subject = clean(value)
    .replace(/\b(campaign|offer|headline|caption|cta|goal|audience)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (subject) return subject;
  if (/student|admission|university|graduate/i.test(brief?.offer || "")) {
    return "international graduate applicant";
  }
  if (/product|shop|ecommerce|commerce/i.test(brief?.industry || "")) {
    return "featured product";
  }
  return "campaign customer";
}

function normalizeAction(value) {
  const action = clean(value);
  if (!action || isAbstractAction(action)) {
    return "reviewing and organizing physical materials";
  }

  return action
    .replace(/\b(transforming|unlocking|empowering|optimizing|accelerating)\b/gi, "reviewing")
    .replace(/\bjourney|roadmap|pathway|funnel\b/gi, "documents")
    .replace(/\s+/g, " ")
    .trim();
}

function isAbstractAction(value) {
  return /\b(transform|unlock|empower|optimi[sz]e|accelerate|convert|scale|journey|pathway|roadmap|clarity|confidence|growth|awareness)\b/i.test(
    value,
  );
}

function isAbstractState(value) {
  return /\b(confidence|trust|growth|readiness|success|awareness|conversion|clarity|relief)\b/i.test(
    value,
  );
}

function normalizeComplexity(value) {
  const complexity = clean(value).toLowerCase();
  return ["low", "medium", "high"].includes(complexity)
    ? complexity
    : "low";
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value === "string") {
    return value.split(/\r?\n|,|;/).map(clean).filter(Boolean);
  }
  return [];
}

function parseJson(text) {
  const value = String(text || "").trim();
  const candidates = [
    value,
    value.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim(),
    extractJson(value),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {}
  }
  return {};
}

function extractJson(value) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  return start >= 0 && end > start ? value.slice(start, end + 1) : "";
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = {
  DEFAULT_NEGATIVE,
  buildVisualDirectorPrompt,
  normalizeVisualDirection,
  runVisualDirector,
};
