import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../../_lib";
import { profileImageUrl } from "../../../_s3";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      zone: true,
      wasteCategory: true,
      wasteVolume: true,
      attention: true,
    },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Fetch all active workers
  const workers = await prisma.user.findMany({
    where: { role: "WORKER", isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      zone: true,
      image: true,
      cleanupsDone: {
        select: {
          id: true,
          status: true,
          report: {
            select: {
              verification: {
                select: { result: true },
              },
            },
          },
        },
      },
    },
  });

  // Calculate scores for each worker
  const scoredWorkers = workers.map((worker) => {
    let score = 50; // Base score
    const matchReasons: string[] = [];

    const activeAssignments = worker.cleanupsDone.filter(
      (c) => !["COMPLETED", "CANCELLED", "REJECTED"].includes(c.status),
    ).length;

    // 1. Zone Matching
    if (report.zone && worker.zone) {
      if (report.zone.toLowerCase() === worker.zone.toLowerCase()) {
        score += 100;
        matchReasons.push(`Same zone jurisdiction (${worker.zone})`);
      }
    } else if (!worker.zone) {
      score += 20;
      matchReasons.push("City-wide floating worker");
    }

    // 2. Workload
    if (activeAssignments === 0) {
      score += 50;
      matchReasons.push("0 active tasks — immediately available");
    } else if (activeAssignments === 1) {
      score += 25;
      matchReasons.push("Light workload (1 active task)");
    } else {
      score -= activeAssignments * 15;
    }

    // 3. Quality / Dispute Rate
    const totalCompleted = worker.cleanupsDone.filter(
      (c) => c.status === "COMPLETED",
    ).length;
    const disputed = worker.cleanupsDone.filter(
      (c) => c.report?.verification?.result === "DISPUTED",
    ).length;

    if (totalCompleted >= 3 && disputed === 0) {
      score += 30;
      matchReasons.push("100% verified quality record");
    } else if (disputed > 0 && totalCompleted > 0) {
      const disputeRate = disputed / totalCompleted;
      if (disputeRate > 0.25) {
        score -= 40;
      }
    }

    // Default reason if none added
    if (matchReasons.length === 0) {
      matchReasons.push("Available municipal worker");
    }

    return {
      id: worker.id,
      name: worker.name,
      email: worker.email,
      zone: worker.zone ?? null,
      image: worker.image ?? null,
      profileImageUrl: profileImageUrl(worker.image),
      activeAssignments,
      score,
      matchReasons: matchReasons.slice(0, 3),
    };
  });

  // Sort by score descending and take top 3
  const topSuggested = scoredWorkers
    .sort((a, b) => b.score - a.score || a.activeAssignments - b.activeAssignments)
    .slice(0, 3);

  return NextResponse.json({
    success: true,
    data: topSuggested,
  });
}
