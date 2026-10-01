import {
  CanonicalAddress,
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonPoint,
  AddressGeoJsonProperties,
} from '@addressflow/types';

/**
 * Converts a CanonicalAddress into a standard RFC 7946 GeoJSON Feature
 * ready for direct consumption by Leaflet (L.geoJSON) or MapLibre GL.
 */
export function addressToGeoJsonFeature(address: CanonicalAddress): GeoJsonFeature {
  const coords: [number, number] = address.location
    ? [address.location.longitude, address.location.latitude]
    : [0, 0];

  const geometry: GeoJsonPoint = {
    type: 'Point',
    coordinates: coords,
  };

  const properties: AddressGeoJsonProperties = {
    id: address.id,
    formattedAddress: address.formattedAddress,
    houseNumber: address.components.houseNumber,
    unit: address.components.unit,
    building: address.components.building,
    street: address.components.street,
    neighborhood: address.components.neighborhood,
    locality: address.components.locality,
    city: address.components.city,
    district: address.components.district,
    state: address.components.state,
    postalCode: address.components.postalCode,
    country: address.components.country,
    countryCode: address.components.countryCode,
    source: address.source,
    confidence: address.confidence,
    providerReferences: address.providerReferences?.map((r) => ({
      provider: r.provider,
      identifier: r.identifier,
    })),
  };

  const feature: GeoJsonFeature = {
    type: 'Feature',
    geometry,
    properties,
  };

  if (address.boundingBox) {
    feature.bbox = [
      address.boundingBox.west,
      address.boundingBox.south,
      address.boundingBox.east,
      address.boundingBox.north,
    ];
  }

  return feature;
}

/**
 * Converts an array of CanonicalAddress records into a standard GeoJSON FeatureCollection
 * for Leaflet layers or MapLibre GeoJSON sources.
 */
export function addressesToGeoJsonFeatureCollection(
  addresses: CanonicalAddress[]
): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: addresses.map(addressToGeoJsonFeature),
  };
}
