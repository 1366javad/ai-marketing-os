const MIN_SCORE = 75;

async function reviewImage({ image, prompt, visualDirection, visionReviewer }) {
  if (typeof visionReviewer === "function") {
    return visionReviewer({ image, prompt, visualDirection });
  }

  return reviewImageHeuristically({ image, prompt, visualDirection });
}

function reviewImageHeuristically({ image, prompt, visualDirection }) {
  const checks = {
    imageReturned: Boolean(image?.imageData),
    supportedMimeType: /^image\/(png|jpe?g|webp)$/i.test(image?.mimeType || ""),
    usefulImageSize: Buffer.byteLength(image?.imageData || "", "base64") >= 20000,
    promptWithinProviderLimit:
      prompt?.provider !== "pollinations" || prompt.wordCount <= 80,
    clearSubject:
      String(visualDirection?.scene?.primarySubject || "").length >= 10,
    clearComposition:
      String(visualDirection?.camera?.focus || "").length >= 5,
    forbiddenElementsDeclared:
      Array.isArray(visualDirection?.negative) &&
      visualDirection.negative.length >= 5,
  };
  const weights = {
    imageReturned: 25,
    supportedMimeType: 10,
    usefulImageSize: 20,
    promptWithinProviderLimit: 15,
    clearSubject: 10,
    clearComposition: 10,
    forbiddenElementsDeclared: 10,
  };
  const score = Object.entries(checks).reduce(
    (total, [name, passed]) => total + (passed ? weights[name] : 0),
    0,
  );

  return {
    score,
    passed: score >= MIN_SCORE,
    mode: "heuristic",
    checks,
    issues: Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name),
    limitations: [
      "No vision-capable reviewer is configured.",
      "Face, hands, rendered text, brand color accuracy, and visual artifacts were not inspected from pixels.",
    ],
    reviewedAt: new Date().toISOString(),
  };
}

module.exports = { MIN_SCORE, reviewImage, reviewImageHeuristically };
