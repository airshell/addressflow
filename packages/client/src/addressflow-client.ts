import {
  SearchAddressRequestDto,
  ResolveAddressRequestDto,
  ReverseGeocodeRequestDto,
  AddressSearchResponseDto,
  AddressResolveResponseDto,
  AddressReverseResponseDto,
  UsageMetricsSummary,
} from '@addressflow/types';

export interface AddressFlowClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class AddressFlowClient {
  private apiKey?: string;
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(options: AddressFlowClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? 'http://localhost:3000').replace(/\/$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const err = new Error(body?.error?.message ?? `HTTP ${res.status}: ${res.statusText}`);
      (err as any).status = res.status;
      (err as any).code = body?.error?.code ?? 'API_ERROR';
      (err as any).details = body?.error?.details;
      throw err;
    }

    return (await res.json()) as T;
  }

  public readonly address = {
    search: (req: SearchAddressRequestDto): Promise<AddressSearchResponseDto> => {
      return this.request<AddressSearchResponseDto>('/v1/address/search', {
        method: 'POST',
        body: JSON.stringify(req),
      });
    },

    resolve: (req: ResolveAddressRequestDto): Promise<AddressResolveResponseDto> => {
      return this.request<AddressResolveResponseDto>('/v1/address/resolve', {
        method: 'POST',
        body: JSON.stringify(req),
      });
    },

    reverse: (req: ReverseGeocodeRequestDto): Promise<AddressReverseResponseDto> => {
      return this.request<AddressReverseResponseDto>('/v1/address/reverse', {
        method: 'POST',
        body: JSON.stringify(req),
      });
    },
  };

  public readonly usage = {
    getSummary: (): Promise<{ data: UsageMetricsSummary }> => {
      return this.request<{ data: UsageMetricsSummary }>('/v1/usage');
    },
  };

  public readonly providers = {
    list: (): Promise<{ data: Array<{ name: string; capabilities: any }> }> => {
      return this.request<{ data: Array<{ name: string; capabilities: any }> }>('/v1/providers');
    },
  };
}
