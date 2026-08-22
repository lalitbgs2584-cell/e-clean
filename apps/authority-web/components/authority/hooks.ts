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
    error:
      (session as any).error instanceof Error ? (session as any).error : null,
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

export function useAssignWorkerProfileImageMutation(token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { workerId: string; file: File }) =>
      authorityApi.assignWorkerProfileImage(
        token as string,
        params.workerId,
        params.file,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["authority", "dashboard"] });
    },
  });
}

export function useMapReportsQuery(
  token: string | null,
  filters: {
    status?: string;
    attention?: string;
    category?: string;
    zone?: string;
    from?: string;
    to?: string;
  } = {},
) {
  return useQuery({
    queryKey: ["authority", "map", "reports", filters],
    queryFn: () => authorityApi.mapReports(token as string, filters),
    enabled: Boolean(token),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useMapSummaryQuery(token: string | null) {
  return useQuery({
    queryKey: ["authority", "map", "summary"],
    queryFn: () => authorityApi.mapSummary(token as string),
    enabled: Boolean(token),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useMapWorkersQuery(token: string | null) {
  return useQuery({
    queryKey: ["authority", "map", "workers"],
    queryFn: () => authorityApi.mapWorkers(token as string),
    enabled: Boolean(token),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}

export function useCitizensQuery(
  token: string | null,
  params: { page?: number; limit?: number; search?: string } = {},
) {
  return useQuery({
    queryKey: ["authority", "citizens", params],
    queryFn: () => authorityApi.listCitizens(token as string, params),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}

export function useWorkersQuery(token: string | null) {
  return useQuery({
    queryKey: ["authority", "workers"],
    queryFn: () => authorityApi.listWorkers(token as string),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}

export function useAuthoritiesQuery(token: string | null) {
  return useQuery({
    queryKey: ["authority", "authorities"],
    queryFn: () => authorityApi.listAuthorities(token as string),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
}
