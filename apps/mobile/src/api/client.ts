import type { AuthMode } from '../constants/config';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
  getAuthMode: () => Promise<AuthMode | null>;
  getDeviceId: () => Promise<string>;
  getAppVersion: () => string;
  onUnauthorized?: () => void;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  path: string,
  options: ApiClientOptions,
  req: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, headers = {} } = req;
  const url = `${options.baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Device-Id': await options.getDeviceId(),
    'X-App-Version': options.getAppVersion(),
    ...headers,
  };

  if (auth) {
    const token = await options.getAccessToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      options.onUnauthorized?.();
    }
    const message =
      typeof parsed === 'object' &&
      parsed !== null &&
      'message' in parsed &&
      typeof (parsed as { message: unknown }).message === 'string'
        ? (parsed as { message: string }).message
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, parsed);
  }

  return parsed as T;
}

export function createApiClient(options: ApiClientOptions) {
  return {
    request: <T>(path: string, req?: RequestOptions) =>
      apiRequest<T>(path, options, req),
    get: <T>(path: string, req?: Omit<RequestOptions, 'method' | 'body'>) =>
      apiRequest<T>(path, options, { ...req, method: 'GET' }),
    post: <T>(
      path: string,
      body?: unknown,
      req?: Omit<RequestOptions, 'method' | 'body'>,
    ) => apiRequest<T>(path, options, { ...req, method: 'POST', body }),
    patch: <T>(
      path: string,
      body?: unknown,
      req?: Omit<RequestOptions, 'method' | 'body'>,
    ) => apiRequest<T>(path, options, { ...req, method: 'PATCH', body }),
    delete: <T>(path: string, req?: Omit<RequestOptions, 'method' | 'body'>) =>
      apiRequest<T>(path, options, { ...req, method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
