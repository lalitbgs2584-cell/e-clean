import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAuthoritySession(request);
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 25),
  );
  const search = searchParams.get("search")?.trim();
  const where = {
    role: "CITIZEN" as const,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, citizens] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isActive: true,
        points: true,
        wrongReportsCount: true,
        blockedAt: true,
        blockedReason: true,
        createdAt: true,
        _count: { select: { reports: true } },
      },
    }),
  ]);
  return NextResponse.json({
    data: citizens.map((citizen) => ({
      ...citizen,
      reportCount: citizen._count.reports,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
