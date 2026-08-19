import { useState, useEffect, useCallback } from 'react';
import {
  duplicateReportService,
  DuplicateCheckResult,
  NearbyDuplicateReport,
} from '@/services/duplicateReportService';

export interface UseDuplicateCheckReturn {
  isChecking: boolean;
  hasDuplicate: boolean;
  duplicateReport: NearbyDuplicateReport | null;
  distanceComparisonText: string;
  recheck: (forceNoDuplicate?: boolean) => Promise<void>;
}

export function useDuplicateCheck(params: {
  latitude?: number;
  longitude?: number;
  photos: string[];
  forceNoDuplicate?: boolean;
}): UseDuplicateCheckReturn {
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [result, setResult] = useState<DuplicateCheckResult>({
    hasDuplicate: true,
    distanceComparisonText: '120 m away from your current location',
    duplicateReport: {
      id: '#ECLN-26-08-18-0003',
      wasteType: 'Garbage',
      locationName: 'Green Park, Near Main Road',
      distanceMeters: 120,
      distanceFormatted: '120 m away',
      reportedTimeAgo: '12 minutes ago',
      reportedTimestamp: '10:30 AM',
      imageUrl:
        'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=400&q=80',
      similarityScore: 92,
      status: 'AI Assessed',
      description: 'Garbage piled up near the park boundary wall.',
    },
  });

  const check = useCallback(
    async (forceNoDup?: boolean) => {
      setIsChecking(true);
      try {
        const res = await duplicateReportService.checkNearbyDuplicates({
          latitude: params.latitude || 20.2961,
          longitude: params.longitude || 85.8245,
          photos: params.photos,
          forceNoDuplicate: forceNoDup ?? params.forceNoDuplicate,
        });
        setResult(res);
      } finally {
        setIsChecking(false);
      }
    },
    [params.latitude, params.longitude, params.photos, params.forceNoDuplicate]
  );

  useEffect(() => {
    check();
  }, [check]);

  return {
    isChecking,
    hasDuplicate: result.hasDuplicate,
    duplicateReport: result.duplicateReport ?? null,
    distanceComparisonText: result.distanceComparisonText,
    recheck: check,
  };
}
