const { buildImagePrompt } = require("./prompt-builders");
const { generateImage } = require("./generateImage");
const { reviewImage } = require("./reviewImage");

async function runImagePipeline({
  visualDirection,
  provider = "pollinations",
  width = 1024,
  height = 1024,
  generator = generateImage,
  reviewer = reviewImage,
  visionReviewer,
}) {
  let attempts = 0;
  let prompt;
  let image;
  let review;

  while (attempts < 2) {
    attempts += 1;
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
  }

  return {
    provider,
    visualDirection,
    prompt,
    review,
    attempts,
    approved: Boolean(review?.passed),
    asset: image
      ? {
          provider,
          mimeType: image.mimeType,
          imageUrl: `data:${image.mimeType};base64,${image.imageData}`,
          remoteUrl: image.remoteUrl || "",
          approvalStatus: review?.passed ? "pending" : "rejected",
        }
      : null,
  };
}

module.exports = { runImagePipeline };
