import { useSyncExternalStore } from 'react';

export type WasteCategory =
  | 'Mixed Waste'
  | 'Plastic / Packaging'
  | 'Organic / Food Waste'
  | 'Hazardous / Chemical'
  | 'Construction Debris'
  | 'Electronic Waste';

export type ReportStatus =
  | 'Reported'
  | 'Under Review'
  | 'Assigned to Team'
  | 'In Progress'
  | 'Resolved';

export interface TimelineStep {
  title: string;
  date?: string;
  time?: string;
  isDone: boolean;
  isCurrent: boolean;
}

export interface Report {
  id: string;
  wasteType: WasteCategory;
  description: string;
  location: string;
  sector: string;
  status: ReportStatus;
  photos: string[];
  reportedDate: string;
  reportedTime: string;
  aiClassification?: string;
  volumeEstimate?: string;
  timeline: TimelineStep[];
  feedback?: {
    rating: number;
    text: string;
  };
}

export interface DraftReport {
  wasteType?: WasteCategory;
  description?: string;
  photos?: string[];
  location?: string;
  lat?: number;
  lng?: number;
}

export interface Notification {
  id: string;
  type: 'reward' | 'alert' | string;
  title: string;
  date: string;
  time: string;
  isRead: boolean;
}

export interface UserProfile {
  name: string;
  email?: string;
  phone: string;
  sector: string;
  avatarUrl: string;
}

interface CitizenState {
  profile: UserProfile;
  reports: Report[];
  draftReport: DraftReport;
  notifications: Notification[];
}

let state: CitizenState = {
  profile: {
    name: '',
    email: undefined,
    phone: '',
    sector: '',
    avatarUrl: '',
  },
  draftReport: {},
  notifications: [
    {
      id: '1',
      type: 'alert',
      title: 'Report #1035 status updated to In Progress',
      date: '12 May',
      time: '02:30 PM',
      isRead: false,
    },
    {
      id: '2',
      type: 'reward',
      title: 'You earned 50 Eco-Points for Report #1034!',
      date: '10 May',
      time: '04:15 PM',
      isRead: false,
    },
    {
      id: '3',
      type: 'alert',
      title: 'Report #1034 has been resolved by Municipal Team',
      date: '10 May',
      time: '04:10 PM',
      isRead: true,
    },
  ],
  reports: [
    {
      id: '#1035',
      wasteType: 'Mixed Waste',
      description: 'Garbage dumped on roadside near the park.',
      location: 'Sector 21, Rourkela, Odisha',
      sector: 'Sector 21',
      status: 'In Progress',
      photos: [
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=300&q=80',
      ],
      reportedDate: '12 May',
      reportedTime: '10:30 AM',
      aiClassification: 'Mixed Solid Waste (92% Confidence)',
      volumeEstimate: 'Approx. 3.2 m³ • Moderate Hazard',
      timeline: [
        { title: 'Reported', date: '12 May', time: '10:30 AM', isDone: true, isCurrent: false },
        { title: 'Under Review', date: '12 May', time: '11:15 AM', isDone: true, isCurrent: false },
        { title: 'Assigned to Team', date: '12 May', time: '01:40 PM', isDone: true, isCurrent: false },
        { title: 'In Progress', date: '12 May', time: '02:30 PM', isDone: true, isCurrent: true },
        { title: 'Resolved', isDone: false, isCurrent: false },
      ],
    },
    {
      id: '#1034',
      wasteType: 'Plastic / Packaging',
      description: 'Plastic bottles and bags overflowing near market area.',
      location: 'Sector 7, Rourkela, Odisha',
      sector: 'Sector 7',
      status: 'Resolved',
      photos: [
        'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=300&q=80',
      ],
      reportedDate: '10 May',
      reportedTime: '09:15 AM',
      aiClassification: 'Plastic Non-Biodegradable (96% Confidence)',
      volumeEstimate: 'Approx. 1.8 m³ • Low Hazard',
      timeline: [
        { title: 'Reported', date: '10 May', time: '09:15 AM', isDone: true, isCurrent: false },
        { title: 'Under Review', date: '10 May', time: '10:00 AM', isDone: true, isCurrent: false },
        { title: 'Assigned to Team', date: '10 May', time: '11:30 AM', isDone: true, isCurrent: false },
        { title: 'In Progress', date: '10 May', time: '01:00 PM', isDone: true, isCurrent: false },
        { title: 'Resolved', date: '10 May', time: '04:10 PM', isDone: true, isCurrent: true },
      ],
      feedback: {
        rating: 5,
        text: 'Great work! Area is now clean.',
      },
    },
    {
      id: '#1033',
      wasteType: 'Construction Debris',
      description: 'Broken concrete blocks left on pavement.',
      location: 'Main Road, Sector 5, Rourkela',
      sector: 'Sector 5',
      status: 'Resolved',
      photos: [
        'https://images.unsplash.com/photo-1604186837056-8e7c286756f2?auto=format&fit=crop&w=300&q=80',
      ],
      reportedDate: '05 May',
      reportedTime: '11:00 AM',
      timeline: [
        { title: 'Reported', date: '05 May', time: '11:00 AM', isDone: true, isCurrent: false },
        { title: 'Resolved', date: '06 May', time: '03:00 PM', isDone: true, isCurrent: true },
      ],
    },
  ],
};

const listeners = new Set<() => void>();

function setState(updater: (prev: CitizenState) => CitizenState) {
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

export function useCitizenStore() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...current,
    setProfile: (profile: Partial<UserProfile>) => {
      setState((prev) => ({
        ...prev,
        profile: { ...prev.profile, ...profile },
      }));
    },
    updateDraftReport: (draft: Partial<DraftReport>) => {
      setState((prev) => ({
        ...prev,
        draftReport: { ...prev.draftReport, ...draft },
      }));
    },
    createNewReport: (data: {
      wasteType: WasteCategory;
      description: string;
      photos: string[];
      location: string;
    }): Report => {
      const newId = `#${Math.floor(1036 + Math.random() * 1000)}`;
      const newReport: Report = {
        id: newId,
        wasteType: data.wasteType,
        description: data.description,
        location: data.location,
        sector: data.location.split(',')[0] || 'Sector 21',
        status: 'Reported',
        photos: data.photos,
        reportedDate: 'Today',
        reportedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aiClassification: `${data.wasteType} (AI Assessed)`,
        volumeEstimate: 'Approx. 2.0 m³',
        timeline: [
          { title: 'Reported', date: 'Today', time: 'Just now', isDone: true, isCurrent: true },
          { title: 'Under Review', isDone: false, isCurrent: false },
          { title: 'Assigned to Team', isDone: false, isCurrent: false },
          { title: 'In Progress', isDone: false, isCurrent: false },
          { title: 'Resolved', isDone: false, isCurrent: false },
        ],
      };
      setState((prev) => ({
        ...prev,
        reports: [newReport, ...prev.reports],
        draftReport: {},
      }));
      return newReport;
    },
    getReportById: (id: string): Report | undefined => {
      return state.reports.find((r) => r.id === id);
    },
    markAllNotificationsRead: () => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    },
    submitFeedback: (reportId: string, rating: number, text: string) => {
      setState((prev) => ({
        ...prev,
        reports: prev.reports.map((r) =>
          r.id === reportId ? { ...r, feedback: { rating, text } } : r
        ),
      }));
    },
  };
}
