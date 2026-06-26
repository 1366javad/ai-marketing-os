export async function runSerpApi({ query }) {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing SERPAPI_API_KEY");
  }

  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(
    query,
  )}&api_key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}
