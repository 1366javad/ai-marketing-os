import { POST as generateAnalytics } from "@/app/api/analytics/generate/route";

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  const forwardedRequest = new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, campaignId: id }),
  });

  return generateAnalytics(forwardedRequest);
}
