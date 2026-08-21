import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";

export const runtime = "nodejs";

const validDate = (value: string | null) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value)
    : undefined;

export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const attention = params.get("attention");
  const category = params.get("category");
  const zone = params.get("zone");
  const from = validDate(params.get("from"));
  const to = validDate(params.get("to"));
  const reports = await prisma.report.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(attention && attention !== "ALL"
        ? { attention: attention as any }
        : {}),
      ...(category && category !== "ALL"
        ? { wasteCategory: category as any }
        : {}),
      ...(zone && zone !== "ALL" ? { zone } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      status: true,
      attention: true,
      wasteCategory: true,
      location: true,
      zone: true,
      duplicateOfId: true,
      cleanup: { select: { workerId: true, status: true } },
    },
  });
  const valid = reports.filter(
    (report) =>
      Number.isFinite(report.latitude) &&
      Number.isFinite(report.longitude) &&
      Math.abs(report.latitude) <= 90 &&
      Math.abs(report.longitude) <= 180,
  );
  return NextResponse.json({
    type: "FeatureCollection",
    features: valid.map((report) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [report.longitude, report.latitude],
      },
      properties: {
        id: report.id,
        status: report.status,
        attention: report.attention,
        category: report.wasteCategory,
        location: report.location,
        zone: report.zone,
        duplicateOfId: report.duplicateOfId,
        assignedWorkerId: report.cleanup?.workerId ?? null,
        cleanupStatus: report.cleanup?.status ?? null,
      },
    })),
    meta: { total: reports.length, filtered: valid.length },
  });
}
