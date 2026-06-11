import type { ApiVersion } from './api';
import type { AppConfig, WidgetConfig } from './widgets';

export type Permission =
  | 'home.read'
  | 'profile.read'
  | 'profile.write'
  | 'leave.read'
  | 'leave.write'
  | 'payslip.read'
  | 'roster.read'
  | 'attendance.read'
  | 'card.read'
  | 'card.share'
  | 'admin';

/**
 * Optional access / privilege the employee currently holds. Rendered as a
 * pill on the Employee ID card. The `tone` lets the server hint at the
 * pill's visual emphasis (e.g. gold for premium-tier benefits).
 */
export interface UserEligibility {
  label: string;
  tone?: 'red' | 'gold' | 'green' | 'amber' | 'blue' | 'purple' | 'gray';
}

/**
 * Single source-of-truth for the user's profile photo. Fetched **once** by
 * `profilePictureService` after sign-in / session restore and stored on the
 * auth store. Every Avatar across the app reads from there.
 *
 *  - `base64`: raw bytes (no `data:…;base64,` prefix). Empty string means
 *    "no photo available — Avatar will render its SVG silhouette fallback."
 *  - `mimeType`: typically `image/png` or `image/jpeg`. Drives the `data:`
 *    URI scheme passed to `<Image source>`.
 */
export interface ProfilePicture {
  base64: string;
  mimeType: string;
}

export interface User {
  id: string;
  /**
   * Internal API identifier (Entra `oid`/`sub`). Used only for service calls
   * (the BFF derives real identity from the JWT, so the value is effectively a
   * non-empty placeholder). NEVER displayed — the visible staff number is
   * `staffId`.
   */
  employeeId: string;
  /** Displayed staff number — Graph `/me` `employeeId`. Empty until /me returns it. */
  staffId?: string;
  firstName: string; // ID token (name)
  lastName: string; // ID token (name)
  email: string; // Graph /me (mail ?? userPrincipalName)
  jobTitle: string; // Graph /me
  department: string; // Graph /me
  /** Graph /me officeLocation. Optional — may be absent. */
  location?: string;
  /** Work phone (Graph /me mobilePhone, fallback businessPhones[0]). Optional. */
  phone?: string;
  /** EK-specific, no real source yet — mocked. */
  grade?: string;
  /** EK-specific, no real source yet — mocked. ISO. */
  joinedAt?: string;
  avatarUrl?: string;
  /**
   * Optional access entitlements (lounge access, airport perks, etc.).
   * Surfaced as pills on the Employee ID card sheet.
   */
  eligibilities?: UserEligibility[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
  idToken?: string;
  scope: string[];
}

/**
 * The single response a successful login returns.
 * It contains everything the app needs to bootstrap:
 * user, session, permissions, enabled apps + widgets, and per-service API versions.
 */
export interface LoginResult {
  user: User;
  session: AuthSession;
  permissions: Permission[];
  apps: AppConfig[];
  widgetLayout: WidgetConfig[];
  apiVersions: Record<string, ApiVersion>; // keyed by service id, e.g. {leave: 'v2'}
  featureFlags: Record<string, boolean>;
}
