import { config } from "@/config/env";
import type { WasteCategory } from "@/store/citizen-store";
import { authClient } from "@/lib/auth-client";

export interface ReportReviewUpdate {
  wasteType: WasteCategory;
  severity: "Low" | "Medium" | "High";
  description: string;
  isRecurring: boolean;
  isLitterer: boolean;
}

export interface CitizenReport {
  id: string;
  description: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  status: string;
  wasteCategory: string | null;
  severityScore: number | null;
  attention: string;
  createdAt: string;
  images: Array<{ id: string; storagePath: string; type: string; createdAt: string }>;
  cleanup?: {
    id: string;
    status: string;
    beforeImage?: { storagePath: string } | null;
    afterImage?: { storagePath: string } | null;
  } | null;
  verification?: { result: "VERIFIED" | "DISPUTED"; comment: string | null } | null;
}

async function getSessionToken() {
  const session = await authClient.getSession();
  return session.data?.session?.token;
}

async function citizenRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getSessionToken();
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error ?? "Could not load report data.");
  }
  return data.data as T;
}

export const getMyReports = () => citizenRequest<CitizenReport[]>("/api/reports");

export const getMyReport = (reportId: string) =>
  citizenRequest<CitizenReport>(`/api/reports/${reportId}`);

export const verifyMyReport = (
  reportId: string,
  result: "VERIFIED" | "DISPUTED",
  comment?: string,
) =>
  citizenRequest<CitizenReport>(`/api/reports/${reportId}/verification`, {
    method: "POST",
    body: JSON.stringify({ result, comment }),
  });

export async function updateReportReview(
  reportId: string,
  update: ReportReviewUpdate,
  token?: string,
) {
  const response = await fetch(`${config.apiUrl}/api/reports/${reportId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(update),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.error ?? "Could not save report details.");
  }
  return data.data;
}
