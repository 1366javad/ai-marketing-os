import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import OpenAI from "openai";

console.log("KEY EXISTS:", !!process.env.OPENAI_API_KEY);
console.log("KEY PREFIX:", process.env.OPENAI_API_KEY?.substring(0, 10));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  const response = await client.responses.create({
    model: "gpt-5.5",
    input: "Reply only with: OpenAI Connected",
  });

  console.log(response.output_text);
}

main().catch(console.error);
