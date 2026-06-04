import { create } from 'zustand';
import type { AuthSession, LoginResult, Permission, ProfilePicture, User } from '@/types';
import type { AppConfig, AppManifestEntry, WidgetConfig } from '@/types';
import { mergeFlags, type FeatureFlagKey } from '@utils/featureFlags';

interface AuthState {
  user: User | null;
  session: AuthSession | null;
  permissions: Permission[];
  apps: AppConfig[];
  widgetLayout: WidgetConfig[];
  /**
   * Cached applications manifest. Hydrated by HomeScreen on first launch
   * (the same fetch that drives the home grid) and used by other screens
   * to discover per-app metadata — most importantly `detail.layout`,
   * which decides whether a tap opens a detail screen.
   */
  manifest: AppManifestEntry[];
  flags: Record<FeatureFlagKey, boolean>;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  /**
   * Cached profile photo for the signed-in user. Single source-of-truth —
   * every Avatar reads from here. Populated once per session by
   * `profilePictureService` via `authService.loadProfilePicture()`.
   */
  photo: ProfilePicture | null;
}

interface AuthActions {
  setLoginResult(result: LoginResult): void;
  bootstrapFromCache(session: AuthSession, bootstrap: LoginResult): void;
  updateSession(session: AuthSession): void;
  setStatus(status: AuthState['status']): void;
  /** User-driven layout edits. Persisted by HomeScreen. */
  setWidgetLayout(layout: WidgetConfig[]): void;
  /** Hydrated by HomeScreen once the applications manifest has been fetched. */
  setManifest(manifest: AppManifestEntry[]): void;
  /** Cached photo setter — only `authService.loadProfilePicture` should call this. */
  setPhoto(photo: ProfilePicture | null): void;
  /** Replace the cached user profile. Only the auth service should call this
   *  (after a successful background refresh from the user API). */
  setUser(user: User): void;
  hasPermission(p: Permission): boolean;
  clear(): void;
}

const initial: AuthState = {
  user: null,
  session: null,
  permissions: [],
  apps: [],
  widgetLayout: [],
  manifest: [],
  flags: mergeFlags({}),
  status: 'idle',
  photo: null,
};

/**
 * Auth store. Single source of truth for session + entitlement data.
 * UI subscribes via selectors so re-renders stay narrow.
 */
export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...initial,

  setLoginResult(result) {
    set({
      user: result.user,
      session: result.session,
      permissions: result.permissions,
      apps: result.apps,
      widgetLayout: result.widgetLayout,
      flags: mergeFlags(result.featureFlags),
      status: 'authenticated',
    });
  },

  bootstrapFromCache(session, bootstrap) {
    set({
      user: bootstrap.user,
      session,
      permissions: bootstrap.permissions,
      apps: bootstrap.apps,
      widgetLayout: bootstrap.widgetLayout,
      flags: mergeFlags(bootstrap.featureFlags),
      status: 'authenticated',
    });
  },

  updateSession(session) {
    set({ session });
  },

  setStatus(status) {
    set({ status });
  },

  setWidgetLayout(widgetLayout) {
    set({ widgetLayout });
  },

  setManifest(manifest) {
    set({ manifest });
  },

  setPhoto(photo) {
    set({ photo });
  },

  setUser(user) {
    set({ user });
  },

  hasPermission(p) {
    return get().permissions.includes(p);
  },

  clear() {
    set({ ...initial, status: 'unauthenticated' });
  },
}));
