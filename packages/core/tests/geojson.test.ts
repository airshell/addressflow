import { describe, it, expect } from 'vitest';
import { addressToGeoJsonFeature, addressesToGeoJsonFeatureCollection } from '../src/geojson/formatter.js';
import { CanonicalAddress } from '@addressflow/types';

describe('GeoJSON Formatters (Leaflet & MapLibre Support)', () => {
  const sampleAddress: CanonicalAddress = {
    id: 'addr_123',
    formattedAddress: '12 Residency Rd, Bengaluru, Karnataka, India',
    components: {
      houseNumber: '12',
      street: 'Residency Rd',
      city: 'Bengaluru',
      state: 'Karnataka',
      countryCode: 'IN',
    },
    location: {
      latitude: 12.9716,
      longitude: 77.5946,
    },
    boundingBox: {
      north: 12.98,
      south: 12.96,
      east: 77.60,
      west: 77.58,
    },
    source: 'provider',
    confidence: 0.95,
  };

  it('formats CanonicalAddress to valid RFC 7946 GeoJsonFeature', () => {
    const feature = addressToGeoJsonFeature(sampleAddress);
    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('Point');
    // Coordinates in GeoJSON are [longitude, latitude]
    expect(feature.geometry.coordinates).toEqual([77.5946, 12.9716]);
    expect(feature.properties.id).toBe('addr_123');
    expect(feature.properties.city).toBe('Bengaluru');
    expect(feature.bbox).toEqual([77.58, 12.96, 77.60, 12.98]);
  });

  it('formats array to GeoJsonFeatureCollection', () => {
    const fc = addressesToGeoJsonFeatureCollection([sampleAddress]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates).toEqual([77.5946, 12.9716]);
  });
});
