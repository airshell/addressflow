import { AddressProvider, ProviderRouter, RoutingContext } from '@addressflow/types';

export class DefaultProviderRouter implements ProviderRouter {
  private providers = new Map<string, AddressProvider>();
  private defaultProviderName: string;

  constructor(defaultProviderName: string = 'google') {
    this.defaultProviderName = defaultProviderName;
  }

  public registerProvider(provider: AddressProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  public async selectProvider(context: RoutingContext): Promise<AddressProvider> {
    // 1. If preferred provider explicitly specified and available
    if (context.preferredProvider) {
      const preferred = this.providers.get(context.preferredProvider.toLowerCase());
      if (preferred) return preferred;
    }

    // 2. Select default provider
    const defaultProvider = this.providers.get(this.defaultProviderName.toLowerCase());
    if (defaultProvider) return defaultProvider;

    // 3. Fallback to any registered provider
    const first = Array.from(this.providers.values())[0];
    if (first) return first;

    throw new Error('No address providers registered in AddressFlow router');
  }

  public getRegisteredProviders(): AddressProvider[] {
    return Array.from(this.providers.values());
  }
}
