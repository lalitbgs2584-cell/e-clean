import type { AuthorityDashboardPayload, AuthorityReport, ReportActionType, VerificationResult } from "./shared";

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? body?.message ?? "Request failed");
  }
  return (body?.data ?? body) as T;
}

async function request<T>(path: string, token: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  return parseJson<T>(response);
}

export const authorityApi = {
  dashboard(token: string) {
    return request<AuthorityDashboardPayload>("/api/authority/dashboard", token);
  },
  report(token: string, reportId: string) {
    return request<AuthorityReport>(`/api/authority/reports/${reportId}`, token);
  },
  updateReport(
    token: string,
    reportId: string,
    payload: {
      action: ReportActionType;
      workerId?: string;
      duplicateOfId?: string;
      verificationResult?: VerificationResult;
      note?: string;
    },
  ) {
    return request<AuthorityReport>(`/api/authority/reports/${reportId}`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
  provisionAuthority(token: string) {
    return request<{ id: string; role: string }>("/api/authority/provision", token, {
      method: "POST",
      body: JSON.stringify({}),
    });
  },
};
