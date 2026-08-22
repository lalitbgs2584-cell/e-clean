"use client";

import { useRef, useState } from "react";
import { ImagePlus, UserPlus, ShieldBan, ShieldCheck, RotateCcw, AlertTriangle, Search } from "lucide-react";
import { useAssignWorkerProfileImageMutation, useWorkersQuery, useAuthoritySession } from "./hooks";
import { authorityApi, AuthorityApiError } from "./api";
import { formatCompactDate, formatRelativeTime } from "./shared";
import type { AuthorityWorker } from "./shared";

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
          flexShrink: 0,
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
        flexShrink: 0,
      }}
      title="No official photo assigned"
    >
      {initials}
    </div>
  );
}

function WorkerStatusBadge({ worker }: { worker: AuthorityWorker }) {
  if (!worker.isActive) {
    return (
      <span className="pill red" title={worker.blockedReason ?? undefined}>
        Blocked
      </span>
    );
  }
  if ((worker.workerStrikeCount ?? 0) >= 3) {
    return <span className="pill red">3 Strikes</span>;
  }
  if ((worker.workerStrikeCount ?? 0) > 0) {
    return <span className="pill amber">{worker.workerStrikeCount} Strike{worker.workerStrikeCount! > 1 ? "s" : ""}</span>;
  }
  if (!worker.available) {
    return <span className="pill amber">Busy</span>;
  }
  return <span className="pill mint">Active</span>;
}

export function WorkersTable({
  onAddUser,
  initialStatusFilter = "ALL",
}: {
  onAddUser: () => void;
  initialStatusFilter?: "ALL" | "ACTIVE" | "BLOCKED" | "STRIKED";
}) {
  const { token } = useAuthoritySession();
  const workersQuery = useWorkersQuery(token);
  const assignImage = useAssignWorkerProfileImageMutation(token);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "BLOCKED" | "STRIKED">(initialStatusFilter);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingWorkerId, setPendingWorkerId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
        onSuccess: () => {
          workersQuery.refetch();
          showToast("Profile photo updated");
        },
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

  const handleToggleBlock = async (worker: AuthorityWorker) => {
    if (!token) return;
    const action = worker.isActive ? "block" : "unblock";
    let reason: string | undefined;
    if (action === "block") {
      const input = window.prompt(
        `Block worker "${worker.name}"? Enter a reason (or leave blank for default):`,
      );
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    setActioningId(worker.id);
    setActionError(null);
    try {
      await authorityApi.setWorkerAction(token, worker.id, action, reason);
      await workersQuery.refetch();
      showToast(action === "block" ? `Blocked worker ${worker.name}` : `Restored worker ${worker.name}`);
    } catch (err) {
      setActionError(
        err instanceof AuthorityApiError
          ? err.message
          : "Failed to update worker status.",
      );
    } finally {
      setActioningId(null);
    }
  };

  const handleResetStrikes = async (worker: AuthorityWorker) => {
    if (!token) return;
    if (!window.confirm(`Reset strike count for worker "${worker.name}" to 0?`)) return;
    setActioningId(worker.id);
    setActionError(null);
    try {
      await authorityApi.setWorkerAction(token, worker.id, "reset_strikes");
      await workersQuery.refetch();
      showToast(`Reset strikes for worker ${worker.name}`);
    } catch (err) {
      setActionError(
        err instanceof AuthorityApiError
          ? err.message
          : "Failed to reset worker strikes.",
      );
    } finally {
      setActioningId(null);
    }
  };

  const rawData = workersQuery.data;
  const rawWorkers: AuthorityWorker[] = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);
  let workers = rawWorkers.filter((w) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q) || (w.zone && w.zone.toLowerCase().includes(q));
  });

  if (statusFilter === "ACTIVE") {
    workers = workers.filter((w) => w.isActive && (w.workerStrikeCount ?? 0) === 0);
  } else if (statusFilter === "BLOCKED") {
    workers = workers.filter((w) => !w.isActive);
  } else if (statusFilter === "STRIKED") {
    workers = workers.filter((w) => (w.workerStrikeCount ?? 0) > 0);
  }

  return (
    <article className="card table-card">
      <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Field workforce</h2>
          <p>
            Availability, workload, strike tracking, and operational moderation. Official photos are managed here.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Status filter tabs */}
          <div className="tab-bar" style={{ marginBottom: 0, padding: 2 }}>
            <button
              className={statusFilter === "ALL" ? "active" : ""}
              onClick={() => setStatusFilter("ALL")}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              All
            </button>
            <button
              className={statusFilter === "ACTIVE" ? "active" : ""}
              onClick={() => setStatusFilter("ACTIVE")}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              Active
            </button>
            <button
              className={statusFilter === "BLOCKED" ? "active" : ""}
              onClick={() => setStatusFilter("BLOCKED")}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              Blocked
            </button>
            <button
              className={statusFilter === "STRIKED" ? "active" : ""}
              onClick={() => setStatusFilter("STRIKED")}
              style={{ padding: "4px 10px", fontSize: 12 }}
            >
              Striked
            </button>
          </div>

          <label
            className="global-search"
            style={{ width: 220, margin: 0, fontSize: 13 }}
          >
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workers…"
            />
          </label>

          <button className="button primary" onClick={onAddUser} style={{ padding: "6px 12px" }}>
            <UserPlus size={16} style={{ marginRight: 6 }} />
            Add member
          </button>
        </div>
      </div>

      {toastMessage && (
        <div style={{ background: "#E8F0E5", color: "#2E7D4F", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
          {toastMessage}
        </div>
      )}

      {assignError && (
        <p style={{ color: "#D64545", margin: "0 0 12px", fontSize: 13 }}>
          {assignError}
        </p>
      )}

      {actionError && (
        <p style={{ color: "#D64545", margin: "0 0 12px", fontSize: 13 }}>
          {actionError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFile}
      />

      {workersQuery.isPending ? (
        <div className="empty-hint">
          <span>Loading workers…</span>
        </div>
      ) : workers.length === 0 ? (
        <div className="empty-hint">
          <span>No workers match your search or filter.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Status</th>
                <th>Current zone</th>
                <th>Active tasks</th>
                <th>Completed</th>
                <th>Strikes</th>
                <th>Photo</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <WorkerAvatar worker={worker} />
                      <div>
                        <b>{worker.name}</b>
                        <small className="cell-sub">{worker.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <WorkerStatusBadge worker={worker} />
                    {worker.blockedAt && (
                      <small className="cell-sub" title={worker.blockedReason ?? undefined}>
                        {formatCompactDate(worker.blockedAt)}
                      </small>
                    )}
                  </td>
                  <td>{worker.zone ?? "Unzoned"}</td>
                  <td>
                    <b style={{ color: worker.activeAssignments > 0 ? "var(--green)" : "var(--muted)" }}>
                      {worker.activeAssignments}
                    </b>
                  </td>
                  <td>{worker.completedCount ?? worker.completedToday}</td>
                  <td>
                    {(worker.workerStrikeCount ?? 0) > 0 ? (
                      <span style={{ color: "var(--red)", fontWeight: 600 }}>
                        {worker.workerStrikeCount}
                      </span>
                    ) : (
                      0
                    )}
                  </td>
                  <td>
                    {worker.imageAssignedBy ? (
                      <small className="cell-sub" style={{ display: "block" }}>
                        By {worker.imageAssignedBy.name}
                        {worker.imageAssignedAt
                          ? ` · ${formatRelativeTime(worker.imageAssignedAt)}`
                          : ""}
                      </small>
                    ) : (
                      <small className="cell-sub">No official photo</small>
                    )}
                    <button
                      className="button ghost"
                      style={{ padding: "2px 6px", fontSize: 11, marginTop: 4 }}
                      disabled={assignImage.isPending}
                      onClick={() => startAssign(worker.id)}
                    >
                      <ImagePlus size={12} style={{ marginRight: 4 }} />
                      {worker.image ? "Replace" : "Assign"}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        className={`button ${worker.isActive ? "ghost" : "primary"}`}
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        disabled={actioningId === worker.id}
                        onClick={() => handleToggleBlock(worker)}
                        title={worker.isActive ? "Block this worker" : "Restore access"}
                      >
                        {worker.isActive ? (
                          <>
                            <ShieldBan size={13} style={{ marginRight: 4 }} />
                            {actioningId === worker.id ? "…" : "Block"}
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={13} style={{ marginRight: 4 }} />
                            {actioningId === worker.id ? "…" : "Unblock"}
                          </>
                        )}
                      </button>
                      {(worker.workerStrikeCount ?? 0) > 0 && (
                        <button
                          className="button ghost"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          disabled={actioningId === worker.id}
                          onClick={() => handleResetStrikes(worker)}
                          title="Reset worker strikes to 0"
                        >
                          <RotateCcw size={13} style={{ marginRight: 4 }} />
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}
