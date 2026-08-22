import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../../_lib";

export const runtime = "nodejs";

/** Records an authority decision on an AI-authenticity flag without altering
 * the report's normal dispute or cleanup lifecycle. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;

  const body = (await request.json().catch(() => null)) as {
    isAuthentic?: boolean;
  } | null;
  if (typeof body?.isAuthentic !== "boolean") {
    return NextResponse.json(
      { error: "isAuthentic must be a boolean" },
      { status: 400 },
    );
  }
  const { id } = await context.params;
  const report = await prisma.report.findUnique({
    where: { id },
    select: { id: true, flaggedForManualReview: true },
  });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }
  if (!report.flaggedForManualReview) {
    return NextResponse.json(
      { error: "This report has no open authenticity flag" },
      { status: 409 },
    );
  }
  await prisma.report.update({
    where: { id },
    data: body.isAuthentic
      ? { flaggedForManualReview: false, flagReason: null }
      : {
          flaggedForManualReview: true,
          flagReason: "Authority confirmed image evidence as likely synthetic",
        },
  });
  return NextResponse.json({
    success: true,
    data: { isAuthentic: body.isAuthentic },
  });
}
