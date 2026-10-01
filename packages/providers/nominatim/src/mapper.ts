import { CanonicalAddress, ProviderSearchCandidate } from '@addressflow/types';

export interface NominatimRawAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  suburb?: string;
  neighbourhood?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

export interface NominatimRawItem {
  place_id: number;
  osm_id: number;
  osm_type: string;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string]; // [south, north, west, east]
  address?: NominatimRawAddress;
  importance?: number;
}

export function mapNominatimToCanonical(raw: NominatimRawItem): CanonicalAddress {
  const addr = raw.address ?? {};
  const lat = parseFloat(raw.lat);
  const lon = parseFloat(raw.lon);

  const street = addr.road || addr.pedestrian || undefined;
  const city = addr.city || addr.town || addr.village || addr.county || undefined;
  const countryCode = addr.country_code ? addr.country_code.toUpperCase() : undefined;

  const canonical: CanonicalAddress = {
    id: `addr_osm_${raw.osm_id}`,
    formattedAddress: raw.display_name,
    components: {
      houseNumber: addr.house_number,
      street,
      neighborhood: addr.neighbourhood || addr.suburb,
      locality: addr.suburb,
      city,
      district: addr.state_district,
      state: addr.state,
      postalCode: addr.postcode,
      country: addr.country,
      countryCode,
    },
    location: {
      latitude: lat,
      longitude: lon,
    },
    source: 'provider',
    confidence: raw.importance ? Math.min(1.0, raw.importance) : 0.85,
    providerReferences: [
      {
        provider: 'nominatim',
        type: 'osm_id',
        identifier: String(raw.osm_id),
        createdAt: new Date().toISOString(),
        metadata: {
          osm_type: raw.osm_type,
          place_id: raw.place_id,
        },
      },
    ],
  };

  if (raw.boundingbox && raw.boundingbox.length === 4) {
    canonical.boundingBox = {
      south: parseFloat(raw.boundingbox[0]),
      north: parseFloat(raw.boundingbox[1]),
      west: parseFloat(raw.boundingbox[2]),
      east: parseFloat(raw.boundingbox[3]),
    };
  }

  return canonical;
}

export function mapNominatimToCandidate(raw: NominatimRawItem): ProviderSearchCandidate {
  const canonical = mapNominatimToCanonical(raw);
  return {
    identifier: String(raw.osm_id),
    formattedAddress: canonical.formattedAddress,
    components: canonical.components,
    location: canonical.location,
    confidence: canonical.confidence,
    provider: 'nominatim',
    type: raw.osm_type,
    metadata: {
      place_id: raw.place_id,
    },
  };
}
