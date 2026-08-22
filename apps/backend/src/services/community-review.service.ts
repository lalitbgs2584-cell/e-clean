import { prisma } from "db/client";
import { recordWrongReport } from "./notification.service";

const COMMUNITY_RADIUS_METERS = 750;

type NearbyCitizenRow = { userId: string; distanceMeters: number };

type CommunityReviewResult =
  | { resolved: false; reason: "NOT_READY" | "ALREADY_RESOLVED" }
  | {
      resolved: true;
      status: "CONFIRMED_DIRTY" | "CONFIRMED_CLEAN" | "INCONCLUSIVE";
    };

type CommunityReviewOutcome = "CONFIRMED_DIRTY" | "CONFIRMED_CLEAN";
type CommunityReviewReport = {
  id: string;
  userId: string;
  cleanup: { workerId: string } | null;
};

/**
 * Citizens who have reported from the same neighbourhood are eligible to
 * review a cleanup. Keeping eligibility server-owned prevents self-voting and
 * keeps arbitrary distant accounts out of the decision.
 */
export async function findNearbyEligibleCitizens(
  latitude: number,
  longitude: number,
  excludeUserIds: string[] = [],
) {
  const rows = await prisma.$queryRaw<NearbyCitizenRow[]>`
    SELECT DISTINCT ON (r."userId")
      r."userId",
      ST_Distance(
        ST_SetSRID(ST_MakePoint(r."longitude", r."latitude"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      ) AS "distanceMeters"
    FROM "reports" r
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(r."longitude", r."latitude"), 4326)::geography,
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
      ${COMMUNITY_RADIUS_METERS}
    )
    ORDER BY r."userId", "distanceMeters"
  `;

  const candidateIds = [
    ...new Set(
      rows
        .map((row) => row.userId)
        .filter((id) => !excludeUserIds.includes(id)),
    ),
  ];
  if (!candidateIds.length) return [];

  const citizens = await prisma.user.findMany({
    where: {
      id: { in: candidateIds },
      role: "CITIZEN",
      isActive: true,
      blockedAt: null,
    },
    select: { id: true, name: true },
  });
  const distanceByUserId = new Map(
    rows.map((row) => [row.userId, row.distanceMeters]),
  );
  return citizens.map((citizen) => ({
    ...citizen,
    distanceMeters: distanceByUserId.get(citizen.id) ?? COMMUNITY_RADIUS_METERS,
  }));
}

export async function notifyForCommunityReview(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { cleanup: { select: { workerId: true } } },
  });
  if (!report) return 0;

  const eligibleCitizens = await findNearbyEligibleCitizens(
    report.latitude,
    report.longitude,
    [report.userId, report.cleanup?.workerId].filter((value): value is string =>
      Boolean(value),
    ),
  );
  if (!eligibleCitizens.length) return 0;

  await prisma.notification.createMany({
    data: eligibleCitizens.map((citizen) => ({
      userId: citizen.id,
      reportId,
      audience: "CITIZEN" as const,
      type: "COMMUNITY_VERIFICATION_REQUEST" as const,
      title: "Help verify a nearby cleanup",
      message:
        "A resident has disputed this cleanup. Does the area look clean?",
    })),
  });
  return eligibleCitizens.length;
}

/** Applies one final review outcome. Both crowd and authority decisions use it. */
async function applyCommunityReviewOutcome(
  report: CommunityReviewReport,
  outcome: CommunityReviewOutcome,
) {
  if (outcome === "CONFIRMED_CLEAN") {
    await prisma.report.update({
      where: { id: report.id },
      data: { status: "RESOLVED" },
    });
    await recordWrongReport(
      report.userId,
      "Dispute rejected by community verification",
    );
    await prisma.notification.create({
      data: {
        userId: report.userId,
        reportId: report.id,
        audience: "CITIZEN",
        type: "DISPUTE_REJECTED_BY_COMMUNITY",
        title: "Community confirmed the cleanup",
        message: "Nearby residents confirmed that the area is clean.",
      },
    });
    return;
  }

  const workerId = report.cleanup?.workerId;
  await prisma.$transaction(async (tx) => {
    await tx.report.update({
      where: { id: report.id },
      data: { status: "ASSIGNED" },
    });
    if (workerId) {
      await tx.cleanup.update({
        where: { reportId: report.id },
        data: {
          status: "ASSIGNED",
          afterImageId: null,
          completedAt: null,
          completionNotes: null,
        },
      });
      await tx.pointTransaction.create({
        data: {
          userId: workerId,
          reportId: report.id,
          points: -10,
          reason: "COMMUNITY_CONFIRMED_INCOMPLETE_CLEANUP",
        },
      });
      await tx.user.update({
        where: { id: workerId },
        data: {
          points: { decrement: 10 },
          workerStrikeCount: { increment: 1 },
        },
      });
    }
  });

  await prisma.notification.create({
    data: {
      userId: report.userId,
      reportId: report.id,
      audience: "CITIZEN",
      type: "DISPUTE_CONFIRMED_DIRTY",
      title: "Community confirmed the issue",
      message: "The cleanup has been reopened and sent back for action.",
    },
  });

  if (!workerId) return;
  const worker = await prisma.user.findUnique({
    where: { id: workerId },
    select: { workerStrikeCount: true, isActive: true },
  });
  await prisma.notification.create({
    data: {
      userId: workerId,
      reportId: report.id,
      audience: "WORKER",
      type: "CLEANUP_DISPUTE_UPHELD",
      title: "Cleanup dispute upheld",
      message: "The community found this area still needs cleanup.",
    },
  });
  if (worker && worker.workerStrikeCount >= 3 && worker.isActive) {
    await prisma.user.update({
      where: { id: workerId },
      data: {
        isActive: false,
        blockedAt: new Date(),
        blockedReason: "Three community-confirmed incomplete cleanups",
      },
    });
    await prisma.notification.create({
      data: {
        reportId: report.id,
        audience: "AUTHORITY",
        type: "WORKER_AUTO_BLOCKED",
        title: "Worker automatically deactivated",
        message: "A worker reached three community-confirmed cleanup strikes.",
      },
    });
  }
}

export async function resolveCommunityReview(
  reportId: string,
): Promise<CommunityReviewResult> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      cleanup: { select: { workerId: true } },
      communityVotes: { select: { vote: true } },
    },
  });
  if (!report || report.communityReviewStatus !== "PENDING") {
    return { resolved: false, reason: "ALREADY_RESOLVED" };
  }

  const now = new Date();
  const isClosed = Boolean(
    report.communityReviewClosesAt && report.communityReviewClosesAt <= now,
  );
  const cleanVotes = report.communityVotes.filter(
    (vote) => vote.vote === "CLEAN",
  ).length;
  const dirtyVotes = report.communityVotes.filter(
    (vote) => vote.vote === "NOT_CLEAN",
  ).length;
  const voteCount = cleanVotes + dirtyVotes;

  if (voteCount < 5 && !isClosed) {
    return { resolved: false, reason: "NOT_READY" };
  }

  const outcome =
    voteCount < 3 || cleanVotes === dirtyVotes
      ? "INCONCLUSIVE"
      : dirtyVotes > cleanVotes
        ? "CONFIRMED_DIRTY"
        : "CONFIRMED_CLEAN";

  const claimed = await prisma.report.updateMany({
    where: { id: report.id, communityReviewStatus: "PENDING" },
    data: { communityReviewStatus: outcome },
  });
  if (!claimed.count) return { resolved: false, reason: "ALREADY_RESOLVED" };

  if (outcome === "INCONCLUSIVE") {
    return { resolved: true, status: outcome };
  }

  await applyCommunityReviewOutcome(report, outcome);

  return { resolved: true, status: outcome };
}

/** Manual authority resolution is allowed only after an inconclusive review. */
export async function manuallyResolveCommunityReview(
  reportId: string,
  decision: "CLEAN" | "NOT_CLEAN",
): Promise<CommunityReviewResult> {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { cleanup: { select: { workerId: true } } },
  });
  if (
    !report ||
    report.status !== "DISPUTED" ||
    report.communityReviewStatus !== "INCONCLUSIVE"
  ) {
    return { resolved: false, reason: "ALREADY_RESOLVED" };
  }
  const outcome = decision === "CLEAN" ? "CONFIRMED_CLEAN" : "CONFIRMED_DIRTY";
  const claimed = await prisma.report.updateMany({
    where: { id: report.id, communityReviewStatus: "INCONCLUSIVE" },
    data: { communityReviewStatus: outcome },
  });
  if (!claimed.count) return { resolved: false, reason: "ALREADY_RESOLVED" };
  await applyCommunityReviewOutcome(report, outcome);
  return { resolved: true, status: outcome };
}

/** Suitable for a scheduled job or an authority-triggered maintenance call. */
export async function resolveExpiredCommunityReviews() {
  const pending = await prisma.report.findMany({
    where: {
      communityReviewStatus: "PENDING",
      communityReviewClosesAt: { lte: new Date() },
    },
    select: { id: true },
  });
  const results = await Promise.all(
    pending.map((report) => resolveCommunityReview(report.id)),
  );
  return { processed: results.filter((result) => result.resolved).length };
}
