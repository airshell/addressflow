import { describe, it, expect } from 'vitest';
import { toLeafletGeoJSON, toLeafletLatLng, createLeafletPopupContent } from '../src/leaflet.js';
import { toMapLibreSource, toMapLibreBounds } from '../src/maplibre.js';
import { CanonicalAddress } from '@addressflow/types';

describe('Map Helpers (Leaflet & MapLibre)', () => {
  const addresses: CanonicalAddress[] = [
    {
      id: 'addr_blr',
      formattedAddress: 'MG Road, Bangalore, India',
      components: { street: 'MG Road', city: 'Bangalore', countryCode: 'IN' },
      location: { latitude: 12.9716, longitude: 77.5946 },
      source: 'provider',
    },
    {
      id: 'addr_del',
      formattedAddress: 'Connaught Place, New Delhi, India',
      components: { street: 'Connaught Place', city: 'New Delhi', countryCode: 'IN' },
      location: { latitude: 28.6139, longitude: 77.2090 },
      source: 'provider',
    },
  ];

  it('converts CanonicalAddress to Leaflet LatLng and popup HTML', () => {
    const latlng = toLeafletLatLng(addresses[0]);
    expect(latlng).toEqual({ lat: 12.9716, lng: 77.5946 });

    const popup = createLeafletPopupContent(addresses[0]);
    expect(popup).toContain('MG Road');
    expect(popup).toContain('Bangalore, India');
  });

  it('converts addresses to Leaflet GeoJSON FeatureCollection', () => {
    const geojson = toLeafletGeoJSON(addresses);
    expect(geojson.type).toBe('FeatureCollection');
    expect(geojson.features).toHaveLength(2);
    expect(geojson.features[0].geometry.coordinates).toEqual([77.5946, 12.9716]);
  });

  it('generates MapLibre GeoJSON Source and auto-bounds calculation', () => {
    const source = toMapLibreSource(addresses);
    expect(source.type).toBe('geojson');
    expect(source.data.features).toHaveLength(2);

    const bounds = toMapLibreBounds(addresses);
    expect(bounds).toBeDefined();
    // [minLng, minLat], [maxLng, maxLat]
    expect(bounds![0][1]).toBe(12.9716); // minLat
    expect(bounds![1][1]).toBe(28.6139); // maxLat
  });
});
