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
    action?: "block" | "unblock" | "reset_strikes";
    reason?: string;
  } | null;

  if (
    !body ||
    !["block", "unblock", "reset_strikes"].includes(body.action ?? "")
  ) {
    return NextResponse.json(
      { error: "action must be block, unblock, or reset_strikes" },
      { status: 400 },
    );
  }

  const worker = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!worker || worker.role !== "WORKER") {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 });
  }

  if (body.action === "reset_strikes") {
    const updated = await prisma.user.update({
      where: { id },
      data: { workerStrikeCount: 0 },
      select: {
        id: true,
        isActive: true,
        workerStrikeCount: true,
        blockedAt: true,
        blockedReason: true,
      },
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
    select: {
      id: true,
      isActive: true,
      workerStrikeCount: true,
      blockedAt: true,
      blockedReason: true,
    },
  });

  if (blocked) {
    await prisma.notification.create({
      data: {
        userId: id,
        audience: "WORKER",
        type: "WORKER_MANUALLY_BLOCKED",
        title: "Worker account blocked",
        message: body.reason?.trim()
          ? `Your worker account was blocked by municipal authority: ${body.reason.trim()}`
          : "Your worker account was blocked by municipal authority.",
      },
    });
  } else {
    await prisma.notification.create({
      data: {
        userId: id,
        audience: "WORKER",
        type: "ACCOUNT_UNBLOCKED",
        title: "Worker account restored",
        message: "Your worker account access has been restored.",
      },
    });
  }

  return NextResponse.json({ data: updated });
}
