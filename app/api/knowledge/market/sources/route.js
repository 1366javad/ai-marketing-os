import { authenticatedMarketService, marketError } from "../_service";

export async function POST(request) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const source = await service.registerMarketSource({
      ...(await request.json()), createdBy: user.id,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    });
    return Response.json({ source }, { status: source.duplicate ? 200 : 201 });
  } catch (error) { return marketError(error, "Market source registration failed"); }
}

export async function GET(request) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ sources: await service.listMarketSources(new URL(request.url).searchParams.get("businessId")) });
  } catch (error) { return marketError(error, "Market source listing failed"); }
}
