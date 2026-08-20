import { NextResponse } from "next/server";
import { buildDashboardPayload, requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const payload = await buildDashboardPayload();
  return NextResponse.json({ data: payload });
}
