import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

/** Every provisioned municipal authority account, including inactive accounts. */
export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;

  const authorities = await prisma.user.findMany({
    where: { role: "AUTHORITY" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      zone: true,
      isActive: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ data: authorities });
}
