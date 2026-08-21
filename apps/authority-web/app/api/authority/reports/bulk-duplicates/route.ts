import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const { canonicalReportId, duplicateReportIds } = body as {
    canonicalReportId?: string;
    duplicateReportIds?: string[];
  };

  if (!canonicalReportId || !Array.isArray(duplicateReportIds) || duplicateReportIds.length === 0) {
    return NextResponse.json(
      { error: "canonicalReportId and duplicateReportIds array are required" },
      { status: 400 },
    );
  }

  // Verify canonical report exists
  const canonical = await prisma.report.findUnique({
    where: { id: canonicalReportId },
  });

  if (!canonical) {
    return NextResponse.json(
      { error: "Canonical report not found" },
      { status: 404 },
    );
  }

  // Filter out the canonical ID from duplicates to avoid self-reference
  const validDuplicateIds = duplicateReportIds.filter((id) => id !== canonicalReportId);

  if (validDuplicateIds.length === 0) {
    return NextResponse.json(
      { error: "No valid duplicate IDs to link" },
      { status: 400 },
    );
  }

  // Update all duplicates to link to canonical and cancel them
  await prisma.$transaction(async (tx) => {
    await tx.report.updateMany({
      where: { id: { in: validDuplicateIds } },
      data: {
        duplicateOfId: canonicalReportId,
        status: "CANCELLED",
        resolvedAt: new Date(),
      },
    });

    // Sum upvotes from duplicates and add to canonical report
    const dupReports = await tx.report.findMany({
      where: { id: { in: validDuplicateIds } },
      select: { upvoteCount: true },
    });
    const extraUpvotes = dupReports.reduce((sum, r) => sum + r.upvoteCount, 0);

    if (extraUpvotes > 0) {
      await tx.report.update({
        where: { id: canonicalReportId },
        data: { upvoteCount: { increment: extraUpvotes } },
      });
    }
  });

  return NextResponse.json({
    success: true,
    linkedCount: validDuplicateIds.length,
    canonicalReportId,
  });
}
