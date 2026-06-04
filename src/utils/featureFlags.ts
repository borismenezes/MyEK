/**
 * Feature flags.
 *
 * Source of truth precedence (last wins):
 *   1. Build-time defaults (this file)
 *   2. Server-provided flags from the LoginResult (auth bootstrap)
 *   3. Local user overrides (dev menu, debug builds only)
 *
 * The store layer holds the merged state; this util exposes the keys.
 */

export const FEATURE_FLAGS = {
  DARK_MODE: 'darkMode',
  OFFLINE_MODE: 'offlineMode',
  DRAG_AND_DROP: 'dragAndDrop',
  BIOMETRIC_LOGIN: 'biometricLogin',
  PLATINUM_CARD: 'platinumCard',
  WIDGET_REFRESH_PULL: 'widgetRefreshPull',
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

export const DEFAULT_FLAGS: Record<FeatureFlagKey, boolean> = {
  darkMode: true,
  offlineMode: true,
  dragAndDrop: true,
  // Biometric unlock is on by default. Once a user signs in interactively
  // the persisted session is gated by Face ID / Touch ID on every cold
  // start; failure or cancellation routes them back to the login screen.
  biometricLogin: true,
  platinumCard: true,
  widgetRefreshPull: true,
};

export function mergeFlags(
  serverFlags: Record<string, boolean>,
  overrides: Partial<Record<FeatureFlagKey, boolean>> = {},
): Record<FeatureFlagKey, boolean> {
  return { ...DEFAULT_FLAGS, ...serverFlags, ...overrides };
}
