import sharp from "sharp";

const input = "public/landing-assets/marketing-brain-chroma.png";
const output = "public/landing-assets/marketing-brain.png";
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const greenDominance = g - Math.max(r, b);
  const alphaRemoval = Math.max(0, Math.min(1, (greenDominance - 12) / 58));

  data[i + 3] = Math.round(255 * (1 - alphaRemoval));
  data[i + 1] = Math.round(g * (1 - alphaRemoval * 0.92));
}

await sharp(data, { raw: info }).png().toFile(output);
