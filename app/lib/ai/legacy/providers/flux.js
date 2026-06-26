export async function runFlux({
  prompt,
  model = "black-forest-labs/FLUX.1-schnell",
}) {
  const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;

  if (!HF_TOKEN) {
    throw new Error("HUGGINGFACE_API_KEY is missing.");
  }

  if (!prompt || prompt.trim().length < 15) {
    throw new Error("The prompt must be at least 15 characters long.");
  }

  const url = `https://router.huggingface.co/hf-inference/models/${model}`;

  console.log("Generating image with HF model:", model);
  console.log("HF Router URL:", url);
  console.log("MODEL:", model);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        num_inference_steps: 28,
        guidance_scale: 3.5,
        height: 1024,
        width: 1024,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HF error ${response.status}: ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return {
    success: true,
    provider: "hf-inference",
    model,
    imageData: base64,
    mimeType: "image/png",
  };
}
