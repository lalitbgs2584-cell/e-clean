import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../../_lib";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;
  if (!auth.session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
  } | null;

  if (!body?.name?.trim()) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const name = body.name.trim();

  await prisma.user.update({
    where: { id: auth.session.user.id },
    data: { name },
  });

  return NextResponse.json({ success: true, name });
}
