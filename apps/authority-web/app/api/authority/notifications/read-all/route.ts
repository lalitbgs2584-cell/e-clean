import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;

  await prisma.notification.updateMany({
    where: { audience: "AUTHORITY", isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
