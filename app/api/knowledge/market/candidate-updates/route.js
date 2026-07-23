import { authenticatedMarketService, marketError } from "../_service";

export async function POST(request) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    return Response.json({ candidateUpdate: await service.createMarketCandidateUpdate({
      ...(await request.json()), actorId: user.id,
      correlationId: request.headers.get("x-correlation-id") || undefined,
    }) }, { status: 201 });
  } catch (error) { return marketError(error, "Market candidate update failed"); }
}
