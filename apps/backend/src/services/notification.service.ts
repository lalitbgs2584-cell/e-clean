import { prisma } from "db/client";

type CreateNotificationInput = {
  userId: string;
  reportId?: string | null;
  type:
    | "REPORT_ASSIGNED"
    | "REPORT_IN_PROGRESS"
    | "REPORT_CLEANUP_COMPLETED"
    | "REPORT_RESOLVED"
    | "REPORT_VERIFIED"
    | "REPORT_DISPUTED"
    | "ACCOUNT_BLOCKED"
    | "ACCOUNT_UNBLOCKED"
    | "REPORT_NO_WASTE_FOUND";
  title: string;
  message?: string | null;
};

export function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      reportId: input.reportId ?? null,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
    },
  });
}

/** Increments the server-owned incorrect-report counter and blocks at three. */
export async function recordWrongReport(userId: string, reason: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { wrongReportsCount: { increment: 1 } },
    select: { wrongReportsCount: true, isActive: true },
  });

  if (user.wrongReportsCount >= 3 && user.isActive) {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, blockedAt: new Date(), blockedReason: reason },
    });
    await createNotification({
      userId,
      type: "ACCOUNT_BLOCKED",
      title: "Account temporarily blocked",
      message:
        "Your account has been blocked after repeated reports were found to be inaccurate. Contact your authority if you believe this is a mistake.",
    });
    return { ...user, blocked: true };
  }
  return { ...user, blocked: false };
}
