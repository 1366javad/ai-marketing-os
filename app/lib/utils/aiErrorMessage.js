export function getAiErrorMessage(error) {
  const message =
    typeof error === "string" ? error : error?.message || "Generation failed.";

  const lowerMessage = message.toLowerCase();

  if (
    (lowerMessage.includes("pollinations video") ||
      lowerMessage.includes("video generation failed")) &&
    (lowerMessage.includes("402") ||
      lowerMessage.includes("credit") ||
      lowerMessage.includes("quota"))
  ) {
    return "This feature requires Pollinations credits.";
  }

  if (
    lowerMessage.includes("402") ||
    lowerMessage.includes("credit") ||
    lowerMessage.includes("quota") ||
    lowerMessage.includes("can only afford")
  ) {
    return "Generation limit reached. Please add credits or try again with a shorter request.";
  }

  if (
    lowerMessage.includes("403") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("permission")
  ) {
    return "AI provider access is blocked or unavailable. Trying another provider may resolve it.";
  }

  if (
    lowerMessage.includes("api_key") ||
    lowerMessage.includes("api key") ||
    lowerMessage.includes("missing")
  ) {
    return "AI provider key is missing or invalid. Please check the environment settings.";
  }

  if (
    lowerMessage.includes("fetch failed") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Unable to connect to the AI provider. Please try again in a moment.";
  }

  if (
    lowerMessage.includes("pollinations video") ||
    lowerMessage.includes("video generation failed")
  ) {
    return "Video generation beta is unavailable right now. The video endpoint may be missing or temporarily offline.";
  }

  if (
    lowerMessage.includes("pollinations image") ||
    lowerMessage.includes("image generation") ||
    lowerMessage.includes("internal server error")
  ) {
    return "Image generation is temporarily unavailable. Please try again with a simpler prompt.";
  }

  return "Generation failed. Please try again or adjust the request.";
}

export function getAiErrorStatus(error) {
  const message =
    typeof error === "string" ? error : error?.message || "Generation failed.";

  const lowerMessage = message.toLowerCase();

  if (
    (lowerMessage.includes("pollinations video") ||
      lowerMessage.includes("video generation failed")) &&
    (lowerMessage.includes("402") ||
      lowerMessage.includes("credit") ||
      lowerMessage.includes("quota"))
  ) {
    return 402;
  }

  if (
    lowerMessage.includes("402") ||
    lowerMessage.includes("credit") ||
    lowerMessage.includes("quota") ||
    lowerMessage.includes("can only afford")
  ) {
    return 402;
  }

  if (
    lowerMessage.includes("403") ||
    lowerMessage.includes("forbidden") ||
    lowerMessage.includes("permission")
  ) {
    return 403;
  }

  if (
    lowerMessage.includes("api_key") ||
    lowerMessage.includes("api key") ||
    lowerMessage.includes("missing")
  ) {
    return 401;
  }

  if (
    lowerMessage.includes("fetch failed") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return 503;
  }

  if (
    lowerMessage.includes("pollinations video") ||
    lowerMessage.includes("video generation failed")
  ) {
    return lowerMessage.includes("404") ? 404 : 503;
  }

  if (
    lowerMessage.includes("pollinations image") ||
    lowerMessage.includes("image generation") ||
    lowerMessage.includes("internal server error")
  ) {
    return 503;
  }

  return 500;
}
