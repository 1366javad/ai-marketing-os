import { authenticatedMarketService, marketError } from "../_service";

export async function GET(request) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ items: await service.listMarketMemory(new URL(request.url).searchParams.get("businessId")) });
  } catch (error) { return marketError(error, "Market memory listing failed"); }
}
