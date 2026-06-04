import axios, { AxiosError, type AxiosInstance } from 'axios';
import { config } from '@config/index';
import type { ApiError } from '@/types';

/**
 * Shared axios instance for Azure API Management calls.
 *
 * Cleanly separated from auth:
 *   - Sign-in (MSAL) just establishes the user's identity (scope `User.Read`).
 *   - This client asks for its OWN access token at call time, scoped to
 *     `config.apim.scope` (the API audience). MSAL caches the token, so the
 *     silent acquisition is fast after the first call.
 *
 * Why a separate axios instance from `apiClient`:
 *   - APIM host differs from `config.api.baseUrl` and doesn't use the
 *     `/v{N}` segment.
 *   - Auto-attaches the APIM subscription key.
 *   - Each APIM-backed service owns its full path (e.g.
 *     `/hr/myek/employee/businessCard/{id}`) because different APIM APIs sit
 *     under different base paths.
 */

/**
 * Token acquirer installed by the auth layer at boot (see
 * `wireApiAuth` in `@auth/authService`). Keeps this module free of any
 * import on `@auth`, avoiding a circular dependency.
 */
type ApiTokenAcquirer = (scopes: string[]) => Promise<string | null>;
let acquireApiToken: ApiTokenAcquirer = async () => null;
export const setApimTokenAcquirer = (fn: ApiTokenAcquirer) => {
  acquireApiToken = fn;
};

/**
 * Format a path template by replacing `{key}` placeholders with URL-encoded
 * values from `params`. Used by services to resolve env-configured templates
 * (e.g. `/leave/{employeeId}`) against per-request values.
 */
export function buildPath(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => encodeURIComponent(params[key] ?? ''));
}

let instance: AxiosInstance | null = null;

export function apimClient(): AxiosInstance {
  if (instance) return instance;

  instance = axios.create({
    baseURL: config.apim.baseUrl,
    timeout: config.api.timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(config.apim.subscriptionKey
        ? { 'Ocp-Apim-Subscription-Key': config.apim.subscriptionKey }
        : {}),
    },
  });

  instance.interceptors.request.use(async req => {
    const token = await acquireApiToken(config.apim.scope);
    if (token) req.headers.Authorization = `Bearer ${token}`;
    return req;
  });

  instance.interceptors.response.use(
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

  return instance;
}
