import { Report, WasteCategory } from '@/store/citizen-store';

export interface SubmitReportPayload {
  photos: string[];
  location: string;
  latitude?: number;
  longitude?: number;
  wasteType: WasteCategory;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  isRecurring?: boolean;
  duplicateResolution?: 'new_issue' | 'reported_anyway' | 'followed_existing';
}

export interface SubmitReportResult {
  success: boolean;
  reportId: string;
  report: Report;
  message: string;
}

/**
 * Service abstraction for submitting waste reports to backend API.
 */
export const reportService = {
  async submitReport(payload: SubmitReportPayload): Promise<SubmitReportResult> {
    // Simulate brief network dispatch
    await new Promise((resolve) => setTimeout(resolve, 500));

    const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '-');
    const randomSuffix = String(Math.floor(1 + Math.random() * 9999)).padStart(4, '0');
    const reportId = `#ECLN-${todayStr}-${randomSuffix}`;

    const report: Report = {
      id: reportId,
      wasteType: payload.wasteType,
      description: payload.description,
      location: payload.location,
      sector: payload.location.split(',')[0]?.trim() || 'Green Park',
      status: 'Reported',
      photos: payload.photos,
      reportedDate: 'Today',
      reportedTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      aiClassification: `${payload.wasteType} (AI Assessed • ${payload.severity} Severity)`,
      volumeEstimate: 'Approx. 2.0 m³',
      timeline: [
        {
          title: 'Reported',
          date: 'Today',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isDone: true,
          isCurrent: true,
        },
        { title: 'AI Assessed', isDone: false, isCurrent: false },
        { title: 'Assigned to Team', isDone: false, isCurrent: false },
        { title: 'In Progress', isDone: false, isCurrent: false },
        { title: 'Resolved', isDone: false, isCurrent: false },
      ],
    };

    return {
      success: true,
      reportId,
      report,
      message: 'Report submitted successfully.',
    };
  },
};
