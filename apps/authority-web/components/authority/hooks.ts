"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { authorityApi } from "./api";
import type { ReportActionType, VerificationResult } from "./shared";

type AuthoritySessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role?: "CITIZEN" | "WORKER" | "AUTHORITY" | "RECYCLING_PARTNER";
  zone?: string | null;
  isActive?: boolean;
};

type AuthoritySessionState = {
  data: {
    session?: {
      token?: string | null;
    };
    user: AuthoritySessionUser;
  } | null;
  isPending: boolean;
  error?: Error | null;
};

export function useAuthoritySession(): {
  data: AuthoritySessionState["data"];
  isPending: boolean;
  error: Error | null;
  token: string | null;
  user: AuthoritySessionUser | null;
} {
  const session = authClient.useSession();
  const data = session.data as AuthoritySessionState["data"];
  return {
    data,
    isPending: session.isPending,
    error: (session as any).error instanceof Error ? (session as any).error : null,
    token: data?.session?.token ?? null,
    user: data?.user ?? null,
  };
}

export function useAuthorityDashboardQuery(token: string | null) {
  return useQuery({
    queryKey: ["authority", "dashboard"],
    queryFn: () => authorityApi.dashboard(token as string),
    enabled: Boolean(token),
    staleTime: 10_000,
  });
}

export function useReportQuery(token: string | null, reportId: string | null) {
  return useQuery({
    queryKey: ["authority", "report", reportId],
    queryFn: () => authorityApi.report(token as string, reportId as string),
    enabled: Boolean(token && reportId),
  });
}

export function useReportActionMutation(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      reportId: string;
      action: ReportActionType;
      workerId?: string;
      duplicateOfId?: string;
      verificationResult?: VerificationResult;
      note?: string;
    }) => authorityApi.updateReport(token as string, params.reportId, params),
    onSuccess: async (_report, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["authority", "dashboard"] }),
        queryClient.invalidateQueries({
          queryKey: ["authority", "report", vars.reportId],
        }),
      ]);
    },
  });
}

export function useProvisionAuthorityMutation(token: string | null) {
  return useMutation({
    mutationFn: () => authorityApi.provisionAuthority(token as string),
  });
}
