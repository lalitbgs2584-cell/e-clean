import { useSyncExternalStore } from 'react';

export type LittererReportType = 'Litterer' | 'IllegalDumping';
export type LittererGender = 'Male' | 'Female' | 'Others';
export type LittererStatus = 'Submitted' | 'In Progress' | 'Resolved';

export interface LittererReport {
  id: string;
  type: LittererReportType;
  location: string;
  date: string;
  time: string;
  approxTime: string;
  description: string;
  photos: string[];
  littererGender?: LittererGender | 'Prefer not to say';
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
  gender?: LittererGender | 'Prefer not to say';
  approxAge?: string;
  clothing?: string;
}

interface LittererState {
  reports: LittererReport[];
  draft: DraftLittererReport;
}

let state: LittererState = {
  draft: {},
  reports: [
    {
      id: '#LR78542',
      type: 'Litterer',
      location: 'Sector 21, Rourkela, Odisha 769004',
      date: '14 May 2025',
      time: '09:41 AM',
      approxTime: '09:30 AM',
      description: '',
      photos: ['https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=300&q=80'],
      littererGender: 'Male',
      littererAge: '20–30 years',
      impactType: 'On Road',
      status: 'Submitted',
      submittedDate: '14 May 2025',
      submittedTime: '09:41 AM',
    },
    {
      id: '#LR78211',
      type: 'Litterer',
      location: 'Park / Garden',
      date: '12 May 2025',
      time: '04:25 PM',
      approxTime: '04:15 PM',
      description: '',
      photos: ['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=300&q=80'],
      impactType: 'Park / Garden',
      status: 'In Progress',
      submittedDate: '12 May 2025',
      submittedTime: '04:25 PM',
    },
    {
      id: '#LR79990',
      type: 'IllegalDumping',
      location: 'Public Place',
      date: '10 May 2025',
      time: '11:15 AM',
      approxTime: '11:00 AM',
      description: '',
      photos: ['https://images.unsplash.com/photo-1604186837056-8e7c286756f2?auto=format&fit=crop&w=300&q=80'],
      impactType: 'Public Place',
      status: 'Resolved',
      submittedDate: '10 May 2025',
      submittedTime: '11:15 AM',
    },
    {
      id: '#LR77663',
      type: 'Litterer',
      location: 'Near Waterbody',
      date: '08 May 2025',
      time: '06:40 PM',
      approxTime: '06:30 PM',
      description: '',
      photos: ['https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=300&q=80'],
      impactType: 'Near Waterbody',
      status: 'In Progress',
      submittedDate: '08 May 2025',
      submittedTime: '06:40 PM',
    },
  ],
};

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
        type: draft.type || 'Litterer',
        location: draft.location || 'Sector 21, Rourkela',
        date: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        approxTime: draft.approxTime || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        description: draft.description || '',
        photos: draft.photos || [],
        littererGender: draft.gender,
        littererAge: draft.approxAge,
        littererClothing: draft.clothing,
        impactType: 'On Road',
        status: 'Submitted',
        submittedDate: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        submittedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
