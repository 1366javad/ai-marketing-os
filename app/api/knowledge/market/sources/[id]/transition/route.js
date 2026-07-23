import { authenticatedMarketService, marketError } from "../../../_service";

export async function POST(request, context) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    return Response.json({ source: await service.transitionMarketSource({
      ...(await request.json()), sourceId: id, actorId: user.id,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    }) });
  } catch (error) { return marketError(error, "Market source transition failed"); }
}
