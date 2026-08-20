import { NextResponse } from "next/server";
import { loadManagedWorker, requireAuthoritySession } from "../../../../_lib";
import {
  generateUploadId,
  presignProfileImagePut,
  profileImageKey,
} from "../../../../_s3";

export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// POST /api/authority/workers/:id/profile-image/upload-url
// Body: { mime: "image/jpeg" }
//
// Authority-scoped presign for a WORKER avatar. The worker id and storage key
// are always derived server-side; the client never picks the key.
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authResult = await requireAuthoritySession(request);
  if (authResult.response) return authResult.response;

  const { id: workerId } = await params;

  const body = (await request.json().catch(() => null)) as {
    mime?: string;
  } | null;

  if (body?.mime !== "image/jpeg") {
    return NextResponse.json(
      { error: "Only image/jpeg is supported" },
      { status: 400 },
    );
  }

  const { worker, error } = await loadManagedWorker(
    authResult.session!.user,
    workerId,
  );
  if (error) return error;

  const key = profileImageKey(worker.id, generateUploadId());
  const url = await presignProfileImagePut(key, body.mime);

  return NextResponse.json({ success: true, url, key });
}
