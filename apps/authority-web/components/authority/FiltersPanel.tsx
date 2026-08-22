"use client";

import { X } from "lucide-react";
import type { AuthorityDashboardPayload, AuthorityWorker } from "./shared";

export type ReportFilters = {
  zone: string;
  category: string;
  status: string;
  attention: string;
  workerId: string;
  from: string;
  to: string;
};

export const EMPTY_FILTERS: ReportFilters = {
  zone: "",
  category: "",
  status: "",
  attention: "",
  workerId: "",
  from: "",
  to: "",
};

const WASTE_CATEGORIES = [
  "Garbage",
  "Recyclable",
  "Hazardous",
  "Organic",
  "Construction",
  "Electronic",
  "Medical",
  "Mixed",
];

const REPORT_STATUSES = [
  "PENDING",
  "AI_ASSESSED",
  "ASSIGNED",
  "IN_PROGRESS",
  "CLEANUP_COMPLETED",
  "RESOLVED",
  "VERIFIED",
  "DISPUTED",
  "CANCELLED",
];

interface FiltersPanelProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  onClose: () => void;
  zones: AuthorityDashboardPayload["zones"];
  workers: AuthorityWorker[];
}

export function FiltersPanel({
  filters,
  onChange,
  onClose,
  zones,
  workers,
}: FiltersPanelProps) {
  const set = (key: keyof ReportFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  const activeCount = Object.values(filters).filter(Boolean).length;

  const reset = () => onChange(EMPTY_FILTERS);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 400,
          background: "rgba(0,0,0,0.22)",
        }}
      />

      {/* Panel */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
          background: "var(--surface, #fff)",
          borderLeft: "1px solid var(--border, #DCE3D8)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
          zIndex: 401,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid var(--border, #DCE3D8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              Filters
              {activeCount > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "var(--green)",
                    color: "#fff",
                    borderRadius: 99,
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {activeCount}
                </span>
              )}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--muted)" }}>
              All filters compose with AND logic
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "var(--muted)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable fields */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Zone */}
          <label className="setting-field" style={{ margin: 0 }}>
            Zone
            <select
              className="select"
              value={filters.zone}
              onChange={(e) => set("zone", e.target.value)}
            >
              <option value="">All zones</option>
              {zones.map((z) => (
                <option key={z.zone} value={z.zone}>
                  {z.zone} ({z.openReports} open)
                </option>
              ))}
            </select>
          </label>

          {/* Waste category */}
          <label className="setting-field" style={{ margin: 0 }}>
            Waste category
            <select
              className="select"
              value={filters.category}
              onChange={(e) => set("category", e.target.value)}
            >
              <option value="">All categories</option>
              {WASTE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          {/* Status */}
          <label className="setting-field" style={{ margin: 0 }}>
            Status
            <select
              className="select"
              value={filters.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {REPORT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          {/* Priority / attention */}
          <label className="setting-field" style={{ margin: 0 }}>
            Priority
            <select
              className="select"
              value={filters.attention}
              onChange={(e) => set("attention", e.target.value)}
            >
              <option value="">All priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="NORMAL">Normal</option>
            </select>
          </label>

          {/* Assigned worker */}
          <label className="setting-field" style={{ margin: 0 }}>
            Assigned worker
            <select
              className="select"
              value={filters.workerId}
              onChange={(e) => set("workerId", e.target.value)}
            >
              <option value="">Any worker</option>
              <option value="__none__">Unassigned</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.zone ? ` (${w.zone})` : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Date range */}
          <div>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              Date range
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label className="setting-field" style={{ margin: 0 }}>
                From
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => set("from", e.target.value)}
                />
              </label>
              <label className="setting-field" style={{ margin: 0 }}>
                To
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => set("to", e.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border, #DCE3D8)",
            display: "flex",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            className="button ghost"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={reset}
            disabled={activeCount === 0}
          >
            Reset all
          </button>
          <button
            className="button primary"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={onClose}
          >
            Apply
          </button>
        </div>
      </aside>
    </>
  );
}
