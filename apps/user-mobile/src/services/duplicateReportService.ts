export interface NearbyDuplicateReport {
  id: string;
  wasteType: string;
  locationName: string;
  distanceMeters: number;
  distanceFormatted: string;
  reportedTimeAgo: string;
  reportedTimestamp: string;
  imageUrl: string;
  similarityScore: number; // e.g. 92 for 92%
  status: string;
  description: string;
}

export interface DuplicateCheckResult {
  hasDuplicate: boolean;
  duplicateReport?: NearbyDuplicateReport;
  distanceComparisonText: string;
}

/**
 * Service abstraction for nearby/duplicate report detection.
 * In a production backend, this connects to geospatial k-d tree search and vector image similarity.
 */
export const duplicateReportService = {
  /**
   * Check for duplicate reports near given coordinates with submitted images
   */
  async checkNearbyDuplicates(params: {
    latitude: number;
    longitude: number;
    photos: string[];
    forceNoDuplicate?: boolean;
  }): Promise<DuplicateCheckResult> {
    // Simulate realistic AI/Geo network query latency (400ms)
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (params.forceNoDuplicate) {
      return {
        hasDuplicate: false,
        distanceComparisonText: 'No existing reports found in your immediate perimeter.',
      };
    }

    const mockDuplicate: NearbyDuplicateReport = {
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
    };

    return {
      hasDuplicate: true,
      duplicateReport: mockDuplicate,
      distanceComparisonText: '120 m away from your current location',
    };
  },
};
