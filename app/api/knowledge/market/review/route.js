import { authenticatedMarketService, marketError } from "../_service";

export async function GET(request) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json(await service.listMarketReviewQueue(new URL(request.url).searchParams.get("businessId")));
  } catch (error) { return marketError(error, "Market review queue failed"); }
}
