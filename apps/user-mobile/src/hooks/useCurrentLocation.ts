import { useState, useEffect, useCallback } from 'react';
import { locationService, LocationResult } from '@/services/locationService';

export interface UseCurrentLocationState {
  location: LocationResult | null;
  isLoading: boolean;
  error: string | null;
  permissionGranted: boolean;
  refreshLocation: () => Promise<void>;
  requestPermission: () => Promise<void>;
}

export function useCurrentLocation(autoFetch = true): UseCurrentLocationState {
  const [location, setLocation] = useState<LocationResult | null>({
    latitude: 20.2961,
    longitude: 85.8245,
    address: 'Green Park, Near Main Road',
    formattedAddress: 'Green Park, Near Main Road\nBhubaneswar, Odisha 751014',
    accuracyMeters: 10,
    street: 'Green Park',
    district: 'Near Main Road',
    city: 'Bhubaneswar',
    region: 'Odisha',
    postalCode: '751014',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(true);

  const fetchLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await locationService.getCurrentLocation();
      setLocation(result);
      setPermissionGranted(true);
    } catch (err: any) {
      if (err?.message === 'LOCATION_PERMISSION_DENIED') {
        setPermissionGranted(false);
        setError('Location permission is needed to detect where the waste is.');
      } else {
        setError('Could not retrieve precise location. Using fallback coordinates.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const perm = await locationService.requestPermission();
    setPermissionGranted(perm.granted);
    if (perm.granted) {
      fetchLocation();
    }
  }, [fetchLocation]);

  useEffect(() => {
    if (autoFetch) {
      fetchLocation();
    }
  }, [autoFetch, fetchLocation]);

  return {
    location,
    isLoading,
    error,
    permissionGranted,
    refreshLocation: fetchLocation,
    requestPermission,
  };
}
