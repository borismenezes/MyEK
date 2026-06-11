/**
 * @myek/api-client — the HTTP client federated remotes use to call the BFF.
 *
 * This is what makes remotes more than display surfaces: a remote's own
 * `api.ts` can fetch live data with the host's auth, without importing host
 * stores. Mirrors enterprise-app's `@employee-app/api-client`.
 *
 * Cross-bundle auth state (ADR-0022): the token getter and base URL live on
 * namespaced `globalThis` slots, NOT module-level state. Under MF2 the host
 * and each remote can hold separate module instances of this package, and
 * module-level `let` closures don't reliably unify across them. The global
 * slot guarantees every copy of the client — host's, every remote's — reads
 * the same values. The host wires both slots once during auth bootstrap
 * (`wireApiAuth` in src/auth/authService.ts).
 *
 * Dependency-free on purpose (platform `fetch`): remotes bundling a fallback
 * copy don't drag axios into every OTA bundle.
 */

const G = globalThis as unknown as Record<string, unknown>;
const TOKEN_GETTER_KEY = '__myek_api_token_getter__';
const BASE_URL_KEY = '__myek_api_base_url__';

/**
 * Resolves the bearer for the next request. Async so the host can refresh an
 * expired token on demand; resolve `null` when signed out (the request goes
 * out unauthenticated and the backend 401s — surfaced as ApiError).
 */
export type TokenGetter = () => Promise<string | null>;

/** Host-side: publish the token getter every bundle's client reads. */
export function setTokenGetter(fn: TokenGetter | null): void {
  G[TOKEN_GETTER_KEY] = fn ?? undefined;
}

export function getTokenGetter(): TokenGetter | null {
  const fn = G[TOKEN_GETTER_KEY];
  return typeof fn === 'function' ? (fn as TokenGetter) : null;
}

/** Host-side: publish the API base URL (e.g. `https://host` — no trailing slash). */
export function setApiBaseUrl(url: string | null): void {
  G[BASE_URL_KEY] = url ?? undefined;
}

export function getApiBaseUrl(): string | null {
  const url = G[BASE_URL_KEY];
  return typeof url === 'string' && url.length > 0 ? url : null;
}

/** Non-2xx response. `status` is 0 for network-level failures. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
    /** Raw response body when one was readable (error envelopes, HTML, …). */
    public readonly body?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  /** Extra headers merged over the defaults (Authorization, Accept, Content-Type). */
  headers?: Record<string, string>;
  /** Abort/timeout control. Default: a 15s timeout. */
  signal?: AbortSignal;
  /** Override the default 15s timeout (ignored when `signal` is passed). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  opts: RequestOptions = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(
      '[api-client] base URL not set — the host must call setApiBaseUrl during bootstrap.',
      0,
      path,
    );
  }
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  const getToken = getTokenGetter();
  if (getToken) {
    // Token failures (refresh dead, signed out) fall through to an
    // unauthenticated request; the backend's 401 is the real signal and is
    // surfaced as ApiError below — never swallowed.
    const token = await getToken().catch(() => null);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Hermes has AbortController but not AbortSignal.timeout — roll the timeout.
  let signal = opts.signal;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (!signal) {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    signal = controller.signal;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    throw new ApiError(
      `[api-client] ${method} ${url} network failure: ${e instanceof Error ? e.message : String(e)}`,
      0,
      url,
    );
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => undefined);
    throw new ApiError(`[api-client] ${method} ${url} → ${res.status}`, res.status, url, text);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function apiGet<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('GET', path, undefined, opts);
}

export function apiPost<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>('POST', path, body, opts);
}

export function apiPut<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>('PUT', path, body, opts);
}

export function apiDelete<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>('DELETE', path, undefined, opts);
}
