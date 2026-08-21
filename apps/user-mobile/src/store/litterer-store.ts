import { useSyncExternalStore } from "react";

export type LittererReportType = "Litterer" | "IllegalDumping";
export type LittererGender = "Male" | "Female" | "Others";
export type LittererStatus = "Submitted" | "In Progress" | "Resolved";

export interface LittererReport {
  id: string;
  type: LittererReportType;
  location: string;
  date: string;
  time: string;
  approxTime: string;
  description: string;
  photos: string[];
  littererGender?: LittererGender | "Prefer not to say";
  littererAge?: string;
  littererClothing?: string;
  impactType: string;
  status: LittererStatus;
  submittedDate: string;
  submittedTime: string;
}

export interface DraftLittererReport {
  type?: LittererReportType;
  location?: string;
  date?: string;
  time?: string;
  approxTime?: string;
  description?: string;
  photos?: string[];
  gender?: LittererGender | "Prefer not to say";
  approxAge?: string;
  clothing?: string;
  latitude?: number;
  longitude?: number;
}

interface LittererState {
  reports: LittererReport[];
  draft: DraftLittererReport;
}

let state: LittererState = { draft: {}, reports: [] };

const listeners = new Set<() => void>();

function setState(updater: (prev: LittererState) => LittererState) {
  state = updater(state);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useLittererStore() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...current,

    updateDraft: (patch: Partial<DraftLittererReport>) => {
      setState((prev) => ({ ...prev, draft: { ...prev.draft, ...patch } }));
    },

    clearDraft: () => {
      setState((prev) => ({ ...prev, draft: {} }));
    },

    createReport: (draft: DraftLittererReport): LittererReport => {
      const newId = `#LR${Math.floor(70000 + Math.random() * 20000)}`;
      const now = new Date();
      const newReport: LittererReport = {
        id: newId,
        type: draft.type || "Litterer",
        location: draft.location || "Sector 21, Rourkela",
        date: now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        time: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        approxTime:
          draft.approxTime ||
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        description: draft.description || "",
        photos: draft.photos || [],
        littererGender: draft.gender,
        littererAge: draft.approxAge,
        littererClothing: draft.clothing,
        impactType: "On Road",
        status: "Submitted",
        submittedDate: now.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        submittedTime: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setState((prev) => ({
        ...prev,
        reports: [newReport, ...prev.reports],
        draft: {},
      }));
      return newReport;
    },

    getReportById: (id: string): LittererReport | undefined => {
      return state.reports.find((r) => r.id === id);
    },
  };
}
