import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    action?: "block" | "unblock" | "reset_wrong_reports";
    reason?: string;
  } | null;
  if (!body || !["block", "unblock", "reset_wrong_reports"].includes(body.action ?? ""))
    return NextResponse.json(
      { error: "action must be block, unblock, or reset_wrong_reports" },
      { status: 400 },
    );
  const citizen = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!citizen || citizen.role !== "CITIZEN")
    return NextResponse.json({ error: "Citizen not found" }, { status: 404 });

  if (body.action === "reset_wrong_reports") {
    const updated = await prisma.user.update({
      where: { id },
      data: { wrongReportsCount: 0 },
      select: { id: true, isActive: true, points: true, wrongReportsCount: true, blockedAt: true, blockedReason: true },
    });
    return NextResponse.json({ data: updated });
  }

  const blocked = body.action === "block";
  const updated = await prisma.user.update({
    where: { id },
    data: {
      isActive: !blocked,
      blockedAt: blocked ? new Date() : null,
      blockedReason: blocked
        ? body.reason?.trim() || "Blocked by municipal authority"
        : null,
    },
    select: { id: true, isActive: true, points: true, wrongReportsCount: true, blockedAt: true, blockedReason: true },
  });
  await prisma.notification.create({
    data: {
      userId: id,
      audience: "CITIZEN",
      type: blocked ? "ACCOUNT_BLOCKED" : "ACCOUNT_UNBLOCKED",
      title: blocked ? "Account temporarily blocked" : "Account restored",
      message: blocked
        ? "Your reporting account was blocked by the municipal authority."
        : "Your reporting account has been restored.",
    },
  });
  return NextResponse.json({ data: updated });
}
