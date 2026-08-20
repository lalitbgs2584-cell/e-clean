import { config } from "@/config/env";

export type ReportPhotoSlot = "original" | "support";

interface PresignResponse {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export async function uploadReportPhoto({
  reportId,
  slot,
  fileUri,
  token,
}: {
  reportId: string;
  slot: ReportPhotoSlot;
  fileUri: string;
  token?: string;
}): Promise<string> {
  const presignResponse = await fetch(
    `${config.apiUrl}/api/upload/create-presign-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ mime: "image/jpeg", reportId, slot }),
    },
  );

  const presign = (await presignResponse
    .json()
    .catch(() => null)) as PresignResponse | null;
  if (
    !presignResponse.ok ||
    !presign?.success ||
    !presign.url ||
    !presign.key
  ) {
    throw new Error(
      presign?.error ?? `Could not prepare ${slot} photo upload.`,
    );
  }

  const image = await fetch(fileUri);
  if (!image.ok) {
    throw new Error("Could not read the selected photo.");
  }

  const uploadResponse = await fetch(presign.url, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: await image.blob(),
  });
  if (!uploadResponse.ok) {
    throw new Error(`Photo upload failed (${uploadResponse.status}).`);
  }

  return presign.key;
}
