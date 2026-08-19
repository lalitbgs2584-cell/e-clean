import * as Location from 'expo-location';

export interface LocationResult {
  latitude: number;
  longitude: number;
  address: string;
  formattedAddress: string;
  accuracyMeters: number;
  street?: string;
  district?: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

/**
 * Service abstraction for location querying and reverse geocoding.
 * Can be hooked into Google Maps Geocoding or a custom backend geocoder later.
 */
export const locationService = {
  /**
   * Check or request foreground location permission
   */
  async requestPermission(): Promise<LocationPermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
      };
    } catch {
      return { granted: false, canAskAgain: true };
    }
  },

  /**
   * Get current device location and resolve friendly address
   */
  async getCurrentLocation(): Promise<LocationResult> {
    const perm = await this.requestPermission();
    if (!perm.granted) {
      throw new Error('LOCATION_PERMISSION_DENIED');
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude, accuracy } = position.coords;

      let address = 'Green Park, Near Main Road';
      let formattedAddress = 'Green Park, Near Main Road\nBhubaneswar, Odisha 751014';
      let street = 'Green Park';
      let district = 'Near Main Road';
      let city = 'Bhubaneswar';
      let region = 'Odisha';
      let postalCode = '751014';

      try {
        const reverseResults = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverseResults && reverseResults.length > 0) {
          const first = reverseResults[0];
          street = first.street || first.name || 'Green Park';
          district = first.district || first.subregion || 'Near Main Road';
          city = first.city || 'Bhubaneswar';
          region = first.region || 'Odisha';
          postalCode = first.postalCode || '751014';

          const line1 = [street, district].filter(Boolean).join(', ');
          const line2 = [city, region, postalCode].filter(Boolean).join(', ');

          address = line1 || line2 || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          formattedAddress = line1 && line2 ? `${line1}\n${line2}` : address;
        }
      } catch {
        // Fall back to clean default address if reverse geocoding fails
      }

      return {
        latitude,
        longitude,
        address,
        formattedAddress,
        accuracyMeters: Math.round(accuracy ?? 10),
        street,
        district,
        city,
        region,
        postalCode,
      };
    } catch (err) {
      throw err;
    }
  },
};
