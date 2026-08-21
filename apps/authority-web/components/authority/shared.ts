export type ReportStatus =
  | "PENDING"
  | "AI_ASSESSED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "CLEANUP_COMPLETED"
  | "RESOLVED"
  | "VERIFIED"
  | "DISPUTED"
  | "CANCELLED";

export type AttentionLevel = "NORMAL" | "URGENT";
export type CleanupStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type VerificationResult = "VERIFIED" | "DISPUTED";
export type ReportActionType =
  | "assign"
  | "approve_cleanup"
  | "link_duplicate"
  | "mark_verified"
  | "mark_disputed"
  | "start_cleanup"
  | "complete_cleanup"
  | "route_recycling";

export type StatusStepState = "done" | "current" | "blocked" | "upcoming";

export type AuthorityTimelineStep = {
  key: string;
  label: string;
  state: StatusStepState;
};

export type AuthorityMedia = {
  id: string;
  type: "REPORT" | "BEFORE_CLEANUP" | "AFTER_CLEANUP" | "COLLECTION_PROOF";
  storagePath: string;
  /** CDN URL derived from storagePath (the single E-Clean distribution). */
  url: string | null;
  mediaType: "PHOTO" | "VIDEO";
  createdAt: string;
};

export type AuthorityUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  profileImageUrl: string | null;
  role: "CITIZEN" | "WORKER" | "AUTHORITY" | "RECYCLING_PARTNER";
  zone: string | null;
  isActive: boolean;
};

export type AuthorityCleanup = {
  id: string;
  status: CleanupStatus;
  assignedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  worker: AuthorityUser;
  assignedBy: AuthorityUser;
  beforeImage: AuthorityMedia | null;
  afterImage: AuthorityMedia | null;
};

export type AuthorityVerification = {
  id: string;
  result: VerificationResult;
  comment: string | null;
  createdAt: string;
  user: AuthorityUser;
};

export type RecyclingPartnerRecord = {
  id: string;
  name: string;
  contactPhone: string | null;
  contactEmail: string | null;
  city: string | null;
  area: string | null;
  acceptedCategories: string[];
};

export type SuggestedWorker = {
  id: string;
  name: string;
  email: string;
  zone: string | null;
  image: string | null;
  profileImageUrl: string | null;
  activeAssignments: number;
  score: number;
  matchReasons: string[];
};

export type PersonOfTheWeek = {
  id: string;
  name: string;
  image: string | null;
  profileImageUrl: string | null;
  points: number;
  verifiedReportsCount: number;
  title: string;
};

export type AuthorityReport = {
  id: string;
  description: string | null;
  latitude: number;
  longitude: number;
  location: string | null;
  zone: string | null;
  dumpType: string | null;
  wasteCategory: string | null;
  wasteVolume: string | null;
  truckSize: string | null;
  workersNeeded: number | null;
  recommendedAction: string | null;
  attention: AttentionLevel;
  nearSensitiveLocation: boolean;
  severityScore: number | null;
  aiConfidence: number | null;
  aiProcessedAt: string | null;
  duplicateOfId: string | null;
  upvoteCount: number;
  recyclingPartnerId?: string | null;
  recyclingPartner?: RecyclingPartnerRecord | null;
  recyclingStatus: string | null;
  routedToRecyclingAt?: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  citizen: AuthorityUser;
  cleanup: AuthorityCleanup | null;
  verification: AuthorityVerification | null;
  images: AuthorityMedia[];
  duplicateOf: {
    id: string;
    status: ReportStatus;
    zone: string | null;
    createdAt: string;
  } | null;
  duplicates: Array<{
    id: string;
    status: ReportStatus;
    createdAt: string;
  }>;
  timeline: AuthorityTimelineStep[];
  urgencyLabel: string;
  duplicateMatch: number;
  workerName: string;
  cleanupState: string;
  citizenVerificationState: string;
};

export type AuthorityWorker = {
  id: string;
  name: string;
  email: string;
  zone: string | null;
  image: string | null;
  profileImageUrl: string | null;
  imageAssignedBy: { id: string; name: string } | null;
  imageAssignedAt: string | null;
  isActive: boolean;
  available: boolean;
  workload: number;
  completedToday: number;
  activeAssignments: number;
  lastActiveAt: string | null;
  specialties: string[];
};

export type AuthorityZone = {
  zone: string;
  openReports: number;
  urgentReports: number;
  duplicateReports: number;
  resolvedReports: number;
  averageResolutionHours: number | null;
};

export type AuthorityChartSeries = {
  labels: string[];
  submitted: number[];
  resolved: number[];
  urgent: number[];
};

export type AuthorityDashboardPayload = {
  generatedAt: string;
  metrics: {
    openReports: number;
    urgentReports: number;
    duplicateReports: number;
    availableWorkers: number;
    reviewQueue: number;
    disputedReports: number;
    openAssignments: number;
    mostAffectedArea: string;
    averageResolutionHours: number | null;
    resolutionEfficiency: number;
  };
  personOfTheWeek?: PersonOfTheWeek | null;
  reports: AuthorityReport[];
  workers: AuthorityWorker[];
  zones: AuthorityZone[];
  recyclingPartners?: RecyclingPartnerRecord[];
  charts: {
    dailyVolume: AuthorityChartSeries;
  };
  notifications: Array<{
    id: string;
    title: string;
    message: string | null;
    createdAt: string;
    isRead: boolean;
    type: string;
    reportId: string;
    report: {
      id: string;
      status: ReportStatus;
      zone: string | null;
      attention: AttentionLevel;
    };
  }>;
};

export const STATUS_FLOW: Array<{ key: string; label: string }> = [
  { key: "PENDING", label: "Submitted" },
  { key: "AI_ASSESSED", label: "AI assessed" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "CLEANUP_COMPLETED", label: "Cleanup complete" },
  { key: "RESOLVED", label: "Authority reviewed" },
  { key: "VERIFIED", label: "Citizen verified" },
  { key: "DISPUTED", label: "Disputed" },
];

export const STATUS_TONES: Record<
  ReportStatus,
  "mint" | "amber" | "red" | "gray"
> = {
  PENDING: "gray",
  AI_ASSESSED: "amber",
  ASSIGNED: "mint",
  IN_PROGRESS: "mint",
  CLEANUP_COMPLETED: "amber",
  RESOLVED: "mint",
  VERIFIED: "mint",
  DISPUTED: "red",
  CANCELLED: "gray",
};

export const URGENCY_TONES: Record<AttentionLevel, "red" | "amber"> = {
  NORMAL: "amber",
  URGENT: "red",
};

export function buildTimeline(status: ReportStatus): AuthorityTimelineStep[] {
  const currentIndex = STATUS_FLOW.findIndex((step) => step.key === status);

  return STATUS_FLOW.map((step, index) => ({
    ...step,
    state:
      currentIndex === -1
        ? index === 0
          ? "current"
          : "upcoming"
        : index < currentIndex
          ? "done"
          : index === currentIndex
            ? "current"
            : "upcoming",
  }));
}

export function formatHours(value: number | null) {
  if (value == null || Number.isNaN(value)) return "n/a";
  if (value < 1) return `${Math.max(1, Math.round(value * 60))} min`;
  return `${value.toFixed(value >= 10 ? 0 : 1)} h`;
}

export function formatCompactDate(dateIso: string | null) {
  if (!dateIso) return "n/a";
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(dateIso: string | null) {
  if (!dateIso) return "n/a";
  const date = new Date(dateIso);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 60) {
    return `${absMinutes} min ${diffMinutes < 0 ? "ago" : "from now"}`;
  }

  const hours = Math.round(absMinutes / 60);
  if (hours < 24) {
    return `${hours} hr ${diffMinutes < 0 ? "ago" : "from now"}`;
  }

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ${diffMinutes < 0 ? "ago" : "from now"}`;
}

export function getUrgencyLabel(
  report: Pick<AuthorityReport, "attention" | "severityScore">,
) {
  if (report.attention === "URGENT") return "Urgent";
  if ((report.severityScore ?? 0) >= 75) return "High";
  return "Normal";
}

export function deriveWorkerName(report: AuthorityReport) {
  if (report.cleanup?.worker?.name) return report.cleanup.worker.name;
  return report.status === "ASSIGNED" || report.status === "IN_PROGRESS"
    ? "Unassigned"
    : "Not assigned";
}

export function deriveCleanupState(report: AuthorityReport) {
  if (report.cleanup?.status === "COMPLETED")
    return "Waiting for citizen review";
  if (report.cleanup?.status === "IN_PROGRESS") return "Cleanup in progress";
  if (report.cleanup?.status === "ACCEPTED") return "Worker accepted assignment";
  if (report.cleanup?.status === "REJECTED") return "Worker declined assignment";
  if (report.cleanup?.status === "ASSIGNED") return "Worker assigned";
  return "Awaiting assignment";
}

export function deriveCitizenVerificationState(report: AuthorityReport) {
  if (
    report.verification?.result === "VERIFIED" ||
    report.status === "VERIFIED"
  )
    return "Verified by citizen";
  if (
    report.verification?.result === "DISPUTED" ||
    report.status === "DISPUTED"
  )
    return "Disputed by citizen";
  if (report.status === "RESOLVED") return "Pending citizen response";
  return "Not ready";
}
