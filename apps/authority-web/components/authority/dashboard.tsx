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
  ImagePlus,
  Leaf,
  LocateFixed,
  MapPinned,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
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

type Page =
  | "Overview"
  | "Reports"
  | "Map & Locations"
  | "Assignments"
  | "Workers"
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

function pillTone(value: "green" | "amber" | "red" | "gray" | "mint") {
  return value === "green"
    ? "mint"
    : value === "gray"
      ? "gray"
      : value === "red"
        ? "red"
        : "amber";
}

function Pill({
  children,
  tone = "mint",
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "red" | "gray" | "mint";
}) {
  return <span className={`pill ${pillTone(tone)}`}>{children}</span>;
}

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

function MapCanvas({
  reports,
  onOpen,
}: {
  reports: AuthorityReport[];
  onOpen: (report: AuthorityReport) => void;
}) {
  const latitudes = reports.map((report) => report.latitude);
  const longitudes = reports.map((report) => report.longitude);
  const minLat = Math.min(...latitudes, 0);
  const maxLat = Math.max(...latitudes, 1);
  const minLng = Math.min(...longitudes, 0);
  const maxLng = Math.max(...longitudes, 1);
  const scale = (value: number, min: number, max: number) =>
    max === min ? 50 : ((value - min) / (max - min)) * 100;

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

function ReportTable({
  title,
  subtitle,
  reports,
  onOpen,
  onAction,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  reports: AuthorityReport[];
  onOpen: (report: AuthorityReport) => void;
  onAction?: (report: AuthorityReport) => void;
  emptyLabel: string;
}) {
  return (
    <article className="card table-card">
      <div className="card-title">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <button className="button ghost">
          <Filter size={15} /> Filters
        </button>
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

function ReportDrawer({
  report,
  onClose,
  onOpenAction,
}: {
  report: AuthorityReport;
  onClose: () => void;
  onOpenAction: (action: ReportActionType) => void;
}) {
  const currentStep = Math.max(
    0,
    report.timeline.findIndex((step) => step.state === "current"),
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
            <img
              src={report.images.find((img) => img.type === "REPORT")!.url!}
              alt="Citizen report image"
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
        <section>
          <h3>Evidence</h3>
          <div className="evidence-grid">
            <div className="evidence-shot before">
              {report.images[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={report.images[0].url}
                  alt="Reported waste"
                  loading="lazy"
                />
              ) : null}
              <span className="evidence-label">Before</span>
              <small>
                {report.images[0]
                  ? formatCompactDate(report.images[0].createdAt)
                  : "Citizen upload"}
              </small>
            </div>
            <div className="evidence-shot after">
              {report.cleanup?.afterImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={report.cleanup.afterImage.url}
                  alt="After cleanup"
                  loading="lazy"
                />
              ) : null}
              <span className="evidence-label">After</span>
              <small>
                {report.cleanup?.afterImage
                  ? formatCompactDate(report.cleanup.afterImage.createdAt)
                  : "Awaiting cleanup"}
              </small>
            </div>
          </div>
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
  setNote: (value: string) => void;
  setSelectedWorkerId: (value: string) => void;
  setSelectedDuplicateId: (value: string) => void;
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
        {action === "assign" ? (
          <div className="worker-choices">
            {workers.map((worker) => (
              <button
                className={selectedWorkerId === worker.id ? "chosen" : ""}
                key={worker.id}
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
        ) : null}
        {action === "link_duplicate" ? (
          <div className="duplicate-card">
            <b>Pick the report to link</b>
            <p>
              The selected duplicate will be closed and attached to the existing
              report.
            </p>
            <select
              className="select"
              value={selectedDuplicateId}
              onChange={(event) => setSelectedDuplicateId(event.target.value)}
            >
              <option value="">Choose a linked report</option>
              {reports
                .filter((item) => item.id !== report.id)
                .slice(0, 12)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} · {item.location ?? item.zone ?? "Nearby report"}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
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
                onChange={(event) => setNote(event.target.value)}
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

function ZonePanel({
  payload,
  onOpen,
}: {
  payload: AuthorityDashboardPayload;
  onOpen: (report: AuthorityReport) => void;
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
          <div className="info-row" key={label}>
            <span>{label}</span>
            <b>{value}</b>
          </div>
        ))}
        {payload.reports[0] ? (
          <button
            className="button primary"
            onClick={() => onOpen(payload.reports[0]!)}
          >
            Review top report
          </button>
        ) : null}
      </aside>
    </div>
  );
}

function NotificationsPanel({
  payload,
  onOpen,
}: {
  payload: AuthorityDashboardPayload;
  onOpen: (report: AuthorityReport) => void;
}) {
  return (
    <article className="card notification-page">
      <div className="card-title">
        <div>
          <h2>Notification center</h2>
          <p>Latest authority events, disputes, and approvals.</p>
        </div>
        <button className="button ghost">Mark all read</button>
      </div>
      {payload.notifications.map((notification) => (
        <div className="notification-item" key={notification.id}>
          <Pill
            tone={notification.report.attention === "URGENT" ? "red" : "amber"}
          >
            {notification.type.replaceAll("_", " ")}
          </Pill>
          <div>
            <b>{notification.title}</b>
            <p>
              {notification.message ?? notification.report.id} ·{" "}
              {formatRelativeTime(notification.createdAt)}
            </p>
          </div>
          <button
            className="more"
            onClick={() => {
              const target =
                payload.reports.find(
                  (report) => report.id === notification.reportId,
                ) ?? payload.reports[0];
              if (target) onOpen(target);
            }}
          >
            Open
          </button>
        </div>
      ))}
    </article>
  );
}

function SettingsPanel({
  sessionUser,
}: {
  sessionUser: { name: string; email: string };
}) {
  const [active, setActive] = useState("Profile");
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
            onClick={() => setActive(item)}
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
        ) : (
          <>
            <p>
              Update your {active.toLowerCase()} configuration for the authority
              portal.
            </p>
            <label className="setting-field">
              Authority name
              <input defaultValue={sessionUser.name} />
            </label>
            <label className="setting-field">
              Email
              <input defaultValue={sessionUser.email} />
            </label>
            <button className="button primary">Save changes</button>
          </>
        )}
      </article>
    </div>
  );
}

function AddUserModal({
  zones,
  token,
  onClose,
  onSuccess,
}: {
  zones: AuthorityDashboardPayload["zones"];
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [role, setRole] = useState<"WORKER" | "AUTHORITY">("WORKER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [zone, setZone] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in full name, email, and password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!token) {
      setError("Authentication required.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      await authorityApi.createUser(token, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        zone: zone.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create user.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="overlay modal-overlay">
      <div
        className="modal workflow-modal"
        style={{
          maxWidth: 580,
          width: "92%",
          maxHeight: "88vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <button className="modal-close" onClick={onClose} disabled={pending}>
          <X size={19} />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 6,
          }}
        >
          <span className="modal-icon" style={{ margin: 0 }}>
            {role === "WORKER" ? (
              <Users size={22} />
            ) : (
              <ShieldCheck size={22} />
            )}
          </span>
          <div>
            <h2 style={{ fontSize: 18, margin: 0 }}>
              {role === "WORKER"
                ? "Provision Field Worker"
                : "Provision Authority Officer"}
            </h2>
            <p
              style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}
            >
              {role === "WORKER"
                ? "Creates credentials for mobile field worker app access."
                : "Creates credentials for authority web command center access."}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 12,
          }}
        >
          {/* Role selector pill toggle */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: 4,
              background: "var(--surface-subtle, #f5f8f5)",
              borderRadius: 10,
              border: "1px solid var(--border-color, #dce3d8)",
            }}
          >
            <button
              type="button"
              className={`button ${role === "WORKER" ? "primary" : "ghost"}`}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                justifyContent: "center",
              }}
              onClick={() => setRole("WORKER")}
            >
              <Users size={14} style={{ marginRight: 6 }} /> Field Worker
            </button>
            <button
              type="button"
              className={`button ${role === "AUTHORITY" ? "primary" : "ghost"}`}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                justifyContent: "center",
              }}
              onClick={() => setRole("AUTHORITY")}
            >
              <ShieldCheck size={14} style={{ marginRight: 6 }} /> Authority
              Officer
            </button>
          </div>

          {/* Row 1: Name & Email */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <label className="setting-field" style={{ margin: 0 }}>
              Full Name *
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  role === "WORKER" ? "Ramesh Kumar" : "Officer Sharma"
                }
              />
            </label>

            <label className="setting-field" style={{ margin: 0 }}>
              Email Address *
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  role === "WORKER" ? "worker@eclean.in" : "officer@city.gov"
                }
              />
            </label>
          </div>

          {/* Row 2: Password & Phone */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <label className="setting-field" style={{ margin: 0 }}>
              Initial Password *
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </label>

            <label className="setting-field" style={{ margin: 0 }}>
              Contact Phone (Optional)
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>
          </div>

          {/* Row 3: Zone */}
          <label className="setting-field" style={{ margin: 0 }}>
            Assigned Ward / Zone (Optional)
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g. Ward 12, Green Park"
              list="zones-datalist"
            />
            <datalist id="zones-datalist">
              {zones.map((z) => (
                <option key={z.zone} value={z.zone} />
              ))}
            </datalist>
          </label>

          {error && (
            <div
              style={{
                color: "#D64545",
                backgroundColor: "#FFF2F2",
                border: "1px solid #FFCDD2",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: 4 }}>
            <button
              type="button"
              className="button ghost"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={pending}>
              {pending
                ? "Creating..."
                : role === "WORKER"
                  ? "Create Worker Account"
                  : "Create Authority Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkerAvatar({ worker }: { worker: AuthorityWorker }) {
  const initials =
    worker.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "W";

  if (worker.profileImageUrl) {
    return (
      <img
        src={worker.profileImageUrl}
        alt={worker.name}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          objectFit: "cover",
          border: "1px solid var(--border, #DCE3D8)",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "#E8F0E5",
        color: "#2E7D4F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: 13,
      }}
      title="No official photo assigned"
    >
      {initials}
    </div>
  );
}

function WorkersPanel({
  payload,
  onAddUser,
}: {
  payload: AuthorityDashboardPayload;
  onAddUser: () => void;
}) {
  const { token } = useAuthoritySession();
  const assignImage = useAssignWorkerProfileImageMutation(token);
  const [assignError, setAssignError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingWorkerId, setPendingWorkerId] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingWorkerId) return;
    if (!file.type.startsWith("image/")) {
      setAssignError("Please choose an image file.");
      return;
    }
    setAssignError(null);
    assignImage.mutate(
      { workerId: pendingWorkerId, file },
      {
        onError: (err: Error) => {
          setAssignError(err.message || "Could not assign worker photo.");
        },
      },
    );
  };

  const startAssign = (workerId: string) => {
    setPendingWorkerId(workerId);
    fileInputRef.current?.click();
  };

  return (
    <article className="card table-card">
      <div className="card-title">
        <div>
          <h2>Field workforce</h2>
          <p>
            Availability, workload, and operational performance. Official worker
            photos are managed here — workers cannot change their own photo.
          </p>
        </div>
        <button className="button primary" onClick={onAddUser}>
          <UserPlus size={16} style={{ marginRight: 6 }} />
          Add member
        </button>
      </div>
      {assignError ? (
        <p style={{ color: "#D64545", margin: "0 0 12px", fontSize: 13 }}>
          {assignError}
        </p>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Worker</th>
              <th>Status</th>
              <th>Current zone</th>
              <th>Active assignments</th>
              <th>Completed today</th>
              <th>Specialties</th>
              <th>Photo</th>
            </tr>
          </thead>
          <tbody>
            {payload.workers.map((worker) => (
              <tr key={worker.id}>
                <td>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <WorkerAvatar worker={worker} />
                    <div>
                      <b>{worker.name}</b>
                      <small className="cell-sub">{worker.email}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <Pill tone={worker.available ? "mint" : "amber"}>
                    {worker.available ? "Available" : "Busy"}
                  </Pill>
                </td>
                <td>{worker.zone ?? "Unzoned"}</td>
                <td>{worker.activeAssignments}</td>
                <td>{worker.completedToday}</td>
                <td>
                  {worker.specialties.length
                    ? worker.specialties.join(", ")
                    : "General cleanup"}
                </td>
                <td>
                  {worker.imageAssignedBy ? (
                    <small className="cell-sub" style={{ display: "block" }}>
                      Assigned by {worker.imageAssignedBy.name}
                      {worker.imageAssignedAt
                        ? ` · ${formatRelativeTime(worker.imageAssignedAt)}`
                        : ""}
                    </small>
                  ) : (
                    <small className="cell-sub">No official photo</small>
                  )}
                  <button
                    className="button ghost"
                    style={{ padding: "4px 8px", fontSize: 12, marginTop: 4 }}
                    disabled={assignImage.isPending}
                    onClick={() => startAssign(worker.id)}
                  >
                    <ImagePlus size={14} style={{ marginRight: 4 }} />
                    {worker.image ? "Replace photo" : "Assign photo"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

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

  const payload = dashboardQuery.data;
  const reports = payload?.reports ?? [];
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
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
      return haystack.includes(query.toLowerCase()) && tabMatches;
    });
  }, [query, reports, tab]);

  const urgentReports = useMemo(
    () => reports.filter((report) => report.attention === "URGENT").slice(0, 4),
    [reports],
  );
  const reviewReports = useMemo(
    () =>
      reports
        .filter(
          (report) =>
            report.status === "CLEANUP_COMPLETED" ||
            (report.status === "RESOLVED" && !report.verification),
        )
        .slice(0, 8),
    [reports],
  );
  const disputedReports = useMemo(
    () => reports.filter((report) => report.status === "DISPUTED").slice(0, 8),
    [reports],
  );
  const openAssignments = useMemo(
    () =>
      reports.filter((report) =>
        ["ASSIGNED", "IN_PROGRESS"].includes(report.status),
      ),
    [reports],
  );

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/login");
  };

  useEffect(() => {
    if (selectedReportId && !selectedReport) {
      setDrawerOpen(false);
    }
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

  const openReport = (report: AuthorityReport) => {
    setSelectedReportId(report.id);
    setDrawerOpen(true);
  };

  const openAction = (action: ReportActionType) => {
    if (!selectedReport) return;
    setModal({ action, reportId: selectedReport.id });
    setSelectedWorkerId(
      selectedReport.cleanup?.worker?.id ??
        payload.workers.find((worker) => worker.available)?.id ??
        payload.workers[0]?.id ??
        "",
    );
    setSelectedDuplicateId(
      selectedReport.duplicateOfId ??
        reports.find(
          (report) =>
            report.id !== selectedReport.id &&
            report.zone === selectedReport.zone,
        )?.id ??
        "",
    );
    setNote("");
  };

  const submitAction = async () => {
    if (!modal) return;
    await actionMutation.mutateAsync({
      reportId: modal.reportId,
      action: modal.action,
      workerId: modal.action === "assign" ? selectedWorkerId : undefined,
      duplicateOfId:
        modal.action === "link_duplicate" ? selectedDuplicateId : undefined,
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
  };

  return (
    <main className="app-shell">
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
              <Icon size={18} />
              {label}
              {label === "Notifications" &&
              payload.notifications.some((item) => !item.isRead) ? (
                <b>
                  {payload.notifications.filter((item) => !item.isRead).length}
                </b>
              ) : null}
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
      <section className="content">
        <header className="topbar">
          <label className="global-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
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
              {payload.notifications.some((item) => !item.isRead) && <em />}
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
              <button className="button ghost">
                <Download size={16} /> Export
              </button>
              <button
                className="button ghost"
                onClick={() => router.push("/register")}
              >
                <Users size={16} /> Add authority
              </button>
              {page === "Reports" ? (
                <button
                  className="button primary"
                  onClick={() => setTab("Pending")}
                >
                  Review queue <span>{payload.metrics.reviewQueue}</span>
                </button>
              ) : null}
            </div>
          </div>

          <MetricGrid payload={payload} />

          {page === "Overview" ? (
            <>
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
          ) : null}

          {page === "Reports" ? (
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
              />
            </>
          ) : null}

          {page === "Map & Locations" ? (
            <MapCommandCenter
              payload={payload}
              onOpen={openReport}
              token={token}
            />
          ) : null}
          {page === "Assignments" ? (
            <ReportTable
              title="Cleanup assignments"
              subtitle="Track work currently waiting on worker dispatch or escalation."
              reports={openAssignments}
              onOpen={openReport}
              onAction={openReport}
              emptyLabel="No assignments are waiting right now."
            />
          ) : null}
          {page === "Workers" ? (
            <WorkersPanel
              payload={payload}
              onAddUser={() => setAddUserOpen(true)}
            />
          ) : null}
          {page === "Verification" ? (
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
          ) : null}
          {page === "Disputes" ? (
            <ReportTable
              title="Citizen disputes"
              subtitle="Open disputes that need evidence review or re-dispatch."
              reports={disputedReports}
              onOpen={openReport}
              onAction={(report) => {
                openReport(report);
                setModal({ action: "mark_disputed", reportId: report.id });
              }}
              emptyLabel="No citizens have disputed a cleanup yet."
            />
          ) : null}
          {page === "Analytics" ? (
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
          ) : null}
          {page === "Notifications" ? (
            <NotificationsPanel payload={payload} onOpen={openReport} />
          ) : null}
          {page === "Settings" ? (
            <SettingsPanel
              sessionUser={{
                name: session.user.name,
                email: session.user.email,
              }}
            />
          ) : null}
        </div>
      </section>
      {drawerOpen && selectedReport ? (
        <ReportDrawer
          report={selectedReport}
          onClose={() => setDrawerOpen(false)}
          onOpenAction={(action) =>
            setModal({ action, reportId: selectedReport.id })
          }
        />
      ) : null}
      {modal && selectedReport ? (
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
      ) : null}
      {addUserOpen ? (
        <AddUserModal
          zones={payload.zones}
          token={token}
          onClose={() => setAddUserOpen(false)}
          onSuccess={() => {
            setAddUserOpen(false);
            dashboardQuery.refetch();
          }}
        />
      ) : null}
    </main>
  );
}
