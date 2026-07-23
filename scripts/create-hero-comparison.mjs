import sharp from "sharp";

const reference = await sharp("D:/Users/Dell/Downloads/ChatGPT Image Jul 19, 2026, 08_13_50 PM.png")
  .extract({ left: 0, top: 42, width: 1024, height: 291 })
  .png()
  .toBuffer();

const implementation = await sharp("hero-implementation-1024.png")
  .extract({ left: 0, top: 43, width: 1024, height: 291 })
  .png()
  .toBuffer();

await sharp({
  create: { width: 2048, height: 291, channels: 4, background: "#020711" },
})
  .composite([
    { input: reference, left: 0, top: 0 },
    { input: implementation, left: 1024, top: 0 },
  ])
  .png()
  .toFile("hero-comparison.png");
