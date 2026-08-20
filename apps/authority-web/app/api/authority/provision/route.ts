import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthenticatedSession } from "../_lib";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuthenticatedSession(request);

  if (authResult.response) {
    return authResult.response;
  }

  const email = authResult.session!.user.email.toLowerCase();
  if (!email.endsWith(".gov")) {
    return NextResponse.json({ error: "Authority sign-up requires an official .gov email" }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: authResult.session!.user.id },
    data: {
      role: "AUTHORITY",
      isActive: true,
    },
    select: {
      id: true,
      role: true,
    },
  });

  return NextResponse.json({ data: updated });
}
