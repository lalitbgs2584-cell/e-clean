"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Check,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileWarning,
  Filter,
  Leaf,
  LocateFixed,
  MapPinned,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  X,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { AuthorityApiError, authorityApi } from "./api";
import {
  useAssignWorkerProfileImageMutation,
  useAuthorityDashboardQuery,
  useAuthoritySession,
  useReportActionMutation,
} from "./hooks";
import {
  STATUS_TONES,
  buildTimeline,
  formatCompactDate,
  formatHours,
  formatRelativeTime,
  getUrgencyLabel,
  type AuthorityDashboardPayload,
  type AuthorityReport,
  type AuthorityWorker,
  type ReportActionType,
} from "./shared";
import { ReportTimeline } from "./report-timeline";
import { MapCommandCenter } from "./map-command-center";
import { CitizensTable } from "./CitizensTable";
import { AuthoritiesTable } from "./AuthoritiesTable";
import { WorkersTable } from "./WorkersTable";
import { CreateUserModal } from "./CreateUserModal";
import { EvidenceGallery } from "./EvidenceGallery";
import {
  FiltersPanel,
  EMPTY_FILTERS,
  type ReportFilters,
} from "./FiltersPanel";

// ── Types ─────────────────────────────────────────────────────────────────────
type Page =
  | "Overview"
  | "Reports"
  | "Map & Locations"
  | "Assignments"
  | "Workers"
  | "Authorities"
  | "Citizens"
  | "Verification"
  | "Disputes"
  | "Analytics"
  | "Notifications"
  | "Settings";

const NAVIGATION: Array<{ label: Page; icon: LucideIcon }> = [
  { label: "Overview", icon: MapPinned },
  { label: "Reports", icon: FileWarning },
  { label: "Map & Locations", icon: LocateFixed },
  { label: "Assignments", icon: ClipboardCheck },
  { label: "Workers", icon: Users },
  { label: "Authorities", icon: ShieldCheck },
  { label: "Citizens", icon: UserCheck },
  { label: "Verification", icon: ShieldCheck },
  { label: "Disputes", icon: AlertTriangle },
  { label: "Analytics", icon: BarChart3 },
  { label: "Notifications", icon: Bell },
  { label: "Settings", icon: Settings },
];

const REPORT_TABS = [
  "All",
  "Pending",
  "AI_ASSESSED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLEANUP_COMPLETED",
  "RESOLVED",
  "VERIFIED",
  "DISPUTED",
  "CANCELLED",
] as const;

type ModalState = { action: ReportActionType; reportId: string } | null;

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Pill({
  children,
  tone = "mint",
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "gray" | "mint";
}) {
  const cls =
    tone === "green"
      ? "mint"
      : tone === "red"
        ? "red"
        : tone === "amber"
          ? "amber"
          : tone === "gray"
            ? "gray"
            : "mint";
  return <span className={`pill ${cls}`}>{children}</span>;
}

// ── MetricGrid ────────────────────────────────────────────────────────────────
function MetricGrid({ payload }: { payload: AuthorityDashboardPayload }) {
  const items = [
    [
      "Open reports",
      payload.metrics.openReports,
      `Focus: ${payload.metrics.mostAffectedArea}`,
    ],
    [
      "Urgent reports",
      payload.metrics.urgentReports,
      `${payload.metrics.resolutionEfficiency}% on-time resolution`,
    ],
    [
      "Duplicates",
      payload.metrics.duplicateReports,
      "Potential repeat submissions",
    ],
    [
      "Available workers",
      payload.metrics.availableWorkers,
      `${payload.metrics.openAssignments} active assignments`,
    ],
    [
      "Awaiting review",
      payload.metrics.reviewQueue,
      "Cleanups waiting for approval",
    ],
    [
      "Citizen disputes",
      payload.metrics.disputedReports,
      "Reports reopened for review",
    ],
  ] as const;

  return (
    <div className="metrics">
      {items.map(([label, value, note]) => (
        <article className="metric" key={label}>
          <p>{label}</p>
          <h2>{value}</h2>
          <small className="up">• {note}</small>
        </article>
      ))}
    </div>
  );
}

// ── PeopleOverview ────────────────────────────────────────────────────────────
function PeopleOverview({
  payload,
  onNavigateCitizens,
  onNavigateWorkers,
  onNavigateAuthorities,
}: {
  payload: AuthorityDashboardPayload;
  onNavigateCitizens: (filter: "ALL" | "ACTIVE" | "BLOCKED") => void;
  onNavigateWorkers: (filter: "ALL" | "ACTIVE" | "BLOCKED" | "STRIKED") => void;
  onNavigateAuthorities: () => void;
}) {
  const people = payload.people;
  if (!people) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          People & Moderation
        </h3>
      </div>
      <div className="metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <article
          className="metric"
          onClick={() => onNavigateCitizens("ALL")}
          style={{ cursor: "pointer" }}
        >
          <p>Total Citizens</p>
          <h2>{people.totalCitizens}</h2>
          <small className="up" style={{ color: "var(--green)" }}>• Registered citizens →</small>
        </article>
        <article
          className="metric"
          onClick={() => onNavigateWorkers("ALL")}
          style={{ cursor: "pointer" }}
        >
          <p>Total Workers</p>
          <h2>{people.totalWorkers}</h2>
          <small className="up" style={{ color: "var(--green)" }}>• Field personnel →</small>
        </article>
        <article
          className="metric"
          onClick={onNavigateAuthorities}
          style={{ cursor: "pointer" }}
        >
          <p>Authority Staff</p>
          <h2>{people.totalAuthorityStaff}</h2>
          <small className="up">• Municipal admins →</small>
        </article>
        <article
          className="metric"
          onClick={() => onNavigateCitizens("BLOCKED")}
          style={{ cursor: "pointer" }}
        >
          <p>Blocked Citizens</p>
          <h2 style={{ color: people.blockedCitizens > 0 ? "var(--red)" : "inherit" }}>
            {people.blockedCitizens}
          </h2>
          <small style={{ color: people.blockedCitizens > 0 ? "var(--red)" : "var(--muted)" }}>
            • Inactive/suspended →
          </small>
        </article>
        <article
          className="metric"
          onClick={() => onNavigateWorkers("STRIKED")}
          style={{ cursor: "pointer" }}
        >
          <p>Striked / Blocked Workers</p>
          <h2 style={{ color: people.blockedOrStrikedWorkers > 0 ? "var(--amber)" : "inherit" }}>
            {people.blockedOrStrikedWorkers}
          </h2>
          <small style={{ color: people.blockedOrStrikedWorkers > 0 ? "var(--amber)" : "var(--muted)" }}>
            • Needs attention →
          </small>
        </article>
      </div>
    </div>
  );
}

// ── BarChart ──────────────────────────────────────────────────────────────────
function BarChart({
  series,
  title,
  subtitle,
}: {
  series: AuthorityDashboardPayload["charts"]["dailyVolume"];
  title: string;
  subtitle: string;
}) {
  const maxValue = Math.max(
    ...series.submitted,
    ...series.resolved,
    ...series.urgent,
    1,
  );
  return (
    <article className="card chart-card">
      <div className="card-title">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="bar-chart">
        {series.submitted.map((value, index) => (
          <i
            key={series.labels[index]}
            style={{ height: `${(value / maxValue) * 100}%` }}
          />
        ))}
      </div>
      <div className="chart-axis">
        <span>{series.labels[0]}</span>
        <span>{series.labels[Math.floor(series.labels.length / 2)]}</span>
        <span>{series.labels[series.labels.length - 1]}</span>
      </div>
    </article>
  );
}

// ── MapCanvas ─────────────────────────────────────────────────────────────────
function MapCanvas({
  reports,
  onOpen,
}: {
  reports: AuthorityReport[];
  onOpen: (r: AuthorityReport) => void;
}) {
  const latitudes = reports.map((r) => r.latitude);
  const longitudes = reports.map((r) => r.longitude);
  const minLat = Math.min(...latitudes, 0),
    maxLat = Math.max(...latitudes, 1);
  const minLng = Math.min(...longitudes, 0),
    maxLng = Math.max(...longitudes, 1);
  const scale = (v: number, min: number, max: number) =>
    max === min ? 50 : ((v - min) / (max - min)) * 100;

  return (
    <div className="map-canvas operational-map">
      <div className="zone-label z1">WARD 3</div>
      <div className="zone-label z2">WARD 7</div>
      <div className="map-water one" />
      <div className="map-water two" />
      <div className="map-road r1" />
      <div className="map-road r2" />
      <div className="map-road r3" />
      {reports.slice(0, 12).map((report, index) => (
        <button
          key={report.id}
          className={`map-marker ${report.attention === "URGENT" ? "urgent" : report.cleanup?.worker ? "worker" : index % 3 === 0 ? "cluster" : "normal"}`}
          style={{
            left: `${Math.min(92, Math.max(8, 10 + scale(report.longitude, minLng, maxLng) * 0.78))}%`,
            top: `${Math.min(88, Math.max(10, 12 + scale(report.latitude, minLat, maxLat) * 0.72))}%`,
          }}
          onClick={() => onOpen(report)}
        >
          {report.duplicateMatch > 95 ? "12" : ""}
        </button>
      ))}
    </div>
  );
}

// ── ReportTable ───────────────────────────────────────────────────────────────
function ReportTable({
  title,
  subtitle,
  reports,
  onOpen,
  onAction,
  emptyLabel,
  onFilters,
}: {
  title: string;
  subtitle: string;
  reports: AuthorityReport[];
  onOpen: (r: AuthorityReport) => void;
  onAction?: (r: AuthorityReport) => void;
  emptyLabel: string;
  onFilters?: () => void;
}) {
  return (
    <article className="card table-card">
      <div className="card-title">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {onFilters && (
          <button className="button ghost" onClick={onFilters}>
            <Filter size={15} /> Filters
          </button>
        )}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Report</th>
              <th>Category</th>
              <th>Location</th>
              <th>Timeline</th>
              <th>Priority</th>
              <th>Worker</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-hint">
                    <span>{emptyLabel}</span>
                  </div>
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr
                  key={report.id}
                  className={
                    report.attention === "URGENT" ? "urgent-row" : undefined
                  }
                >
                  <td>
                    <b>{report.id}</b>
                    <small className="cell-sub">{report.citizen.name}</small>
                  </td>
                  <td>
                    {report.wasteCategory ?? "Unknown"}
                    <small className="cell-sub">{report.urgencyLabel}</small>
                  </td>
                  <td>
                    {report.location ?? "Location pending"}
                    <small className="cell-sub">
                      {report.zone ?? "No zone"}
                    </small>
                  </td>
                  <td>
                    <div
                      style={{
                        minWidth: 170,
                        transform: "scale(0.84)",
                        transformOrigin: "left center",
                        marginLeft: -3,
                      }}
                    >
                      <ReportTimeline steps={report.timeline} />
                    </div>
                  </td>
                  <td>
                    <Pill
                      tone={
                        report.attention === "URGENT"
                          ? "red"
                          : report.urgencyLabel === "High"
                            ? "amber"
                            : "gray"
                      }
                    >
                      {report.urgencyLabel}
                    </Pill>
                  </td>
                  <td>
                    {report.workerName}
                    <small className="cell-sub">{report.cleanupState}</small>
                  </td>
                  <td>
                    <Pill tone={STATUS_TONES[report.status]}>
                      {report.status.replaceAll("_", " ")}
                    </Pill>
                    <small className="cell-sub">
                      {report.citizenVerificationState}
                    </small>
                  </td>
                  <td>
                    <button
                      className="more"
                      onClick={() => {
                        if (onAction) onAction(report);
                        else onOpen(report);
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

// ── ReportDrawer ──────────────────────────────────────────────────────────────
function ReportDrawer({
  report,
  onClose,
  onOpenAction,
  token,
}: {
  report: AuthorityReport;
  onClose: () => void;
  onOpenAction: (action: ReportActionType) => void;
  token: string | null;
}) {
  const currentStep = Math.max(
    0,
    report.timeline.findIndex((s) => s.state === "current"),
  );
  return (
    <div className="overlay">
      <aside className="drawer">
        <header>
          <div>
            <p>REPORT DETAIL</p>
            <h2>{report.id}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </header>

        {/* Hero image — first REPORT type */}
        <div
          className={`detail-image ${report.attention === "URGENT" ? "orange" : report.status === "DISPUTED" ? "teal" : "green"}`}
          style={{
            padding: report.images.some((i) => i.type === "REPORT")
              ? 0
              : undefined,
            overflow: "hidden",
          }}
        >
          {report.images.find((img) => img.type === "REPORT")?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={report.images.find((img) => img.type === "REPORT")!.url!}
              alt="Citizen report"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            "Citizen report image · GPS verified"
          )}
        </div>

        <section>
          <div className="detail-heading">
            <h3>Report information</h3>
            <Pill tone={report.attention === "URGENT" ? "red" : "amber"}>
              {report.status.replaceAll("_", " ")}
            </Pill>
          </div>
          <dl>
            <dt>Submitted by</dt>
            <dd>{report.citizen.name}</dd>
            <dt>Submitted</dt>
            <dd>{formatRelativeTime(report.createdAt)}</dd>
            <dt>Waste category</dt>
            <dd>{report.wasteCategory ?? "Unknown"}</dd>
            <dt>Location</dt>
            <dd>{report.location ?? "Location pending"}</dd>
            <dt>Zone</dt>
            <dd>{report.zone ?? "Unzoned"}</dd>
            <dt>Priority</dt>
            <dd>
              <Pill tone={report.attention === "URGENT" ? "red" : "amber"}>
                {getUrgencyLabel(report)}
              </Pill>
            </dd>
          </dl>
        </section>

        <section className="ai-assessment">
          <span>
            <ShieldCheck size={17} /> AI assessment ·{" "}
            {Math.round(report.aiConfidence ?? 0)}% confidence
          </span>
          <b>{report.dumpType ?? "Waste report"}</b>
          <p>
            Resources: {report.workersNeeded ?? 2} workers ·{" "}
            {report.truckSize ?? "Medium"} truck ·{" "}
            {report.recommendedAction ?? "Authority review"}.
          </p>
        </section>

        <section>
          <h3>Status timeline</h3>
          <ReportTimeline steps={buildTimeline(report.status)} />
          <p className="cell-sub" style={{ marginTop: 10 }}>
            Current stage:{" "}
            {currentStep >= 0
              ? report.timeline[currentStep]?.label
              : "Submitted"}
          </p>
        </section>

        {/* Full evidence gallery */}
        <section>
          <h3>Evidence</h3>
          <EvidenceGallery report={report} token={token} />
        </section>

        <footer>
          <button className="button ghost" onClick={onClose}>
            Close
          </button>
          {report.status === "CLEANUP_COMPLETED" ||
          report.status === "RESOLVED" ? (
            <button
              className="button primary"
              onClick={() =>
                onOpenAction(
                  report.verification?.result === "DISPUTED"
                    ? "mark_disputed"
                    : "mark_verified",
                )
              }
            >
              Verification decision
            </button>
          ) : report.status === "IN_PROGRESS" ? (
            <button
              className="button primary"
              onClick={() => onOpenAction("complete_cleanup")}
            >
              Mark cleanup complete
            </button>
          ) : report.status === "ASSIGNED" ? (
            <button
              className="button primary"
              onClick={() => onOpenAction("start_cleanup")}
            >
              Start cleanup
            </button>
          ) : (
            <button
              className="button primary"
              onClick={() => onOpenAction("assign")}
            >
              {report.workerName === "Not assigned" ||
              report.workerName === "Unassigned"
                ? "Assign worker"
                : "Update assignment"}
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

// ── ActionModal ───────────────────────────────────────────────────────────────
function ActionModal({
  report,
  action,
  workers,
  reports,
  selectedWorkerId,
  selectedDuplicateId,
  note,
  setNote,
  setSelectedWorkerId,
  setSelectedDuplicateId,
  onClose,
  onSubmit,
  pending,
}: {
  report: AuthorityReport;
  action: ReportActionType;
  workers: AuthorityDashboardPayload["workers"];
  reports: AuthorityReport[];
  selectedWorkerId: string;
  selectedDuplicateId: string;
  note: string;
  setNote: (v: string) => void;
  setSelectedWorkerId: (v: string) => void;
  setSelectedDuplicateId: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  pending: boolean;
}) {
  const titles: Record<ReportActionType, [string, string]> = {
    assign: [
      "Assign cleanup team",
      "Choose the closest available worker before the cleanup starts.",
    ],
    start_cleanup: [
      "Start cleanup",
      "Move the cleanup from assignment to active field work.",
    ],
    complete_cleanup: [
      "Complete cleanup",
      "Record the cleanup completion and release the report for review.",
    ],
    approve_cleanup: [
      "Approve cleanup",
      "Mark the cleanup resolved after review of before/after evidence.",
    ],
    mark_verified: [
      "Citizen verification",
      "Finalize the cleanup as verified by the citizen.",
    ],
    mark_disputed: [
      "Citizen dispute",
      "Reopen the cleanup with a disputed verification outcome.",
    ],
    link_duplicate: [
      "Link duplicate reports",
      "Connect this report to the strongest existing duplicate match.",
    ],
    route_recycling: [
      "Route to Recycling Partner",
      "Assign this report to an authorized recycling partner for material recovery.",
    ],
  };

  return (
    <div className="overlay modal-overlay">
      <div className="modal workflow-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={19} />
        </button>
        <span className="modal-icon">
          {action === "assign" ? (
            <Users size={22} />
          ) : action === "link_duplicate" ? (
            <FileWarning size={22} />
          ) : (
            <ClipboardCheck size={22} />
          )}
        </span>
        <h2>{titles[action][0]}</h2>
        <p>{titles[action][1]}</p>
        {action === "assign" && (
          <div className="worker-choices">
            {workers.map((worker) => (
              <button
                key={worker.id}
                className={selectedWorkerId === worker.id ? "chosen" : ""}
                onClick={() => setSelectedWorkerId(worker.id)}
              >
                <span>
                  <b>{worker.name}</b>
                  <small>
                    {worker.zone ?? "Unzoned"} ·{" "}
                    {worker.specialties.join(", ") || "General cleanup"}
                  </small>
                </span>
                <Pill tone={worker.available ? "mint" : "amber"}>
                  {worker.available ? "Available" : "Busy"}
                </Pill>
              </button>
            ))}
            <div className="resource-note">
              <b>Resources</b>
              <span>
                {report.workersNeeded ?? 2} workers ·{" "}
                {report.truckSize ?? "Medium"} truck · PPE · Estimated duration
                2-3 hours
              </span>
            </div>
          </div>
        )}
        {action === "link_duplicate" && (
          <div className="duplicate-card">
            <b>Pick the report to link</b>
            <p>
              The selected duplicate will be closed and attached to the existing
              report.
            </p>
            <select
              className="select"
              value={selectedDuplicateId}
              onChange={(e) => setSelectedDuplicateId(e.target.value)}
            >
              <option value="">Choose a linked report</option>
              {reports
                .filter((r) => r.id !== report.id)
                .slice(0, 12)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} · {r.location ?? r.zone ?? "Nearby report"}
                  </option>
                ))}
            </select>
          </div>
        )}
        {(action === "mark_verified" ||
          action === "mark_disputed" ||
          action === "approve_cleanup") && (
          <div className="verify-choice">
            <b>Review note</b>
            <p>
              Add a short authority note if you want this workflow to appear in
              the audit trail.
            </p>
            <label className="setting-field" style={{ marginTop: 10 }}>
              Decision note
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional comment for the record"
              />
            </label>
          </div>
        )}
        <div className="modal-actions">
          <button className="button ghost" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            className="button primary"
            onClick={onSubmit}
            disabled={
              pending ||
              (action === "assign" && !selectedWorkerId) ||
              (action === "link_duplicate" && !selectedDuplicateId)
            }
          >
            {pending
              ? "Updating..."
              : action === "assign"
                ? "Assign"
                : action === "start_cleanup"
                  ? "Start cleanup"
                  : action === "complete_cleanup"
                    ? "Complete cleanup"
                    : action === "approve_cleanup"
                      ? "Approve cleanup"
                      : action === "mark_verified"
                        ? "Mark verified"
                        : action === "mark_disputed"
                          ? "Mark disputed"
                          : "Link reports"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hotspots ──────────────────────────────────────────────────────────────────
function Hotspots({ payload }: { payload: AuthorityDashboardPayload }) {
  return (
    <article className="card category-card">
      <div className="card-title">
        <div>
          <h2>Hotspot ranking</h2>
          <p>Areas with the most open waste reports</p>
        </div>
      </div>
      {payload.zones.slice(0, 4).map((zone) => (
        <div className="category-row" key={zone.zone}>
          <span>{zone.zone}</span>
          <div>
            <i
              style={{
                width: `${Math.max(15, Math.min(100, zone.openReports * 10 + zone.urgentReports * 12))}%`,
              }}
            />
          </div>
          <b>{zone.openReports}</b>
        </div>
      ))}
    </article>
  );
}

// ── ZonePanel (Map & Locations legacy) ───────────────────────────────────────
function ZonePanel({
  payload,
  onOpen,
}: {
  payload: AuthorityDashboardPayload;
  onOpen: (r: AuthorityReport) => void;
}) {
  const topZone = payload.zones[0];
  return (
    <div className="map-page">
      <article className="card map-card">
        <div className="card-title">
          <div>
            <h2>Operational locations</h2>
            <p>Reports, workers, hotspots, and duplicate clusters.</p>
          </div>
          <div className="map-tools">
            <button>Status</button>
            <button>Priority</button>
            <button>Worker</button>
          </div>
        </div>
        <MapCanvas reports={payload.reports} onOpen={onOpen} />
        <footer className="map-legend">
          <span>
            <i className="dot urgent" /> Urgent
          </span>
          <span>
            <i className="dot" /> Report
          </span>
          <span>
            <i className="dot worker" /> Worker
          </span>
          <span>
            <i className="dot cluster" /> Cluster
          </span>
        </footer>
      </article>
      <aside className="area-panel">
        <Pill>AREA OVERVIEW</Pill>
        <h2>{topZone?.zone ?? "No zone data"}</h2>
        <p>Highest concentration of open and urgent waste reports</p>
        {(topZone
          ? [
              ["Open reports", topZone.openReports],
              ["Urgent reports", topZone.urgentReports],
              ["Duplicates", topZone.duplicateReports],
              ["Resolved", topZone.resolvedReports],
              ["Avg. resolution", formatHours(topZone.averageResolutionHours)],
            ]
          : [
              ["Open reports", "0"],
              ["Urgent reports", "0"],
              ["Duplicates", "0"],
              ["Resolved", "0"],
              ["Avg. resolution", "n/a"],
            ]
        ).map(([label, value]) => (
          <div className="info-row" key={label as string}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
        {payload.reports[0] && (
          <button
            className="button primary"
            onClick={() => onOpen(payload.reports[0]!)}
          >
            Review top report
          </button>
        )}
      </aside>
    </div>
  );
}

// ── NotificationsPanel ────────────────────────────────────────────────────────
function NotificationsPanel({
  payload,
  token,
  onOpen,
}: {
  payload: AuthorityDashboardPayload;
  token: string | null;
  onOpen: (r: AuthorityReport) => void;
}) {
  const [marking, setMarking] = useState(false);
  const [markedAll, setMarkedAll] = useState(false);

  const handleMarkAll = async () => {
    if (!token) return;
    setMarking(true);
    try {
      await authorityApi.markAllNotificationsRead(token);
      setMarkedAll(true);
    } finally {
      setMarking(false);
    }
  };

  const notifications = payload.notifications;

  return (
    <article className="card notification-page">
      <div className="card-title">
        <div>
          <h2>Notification center</h2>
          <p>Latest authority events, disputes, and approvals.</p>
        </div>
        <button
          className="button ghost"
          onClick={handleMarkAll}
          disabled={marking || markedAll}
        >
          {markedAll ? "All read ✓" : marking ? "Marking…" : "Mark all read"}
        </button>
      </div>
      {notifications.length === 0 ? (
        <div className="empty-hint">
          <span>No notifications yet.</span>
        </div>
      ) : (
        notifications.map((n) => (
          <div
            className="notification-item"
            key={n.id}
            style={{ opacity: n.isRead && !markedAll ? 0.6 : 1 }}
          >
            <Pill tone={n.report?.attention === "URGENT" ? "red" : "amber"}>
              {n.type.replaceAll("_", " ")}
            </Pill>
            <div>
              <b>{n.title}</b>
              <p>
                {n.message ?? n.reportId} · {formatRelativeTime(n.createdAt)}
              </p>
            </div>
            <button
              className="more"
              onClick={() => {
                const target =
                  payload.reports.find((r) => r.id === n.reportId) ??
                  payload.reports[0];
                if (target) onOpen(target);
              }}
            >
              Open
            </button>
          </div>
        ))
      )}
    </article>
  );
}

// ── SettingsPanel ─────────────────────────────────────────────────────────────
function SettingsPanel({
  sessionUser,
  token,
}: {
  sessionUser: { name: string; email: string };
  token: string | null;
}) {
  const [active, setActive] = useState("Profile");
  const [name, setName] = useState(sessionUser.name);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const handleSave = async () => {
    if (!token || !name.trim()) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await authorityApi.updateProfile(token, { name: name.trim() });
      setSaveMsg("Changes saved.");
    } catch {
      setSaveMsg("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const COMING_SOON_TABS = [
    "Organization",
    "Notifications",
    "Security",
    "Audit logs",
  ];
  const isComingSoon = COMING_SOON_TABS.includes(active);

  return (
    <div className="settings-layout">
      <aside className="settings-nav">
        {[
          "Profile",
          "Organization",
          "Notifications",
          "Security",
          "Roles & Permissions",
          "Audit logs",
        ].map((item) => (
          <button
            key={item}
            onClick={() => {
              setActive(item);
              setSaveMsg(null);
            }}
            className={active === item ? "active" : ""}
          >
            {item}
          </button>
        ))}
      </aside>
      <article className="card settings-card">
        <h2>{active}</h2>
        {active === "Roles & Permissions" ? (
          <>
            <p>Assign dashboard capabilities by municipal role.</p>
            <small
              style={{
                display: "block",
                marginBottom: 12,
                color: "var(--muted)",
                fontSize: 12,
              }}
            >
              This table is for reference only and is non-editable.
            </small>
            <table className="permission-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Super Admin</th>
                  <th>Reviewer</th>
                  <th>Supervisor</th>
                </tr>
              </thead>
              <tbody>
                {[
                  "Reports",
                  "Assignments",
                  "Verification",
                  "Workers",
                  "Settings",
                ].map((item) => (
                  <tr key={item}>
                    <td>{item}</td>
                    <td>
                      <Check size={16} />
                    </td>
                    <td>
                      <Check size={16} />
                    </td>
                    <td>{item !== "Settings" && <Check size={16} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : isComingSoon ? (
          <div
            style={{
              padding: "40px 0",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🚧</div>
            <p style={{ fontWeight: 600, fontSize: 15, margin: "0 0 6px" }}>
              Coming soon
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {active} configuration will be available in a future release.
            </p>
          </div>
        ) : (
          /* Profile tab */
          <>
            <p>Update your profile for the authority portal.</p>
            <label className="setting-field">
              Authority name
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="setting-field">
              Email
              <input
                defaultValue={sessionUser.email}
                disabled
                style={{ opacity: 0.6 }}
              />
            </label>
            {saveMsg && (
              <p
                style={{
                  fontSize: 13,
                  color: saveMsg.includes("failed") ? "#D64545" : "#2E7D4F",
                  margin: "4px 0 0",
                }}
              >
                {saveMsg}
              </p>
            )}
            <button
              className="button primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        )}
      </article>
    </div>
  );
}

// ── DisputesPanel ─────────────────────────────────────────────────────────────
function DisputesPanel({
  reports,
  onOpen,
  onAction,
  token,
}: {
  reports: AuthorityReport[];
  onOpen: (r: AuthorityReport) => void;
  onAction: (r: AuthorityReport) => void;
  token: string | null;
}) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleResolve = async (
    report: AuthorityReport,
    decision: "CLEAN" | "NOT_CLEAN",
  ) => {
    if (!token) return;
    setResolving(report.id + decision);
    setResolveError(null);
    try {
      await authorityApi.resolveDispute(token, report.id, decision);
    } catch (err) {
      setResolveError(
        err instanceof AuthorityApiError ? err.message : "Action failed.",
      );
    } finally {
      setResolving(null);
    }
  };

  return (
    <div>
      {resolveError && (
        <p style={{ color: "#D64545", marginBottom: 12, fontSize: 13 }}>
          {resolveError}
        </p>
      )}
      <article className="card table-card">
        <div className="card-title">
          <div>
            <h2>Citizen disputes</h2>
            <p>Open disputes that need evidence review or re-dispatch.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Report</th>
                <th>Citizen</th>
                <th>Zone</th>
                <th>Community review</th>
                <th>Votes</th>
                <th>Closes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-hint">
                      <span>No citizens have disputed a cleanup yet.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isInconclusive =
                    report.communityReviewStatus === "INCONCLUSIVE";
                  const hasCommunityReview = !!report.communityReviewStatus;
                  return (
                    <tr key={report.id}>
                      <td>
                        <b>{report.id}</b>
                        <small className="cell-sub">
                          {report.wasteCategory ?? "Unknown"}
                        </small>
                      </td>
                      <td>{report.citizen.name}</td>
                      <td>{report.zone ?? "Unzoned"}</td>
                      <td>
                        {hasCommunityReview ? (
                          <span
                            className={`pill ${
                              report.communityReviewStatus === "CONFIRMED_CLEAN"
                                ? "mint"
                                : report.communityReviewStatus ===
                                    "CONFIRMED_DIRTY"
                                  ? "red"
                                  : report.communityReviewStatus ===
                                      "INCONCLUSIVE"
                                    ? "amber"
                                    : "gray"
                            }`}
                          >
                            {report.communityReviewStatus?.replace(/_/g, " ")}
                          </span>
                        ) : (
                          <span className="pill gray">No review</span>
                        )}
                      </td>
                      <td>
                        {report.communityVoteTally ? (
                          <span style={{ fontSize: 12 }}>
                            ✓ {report.communityVoteTally.clean} / ✗{" "}
                            {report.communityVoteTally.notClean}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {report.communityReviewClosesAt
                          ? formatRelativeTime(report.communityReviewClosesAt)
                          : "—"}
                      </td>
                      <td
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          minWidth: 160,
                        }}
                      >
                        <button
                          className="more"
                          onClick={() => {
                            onOpen(report);
                            onAction(report);
                          }}
                        >
                          Open
                        </button>
                        {(isInconclusive || report.status === "DISPUTED") && (
                          <>
                            <button
                              className="button primary"
                              style={{ padding: "3px 8px", fontSize: 11 }}
                              disabled={resolving !== null}
                              onClick={() => handleResolve(report, "CLEAN")}
                            >
                              {resolving === report.id + "CLEAN"
                                ? "…"
                                : "Confirm clean"}
                            </button>
                            <button
                              className="button ghost"
                              style={{ padding: "3px 8px", fontSize: 11 }}
                              disabled={resolving !== null}
                              onClick={() => handleResolve(report, "NOT_CLEAN")}
                            >
                              {resolving === report.id + "NOT_CLEAN"
                                ? "…"
                                : "Confirm dirty"}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

// ── Loading / Access states ───────────────────────────────────────────────────
function LoadingState() {
  return (
    <main className="auth-loading">
      <LoaderCircle size={25} /> Checking secure session…
    </main>
  );
}
function AccessDenied({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}) {
  return (
    <main
      className="auth-loading"
      style={{ gap: 14, textAlign: "center", padding: 24 }}
    >
      <ShieldCheck size={28} />
      <strong>Authority access required</strong>
      <span>
        {email} is signed in, but the account is not provisioned for the
        authority workspace.
      </span>
      <button className="button primary" onClick={onSignOut}>
        Sign out
      </button>
    </main>
  );
}

// ── AuthorityDashboard (main shell) ──────────────────────────────────────────
export default function AuthorityDashboard() {
  const router = useRouter();
  const { data: session, isPending, token, user } = useAuthoritySession();
  const dashboardQuery = useAuthorityDashboardQuery(token);
  const actionMutation = useReportActionMutation(token);

  const [page, setPage] = useState<Page>("Overview");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof REPORT_TABS)[number]>("All");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedDuplicateId, setSelectedDuplicateId] = useState("");
  const [note, setNote] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reportFilters, setReportFilters] =
    useState<ReportFilters>(EMPTY_FILTERS);
  const [citizenStatusFilter, setCitizenStatusFilter] =
    useState<"ALL" | "ACTIVE" | "BLOCKED">("ALL");
  const [workerStatusFilter, setWorkerStatusFilter] =
    useState<"ALL" | "ACTIVE" | "BLOCKED" | "STRIKED">("ALL");

  useEffect(() => {
    const error = dashboardQuery.error;
    if (error instanceof AuthorityApiError && error.status === 401) {
      router.replace("/login?access=authority");
    }
  }, [dashboardQuery.error, router]);

  useEffect(() => {
    if (!selectedReportId && dashboardQuery.data?.reports[0]) {
      setSelectedReportId(dashboardQuery.data.reports[0].id);
    }
  }, [dashboardQuery.data?.reports, selectedReportId]);

  const rawPayload = dashboardQuery.data;
  const payload: AuthorityDashboardPayload | undefined =
    (rawPayload as any)?.data ?? rawPayload;
  const reports = payload?.reports ?? [];
  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) ?? null,
    [reports, selectedReportId],
  );

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const haystack = [
        report.id,
        report.citizen.name,
        report.location,
        report.zone,
        report.wasteCategory,
        report.status,
        report.cleanup?.worker?.name,
        report.workerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const tabMatches =
        tab === "All"
          ? true
          : tab === "Pending"
            ? ["PENDING", "AI_ASSESSED"].includes(report.status)
            : report.status === tab;
      const fZone = !reportFilters.zone || report.zone === reportFilters.zone;
      const fCategory =
        !reportFilters.category ||
        report.wasteCategory === reportFilters.category;
      const fStatus =
        !reportFilters.status || report.status === reportFilters.status;
      const fAttention =
        !reportFilters.attention ||
        report.attention === reportFilters.attention;
      const fWorker = !reportFilters.workerId
        ? true
        : reportFilters.workerId === "__none__"
          ? !report.cleanup?.worker
          : report.cleanup?.worker?.id === reportFilters.workerId;
      const fFrom =
        !reportFilters.from ||
        new Date(report.createdAt) >= new Date(reportFilters.from);
      const fTo =
        !reportFilters.to ||
        new Date(report.createdAt) <= new Date(reportFilters.to + "T23:59:59");
      return (
        haystack.includes(query.toLowerCase()) &&
        tabMatches &&
        fZone &&
        fCategory &&
        fStatus &&
        fAttention &&
        fWorker &&
        fFrom &&
        fTo
      );
    });
  }, [query, reports, tab, reportFilters]);

  const urgentReports = useMemo(
    () => reports.filter((r) => r.attention === "URGENT").slice(0, 4),
    [reports],
  );
  const reviewReports = useMemo(
    () =>
      reports
        .filter(
          (r) =>
            r.status === "CLEANUP_COMPLETED" ||
            (r.status === "RESOLVED" && !r.verification),
        )
        .slice(0, 8),
    [reports],
  );
  const disputedReports = useMemo(
    () => reports.filter((r) => r.status === "DISPUTED").slice(0, 20),
    [reports],
  );
  const openAssignments = useMemo(
    () => reports.filter((r) => ["ASSIGNED", "IN_PROGRESS"].includes(r.status)),
    [reports],
  );

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    if (selectedReportId && !selectedReport) setDrawerOpen(false);
  }, [selectedReport, selectedReportId]);

  if (isPending || !session || dashboardQuery.isPending)
    return <LoadingState />;
  if (
    user?.role !== "AUTHORITY" ||
    (dashboardQuery.error instanceof AuthorityApiError &&
      dashboardQuery.error.status === 403)
  ) {
    return (
      <AccessDenied
        email={user?.email ?? session.user.email}
        onSignOut={signOut}
      />
    );
  }
  if (!payload) return <LoadingState />;

  const title = page === "Overview" ? "Authority Dashboard" : page;

  const handleExportCsv = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/authority/reports/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eclean-reports-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
    }
  };

  const openReport = (report: AuthorityReport) => {
    setSelectedReportId(report.id);
    setDrawerOpen(true);
  };
  const openAction = (action: ReportActionType) => {
    if (!selectedReport) return;
    setModal({ action, reportId: selectedReport.id });
    setSelectedWorkerId(
      selectedReport.cleanup?.worker?.id ??
        payload.workers.find((w) => w.available)?.id ??
        payload.workers[0]?.id ??
        "",
    );
    setSelectedDuplicateId(
      selectedReport.duplicateOfId ??
        reports.find(
          (r) => r.id !== selectedReport.id && r.zone === selectedReport.zone,
        )?.id ??
        "",
    );
    setNote("");
  };

  const unreadCount = (payload?.notifications ?? []).filter((n) => !n.isRead).length;

  return (
    <main className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={20} />
          </span>
          <span>E-CLEAN</span>
        </div>
        <div className="org-label">AUTHORITY PORTAL</div>
        <nav>
          {NAVIGATION.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setPage(label)}
              className={`nav-link ${page === label ? "active" : ""}`}
            >
              <Icon size={18} /> {label}
              {label === "Notifications" && unreadCount > 0 && (
                <b>{unreadCount}</b>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="authority-card">
            <div className="avatar">
              {session.user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>{session.user.name}</strong>
              <small>
                <i />
                {session.user.email}
              </small>
            </div>
          </div>
          <button className="logout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Content */}
      <section className="content">
        <header className="topbar">
          <label className="global-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports, workers, zones, and evidence..."
            />
          </label>
          <div className="header-actions">
            <button className="date-button">Live</button>
            <button
              className="icon-button"
              onClick={() => setPage("Notifications")}
            >
              <Bell size={19} />
              {unreadCount > 0 && <em />}
            </button>
            <div className="header-avatar">
              {session.user.name.slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="page">
          <div className="page-heading">
            <div>
              <p className="breadcrumb">
                Operations <span>/</span> {title}
              </p>
              <h1>{title}</h1>
              <p>
                {page === "Overview"
                  ? "A live municipal command center with connected queues, reviews, workers, and audit-ready timelines."
                  : "Manage the municipal waste lifecycle from intake to verification."}
              </p>
            </div>
            <div className="heading-actions">
              <button className="button ghost" onClick={handleExportCsv}>
                <Download size={16} /> Export
              </button>
              <button
                className="button ghost"
                onClick={() => setAddUserOpen(true)}
              >
                <UserPlus size={16} /> Add member
              </button>
              {page === "Reports" && (
                <button
                  className="button primary"
                  onClick={() => setTab("Pending")}
                >
                  Review queue <span>{payload.metrics.reviewQueue}</span>
                </button>
              )}
            </div>
          </div>

          <MetricGrid payload={payload} />

          {/* ── Overview ── */}
          {page === "Overview" && (
            <>
              <PeopleOverview
                payload={payload}
                onNavigateCitizens={(f) => {
                  setCitizenStatusFilter(f);
                  setPage("Citizens");
                }}
                onNavigateWorkers={(f) => {
                  setWorkerStatusFilter(f);
                  setPage("Workers");
                }}
                onNavigateAuthorities={() => setPage("Authorities")}
              />
              <div className="operations-grid">
                <article className="card map-card">
                  <div className="card-title">
                    <div>
                      <h2>Live operations map</h2>
                      <p>
                        {payload.metrics.openReports} active reports across the
                        municipality
                      </p>
                    </div>
                    <button
                      className="button ghost"
                      onClick={() => setPage("Map & Locations")}
                    >
                      Open map <ChevronRight size={15} />
                    </button>
                  </div>
                  <MapCanvas reports={reports} onOpen={openReport} />
                  <footer className="map-legend">
                    <span>
                      <i className="dot urgent" /> Urgent
                    </span>
                    <span>
                      <i className="dot" /> Report
                    </span>
                    <span>
                      <i className="dot worker" /> Worker
                    </span>
                    <span>
                      <i className="dot cluster" /> Cluster
                    </span>
                  </footer>
                </article>
                <aside
                  className="urgent-card"
                  style={{
                    borderTop: "3px solid var(--red)",
                    boxShadow: "0 10px 24px rgba(195,61,46,.08)",
                  }}
                >
                  <div className="card-title">
                    <div>
                      <h2>Urgent reports</h2>
                      <p>Immediate follow-up required</p>
                    </div>
                    <Pill tone="red">{urgentReports.length} open</Pill>
                  </div>
                  {urgentReports.map((report) => (
                    <button
                      key={report.id}
                      className="urgent-row"
                      onClick={() => openReport(report)}
                    >
                      <span
                        className={`thumb ${report.status === "DISPUTED" ? "teal" : "orange"}`}
                      />
                      <span>
                        <b>
                          {report.id} · {report.wasteCategory ?? "Waste report"}
                        </b>
                        <small>
                          <MapPinned size={12} />{" "}
                          {report.location ?? report.zone ?? "Location pending"}
                        </small>
                        <small>{formatRelativeTime(report.createdAt)}</small>
                      </span>
                      <MoreHorizontal size={18} />
                    </button>
                  ))}
                  <button
                    className="text-link"
                    onClick={() => setPage("Reports")}
                  >
                    View all reports <ChevronRight size={14} />
                  </button>
                </aside>
              </div>
              <ReportTable
                title="Recent reports"
                subtitle="Every row includes a visible status timeline and current workflow state."
                reports={reports.slice(0, 6)}
                onOpen={openReport}
                onAction={openReport}
                emptyLabel="No recent reports available."
              />
              <section className="analytics">
                <BarChart
                  title="Reports over time"
                  subtitle="Daily intake for the last 14 days"
                  series={payload.charts.dailyVolume}
                />
                <article className="card resolution-card">
                  <div className="card-title">
                    <div>
                      <h2>Resolution performance</h2>
                      <p>
                        How efficiently the municipality is resolving reports
                      </p>
                    </div>
                  </div>
                  <div className="radial">
                    <div>
                      <strong>{payload.metrics.resolutionEfficiency}%</strong>
                      <span>on-time resolution</span>
                    </div>
                  </div>
                  <div className="performance-row">
                    <span>
                      <i className="dot green" /> Average resolution
                    </span>
                    <b>{formatHours(payload.metrics.averageResolutionHours)}</b>
                  </div>
                  <div className="performance-row">
                    <span>
                      <i className="dot amber" /> Review queue
                    </span>
                    <b>{payload.metrics.reviewQueue}</b>
                  </div>
                </article>
                <Hotspots payload={payload} />
              </section>
            </>
          )}

          {/* ── Reports ── */}
          {page === "Reports" && (
            <>
              <div className="tab-bar">
                {REPORT_TABS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setTab(item)}
                    className={tab === item ? "active" : ""}
                  >
                    {item.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
              <ReportTable
                title="Waste report management"
                subtitle="Review open reports, duplicates, and the current stage for every case."
                reports={filteredReports}
                onOpen={openReport}
                onAction={openReport}
                emptyLabel="No reports matched your current search or filter."
                onFilters={() => setFiltersOpen(true)}
              />
              {filtersOpen && (
                <FiltersPanel
                  filters={reportFilters}
                  onChange={setReportFilters}
                  onClose={() => setFiltersOpen(false)}
                  zones={payload.zones}
                  workers={payload.workers}
                />
              )}
            </>
          )}

          {page === "Map & Locations" && (
            <MapCommandCenter
              payload={payload}
              onOpen={openReport}
              token={token}
            />
          )}
          {page === "Assignments" && (
            <ReportTable
              title="Cleanup assignments"
              subtitle="Track work currently waiting on worker dispatch or escalation."
              reports={openAssignments}
              onOpen={openReport}
              onAction={openReport}
              emptyLabel="No assignments are waiting right now."
            />
          )}
          {page === "Workers" && (
            <WorkersTable
              onAddUser={() => setAddUserOpen(true)}
              initialStatusFilter={workerStatusFilter}
            />
          )}
          {page === "Authorities" && <AuthoritiesTable />}
          {page === "Citizens" && (
            <CitizensTable
              token={token}
              initialStatusFilter={citizenStatusFilter}
              onViewReports={(citizenId) => {
                setQuery(citizenId);
                setPage("Reports");
              }}
            />
          )}
          {page === "Verification" && (
            <ReportTable
              title="Cleanup review queue"
              subtitle="These cleanups are waiting for authority approval or citizen verification."
              reports={reviewReports}
              onOpen={openReport}
              onAction={(report) => {
                openReport(report);
                setModal({
                  action:
                    report.verification?.result === "DISPUTED"
                      ? "mark_disputed"
                      : "mark_verified",
                  reportId: report.id,
                });
              }}
              emptyLabel="Nothing is waiting for verification review."
            />
          )}
          {page === "Disputes" && (
            <DisputesPanel
              reports={disputedReports}
              onOpen={openReport}
              onAction={(report) =>
                setModal({ action: "mark_disputed", reportId: report.id })
              }
              token={token}
            />
          )}
          {page === "Analytics" && (
            <section className="analytics">
              <BarChart
                title="Submission trend"
                subtitle="Incoming reports across the last 14 days"
                series={payload.charts.dailyVolume}
              />
              <article className="card resolution-card">
                <div className="card-title">
                  <div>
                    <h2>Municipal efficiency</h2>
                    <p>What percentage of cleanups stay on track</p>
                  </div>
                </div>
                <div className="radial">
                  <div>
                    <strong>{payload.metrics.resolutionEfficiency}%</strong>
                    <span>efficiency</span>
                  </div>
                </div>
                <div className="performance-row">
                  <span>
                    <i className="dot green" /> Avg. resolution
                  </span>
                  <b>{formatHours(payload.metrics.averageResolutionHours)}</b>
                </div>
                <div className="performance-row">
                  <span>
                    <i className="dot amber" /> Open assignments
                  </span>
                  <b>{payload.metrics.openAssignments}</b>
                </div>
              </article>
              <Hotspots payload={payload} />
            </section>
          )}
          {page === "Notifications" && (
            <NotificationsPanel
              payload={payload}
              token={token}
              onOpen={openReport}
            />
          )}
          {page === "Settings" && (
            <SettingsPanel
              sessionUser={{
                name: session.user.name,
                email: session.user.email,
              }}
              token={token}
            />
          )}
        </div>
      </section>

      {/* Overlays */}
      {drawerOpen && selectedReport && (
        <ReportDrawer
          report={selectedReport}
          onClose={() => setDrawerOpen(false)}
          onOpenAction={(action) =>
            setModal({ action, reportId: selectedReport.id })
          }
          token={token}
        />
      )}
      {modal && selectedReport && (
        <ActionModal
          report={selectedReport}
          action={modal.action}
          workers={payload.workers}
          reports={reports}
          selectedWorkerId={selectedWorkerId}
          selectedDuplicateId={selectedDuplicateId}
          note={note}
          setNote={setNote}
          setSelectedWorkerId={setSelectedWorkerId}
          setSelectedDuplicateId={setSelectedDuplicateId}
          onClose={() => setModal(null)}
          onSubmit={async () => {
            await actionMutation.mutateAsync({
              reportId: modal.reportId,
              action: modal.action,
              workerId:
                modal.action === "assign" ? selectedWorkerId : undefined,
              duplicateOfId:
                modal.action === "link_duplicate"
                  ? selectedDuplicateId
                  : undefined,
              verificationResult:
                modal.action === "mark_verified"
                  ? "VERIFIED"
                  : modal.action === "mark_disputed"
                    ? "DISPUTED"
                    : undefined,
              note,
            });
            setModal(null);
            setNote("");
          }}
          pending={actionMutation.isPending}
        />
      )}
      {addUserOpen && (
        <CreateUserModal
          zones={payload.zones}
          token={token}
          onClose={() => setAddUserOpen(false)}
          onSuccess={() => {
            setAddUserOpen(false);
            dashboardQuery.refetch();
          }}
        />
      )}
    </main>
  );
}
