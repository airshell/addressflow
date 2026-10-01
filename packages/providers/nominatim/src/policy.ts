import { ProviderCapabilities } from '@addressflow/types';

export const NOMINATIM_CAPABILITIES: ProviderCapabilities = {
  supportsAutocomplete: true,
  supportsGeocoding: true,
  supportsReverseGeocoding: true,
  supportsPlaceDetails: true,
  supportsPersistentProviderIds: true, // OSM IDs and Place IDs can be permanently stored
  requiresAttribution: true,
  attributionRequirements: [
    {
      text: 'Data © OpenStreetMap contributors, ODbL 1.0',
      url: 'https://www.openstreetmap.org/copyright',
      mustDisplay: true,
    },
  ],
  retentionPolicy: {
    canStoreApplicationDataPermanently: true,
    canStoreProviderIdentifiersPermanently: true,
    maxResponseCacheTtlSeconds: 86400 * 30, // 30 days cache allowed under OSM policy
  },
};
