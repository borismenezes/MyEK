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
/**
 * Resolves the bearer for the next request. Async so the host can refresh an
 * expired token on demand; resolve `null` when signed out (the request goes
 * out unauthenticated and the backend 401s — surfaced as ApiError).
 */
export type TokenGetter = () => Promise<string | null>;
/** Host-side: publish the token getter every bundle's client reads. */
export declare function setTokenGetter(fn: TokenGetter | null): void;
export declare function getTokenGetter(): TokenGetter | null;
/** Host-side: publish the API base URL (e.g. `https://host` — no trailing slash). */
export declare function setApiBaseUrl(url: string | null): void;
export declare function getApiBaseUrl(): string | null;
/** Non-2xx response. `status` is 0 for network-level failures. */
export declare class ApiError extends Error {
    readonly status: number;
    readonly url: string;
    /** Raw response body when one was readable (error envelopes, HTML, …). */
    readonly body?: string | undefined;
    constructor(message: string, status: number, url: string, 
    /** Raw response body when one was readable (error envelopes, HTML, …). */
    body?: string | undefined);
}
export interface RequestOptions {
    /** Extra headers merged over the defaults (Authorization, Accept, Content-Type). */
    headers?: Record<string, string>;
    /** Abort/timeout control. Default: a 15s timeout. */
    signal?: AbortSignal;
    /** Override the default 15s timeout (ignored when `signal` is passed). */
    timeoutMs?: number;
}
export declare function apiGet<T>(path: string, opts?: RequestOptions): Promise<T>;
export declare function apiPost<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
export declare function apiPut<T>(path: string, body?: unknown, opts?: RequestOptions): Promise<T>;
export declare function apiDelete<T>(path: string, opts?: RequestOptions): Promise<T>;
