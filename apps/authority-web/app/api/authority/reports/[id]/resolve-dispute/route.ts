import { NextResponse } from "next/server";
import { requireAuthoritySession } from "../../../_lib";
import { manuallyResolveCommunityReview } from "../../../../../../../backend/src/services/community-review.service";

export const runtime = "nodejs";

/**
 * POST /api/authority/reports/:id/resolve-dispute
 * Body: { decision: "CLEAN" | "NOT_CLEAN" }
 *
 * Allows authority to manually resolve an INCONCLUSIVE community review using
 * the same worker/citizen consequence logic as the crowd-review service.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;
  if (!auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    decision?: string;
  } | null;

  if (!body?.decision || !["CLEAN", "NOT_CLEAN"].includes(body.decision)) {
    return NextResponse.json(
      { error: "decision must be CLEAN or NOT_CLEAN" },
      { status: 400 },
    );
  }
  const resolution = await manuallyResolveCommunityReview(
    id,
    body.decision as "CLEAN" | "NOT_CLEAN",
  );
  if (!resolution.resolved) {
    return NextResponse.json(
      { error: "Only inconclusive community reviews can be manually resolved" },
      { status: 409 },
    );
  }
  return NextResponse.json({ success: true, data: resolution });
}
