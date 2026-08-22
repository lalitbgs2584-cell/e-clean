import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;

  const notifications = await prisma.notification.findMany({
    where: { audience: "AUTHORITY" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      report: {
        select: { id: true, status: true, zone: true, attention: true },
      },
    },
  });

  return NextResponse.json({
    data: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message ?? null,
      createdAt: n.createdAt.toISOString(),
      isRead: n.isRead,
      type: n.type,
      reportId: n.reportId ?? null,
      report: n.report
        ? {
            id: n.report.id,
            status: n.report.status,
            zone: n.report.zone ?? null,
            attention: n.report.attention,
          }
        : null,
    })),
  });
}
