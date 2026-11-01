/**
 * Safe JSON parsing for Admin UI fetch responses.
 * Nest/Express may return 200 with an empty body for null handlers or 204 No Content.
 */

export class HttpResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HttpResponseError';
  }
}

export async function readResponseText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/**
 * Parse JSON from a successful Response, using fallback when the body is empty or 204.
 */
export async function parseJsonResponseBody<T>(
  res: Response,
  fallback?: T,
): Promise<T> {
  if (res.status === 204) {
    return fallback as T;
  }

  const text = await readResponseText(res);
  if (!text.trim()) {
    return fallback as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpResponseError(
      `Invalid JSON response (HTTP ${res.status})`,
      res.status,
    );
  }
}

export async function parseApiErrorMessage(res: Response): Promise<string> {
  const fallback = `Request failed (HTTP ${res.status})`;
  try {
    const body = await parseJsonResponseBody<{ message?: string }>(
      res,
      {},
    );
    if (body.message) {
      return body.message;
    }
  } catch {
    // ignore parse errors for error payloads
  }
  return fallback;
}

export async function assertOkResponse(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  throw new HttpResponseError(await parseApiErrorMessage(res), res.status);
}

/**
 * Fetch JSON for admin API calls with optional fallback for empty bodies.
 */
export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  options?: {
    fallback?: T;
    treatStatusesAsFallback?: number[];
  },
): Promise<T> {
  const res = await fetch(input, init);
  const treatAsFallback = options?.treatStatusesAsFallback ?? [];
  if (
    options?.fallback !== undefined &&
    treatAsFallback.includes(res.status)
  ) {
    return options.fallback;
  }
  await assertOkResponse(res);
  return parseJsonResponseBody(res, options?.fallback);
}
