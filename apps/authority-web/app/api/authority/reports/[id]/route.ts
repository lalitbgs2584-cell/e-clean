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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ data: serializeReport(report) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
        return NextResponse.json({ error: "workerId is required" }, { status: 400 });
      }

      const worker = await prisma.user.findFirst({
        where: { id: body.workerId, role: "WORKER", isActive: true },
      });

      if (!worker) {
        return NextResponse.json({ error: "Worker not found" }, { status: 404 });
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
    }

    if (action === "start_cleanup") {
      await prisma.cleanup.update({
        where: { reportId: id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });

      await prisma.report.update({ where: { id }, data: { status: "IN_PROGRESS" } });
    }

    if (action === "complete_cleanup") {
      await prisma.cleanup.update({
        where: { reportId: id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      await prisma.report.update({ where: { id }, data: { status: "CLEANUP_COMPLETED" } });
    }

    if (action === "approve_cleanup") {
      await prisma.report.update({ where: { id }, data: { status: "RESOLVED", resolvedAt: new Date() } });
    }

    if (action === "mark_verified") {
      await prisma.report.update({ where: { id }, data: { status: "VERIFIED", resolvedAt: new Date() } });

      await prisma.reportVerification.upsert({
        where: { reportId: id },
        create: {
          reportId: id,
          userId: authResult.session!.user.id,
          result: "VERIFIED",
          comment: body?.note ?? null,
        },
        update: {
          result: "VERIFIED",
          comment: body?.note ?? null,
        },
      });
    }

    if (action === "mark_disputed") {
      await prisma.report.update({ where: { id }, data: { status: "DISPUTED" } });

      await prisma.reportVerification.upsert({
        where: { reportId: id },
        create: {
          reportId: id,
          userId: authResult.session!.user.id,
          result: "DISPUTED",
          comment: body?.note ?? null,
        },
        update: {
          result: "DISPUTED",
          comment: body?.note ?? null,
        },
      });
    }

    if (action === "link_duplicate") {
      if (!body?.duplicateOfId) {
        return NextResponse.json({ error: "duplicateOfId is required" }, { status: 400 });
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
    return NextResponse.json({ error: error?.message ?? "Failed to update report" }, { status: 500 });
  }
}
