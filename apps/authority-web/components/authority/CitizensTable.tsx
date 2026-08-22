"use client";

import { useState } from "react";
import { Search, ShieldBan, ShieldCheck, UserCheck, RotateCcw, FileText, MoreVertical } from "lucide-react";
import { authorityApi, AuthorityApiError } from "./api";
import { useCitizensQuery } from "./hooks";
import { formatCompactDate } from "./shared";

type Citizen = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isActive: boolean;
  points: number;
  wrongReportsCount: number;
  blockedAt: string | null;
  blockedReason: string | null;
  createdAt: string;
  reportCount: number;
};

function StatusBadge({ citizen }: { citizen: Citizen }) {
  if (!citizen.isActive) {
    return (
      <span className="pill red" title={citizen.blockedReason ?? undefined}>
        Blocked
      </span>
    );
  }
  if (citizen.wrongReportsCount >= 3) {
    return <span className="pill amber">At risk</span>;
  }
  return <span className="pill mint">Active</span>;
}

function CitizenAvatar({ citizen }: { citizen: Citizen }) {
  const initials =
    citizen.name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "C";

  if (citizen.image) {
    return (
      <img
        src={citizen.image.startsWith("http") ? citizen.image : `https://d2w3a7ppii0a0i.cloudfront.net/${citizen.image}`}
        alt={citizen.name}
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
    >
      {initials}
    </div>
  );
}

export function CitizensTable({
  token,
  initialStatusFilter = "ALL",
  onViewReports,
}: {
  token: string | null;
  initialStatusFilter?: "ALL" | "ACTIVE" | "BLOCKED";
  onViewReports?: (citizenId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "BLOCKED">(initialStatusFilter);
  const [page, setPage] = useState(1);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Debounce search
  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout((handleSearch as any)._timer);
    (handleSearch as any)._timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  };

  const citizensQuery = useCitizensQuery(token, {
    page,
    limit: 100,
    search: debouncedSearch,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleBlock = async (citizen: Citizen) => {
    if (!token) return;
    const action = citizen.isActive ? "block" : "unblock";
    let reason: string | undefined;
    if (action === "block") {
      const input = window.prompt(
        `Block "${citizen.name}"? Enter a reason (or leave blank for default):`,
      );
      if (input === null) return;
      reason = input.trim() || undefined;
    }
    setActioningId(citizen.id);
    setActionError(null);
    try {
      await authorityApi.setCitizenAction(token, citizen.id, action, reason);
      await citizensQuery.refetch();
      showToast(action === "block" ? `Blocked ${citizen.name}` : `Restored ${citizen.name}`);
    } catch (err) {
      setActionError(
        err instanceof AuthorityApiError
          ? err.message
          : "Failed to update citizen status.",
      );
    } finally {
      setActioningId(null);
    }
  };

  const handleResetWrongReports = async (citizen: Citizen) => {
    if (!token) return;
    if (!window.confirm(`Reset wrong reports count for "${citizen.name}" to 0?`)) return;
    setActioningId(citizen.id);
    setActionError(null);
    try {
      await authorityApi.setCitizenAction(token, citizen.id, "reset_wrong_reports");
      await citizensQuery.refetch();
      showToast(`Reset wrong report count for ${citizen.name}`);
    } catch (err) {
      setActionError(
        err instanceof AuthorityApiError
          ? err.message
          : "Failed to reset wrong report count.",
      );
    } finally {
      setActioningId(null);
    }
  };

  const rawData = citizensQuery.data;
  let citizens: Citizen[] = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);

  if (statusFilter === "ACTIVE") {
    citizens = citizens.filter((c) => c.isActive);
  } else if (statusFilter === "BLOCKED") {
    citizens = citizens.filter((c) => !c.isActive);
  }

  const pagination = rawData?.pagination;

  return (
    <article className="card table-card">
      <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Citizens</h2>
          <p>
            Registered citizen accounts — points, report history, and moderation status.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Status filter buttons */}
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
          </div>

          <label
            className="global-search"
            style={{ width: 240, margin: 0, fontSize: 13 }}
          >
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or email…"
            />
          </label>
        </div>
      </div>

      {toastMessage && (
        <div style={{ background: "#E8F0E5", color: "#2E7D4F", padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>
          {toastMessage}
        </div>
      )}

      {actionError && (
        <p style={{ color: "#D64545", margin: "0 0 12px", fontSize: 13 }}>
          {actionError}
        </p>
      )}

      {citizensQuery.isPending ? (
        <div className="empty-hint">
          <span>Loading citizens…</span>
        </div>
      ) : citizens.length === 0 ? (
        <div className="empty-hint">
          <span>No citizens match your search or filter.</span>
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Citizen</th>
                  <th>Points</th>
                  <th>Reports</th>
                  <th>Wrong reports</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {citizens.map((citizen) => (
                  <tr key={citizen.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <CitizenAvatar citizen={citizen} />
                        <div>
                          <b>{citizen.name}</b>
                          <small className="cell-sub">{citizen.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <b style={{ color: "var(--green)" }}>{citizen.points}</b>
                    </td>
                    <td>
                      {onViewReports ? (
                        <button
                          className="text-link"
                          onClick={() => onViewReports(citizen.id)}
                          title="View citizen reports"
                          style={{ fontSize: 13, cursor: "pointer", background: "none", border: "none", padding: 0 }}
                        >
                          {citizen.reportCount} reports
                        </button>
                      ) : (
                        <span>{citizen.reportCount}</span>
                      )}
                    </td>
                    <td>
                      {citizen.wrongReportsCount > 0 ? (
                        <span style={{ color: "var(--red)", fontWeight: 600 }}>
                          {citizen.wrongReportsCount}
                        </span>
                      ) : (
                        citizen.wrongReportsCount
                      )}
                    </td>
                    <td>
                      <StatusBadge citizen={citizen} />
                      {citizen.blockedAt && (
                        <small className="cell-sub" title={citizen.blockedReason ?? undefined}>
                          {formatCompactDate(citizen.blockedAt)}
                        </small>
                      )}
                    </td>
                    <td>
                      <small>{formatCompactDate(citizen.createdAt)}</small>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          className={`button ${citizen.isActive ? "ghost" : "primary"}`}
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          disabled={actioningId === citizen.id}
                          onClick={() => handleToggleBlock(citizen)}
                          title={citizen.isActive ? "Block this citizen" : "Restore access"}
                        >
                          {citizen.isActive ? (
                            <>
                              <ShieldBan size={13} style={{ marginRight: 4 }} />
                              {actioningId === citizen.id ? "…" : "Block"}
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={13} style={{ marginRight: 4 }} />
                              {actioningId === citizen.id ? "…" : "Unblock"}
                            </>
                          )}
                        </button>
                        {citizen.wrongReportsCount > 0 && (
                          <button
                            className="button ghost"
                            style={{ padding: "4px 8px", fontSize: 12 }}
                            disabled={actioningId === citizen.id}
                            onClick={() => handleResetWrongReports(citizen)}
                            title="Reset wrong reports count to 0"
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

          {pagination && pagination.pages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 12,
                fontSize: 13,
              }}
            >
              <button
                className="button ghost"
                style={{ padding: "4px 10px" }}
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>
              <span style={{ color: "var(--muted)" }}>
                Page {pagination.page} of {pagination.pages} &nbsp;·&nbsp;{" "}
                {pagination.total} citizens
              </span>
              <button
                className="button ghost"
                style={{ padding: "4px 10px" }}
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

export default function CitizensPage({ token }: { token: string | null }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <UserCheck size={22} style={{ color: "var(--green)", flexShrink: 0 }} />
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
            Moderation
          </p>
          <h2 style={{ margin: 0, fontSize: 18 }}>Citizen accounts</h2>
        </div>
      </div>
      <CitizensTable token={token} />
    </div>
  );
}
