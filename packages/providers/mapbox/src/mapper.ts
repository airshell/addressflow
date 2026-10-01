import { CanonicalAddress, ProviderSearchCandidate, AddressComponents } from '@addressflow/types';

export interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  text: string;
  place_name: string;
  address?: string;
  center: [number, number]; // [lng, lat]
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
}

export function mapMapboxContextToComponents(feature: MapboxFeature): AddressComponents {
  const components: AddressComponents = {};

  if (feature.address) {
    components.houseNumber = feature.address;
  }
  if (feature.text) {
    components.street = feature.text;
  }

  if (feature.context) {
    for (const ctx of feature.context) {
      if (ctx.id.startsWith('postcode')) {
        components.postalCode = ctx.text;
      } else if (ctx.id.startsWith('place')) {
        components.city = ctx.text;
      } else if (ctx.id.startsWith('district')) {
        components.district = ctx.text;
      } else if (ctx.id.startsWith('region')) {
        components.state = ctx.short_code ? ctx.short_code.replace(/^[A-Z]+-/, '') : ctx.text;
      } else if (ctx.id.startsWith('country')) {
        components.country = ctx.text;
        if (ctx.short_code) {
          components.countryCode = ctx.short_code.toUpperCase();
        }
      } else if (ctx.id.startsWith('locality') || ctx.id.startsWith('neighborhood')) {
        components.neighborhood = ctx.text;
      }
    }
  }

  return components;
}

export function mapMapboxFeatureToCanonical(feature: MapboxFeature): CanonicalAddress {
  const components = mapMapboxContextToComponents(feature);

  const canonical: CanonicalAddress = {
    id: `addr_mb_${feature.id.replace(/[.:]/g, '_')}`,
    formattedAddress: feature.place_name,
    components,
    location: {
      latitude: feature.center[1],
      longitude: feature.center[0],
    },
    source: 'provider',
    confidence: feature.relevance,
    providerReferences: [
      {
        provider: 'mapbox',
        type: feature.id.split('.')[0] || 'place',
        identifier: feature.id,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  if (feature.bbox && feature.bbox.length === 4) {
    canonical.boundingBox = {
      west: feature.bbox[0],
      south: feature.bbox[1],
      east: feature.bbox[2],
      north: feature.bbox[3],
    };
  }

  return canonical;
}

export function mapMapboxFeatureToCandidate(feature: MapboxFeature): ProviderSearchCandidate {
  const canonical = mapMapboxFeatureToCanonical(feature);
  return {
    identifier: feature.id,
    formattedAddress: feature.place_name,
    components: canonical.components,
    location: canonical.location,
    confidence: feature.relevance,
    provider: 'mapbox',
    type: feature.place_type[0] || 'address',
  };
}
