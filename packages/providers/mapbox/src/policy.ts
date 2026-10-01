import { ProviderCapabilities } from '@addressflow/types';

export const MAPBOX_CAPABILITIES: ProviderCapabilities = {
  supportsAutocomplete: true,
  supportsGeocoding: true,
  supportsReverseGeocoding: true,
  supportsPlaceDetails: true,
  supportsPersistentProviderIds: true,
  requiresAttribution: true,
  attributionRequirements: [
    {
      text: '© Mapbox © OpenStreetMap',
      url: 'https://www.mapbox.com/about/maps/',
      mustDisplay: true,
    },
  ],
  retentionPolicy: {
    canStoreApplicationDataPermanently: true,
    canStoreProviderIdentifiersPermanently: true,
    maxResponseCacheTtlSeconds: 86400 * 30, // 30 days cache for temporary geocoding API
  },
};
