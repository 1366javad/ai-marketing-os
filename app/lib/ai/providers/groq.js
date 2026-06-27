async function runGroq({
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  maxTokens = 1200,
  responseFormat,
}) {
  const startedAt = Date.now();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  let response;
  try {
    const requestBody = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        {
          role: "system",
          content: systemPrompt || "",
        },
        {
          role: "user",
          content: userPrompt || "",
        },
      ],
    };

    if (responseFormat) {
      requestBody.response_format = { type: responseFormat };
    }

    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    console.error("GROQ_FETCH_FAILED", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json();

  if (!response.ok || data.error) {
    const error = new Error(
      `Groq error ${response.status}: ${JSON.stringify(data.error || data)}`,
    );
    error.status = response.status;
    throw error;
  }

  return {
    provider: "groq",
    model,
    text: data?.choices?.[0]?.message?.content || "",
    latencyMs: Date.now() - startedAt,
    usage: {
      inputTokens: Number(data?.usage?.prompt_tokens || 0),
      outputTokens: Number(data?.usage?.completion_tokens || 0),
      totalTokens: Number(data?.usage?.total_tokens || 0),
    },
    raw: data,
  };
}

module.exports = { runGroq };
