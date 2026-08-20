<<<<<<< HEAD
﻿import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
=======
import { NextResponse } from "next/server";
>>>>>>> eda3e8139a2ce90b795792b55d7493dba77ed185
import { prisma } from "db/client";
import type {
  AuthorityChartSeries,
  AuthorityDashboardPayload,
  AuthorityMedia,
  AuthorityReport,
  AuthorityUser,
  AuthorityVerification,
  AuthorityCleanup,
  AuthorityZone,
  ReportStatus,
  VerificationResult,
} from "@/components/authority/shared";
import {
  buildTimeline,
  deriveCitizenVerificationState,
  deriveCleanupState,
  deriveWorkerName,
  getUrgencyLabel,
} from "@/components/authority/shared";

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") return null;
  return token.trim();
}

type AuthorityDbSession = {
  expiresAt: Date;
  user: {
    id: string;
    role: string;
    email: string;
    name: string;
    zone: string | null;
    isActive: boolean;
  } & Record<string, unknown>;
} | null;

async function getSessionFromRequest(request: Request): Promise<AuthorityDbSession> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session;
}

type AuthoritySessionRecord = Awaited<ReturnType<typeof getSessionFromRequest>>;

type AuthoritySessionGate = {
  session: AuthoritySessionRecord | null;
  response: NextResponse | null;
};

export async function requireAuthenticatedSession(request: Request): Promise<AuthoritySessionGate> {
  const session = await getSessionFromRequest(request);

  if (!session?.user) {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session, response: null };
}

export async function requireAuthoritySession(request: Request): Promise<AuthoritySessionGate> {
  const authResult = await requireAuthenticatedSession(request);
  if (authResult.response) return authResult;

  if (authResult.session?.user.role !== "AUTHORITY") {
    return {
      session: null,
      response: NextResponse.json(
        { error: "Authority access required" },
        { status: 403 },
      ),
    };
  }

  return authResult;
}

function toIso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function serializeUser(user: any): AuthorityUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: user.role,
    zone: user.zone ?? null,
    isActive: user.isActive ?? true,
  };
}

function serializeMedia(media: any): AuthorityMedia {
  return {
    id: media.id,
    type: media.type,
    storagePath: media.storagePath,
    mediaType: media.mediaType,
    createdAt: toIso(media.createdAt) ?? new Date().toISOString(),
  };
}

function serializeVerification(
  verification: any,
): AuthorityVerification | null {
  if (!verification) return null;

  return {
    id: verification.id,
    result: verification.result as VerificationResult,
    comment: verification.comment ?? null,
    createdAt: toIso(verification.createdAt) ?? new Date().toISOString(),
    user: serializeUser(verification.user),
  };
}

function serializeCleanup(cleanup: any): AuthorityCleanup | null {
  if (!cleanup) return null;

  return {
    id: cleanup.id,
    status: cleanup.status,
    assignedAt: toIso(cleanup.assignedAt) ?? new Date().toISOString(),
    startedAt: toIso(cleanup.startedAt),
    completedAt: toIso(cleanup.completedAt),
    worker: serializeUser(cleanup.worker),
    assignedBy: serializeUser(cleanup.assignedByRef ?? cleanup.assignedBy),
    beforeImage: cleanup.beforeImage
      ? serializeMedia(cleanup.beforeImage)
      : null,
    afterImage: cleanup.afterImage ? serializeMedia(cleanup.afterImage) : null,
  };
}

export function serializeReport(report: any): AuthorityReport {
  return {
    id: report.id,
    description: report.description ?? null,
    latitude: report.latitude,
    longitude: report.longitude,
    location: report.location ?? null,
    zone: report.zone ?? null,
    dumpType: report.dumpType ?? null,
    wasteCategory: report.wasteCategory ?? null,
    wasteVolume: report.wasteVolume ?? null,
    truckSize: report.truckSize ?? null,
    workersNeeded: report.workersNeeded ?? null,
    recommendedAction: report.recommendedAction ?? null,
    attention: report.attention,
    nearSensitiveLocation: report.nearSensitiveLocation,
    severityScore: report.severityScore ?? null,
    aiConfidence: report.aiConfidence ?? null,
    aiProcessedAt: toIso(report.aiProcessedAt),
    duplicateOfId: report.duplicateOfId ?? null,
    upvoteCount: report.upvoteCount ?? 0,
    recyclingStatus: report.recyclingStatus ?? null,
    status: report.status as ReportStatus,
    createdAt: toIso(report.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(report.updatedAt) ?? new Date().toISOString(),
    resolvedAt: toIso(report.resolvedAt),
    citizen: serializeUser(report.user),
    cleanup: serializeCleanup(report.cleanup),
    verification: serializeVerification(report.verification),
    images: (report.images ?? []).map(serializeMedia),
    duplicateOf: report.duplicateOf
      ? {
          id: report.duplicateOf.id,
          status: report.duplicateOf.status,
          zone: report.duplicateOf.zone ?? null,
          createdAt:
            toIso(report.duplicateOf.createdAt) ?? new Date().toISOString(),
        }
      : null,
    duplicates: (report.duplicates ?? []).map((duplicate: any) => ({
      id: duplicate.id,
      status: duplicate.status,
      createdAt: toIso(duplicate.createdAt) ?? new Date().toISOString(),
    })),
    timeline: buildTimeline(report.status),
    urgencyLabel: getUrgencyLabel(report),
    duplicateMatch: report.duplicateOfId
      ? 100
      : Math.min(
          99,
          (report.duplicates?.length ?? 0) * 24 +
            Math.round((report.upvoteCount ?? 0) * 4),
        ),
    workerName: deriveWorkerName({
      ...report,
      cleanup: serializeCleanup(report.cleanup),
      verification: serializeVerification(report.verification),
    }),
    cleanupState: deriveCleanupState({
      ...report,
      cleanup: serializeCleanup(report.cleanup),
      verification: serializeVerification(report.verification),
    }),
    citizenVerificationState: deriveCitizenVerificationState({
      ...report,
      cleanup: serializeCleanup(report.cleanup),
      verification: serializeVerification(report.verification),
    }),
  };
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

function buildDailySeries(reports: any[]): AuthorityChartSeries {
  const days = 14;
  const today = new Date();
  const labels: string[] = [];
  const submitted: number[] = [];
  const resolved: number[] = [];
  const urgent: number[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const cursor = new Date(today);
    cursor.setUTCDate(today.getUTCDate() - index);
    labels.push(
      new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(cursor),
    );

    const sameDayReports = reports.filter((report) =>
      sameDay(new Date(report.createdAt), cursor),
    );
    const sameDayResolved = reports.filter(
      (report) =>
        report.resolvedAt && sameDay(new Date(report.resolvedAt), cursor),
    );

    submitted.push(sameDayReports.length);
    resolved.push(sameDayResolved.length);
    urgent.push(
      sameDayReports.filter((report) => report.attention === "URGENT").length,
    );
  }

  return { labels, submitted, resolved, urgent };
}

function buildZones(reports: AuthorityReport[]): AuthorityZone[] {
  const zoneMap = new Map<
    string,
    AuthorityZone & { resolutionDurations: number[] }
  >();

  for (const report of reports) {
    const zone = report.zone ?? "Unzoned";
    const current = zoneMap.get(zone) ?? {
      zone,
      openReports: 0,
      urgentReports: 0,
      duplicateReports: 0,
      resolvedReports: 0,
      averageResolutionHours: null,
      resolutionDurations: [],
    };

    const isOpen = !["RESOLVED", "VERIFIED", "CANCELLED"].includes(
      report.status,
    );
    if (isOpen) current.openReports += 1;
    if (report.attention === "URGENT") current.urgentReports += 1;
    if (report.duplicateOfId) current.duplicateReports += 1;
    if (["RESOLVED", "VERIFIED"].includes(report.status))
      current.resolvedReports += 1;
    if (report.resolvedAt) {
      current.resolutionDurations.push(
        (new Date(report.resolvedAt).getTime() -
          new Date(report.createdAt).getTime()) /
          3_600_000,
      );
    }

    zoneMap.set(zone, current);
  }

  return [...zoneMap.values()]
    .map(({ resolutionDurations, ...zone }) => ({
      ...zone,
      averageResolutionHours: average(resolutionDurations),
    }))
    .sort(
      (left, right) =>
        right.openReports +
        right.urgentReports -
        (left.openReports + left.urgentReports),
    );
}

function buildWorkers(workers: any[]): any[] {
  return workers.map((worker) => {
    const cleanups = worker.cleanupsDone ?? [];
<<<<<<< HEAD
    const activeAssignments = cleanups.filter(
      (cleanup: any) => !["COMPLETED", "CANCELLED"].includes(cleanup.status),
    ).length;
    const completedToday = cleanups.filter(
      (cleanup: any) =>
        cleanup.completedAt &&
        sameDay(new Date(cleanup.completedAt), new Date()),
    ).length;
    const lastActive =
      cleanups
        .flatMap((cleanup: any) => [
          cleanup.startedAt,
          cleanup.completedAt,
          cleanup.assignedAt,
        ])
        .filter(Boolean)
        .sort(
          (a: string, b: string) =>
            new Date(b).getTime() - new Date(a).getTime(),
        )[0] ?? worker.updatedAt;
=======
    const activeAssignments = cleanups.filter((cleanup: any) => !["COMPLETED", "CANCELLED"].includes(cleanup.status)).length;
    const completedToday = cleanups.filter((cleanup: any) => cleanup.completedAt && sameDay(new Date(cleanup.completedAt), new Date())).length;
    const lastActive =
      cleanups
        .flatMap((cleanup: any) => [cleanup.startedAt, cleanup.completedAt, cleanup.assignedAt])
        .filter(Boolean)
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] ?? worker.updatedAt;
>>>>>>> eda3e8139a2ce90b795792b55d7493dba77ed185

    const specialties = [
      ...new Set(
        cleanups
          .map((cleanup: any) => cleanup.report?.wasteCategory)
          .filter(Boolean),
      ),
    ].slice(0, 3);

    return {
      id: worker.id,
      name: worker.name,
      email: worker.email,
      zone: worker.zone ?? null,
      image: worker.image ?? null,
      isActive: worker.isActive,
      available: worker.isActive && activeAssignments < 2,
      workload: activeAssignments,
      completedToday,
      activeAssignments,
      lastActiveAt: toIso(lastActive),
      specialties,
    };
  });
}

export async function buildDashboardPayload(): Promise<AuthorityDashboardPayload> {
  const [rawReports, rawWorkers, notifications] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 120,
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
    }),
    prisma.user.findMany({
      where: { role: "WORKER" },
      orderBy: { updatedAt: "desc" },
      include: {
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
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        report: {
          select: {
            id: true,
            status: true,
            zone: true,
            attention: true,
          },
        },
      },
    }),
  ]);

  const reports: AuthorityReport[] = rawReports.map(serializeReport);
  const workers = buildWorkers(rawWorkers);
  const zones = buildZones(reports);
  const openReports = reports.filter(
    (report: AuthorityReport) =>
      !["RESOLVED", "VERIFIED", "CANCELLED"].includes(report.status),
  ).length;
  const urgentReports = reports.filter(
    (report: AuthorityReport) => report.attention === "URGENT",
  ).length;
  const duplicateReports = reports.filter((report: AuthorityReport) =>
    Boolean(report.duplicateOfId),
  ).length;
  const reviewQueue = reports.filter(
    (report: AuthorityReport) =>
      report.status === "CLEANUP_COMPLETED" ||
      (report.status === "RESOLVED" && !report.verification),
  ).length;
  const disputedReports = reports.filter(
    (report: AuthorityReport) => report.status === "DISPUTED",
  ).length;
  const openAssignments = workers.reduce(
    (sum, worker) => sum + worker.activeAssignments,
    0,
  );
  const availableWorkers = workers.filter(
    (worker: any) => worker.available,
  ).length;
  const resolvedReports = reports.filter(
    (report: AuthorityReport) =>
      ["RESOLVED", "VERIFIED"].includes(report.status) && report.resolvedAt,
  );
  const averageResolutionHours = average(
    resolvedReports.map(
      (report: AuthorityReport) =>
        (new Date(report.resolvedAt as string).getTime() -
          new Date(report.createdAt).getTime()) /
        3_600_000,
    ),
  );
  const onTimeResolved = resolvedReports.filter(
    (report: AuthorityReport) =>
      new Date(report.resolvedAt as string).getTime() -
        new Date(report.createdAt).getTime() <=
      48 * 3_600_000,
  ).length;
  const resolutionEfficiency = resolvedReports.length
    ? Math.round((onTimeResolved / resolvedReports.length) * 100)
    : 0;
  const mostAffectedArea = zones[0]?.zone ?? "All wards";

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      openReports,
      urgentReports,
      duplicateReports,
      availableWorkers,
      reviewQueue,
      disputedReports,
      openAssignments,
      mostAffectedArea,
      averageResolutionHours,
      resolutionEfficiency,
    },
    reports,
    workers,
    zones,
    charts: {
      dailyVolume: buildDailySeries(rawReports),
    },
    notifications: notifications.map((notification: any) => ({
      id: notification.id,
      title: notification.title,
      message: notification.message ?? null,
      createdAt: toIso(notification.createdAt) ?? new Date().toISOString(),
      isRead: notification.isRead,
      type: notification.type,
      reportId: notification.reportId,
      report: {
        id: notification.report.id,
        status: notification.report.status,
        zone: notification.report.zone ?? null,
        attention: notification.report.attention,
      },
    })),
  };
}
