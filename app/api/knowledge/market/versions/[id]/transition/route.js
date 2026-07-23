import { authenticatedMarketService, marketError } from "../../../_service";

export async function POST(request, context) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params;
    return Response.json({ version: await service.transitionMarketVersion({
      ...(await request.json()), versionId: id, actorId: user.id,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    }) });
  } catch (error) { return marketError(error, "Market version transition failed"); }
}
