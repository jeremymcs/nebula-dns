// Nebula DNS - Admin UI http-json helper tests
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

import {
  HttpResponseError,
  parseJsonResponseBody,
  parseApiErrorMessage,
} from './http-json';

function mockResponse(status: number, bodyText: string): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => bodyText,
  } as Response;
}

describe('http-json', () => {
  it('uses fallback for empty 200 body', async () => {
    const value = await parseJsonResponseBody(mockResponse(200, ''), {
      connection: null,
    });
    expect(value).toEqual({ connection: null });
  });

  it('uses fallback for 204 No Content', async () => {
    const value = await parseJsonResponseBody(mockResponse(204, ''), []);
    expect(value).toEqual([]);
  });

  it('parses JSON object bodies', async () => {
    const value = await parseJsonResponseBody<{ connection: null }>(
      mockResponse(200, '{"connection":null}'),
    );
    expect(value).toEqual({ connection: null });
  });

  it('throws HttpResponseError on invalid JSON', async () => {
    await expect(
      parseJsonResponseBody(mockResponse(200, 'not-json')),
    ).rejects.toBeInstanceOf(HttpResponseError);
  });

  it('reads message from error JSON body', async () => {
    const message = await parseApiErrorMessage(
      mockResponse(400, '{"message":"Bad token"}'),
    );
    expect(message).toBe('Bad token');
  });
});
