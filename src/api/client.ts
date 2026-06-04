import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { config } from '@config/index';
import { createLogger } from '@utils/logger';
import { backoff, sleep } from '@utils/index';
import type { ApiResponse, ApiVersion, ApiError } from '@/types';

const log = createLogger('Api');

/**
 * Custom config options understood by our wrapper:
 *  - version: per-request API version override
 *  - skipAuth: don't attach the bearer token (for the login call itself)
 *  - retries: per-request override of the global retry budget
 */
export interface RequestOptions extends AxiosRequestConfig {
  version?: ApiVersion;
  skipAuth?: boolean;
  retries?: number;
}

/**
 * Auth-token getter — set once at boot from the auth store so we don't
 * create a circular import between auth and api.
 */
type TokenGetter = () => string | null;
let getAccessToken: TokenGetter = () => null;
export const setAccessTokenGetter = (fn: TokenGetter) => {
  getAccessToken = fn;
};

/**
 * Optional hook called on 401s, so the auth layer can attempt a refresh.
 * Returns the new token or null if the session is dead.
 */
type RefreshHandler = () => Promise<string | null>;
let onUnauthorized: RefreshHandler | null = null;
export const setUnauthorizedHandler = (fn: RefreshHandler | null) => {
  onUnauthorized = fn;
};

/**
 * Build the Axios instance once. We create separate instances per version
 * lazily so `/v1/leave` and `/v2/leave` can have different baseURLs cleanly.
 */
const instances = new Map<ApiVersion, AxiosInstance>();

function getInstance(version: ApiVersion): AxiosInstance {
  const cached = instances.get(version);
  if (cached) return cached;

  const inst = axios.create({
    baseURL: `${config.api.baseUrl}/${version}`,
    timeout: config.api.timeoutMs,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  // ── Request interceptor: attach bearer token + a request id for tracing
  inst.interceptors.request.use(req => {
    const skipAuth = (req as RequestOptions).skipAuth;
    if (!skipAuth) {
      const token = getAccessToken();
      if (token) req.headers.Authorization = `Bearer ${token}`;
    }
    req.headers['X-Request-Id'] = generateRequestId();
    log.debug(`${req.method?.toUpperCase()} ${version}${req.url}`);
    return req;
  });

  // ── Response interceptor: normalise errors into ApiError shape
  inst.interceptors.response.use(
    res => res,
    (error: AxiosError) => {
      const apiErr: ApiError = {
        code: error.code ?? 'UNKNOWN',
        message: error.message,
        status: error.response?.status,
        details: (error.response?.data as Record<string, unknown>) ?? undefined,
      };
      return Promise.reject(apiErr);
    },
  );

  instances.set(version, inst);
  return inst;
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The single entry point all callers use.
 *
 * Handles:
 *  - Version selection (per-request or default)
 *  - Retry with exponential backoff for transient failures (5xx / network)
 *  - Single 401 retry after token refresh
 *  - Unwrapping the standard ApiResponse<T> envelope
 */
async function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, options: RequestOptions = {}): Promise<T> {
  const version = options.version ?? config.api.defaultVersion;
  const maxRetries = options.retries ?? config.api.maxRetries;
  const inst = getInstance(version);

  let lastError: ApiError | null = null;
  let didRefresh = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await inst.request<ApiResponse<T>>({
        method,
        url,
        ...options,
      });
      // Unwrap envelope if present, else assume the body is already T.
      const body = res.data as ApiResponse<T> | T;
      if (isEnvelope<T>(body)) return body.data;
      return body as T;
    } catch (err) {
      const apiErr = err as ApiError;
      lastError = apiErr;

      // 401 → try a single token refresh, then retry once at the same attempt count
      if (apiErr.status === 401 && !didRefresh && onUnauthorized && !options.skipAuth) {
        didRefresh = true;
        log.warn('401 received, attempting token refresh');
        const newToken = await onUnauthorized();
        if (newToken) {
          attempt--; // don't consume a retry for the refresh
          continue;
        }
        throw apiErr; // refresh failed — bubble up
      }

      // Retry only on network errors and 5xx
      const transient = !apiErr.status || apiErr.status >= 500;
      if (!transient || attempt === maxRetries) throw apiErr;

      const delay = backoff(attempt);
      log.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms`, apiErr);
      await sleep(delay);
    }
  }

  throw lastError ?? { code: 'UNKNOWN', message: 'Request failed' };
}

function isEnvelope<T>(body: unknown): body is ApiResponse<T> {
  return typeof body === 'object' && body !== null && 'data' in (body as Record<string, unknown>);
}

/** Public surface — thin convenience wrappers around `request` */
export const apiClient = {
  get: <T>(url: string, options?: RequestOptions) => request<T>('GET', url, options),
  post: <T>(url: string, body?: unknown, options?: RequestOptions) => request<T>('POST', url, { ...options, data: body }),
  put: <T>(url: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', url, { ...options, data: body }),
  patch: <T>(url: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', url, { ...options, data: body }),
  delete: <T>(url: string, options?: RequestOptions) => request<T>('DELETE', url, options),
};
