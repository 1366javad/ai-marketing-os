import { POST as generateCreative } from "@/app/api/creative/generate/route";

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
      section: body.section || body.category || body.task || "image_post",
    }),
  });

  return generateCreative(forwardedRequest);
}
