import { NextResponse } from "next/server";
import { prisma } from "db/client";
import { loadManagedWorker, requireAuthoritySession } from "../../../_lib";
import {
  deleteProfileImageObject,
  isOwnProfileImageKey,
  profileImageObjectExists,
  profileImageUrl,
} from "../../../_s3";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// PUT /api/authority/workers/:id/profile-image
// Body: { key: string } — must be the key returned by the upload-url call.
//
// Finalizes the assignment only after confirming the object exists in the
// shared `profile` bucket, then records the assigning authority. The DB is
// never updated before the upload lands.
// ---------------------------------------------------------------------------
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const authority = authResult.session!.user;
  const { id: workerId } = await params;

  const body = (await request.json().catch(() => null)) as {
    key?: string;
  } | null;

  if (!body?.key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  if (!isOwnProfileImageKey(workerId, body.key)) {
    return NextResponse.json(
      { error: "Profile image key does not belong to the target worker" },
      { status: 403 },
    );
  }

  const { worker, error } = await loadManagedWorker(authority, workerId);
  if (error) return error;

  const exists = await profileImageObjectExists(body.key);
  if (!exists) {
    return NextResponse.json(
      { error: "Upload has not completed. Upload to the presigned URL first." },
      { status: 409 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: worker.id },
    data: {
      image: body.key,
      profileImageUploadedById: authority.id,
      profileImageAssignedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      zone: true,
      isActive: true,
      profileImageUploadedById: true,
      profileImageAssignedAt: true,
    },
  });

  // Free CDN/storage space only after the new image is live (never delete
  // the old image first — a failed replace must not leave the worker bare).
  if (worker.image && worker.image !== body.key) {
    await deleteProfileImageObject(worker.image);
  }

  return NextResponse.json({
    success: true,
    data: {
      ...updated,
      profileImageUrl: profileImageUrl(updated.image),
    },
  });
}
