import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession, serializeReport } from "../../_lib";

export const runtime = "nodejs";

async function getReport(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      user: true,
      images: true,
      recyclingPartner: true,
      cleanup: {
        include: {
          worker: true,
          assignedByRef: true,
          beforeImage: true,
          afterImage: true,
        },
      },
      verification: {
        include: {
          user: true,
        },
      },
      duplicateOf: {
        select: {
          id: true,
          status: true,
          zone: true,
          createdAt: true,
        },
      },
      duplicates: {
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ data: serializeReport(report) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action as string | undefined;

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  try {
    if (action === "assign") {
      if (!body?.workerId) {
        return NextResponse.json(
          { error: "workerId is required" },
          { status: 400 },
        );
      }

      const worker = await prisma.user.findFirst({
        where: { id: body.workerId, role: "WORKER", isActive: true },
      });

      if (!worker) {
        return NextResponse.json(
          { error: "Worker not found" },
          { status: 404 },
        );
      }
      if (!["AI_ASSESSED", "DISPUTED", "ASSIGNED"].includes(report.status)) {
        return NextResponse.json(
          { error: "Only AI-assessed or disputed reports can be assigned" },
          { status: 409 },
        );
      }

      await prisma.$transaction([
        prisma.cleanup.upsert({
          where: { reportId: id },
          create: {
            reportId: id,
            workerId: worker.id,
            assignedBy: authResult.session!.user.id,
            status: "ASSIGNED",
          },
          update: {
            workerId: worker.id,
            assignedBy: authResult.session!.user.id,
            status: "ASSIGNED",
            acceptedAt: null,
            rejectedAt: null,
            rejectionReason: null,
            startedAt: null,
            completedAt: null,
            completionNotes: null,
            beforeImageId: null,
            afterImageId: null,
          },
        }),
        prisma.report.update({
          where: { id },
          data: {
            status: "ASSIGNED",
            resolvedAt: null,
          },
        }),
      ]);
      await prisma.notification.create({
        data: {
          userId: report.userId,
          reportId: id,
          type: "REPORT_ASSIGNED",
          title: "Cleanup team assigned",
          message: "A municipal worker has been assigned to your report.",
        },
      });
    }

    if (action === "approve_cleanup") {
      const cleanup = await prisma.cleanup.findUnique({
        where: { reportId: id },
      });
      if (
        report.status !== "CLEANUP_COMPLETED" ||
        cleanup?.status !== "COMPLETED"
      ) {
        return NextResponse.json(
          {
            error: "Worker cleanup evidence must be submitted before approval",
          },
          { status: 409 },
        );
      }
      await prisma.report.update({
        where: { id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
      await prisma.notification.create({
        data: {
          userId: report.userId,
          reportId: id,
          type: "REPORT_RESOLVED",
          title: "Cleanup approved",
          message:
            "The authority has approved the cleanup. Please verify the area when you can.",
        },
      });
    }

    if (action === "route_recycling") {
      if (!body?.recyclingPartnerId) {
        return NextResponse.json(
          { error: "recyclingPartnerId is required" },
          { status: 400 },
        );
      }

      const partner = await prisma.recyclingPartner.findUnique({
        where: { id: body.recyclingPartnerId },
      });
      if (!partner) {
        return NextResponse.json(
          { error: "Recycling partner not found" },
          { status: 404 },
        );
      }

      await prisma.report.update({
        where: { id },
        data: {
          recyclingPartnerId: partner.id,
          recyclingStatus: "ROUTED",
          routedToRecyclingAt: new Date(),
          status: "ASSIGNED",
        },
      });

      await prisma.notification.create({
        data: {
          userId: report.userId,
          reportId: id,
          type: "REPORT_ASSIGNED",
          title: "Routed to Recycling Partner",
          message: `Your report has been routed to our recycling partner: ${partner.name}.`,
        },
      });
    }

    if (action === "link_duplicate") {
      if (!body?.duplicateOfId) {
        return NextResponse.json(
          { error: "duplicateOfId is required" },
          { status: 400 },
        );
      }

      await prisma.report.update({
        where: { id },
        data: {
          duplicateOfId: body.duplicateOfId,
          status: "CANCELLED",
          resolvedAt: new Date(),
        },
      });
    }

    const updated = await getReport(id);
    return NextResponse.json({ data: serializeReport(updated) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update report" },
      { status: 500 },
    );
  }
}
