import { runGemini } from "./gemini";
import { runTavily } from "./tavily";
import { runSerpApi } from "./serpapi";
import { runFlux } from "./flux";
import { runVideo } from "./video";
import {
  runPollinationsImage,
  runPollinationsText,
  runPollinationsVideo,
} from "./pollinations";
import { runGroq } from "./groq";

export async function runProvider(provider, payload) {
  switch (provider) {
    case "gemini":
      return runGemini(payload);

    case "groq":
      return runGroq(payload);

    case "tavily":
      return runTavily(payload);

    case "serpapi":
      return runSerpApi(payload);

    case "flux":
      return runFlux(payload);

    case "pollinations":
      return runPollinationsImage(payload);

    case "pollinations-text":
      return runPollinationsText(payload);

    case "pollinations-video":
      return runPollinationsVideo(payload);

    case "video":
      return runVideo(payload);

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
