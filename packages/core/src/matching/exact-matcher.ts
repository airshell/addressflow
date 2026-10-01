import { CanonicalAddress } from '@addressflow/types';
import { AddressMatcher } from './matcher.js';

export class InMemoryAddressMatcher implements AddressMatcher {
  private hashIndex = new Map<string, CanonicalAddress>();
  private refIndex = new Map<string, CanonicalAddress>();

  public async findExact(queryHash: string, projectId: string): Promise<CanonicalAddress | null> {
    const key = `${projectId}:${queryHash}`;
    return this.hashIndex.get(key) ?? null;
  }

  public async findByProviderReference(provider: string, identifier: string): Promise<CanonicalAddress | null> {
    const key = `${provider}:${identifier}`;
    return this.refIndex.get(key) ?? null;
  }

  public store(address: CanonicalAddress, projectId: string): void {
    if (address.normalizedQueryHash) {
      this.hashIndex.set(`${projectId}:${address.normalizedQueryHash}`, address);
    }
    if (address.providerReferences) {
      for (const ref of address.providerReferences) {
        this.refIndex.set(`${ref.provider}:${ref.identifier}`, address);
      }
    }
  }

  public clear(): void {
    this.hashIndex.clear();
    this.refIndex.clear();
  }
}
