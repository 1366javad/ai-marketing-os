import { POST as generateResearch } from "@/app/api/research/generate/route";

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
      section: body.section || body.task || "market",
    }),
  });

  return generateResearch(forwardedRequest);
}
