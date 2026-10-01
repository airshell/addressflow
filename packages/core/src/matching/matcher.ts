import { CanonicalAddress } from '@addressflow/types';

export interface AddressMatcher {
  findExact(queryHash: string, projectId: string): Promise<CanonicalAddress | null>;
  findByProviderReference(provider: string, identifier: string): Promise<CanonicalAddress | null>;
}
