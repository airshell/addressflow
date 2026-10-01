import { CanonicalAddress, GeoJsonFeatureCollection, GeoJsonFeature } from '@addressflow/types';

export interface LeafletLatLng {
  lat: number;
  lng: number;
}

/**
 * Extracts Leaflet LatLng coordinates [lat, lng] from a CanonicalAddress.
 */
export function toLeafletLatLng(address: CanonicalAddress): LeafletLatLng | null {
  if (!address.location) return null;
  return {
    lat: address.location.latitude,
    lng: address.location.longitude,
  };
}

/**
 * Formats a clean HTML popup content for a Leaflet marker.
 */
export function createLeafletPopupContent(address: CanonicalAddress): string {
  const title = address.components.building || address.components.street || address.formattedAddress;
  return `
    <div class="addressflow-popup" style="font-family: sans-serif; font-size: 13px;">
      <strong style="display:block; margin-bottom: 4px;">${title}</strong>
      <span style="color: #555;">${address.formattedAddress}</span>
    </div>
  `.trim();
}

/**
 * Converts AddressFlow search/reverse response records into a GeoJSON FeatureCollection
 * ready for L.geoJSON(data).addTo(map).
 */
export function toLeafletGeoJSON(addresses: CanonicalAddress[]): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];

  for (const addr of addresses) {
    if (!addr.location) continue;
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [addr.location.longitude, addr.location.latitude],
      },
      properties: {
        id: addr.id,
        formattedAddress: addr.formattedAddress,
        houseNumber: addr.components.houseNumber,
        street: addr.components.street,
        city: addr.components.city,
        state: addr.components.state,
        postalCode: addr.components.postalCode,
        countryCode: addr.components.countryCode,
        source: addr.source,
        confidence: addr.confidence,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
