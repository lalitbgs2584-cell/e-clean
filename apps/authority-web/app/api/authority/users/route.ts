import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { hashPassword } from "better-auth/crypto";
import { requireAuthoritySession } from "../_lib";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) {
    return authResult.response;
  }

  try {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      email?: string;
      password?: string;
      role?: string;
      zone?: string;
      phone?: string;
    } | null;

    if (!body?.name?.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 },
      );
    }

    if (!body?.email?.trim()) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 },
      );
    }

    const email = body.email.toLowerCase().trim();
    const name = body.name.trim();
    const password = body.password?.trim() || "";

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const role =
      body.role === "AUTHORITY"
        ? "AUTHORITY"
        : "WORKER";

    const zone = body.zone?.trim() || null;
    const phone = body.phone?.trim() || null;

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: `A user with email '${email}' already exists.` },
        { status: 409 },
      );
    }

    // Hash password using Better Auth standard format
    const hashedPassword = await hashPassword(password);

    // Atomically create User and Account in Prisma.
    // This does NOT modify the caller's session cookies or headers,
    // ensuring the Authority admin stays logged in.
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          role: role as "WORKER" | "AUTHORITY",
          zone,
          phone,
          isActive: true,
          emailVerified: true,
        },
      });

      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
          issuer: "local:credential",
        },
      });

      return user;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        zone: newUser.zone,
        phone: newUser.phone,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[authority/users POST]", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to provision user" },
      { status: 500 },
    );
  }
}
