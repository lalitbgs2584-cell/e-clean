import { useState, useCallback } from 'react';
import { WasteCategory } from '@/store/citizen-store';

export type ReportStep = 1 | 2 | 3 | 4 | 5;

export interface ReportDraftState {
  photos: string[];
  location: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  wasteType: WasteCategory;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  isRecurring: boolean;
  duplicateChoice: 'none' | 'same_issue' | 'different_issue';
  duplicateSimulated: boolean; // toggle to test both "Found duplicate" and "No duplicate"
}

const INITIAL_DRAFT: ReportDraftState = {
  photos: [],
  location: 'Green Park, Near Main Road',
  formattedAddress: 'Green Park, Near Main Road\nBhubaneswar, Odisha 751014',
  latitude: 20.2961,
  longitude: 85.8245,
  accuracyMeters: 10,
  wasteType: 'Mixed Waste',
  severity: 'High',
  description: 'Garbage piled up near the corner of Green Park, causing bad smell and inconvenience.',
  isRecurring: true,
  duplicateChoice: 'none',
  duplicateSimulated: false,
};

export function useReportDraft() {
  const [step, setStep] = useState<ReportStep>(1);
  const [draft, setDraft] = useState<ReportDraftState>(INITIAL_DRAFT);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  const updateDraft = useCallback((updates: Partial<ReportDraftState>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const addPhoto = useCallback((uri: string) => {
    setDraft((prev) => {
      if (prev.photos.length >= 2) return prev;
      return { ...prev, photos: [...prev.photos, uri] };
    });
  }, []);

  const removePhoto = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(INITIAL_DRAFT);
    setStep(1);
    setSubmittedReportId(null);
  }, []);

  const goToStep = useCallback((newStep: ReportStep) => {
    setStep(newStep);
  }, []);

  const nextStep = useCallback(() => {
    setStep((prev) => Math.min(prev + 1, 5) as ReportStep);
  }, []);

  const prevStep = useCallback(() => {
    setStep((prev) => Math.max(prev - 1, 1) as ReportStep);
  }, []);

  return {
    step,
    draft,
    submittedReportId,
    setSubmittedReportId,
    updateDraft,
    addPhoto,
    removePhoto,
    resetDraft,
    goToStep,
    nextStep,
    prevStep,
  };
}
