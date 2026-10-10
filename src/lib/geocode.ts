import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Town } from '@/data/types';

type Coords = { latitude: number; longitude: number };

/** Roughly the middle of Cheatham County. */
const COUNTY_CENTER: Coords = { latitude: 36.26, longitude: -87.09 };
/** Anything farther than this is a wrong match, like a same-named street in another state. */
const MAX_DISTANCE_KM = 45;

function distanceKm(a: Coords, b: Coords) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * Finds where an address is, using the phone's built-in geocoder (Apple Maps on iPhone).
 * Returns null when it can't, so the caller can fall back to the town and let the person move the pin.
 */
export async function geocodeAddress(address: string, town: Town): Promise<Coords | null> {
  if (!address.trim() || Platform.OS === 'web') return null;
  try {
    // Android only geocodes with location permission; iPhone doesn't ask.
    if (Platform.OS === 'android') {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return null;
    }
    const [match] = await Location.geocodeAsync(`${address.trim()}, ${town}, TN`);
    if (!match || distanceKm(match, COUNTY_CENTER) > MAX_DISTANCE_KM) return null;
    return { latitude: match.latitude, longitude: match.longitude };
  } catch {
    return null;
  }
}
