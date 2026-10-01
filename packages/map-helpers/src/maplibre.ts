import { CanonicalAddress, GeoJsonFeatureCollection } from '@addressflow/types';
import { toLeafletGeoJSON } from './leaflet.js';

export interface MapLibreGeoJsonSourceData {
  type: 'geojson';
  data: GeoJsonFeatureCollection;
}

/**
 * Creates a MapLibre GL GeoJSON source definition for map.addSource('addresses', source)
 */
export function toMapLibreSource(addresses: CanonicalAddress[]): MapLibreGeoJsonSourceData {
  return {
    type: 'geojson',
    data: toLeafletGeoJSON(addresses),
  };
}

/**
 * Returns bounds for MapLibre map.fitBounds([[minLng, minLat], [maxLng, maxLat]])
 */
export function toMapLibreBounds(
  addresses: CanonicalAddress[]
): [[number, number], [number, number]] | null {
  const points = addresses.filter((a) => a.location).map((a) => a.location!);
  if (points.length === 0) return null;

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
