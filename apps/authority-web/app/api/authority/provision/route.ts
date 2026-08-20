import { NextResponse } from "next/server";
<<<<<<< HEAD
import { auth } from "@/lib/auth";
=======
>>>>>>> eda3e8139a2ce90b795792b55d7493dba77ed185
import { prisma } from "db/client";
import { requireAuthenticatedSession } from "../_lib";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
<<<<<<< HEAD
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as { role?: string }).role !== "AUTHORITY") {
    return NextResponse.json(
      { error: "Only an authenticated authority can add authority staff." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email =
    typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name || !email || !password)
    return NextResponse.json(
      { error: "Name, official email, and password are required." },
      { status: 400 },
    );
  if (!email.endsWith(".gov"))
    return NextResponse.json(
      { error: "Authority staff must use an official .gov email." },
      { status: 400 },
    );
  if (password.length < 8)
    return NextResponse.json(
      { error: "Use a password of at least 8 characters." },
      { status: 400 },
    );

  try {
    // The server verifies the inviter's role first; the inviter's browser
    // session is never replaced by the new staff member's session.
    const created = await auth.api.signUpEmail({
      body: { name, email, password, rememberMe: false },
      headers: request.headers,
    });
    const updated = await prisma.user.update({
      where: { id: created.user.id },
      data: { role: "AUTHORITY", isActive: true },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ data: updated }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "We could not create this authority account.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
=======
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
>>>>>>> eda3e8139a2ce90b795792b55d7493dba77ed185
}
