import { NextResponse } from "next/server";
import { auth } from "auth";
import { prisma } from "db/client";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = session.user.email.toLowerCase();
  if (!email.endsWith(".gov")) {
    return NextResponse.json({ error: "Authority sign-up requires an official .gov email" }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
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
