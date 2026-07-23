import { authenticatedMarketService, marketError } from "../../../_service";

export async function GET(request, context) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { identity } = await context.params;
    return Response.json({ versions: await service.getMarketMemoryHistory(new URL(request.url).searchParams.get("businessId"), decodeURIComponent(identity)) });
  } catch (error) { return marketError(error, "Market memory history failed"); }
}
