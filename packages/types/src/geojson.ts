export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude] per RFC 7946
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface AddressGeoJsonProperties {
  id: string;
  formattedAddress: string;
  houseNumber?: string;
  unit?: string;
  building?: string;
  street?: string;
  neighborhood?: string;
  locality?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
  source: string;
  confidence?: number;
  providerReferences?: { provider: string; identifier: string }[];
  [key: string]: unknown;
}

export interface GeoJsonFeature<G = GeoJsonPoint, P = AddressGeoJsonProperties> {
  type: 'Feature';
  geometry: G;
  properties: P;
  bbox?: [number, number, number, number]; // [minX, minY, maxX, maxY]
}

export interface GeoJsonFeatureCollection<G = GeoJsonPoint, P = AddressGeoJsonProperties> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<G, P>[];
}
