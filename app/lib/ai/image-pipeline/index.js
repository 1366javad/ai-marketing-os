const { buildImagePrompt } = require("./prompt-builders");
const { generateImage } = require("./generateImage");
const { reviewImage } = require("./reviewImage");

async function runImagePipeline({
  visualDirection,
  provider = "openai",
  width = 1024,
  height = 1024,
  generator = generateImage,
  reviewer = reviewImage,
  visionReviewer,
}) {
  const providers = getProviderOrder(provider);
  const errors = [];
  let finalResult = null;

  for (const currentProvider of providers) {
    const result = await runProviderAttempts({
      provider: currentProvider,
      visualDirection,
      width,
      height,
      generator,
      reviewer,
      visionReviewer,
      errors,
    });

    finalResult = result;
    if (result.approved) break;
  }

  if (!finalResult) {
    throw errors[0] || new Error("Image generation failed.");
  }

  const fallbackUsed = finalResult.provider !== providers[0];

  return {
    provider: finalResult.provider,
    visualDirection,
    prompt: finalResult.prompt,
    review: finalResult.review,
    attempts: finalResult.attempts,
    approved: Boolean(finalResult.review?.passed),
    fallbackUsed,
    fallbackProvider: fallbackUsed ? finalResult.provider : "",
    errors: errors.map((error) => error.message),
    usage: finalResult.image?.usage || null,
    latencyMs: finalResult.image?.latencyMs || 0,
    model: finalResult.image?.model || "",
    asset: finalResult.image
      ? {
          provider: finalResult.provider,
          model: finalResult.image.model || "",
          mimeType: finalResult.image.mimeType,
          imageUrl: `data:${finalResult.image.mimeType};base64,${finalResult.image.imageData}`,
          remoteUrl: finalResult.image.remoteUrl || "",
          approvalStatus: finalResult.review?.passed ? "pending" : "rejected",
          latencyMs: finalResult.image.latencyMs || 0,
          usage: finalResult.image.usage || null,
        }
      : null,
  };
}

async function runProviderAttempts({
  provider,
  visualDirection,
  width,
  height,
  generator,
  reviewer,
  visionReviewer,
  errors,
}) {
  let attempts = 0;
  let prompt;
  let image;
  let review;

  while (attempts < 2) {
    attempts += 1;
    try {
      prompt = buildImagePrompt(visualDirection, provider, {
        retry: attempts > 1,
      });
      image = await generator({ provider, prompt, width, height });
      review = await reviewer({
        image,
        prompt,
        visualDirection,
        visionReviewer,
      });

      if (review.passed) break;
    } catch (error) {
      errors.push(error);
      console.error("IMAGE_PIPELINE_PROVIDER_FAILED", {
        provider,
        attempt: attempts,
        message: error?.message,
        stack: error?.stack,
      });
      break;
    }
  }

  return {
    provider,
    prompt,
    image,
    review,
    attempts,
    approved: Boolean(review?.passed),
  };
}

function getProviderOrder(provider) {
  if (provider === "openai") return ["openai", "pollinations"];
  if (provider === "pollinations") return ["pollinations"];
  return [provider, "pollinations"];
}

module.exports = { runImagePipeline };
