import { GeoBoundingBox, GeoLocation } from '@addressflow/types';

export function isPointInsideBounds(point: GeoLocation, bounds: GeoBoundingBox): boolean {
  const { latitude, longitude } = point;
  const inLat = latitude >= bounds.south && latitude <= bounds.north;
  
  // Handle longitude wrap-around if bounds cross the 180th meridian
  let inLon = false;
  if (bounds.west <= bounds.east) {
    inLon = longitude >= bounds.west && longitude <= bounds.east;
  } else {
    inLon = longitude >= bounds.west || longitude <= bounds.east;
  }

  return inLat && inLon;
}
