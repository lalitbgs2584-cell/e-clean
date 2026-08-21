import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const zone = url.searchParams.get("zone");
  const status = url.searchParams.get("status");
  const attention = url.searchParams.get("attention");
  const category = url.searchParams.get("category");

  const where: any = {};

  if (zone && zone !== "ALL") where.zone = zone;
  if (status && status !== "ALL") where.status = status;
  if (attention && attention !== "ALL") where.attention = attention;
  if (category && category !== "ALL") where.wasteCategory = category;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 2000,
    include: {
      user: { select: { name: true, email: true } },
      cleanup: {
        include: {
          worker: { select: { name: true, email: true } },
        },
      },
      recyclingPartner: { select: { name: true } },
    },
  });

  // Build CSV headers
  const headers = [
    "Report ID",
    "Created Date",
    "Zone",
    "Status",
    "Attention",
    "Waste Category",
    "Dump Type",
    "Volume",
    "Upvotes",
    "Citizen Name",
    "Citizen Email",
    "Worker Assigned",
    "Recycling Partner",
    "Resolution Hours",
    "Resolved Date",
    "Latitude",
    "Longitude",
  ];

  const escapeCsv = (val: any) => {
    if (val == null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = reports.map((r) => {
    let resolutionHours: string = "";
    if (r.resolvedAt && r.createdAt) {
      const diffHrs =
        (new Date(r.resolvedAt).getTime() - new Date(r.createdAt).getTime()) /
        3_600_000;
      resolutionHours = diffHrs.toFixed(1);
    }

    return [
      escapeCsv(r.id),
      escapeCsv(new Date(r.createdAt).toISOString().split("T")[0]),
      escapeCsv(r.zone ?? "Unzoned"),
      escapeCsv(r.status),
      escapeCsv(r.attention),
      escapeCsv(r.wasteCategory ?? "N/A"),
      escapeCsv(r.dumpType ?? "N/A"),
      escapeCsv(r.wasteVolume ?? "N/A"),
      escapeCsv(r.upvoteCount),
      escapeCsv(r.user?.name ?? "Unknown"),
      escapeCsv(r.user?.email ?? ""),
      escapeCsv(r.cleanup?.worker?.name ?? "Unassigned"),
      escapeCsv(r.recyclingPartner?.name ?? "N/A"),
      escapeCsv(resolutionHours),
      escapeCsv(r.resolvedAt ? new Date(r.resolvedAt).toISOString() : ""),
      escapeCsv(r.latitude),
      escapeCsv(r.longitude),
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");

  const filename = `eclean-reports-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
