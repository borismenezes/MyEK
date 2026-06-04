/**
 * Generic API contracts.
 * Every server response should conform to ApiResponse<T> for consistent handling.
 */
export type ApiVersion = 'v1' | 'v2' | 'v3';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    version: ApiVersion;
    requestId?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta?: {
    timestamp: string;
    version: ApiVersion;
    page: number;
    pageSize: number;
    total: number;
  };
}

/**
 * Network state used by the offline layer + UI banner.
 */
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  lastOnlineAt: number | null;
}
