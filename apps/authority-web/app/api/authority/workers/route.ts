import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { buildWorkers, requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;
  const workers = await prisma.user.findMany({
    where: { role: "WORKER" },
    orderBy: { updatedAt: "desc" },
    include: {
      profileImageUploadedBy: {
        select: { id: true, name: true },
      },
      cleanupsDone: {
        include: {
          report: {
            select: {
              wasteCategory: true,
              zone: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              resolvedAt: true,
            },
          },
        },
      },
    },
  });
  return NextResponse.json({ data: buildWorkers(workers) });
}
