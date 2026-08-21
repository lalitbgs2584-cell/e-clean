import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;
  const [
    totalReports,
    openReports,
    urgentReports,
    unassigned,
    inProgress,
    pendingVerification,
    resolved,
    activeWorkers,
  ] = await Promise.all([
    prisma.report.count(),
    prisma.report.count({
      where: {
        status: {
          notIn: ["RESOLVED", "VERIFIED", "CANCELLED", "CLOSED_NO_WASTE"],
        },
      },
    }),
    prisma.report.count({
      where: {
        attention: "URGENT",
        status: {
          notIn: ["RESOLVED", "VERIFIED", "CANCELLED", "CLOSED_NO_WASTE"],
        },
      },
    }),
    prisma.report.count({
      where: { cleanup: null, status: { in: ["PENDING", "AI_ASSESSED"] } },
    }),
    prisma.report.count({ where: { status: "IN_PROGRESS" } }),
    prisma.report.count({ where: { status: "CLEANUP_COMPLETED" } }),
    prisma.report.count({
      where: { status: { in: ["RESOLVED", "VERIFIED"] } },
    }),
    prisma.user.count({ where: { role: "WORKER", isActive: true } }),
  ]);
  return NextResponse.json({
    totalReports,
    openReports,
    urgentReports,
    unassigned,
    inProgress,
    pendingVerification,
    resolved,
    activeWorkers,
  });
}
