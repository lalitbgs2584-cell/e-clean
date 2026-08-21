import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";
import { profileImageUrl } from "../../_s3";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response || !auth.session) return auth.response;
  const zone = auth.session.user.zone;
  const workers = await prisma.user.findMany({
    where: {
      role: "WORKER",
      ...(zone ? { OR: [{ zone }, { zone: null }] } : {}),
    },
    select: {
      id: true,
      name: true,
      image: true,
      isActive: true,
      workerLatitude: true,
      workerLongitude: true,
      workerLastSeenAt: true,
      cleanupsDone: {
        where: { status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] } },
        select: { reportId: true, status: true },
      },
    },
  });
  return NextResponse.json({
    data: workers.map((worker) => ({
      id: worker.id,
      name: worker.name,
      profileImageUrl: profileImageUrl(worker.image),
      workerLatitude: worker.workerLatitude,
      workerLongitude: worker.workerLongitude,
      workerLastSeenAt: worker.workerLastSeenAt,
      available: worker.isActive && worker.cleanupsDone.length < 2,
      activeAssignments: worker.cleanupsDone.length,
      currentAssignment: worker.cleanupsDone[0] ?? null,
    })),
  });
}
