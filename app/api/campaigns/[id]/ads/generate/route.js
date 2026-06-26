import { POST as generateAds } from "@/app/api/ads/generate/route";

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  const forwardedRequest = new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...body,
      campaignId: id,
      task: body.task || body.platformKey || "google_ads",
    }),
  });

  return generateAds(forwardedRequest);
}
