import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAuthoritySession(request);
  if (authResult?.response) return authResult.response;

  const partners = await prisma.recyclingPartner.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      contactPhone: true,
      contactEmail: true,
      city: true,
      area: true,
      acceptedCategories: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: partners,
  });
}
