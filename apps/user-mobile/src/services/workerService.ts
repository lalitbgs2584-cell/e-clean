/**
 * Typed API client for all worker endpoints.
 * Uses the same config.apiUrl and cookie-based auth as the citizen flows.
 */
import { config } from "@/config/env";

const base = config.apiUrl;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CleanupStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface WorkerUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  profileImageUrl?: string | null;
  role: string;
  zone?: string | null;
  isActive: boolean;
  profileImageUploadedById?: string | null;
  profileImageAssignedAt?: string | null;
  profileImageUploadedBy?: { id: string; name: string } | null;
  createdAt: string;
}

export interface DisputeStats {
  recentTotal: number;
  recentDisputed: number;
  disputeRatePercent: number;
  warning: boolean;
  message: string | null;
}

export interface WorkerStats {
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  verified: number;
  disputed: number;
  thisWeekCompleted?: number;
  lastWeekCompleted?: number;
  streakDays?: number;
  disputeStats?: DisputeStats;
}

export type RejectionReasonCode =
  | "LOCATION_INCORRECT"
  | "ALREADY_CLEANED"
  | "HAZARDOUS_UNSAFE"
  | "OUT_OF_ZONE"
  | "OTHER";

export const REJECTION_REASONS: {
  code: RejectionReasonCode;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    code: "LOCATION_INCORRECT",
    label: "Location Incorrect",
    icon: "📍",
    description: "Cannot find waste at the given GPS location",
  },
  {
    code: "ALREADY_CLEANED",
    label: "Already Cleaned",
    icon: "✨",
    description: "Site is already clean or no waste present",
  },
  {
    code: "HAZARDOUS_UNSAFE",
    label: "Hazardous / Unsafe",
    icon: "⚠️",
    description: "Bio-hazard, toxic waste, or unsafe terrain",
  },
  {
    code: "OUT_OF_ZONE",
    label: "Out of Zone",
    icon: "🚧",
    description: "Report location is outside assigned jurisdiction",
  },
  {
    code: "OTHER",
    label: "Other Reason",
    icon: "📝",
    description: "Other operational condition or issue",
  },
];

export interface ReportImageRecord {
  id: string;
  reportId: string;
  storagePath: string;
  type: string;
  createdAt: string;
}

export interface WorkerReport {
  id: string;
  latitude: number;
  longitude: number;
  zone?: string | null;
  dumpType?: string | null;
  wasteCategory?: string | null;
  wasteVolume?: string | null;
  truckSize?: string | null;
  workersNeeded?: number | null;
  attention: string;
  severityScore?: number | null;
  status: string;
  createdAt: string;
  images: ReportImageRecord[];
}

export interface AssignedByRef {
  id: string;
  name: string;
}

export interface WorkerCleanup {
  id: string;
  reportId: string;
  workerId: string;
  assignedBy: string;
  status: CleanupStatus;
  beforeImageId?: string | null;
  afterImageId?: string | null;
  assignedAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  report: WorkerReport;
  assignedByRef: AssignedByRef;
  beforeImage?: ReportImageRecord | null;
  afterImage?: ReportImageRecord | null;
  verificationResult?: "VERIFIED" | "DISPUTED" | null;
}

export interface PresignResponse {
  success: boolean;
  url: string;
  key: string;
}

export interface CompleteCleanupBody {
  beforeImageKey: string;
  afterImageKey: string;
  notes?: string;
}

export interface NoWasteFoundBody {
  imageKey: string;
  notes?: string;
}

import { authClient } from "@/lib/auth-client";
import * as SecureStore from "expo-secure-store";

async function getAuthToken(): Promise<string | null> {
  try {
    const sessionRes = await authClient.getSession();
    if (sessionRes?.data?.session?.token) {
      return sessionRes.data.session.token;
    }
  } catch {}

  try {
    const token = await SecureStore.getItemAsync("eclean_session_token");
    if (token) return token;
  } catch {}

  try {
    const token = await SecureStore.getItemAsync("eclean_token");
    if (token) return token;
  } catch {}

  return null;
}

// ---------------------------------------------------------------------------
// Fetch helper — sends token and cookies (Better Auth session)
// ---------------------------------------------------------------------------
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAuthToken();

  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const json = await res
    .json()
    .catch(() => ({ success: false, error: "Invalid response" }));

  if (!res.ok) {
    throw new Error(json?.error ?? `Request failed: ${res.status}`);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Worker API functions
// ---------------------------------------------------------------------------

export const getWorkerMe = () =>
  apiFetch<{ success: boolean; data: WorkerUser }>("/api/worker/me");

export const getWorkerStats = () =>
  apiFetch<{ success: boolean; data: WorkerStats }>("/api/worker/stats");

export const updateWorkerLocation = (latitude: number, longitude: number) =>
  apiFetch<{ success: boolean }>("/api/worker/location", {
    method: "PATCH",
    body: JSON.stringify({ latitude, longitude }),
  });

export const getWorkerCleanups = (status?: CleanupStatus) => {
  const qs = status ? `?status=${status}` : "";
  return apiFetch<{ success: boolean; count: number; data: WorkerCleanup[] }>(
    `/api/worker/cleanups${qs}`,
  );
};

export const getWorkerCleanup = (id: string) =>
  apiFetch<{ success: boolean; data: WorkerCleanup }>(
    `/api/worker/cleanups/${id}`,
  );

export const getWorkerHistory = (
  status?: string,
  timeFilter?: "week" | "month",
) => {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (timeFilter) params.set("timeFilter", timeFilter);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<{ success: boolean; count: number; data: WorkerCleanup[] }>(
    `/api/worker/cleanups/history${qs}`,
  );
};

export const startCleanup = (id: string) =>
  apiFetch<{ success: boolean; data: WorkerCleanup }>(
    `/api/worker/cleanups/${id}/start`,
    { method: "PATCH" },
  );

export const acceptCleanup = (id: string) =>
  apiFetch<{ success: boolean; data: WorkerCleanup }>(
    `/api/worker/cleanups/${id}/accept`,
    { method: "PATCH" },
  );

export const rejectCleanup = (
  id: string,
  reasonOrPayload:
    | string
    | { reasonCode: RejectionReasonCode; notes?: string },
) => {
  const body =
    typeof reasonOrPayload === "string"
      ? { reason: reasonOrPayload }
      : reasonOrPayload;
  return apiFetch<{ success: boolean; data: WorkerCleanup }>(
    `/api/worker/cleanups/${id}/reject`,
    { method: "PATCH", body: JSON.stringify(body) },
  );
};

export const presignCleanupImage = (
  id: string,
  slot: "before" | "after",
  mime = "image/jpeg",
) =>
  apiFetch<PresignResponse>(`/api/worker/cleanups/${id}/images/presign`, {
    method: "POST",
    body: JSON.stringify({ slot, mime }),
  });

export const completeCleanup = (id: string, body: CompleteCleanupBody) =>
  apiFetch<{ success: boolean; data: { cleanup: WorkerCleanup } }>(
    `/api/worker/cleanups/${id}/complete`,
    { method: "PATCH", body: JSON.stringify(body) },
  );

export const presignNoWasteProof = (id: string, mime = "image/jpeg") =>
  apiFetch<PresignResponse>(`/api/worker/cleanups/${id}/no-waste/presign`, {
    method: "POST",
    body: JSON.stringify({ mime }),
  });

export const submitNoWasteFound = (id: string, body: NoWasteFoundBody) =>
  apiFetch<{ success: boolean; data: { cleanup: WorkerCleanup } }>(
    `/api/worker/cleanups/${id}/no-waste`,
    { method: "PATCH", body: JSON.stringify(body) },
  );

// ---------------------------------------------------------------------------
// S3 direct upload helper (reuses the same pattern as citizen upload.ts)
// ---------------------------------------------------------------------------
export async function uploadToPresignedUrl(
  presignedUrl: string,
  fileUri: string,
): Promise<void> {
  const file = await fetch(fileUri);
  if (!file.ok) throw new Error("Could not read photo from device.");

  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: await file.blob(),
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed (${uploadRes.status}).`);
  }
}
