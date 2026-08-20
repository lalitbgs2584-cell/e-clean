import { config } from "@/config/env";
import type { WasteCategory } from "@/store/citizen-store";

export interface ReportReviewUpdate {
  wasteType: WasteCategory;
  severity: "Low" | "Medium" | "High";
  description: string;
  isRecurring: boolean;
}

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
