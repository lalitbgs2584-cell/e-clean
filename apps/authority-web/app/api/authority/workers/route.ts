import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;
  if (!auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const zone = auth.session.user.zone;
  const workers = await prisma.user.findMany({
    where: {
      role: "WORKER",
      ...(zone ? { OR: [{ zone }, { zone: null }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      cleanupsDone: {
        select: { id: true, status: true, assignedAt: true, completedAt: true },
      },
    },
  });
  return NextResponse.json({
    data: workers.map((worker) => {
      const activeAssignments = worker.cleanupsDone.filter(
        (cleanup) =>
          !["COMPLETED", "CANCELLED", "REJECTED"].includes(cleanup.status),
      ).length;
      const completed = worker.cleanupsDone.filter(
        (cleanup) => cleanup.status === "COMPLETED",
      ).length;
      return {
        id: worker.id,
        name: worker.name,
        email: worker.email,
        image: worker.image,
        zone: worker.zone,
        isActive: worker.isActive,
        available: worker.isActive && activeAssignments < 2,
        workload: activeAssignments,
        completed,
      };
    }),
  });
}
