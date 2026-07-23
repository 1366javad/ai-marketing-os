import { authenticatedMarketService, marketError } from "../../../_service";

export async function POST(request, context) {
  try {
    const { service, user } = await authenticatedMarketService();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await context.params; const body = await request.json();
    return Response.json({ candidate: await service.rejectMarketCandidate({ ...body, candidateId: id, actorId: user.id }) });
  } catch (error) { return marketError(error, "Market candidate rejection failed"); }
}
