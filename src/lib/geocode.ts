import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { COUNTY_CENTER, type Town } from '@/data/types';

type Coords = { latitude: number; longitude: number };

/** Anything farther than this (about 50 miles) is a wrong match, like a same-named street in another state. */
const MAX_DISTANCE_KM = 80;

function distanceKm(a: Coords, b: Coords) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/**
 * Finds a place using the phone's built-in geocoder (Apple Maps on iPhone). Returns null when it
 * can't, or when the match is far outside the county, so callers can fall back to a nearby spot.
 */
async function geocode(query: string): Promise<Coords | null> {
  if (Platform.OS === 'web') return null;
  try {
    // Android only geocodes with location permission; iPhone doesn't ask.
    if (Platform.OS === 'android') {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return null;
    }
    const [match] = await Location.geocodeAsync(query);
    if (!match || distanceKm(match, COUNTY_CENTER) > MAX_DISTANCE_KM) return null;
    return { latitude: match.latitude, longitude: match.longitude };
  } catch {
    return null;
  }
}

/** Where a street address in one of the towns is. */
export function geocodeAddress(address: string, town: Town): Promise<Coords | null> {
  return address.trim() ? geocode(`${address.trim()}, ${town}, TN`) : Promise.resolve(null);
}

/** Where a town's center is, for a town the owner adds. */
export function geocodeTown(town: Town): Promise<Coords | null> {
  return geocode(`${town.trim()}, TN`);
}
