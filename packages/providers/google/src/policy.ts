import { ProviderCapabilities } from '@addressflow/types';

export const GOOGLE_MAPS_CAPABILITIES: ProviderCapabilities = {
  supportsAutocomplete: true,
  supportsGeocoding: true,
  supportsReverseGeocoding: true,
  supportsPlaceDetails: true,
  supportsPersistentProviderIds: true, // Google Place IDs can be stored indefinitely alongside user records
  requiresAttribution: true,
  attributionRequirements: [
    {
      text: 'Powered by Google',
      url: 'https://maps.google.com',
      mustDisplay: true,
    },
  ],
  retentionPolicy: {
    canStoreApplicationDataPermanently: true,
    canStoreProviderIdentifiersPermanently: true, // Place IDs stored permanently
    maxResponseCacheTtlSeconds: 86400 * 30, // Raw geocodes max 30 days cache per Google TOS
  },
};
