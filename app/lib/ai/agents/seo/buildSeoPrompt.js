const SEO_TASKS = Object.freeze({
  keywords: {
    label: "Keyword Research",
    type: "keyword_research",
    focus: [
      "Primary keywords",
      "Secondary keywords",
      "Search volume estimate",
      "Difficulty estimate",
      "Search intent",
    ],
    outputShape: {
      type: "keyword_research",
      title: "",
      summary: "",
      primaryKeywords: [{ keyword: "", volume: "", difficulty: "", intent: "" }],
      secondaryKeywords: [{ keyword: "", volume: "", difficulty: "", intent: "" }],
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    },
  },
  clusters: {
    label: "Keyword Clusters",
    type: "keyword_clusters",
    focus: ["Cluster name", "Keywords", "Intent", "Priority"],
    outputShape: {
      type: "keyword_clusters",
      title: "",
      summary: "",
      keywordClusters: [
        { cluster: "", keywords: [""], intent: "", priority: "High|Medium|Low" },
      ],
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    },
  },
  topics: {
    label: "Topic Clusters",
    type: "topic_clusters",
    focus: [
      "Pillar page",
      "Supporting articles",
      "Internal linking strategy",
      "CTA strategy",
    ],
    outputShape: {
      type: "topic_clusters",
      title: "",
      summary: "",
      topicClusters: [
        {
          pillarPage: "",
          supportingArticles: [""],
          internalLinks: [
            { from: "", to: "", anchorText: "" },
          ],
          ctas: [""],
        },
      ],
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    },
  },
  strategy: {
    label: "SEO Strategy",
    type: "seo_strategy",
    focus: ["Quick wins", "Medium-term actions", "Long-term actions", "Priorities"],
    outputShape: {
      type: "seo_strategy",
      title: "",
      summary: "",
      strategy: {
        quickWins: [""],
        mediumTerm: [""],
        longTerm: [""],
        priorities: [""],
      },
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    },
  },
  meta: {
    label: "Meta Descriptions",
    type: "meta_descriptions",
    focus: ["Page", "Title", "Meta description"],
    outputShape: {
      type: "meta_descriptions",
      title: "",
      summary: "",
      metaDescriptions: [{ page: "", title: "", metaDescription: "" }],
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    },
  },
  faq: {
    label: "FAQs",
    type: "faqs",
    focus: ["Question", "Answer", "Schema opportunity"],
    outputShape: {
      type: "faqs",
      title: "",
      summary: "",
      faqs: [{ question: "", answer: "", schemaOpportunity: "" }],
      metadata: { provider: "", confidence: 0, generatedAt: "" },
    },
  },
});

const TASK_ALIASES = Object.freeze({
  keyword: "keywords",
  keywords: "keywords",
  keyword_research: "keywords",
  clusters: "clusters",
  keyword_clusters: "clusters",
  keyword_cluster: "clusters",
  topics: "topics",
  topic_clusters: "topics",
  topic_cluster: "topics",
  strategy: "strategy",
  seo_strategy: "strategy",
  meta: "meta",
  metas: "meta",
  meta_descriptions: "meta",
  meta_description: "meta",
  faq: "faq",
  faqs: "faq",
  faq_generation: "faq",
});

function buildSeoPrompt({ brief, executionPlan }) {
  if (!brief) {
    throw new Error("buildSeoPrompt: brief is required.");
  }

  const taskKey = normalizeSeoTask(brief.task || executionPlan?.task);
  const task = SEO_TASKS[taskKey] || SEO_TASKS.keywords;
  const relevantEvents = Array.isArray(brief.relevantEvents)
    ? brief.relevantEvents
    : [];

  const systemPrompt = [
    "You are SEO Agent V2 for AI Marketing OS.",
    "You produce campaign-specific SEO assets, not generic SEO advice.",
    "Ground every recommendation in the campaign context and approved research memory.",
    "",
    "Rules:",
    "- Do not fabricate exact search volume or keyword difficulty from live tools.",
    "- If live data is unavailable, use clear estimates such as Low, Medium, High.",
    "- Every keyword, cluster, page, or FAQ must be relevant to the campaign audience and goal.",
    "- Prefer practical SEO assets the team can use immediately.",
    "- Return only valid JSON. No markdown outside JSON.",
    "",
    "Return this exact JSON shape for the selected task:",
    JSON.stringify(task.outputShape),
  ].join("\n");

  const userPrompt = [
    `SEO task: ${task.label}`,
    `Output type: ${task.type}`,
    "",
    "Campaign context:",
    `- Campaign: ${brief.campaignName || "Not specified"}`,
    `- Industry: ${brief.industry || "Not specified"}`,
    `- Offer: ${brief.offer || "Not specified"}`,
    `- Audience: ${brief.audience || "Not specified"}`,
    `- Goal: ${brief.goal || "Not specified"}`,
    `- Competitors: ${Array.isArray(brief.competitors) ? brief.competitors.join(", ") : "Not specified"}`,
    brief.normalizedPrompt
      ? `\nAdditional direction from user: ${brief.normalizedPrompt}`
      : "",
    relevantEvents.length
      ? `\nApproved research memory:\n${formatRelevantEvents(relevantEvents)}`
      : "\nApproved research memory: none yet.",
    brief.knowledgeEnabled
      ? `\nApproved durable business knowledge:\n${brief.knowledgeContext}`
      : "",
    "",
    "Task-specific focus areas:",
    ...task.focus.map((item) => `- ${item}`),
    "",
    "Output requirements:",
    "- summary: 2-4 specific paragraphs tied to this campaign.",
    "- Use enough items to make the asset useful. Prefer 6-12 keywords, 4-6 clusters, 4-8 FAQs, or 5-9 strategy actions where relevant.",
    "- Include intent and priority where the task calls for it.",
    "- Keep every field structured exactly as defined in the JSON shape.",
    "- Return user-facing results only. Never include instructions such as 'link each article' or explanations of how to format the output.",
    "- Do not produce unrelated content drafts.",
  ].join("\n");

  return { systemPrompt, userPrompt };
}

function formatRelevantEvents(events) {
  return events
    .slice(0, 6)
    .map(
      (event) =>
        `- ${event.module}/${event.artifact || event.type}: ${event.summary}`,
    )
    .join("\n");
}

function normalizeSeoTask(task) {
  const key = String(task || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return TASK_ALIASES[key] || "keywords";
}

module.exports = {
  buildSeoPrompt,
  normalizeSeoTask,
  SEO_TASKS,
  TASK_ALIASES,
};
