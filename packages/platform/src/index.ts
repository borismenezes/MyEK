/**
 * @myek/platform — cross-bundle bridge between the host and federated remotes.
 *
 * Host state (the signed-in user, the "open profile sheet" action, the active
 * theme) lives in host stores the remotes can't import. Rather than fight MF
 * singleton resolution for React contexts, the host writes these onto
 * namespaced `globalThis` slots and remotes read them (the same pattern
 * enterprise-app uses for its auth token-getter, ADR-0022). The host keeps the
 * slots fresh via `PlatformBridge`.
 *
 * ## Contract rules (read before changing any shape here)
 *
 * Every remote bundles its own copy of this package (and old remote bundles
 * outlive shell releases via the OTA + LKG caches), so the slot shapes are a
 * WIRE PROTOCOL, not an internal API:
 *
 *  1. Slot shapes are ADDITIVE-ONLY. Add optional fields; never rename,
 *     remove, or change the meaning of an existing field.
 *  2. A breaking change requires a new slot key + a `PROTOCOL_VERSION` bump,
 *     keeping the old slot populated until every published remote is rebuilt.
 *
 * The host publishes `PROTOCOL_VERSION` onto its own slot (via
 * `publishBridgeProtocol`, called by the host's PlatformBridge); remotes can
 * compare it against their compiled-in copy with `checkBridgeProtocol`.
 */

import type { HostActionHandlers, HostActionName, HostActionPayloads } from '@myek/sdk';

declare const __DEV__: boolean;

const G = globalThis as unknown as Record<string, unknown>;

/**
 * Bridge protocol version. Bump ONLY on a breaking slot-shape change (see
 * contract rules above). v1: user / theme / openProfile / copyToClipboard.
 */
export const PROTOCOL_VERSION = 1;
const PROTOCOL_KEY = '__myek_platform_protocol__';

/** Host-side: publish the protocol version this host shell speaks. */
export function publishBridgeProtocol(): void {
  G[PROTOCOL_KEY] = PROTOCOL_VERSION;
}

/** The protocol version the host published, or null pre-bridge/standalone. */
export function getHostBridgeProtocol(): number | null {
  const v = G[PROTOCOL_KEY];
  return typeof v === 'number' ? v : null;
}

/**
 * Remote-side sanity check: warn (dev only — release strips console) when this
 * bundle's compiled-in protocol differs from the host's published one. Returns
 * whether the versions are compatible (same major; absent host = compatible,
 * the remote is rendering standalone or pre-bridge).
 */
export function checkBridgeProtocol(): boolean {
  const host = getHostBridgeProtocol();
  if (host === null || host === PROTOCOL_VERSION) return true;
  if (__DEV__) {
    console.warn(
      `[myek/platform] bridge protocol mismatch: host=${host}, this bundle=${PROTOCOL_VERSION}. ` +
        'Rebuild/republish this remote against the host bridge.',
    );
  }
  return false;
}

// ── Slot factory ──────────────────────────────────────────────────────────────
// One value slot + one subscriber set per capability, all on globalThis so
// every bundled copy of this package reads/writes the same state. Uniform
// semantics: set() notifies subscribers on a snapshot of the set (an
// unsubscribe mid-iteration must not mutate the set being walked) and a single
// throwing subscriber never stops the rest.

interface BridgeSlot<T> {
  get(): T | null;
  set(value: T | null): void;
  subscribe(cb: () => void): () => void;
}

function createBridgeSlot<T>(name: string): BridgeSlot<T> {
  const valueKey = `__myek_platform_${name}__`;
  const subsKey = `__myek_platform_${name}_subs__`;

  function subs(): Set<() => void> {
    let s = G[subsKey] as Set<() => void> | undefined;
    if (!s) {
      s = new Set();
      G[subsKey] = s;
    }
    return s;
  }

  return {
    get(): T | null {
      return (G[valueKey] as T | undefined) ?? null;
    },
    set(value: T | null): void {
      G[valueKey] = value ?? undefined;
      for (const cb of [...subs()]) {
        try {
          cb();
        } catch {
          // a single bad subscriber must not stop the rest
        }
      }
    },
    subscribe(cb: () => void): () => void {
      const s = subs();
      s.add(cb);
      return () => {
        s.delete(cb);
      };
    },
  };
}

/**
 * Action slot: a host-published callback remotes invoke. Calling before the
 * host has published is a no-op for the user but a real wiring bug for the
 * developer — surface it in dev instead of failing silently.
 */
interface ActionSlot<F extends (...args: never[]) => void> {
  set(fn: F | null): void;
  invoke(...args: Parameters<F>): void;
}

function createActionSlot<F extends (...args: never[]) => void>(name: string): ActionSlot<F> {
  const slot = createBridgeSlot<F>(name);
  return {
    set: slot.set,
    invoke(...args: Parameters<F>): void {
      const fn = slot.get();
      if (typeof fn === 'function') {
        fn(...args);
      } else if (__DEV__) {
        console.warn(
          `[myek/platform] action "${name}" invoked before the host published it — ` +
            'mount PlatformBridge above any federated UI.',
        );
      }
    },
  };
}

// ── Signed-in user ────────────────────────────────────────────────────────────

export interface PlatformUser {
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  organization?: string;
  /** Displayed staff number (Graph /me employeeId) — shown on the business card. */
  staffId?: string;
  /** Work phone (Graph /me). Shown on the business card when present. */
  phone?: string;
  /** Optional avatar image URI/data-URI; remotes render initials when absent. */
  photoUri?: string;
}

const userSlot = createBridgeSlot<PlatformUser>('user');

/**
 * Host-side: publish (or clear) the signed-in user. Subscribers (remotes via
 * usePlatformUser) re-render when the host republishes — e.g. once Graph /me
 * overrides employeeId with the real value. Without this the federated card
 * would read stale token-derived data.
 */
export const setPlatformUser = userSlot.set;
export const getPlatformUser = userSlot.get;
/** Subscribe to platform-user changes. Returns an unsubscribe fn. */
export const subscribeUser = userSlot.subscribe;

// ── Host-action registry ──────────────────────────────────────────────────────
// One slot holding the host's typed handler map (HostActionPayloads in
// @myek/sdk — type-only import, erased at build, so no runtime dep). Remotes
// invoke by name; the registered handlers ARE the allowlist: an unknown or
// unregistered action dev-warns instead of failing silently, and never
// executes anything. A new host capability = an sdk payload type + one
// handler in PlatformBridge — not a new hand-rolled slot pair. Fire-and-
// forget only; anything needing state/subscriptions graduates to a
// first-class slot (like user/theme below).

const hostActionsSlot = createBridgeSlot<HostActionHandlers>('host_actions');

/** Host-side: register the action handlers this shell supports (PlatformBridge). */
export function registerHostActions(handlers: HostActionHandlers | null): void {
  hostActionsSlot.set(handlers);
}

/** Invoke a host action from a remote (typed by name via @myek/sdk). */
export function hostAction<K extends HostActionName>(
  name: K,
  ...payload: HostActionPayloads[K] extends void ? [] : [HostActionPayloads[K]]
): void {
  const fn = hostActionsSlot.get()?.[name];
  if (typeof fn === 'function') {
    (fn as (p: unknown) => void)(payload[0]);
  } else if (__DEV__) {
    console.warn(
      `[myek/platform] host action "${name}" is not registered — host predates this remote, ` +
        'or PlatformBridge is not mounted above the federated UI.',
    );
  }
}

// ── Legacy action slots (deprecated wrappers) ─────────────────────────────────
// Published remote bundles call openProfile/copyToClipboard against their own
// bundled copy of this package, which reads the legacy slots — so the host's
// PlatformBridge populates BOTH the registry and these. The wrappers below
// prefer the registry (new host) and fall back to the legacy slot (old host),
// covering every host/remote version pairing. New code calls hostAction().

const openProfileSlot = createActionSlot<() => void>('open_profile');
const copySlot = createActionSlot<(text: string, label?: string) => void>('copy');

/** @deprecated Host-side: register via registerHostActions; kept for old bundles. */
export const setOpenProfile = openProfileSlot.set;
/** @deprecated Use `hostAction('openProfile')`. */
export function openProfile(): void {
  if (hostActionsSlot.get()?.openProfile) {
    hostAction('openProfile');
  } else {
    openProfileSlot.invoke();
  }
}

/** @deprecated Host-side: register via registerHostActions; kept for old bundles. */
export const setCopyToClipboard = copySlot.set;
/** @deprecated Use `hostAction('copyToClipboard', { text, label })`. */
export function copyToClipboard(text: string, label?: string): void {
  if (hostActionsSlot.get()?.copyToClipboard) {
    hostAction('copyToClipboard', { text, label });
  } else {
    copySlot.invoke(text, label);
  }
}

// ── Active theme ──────────────────────────────────────────────────────────────
// The host owns light/dark (ThemeProvider). Remotes can't import the host's
// React ThemeContext (separate bundle, not a shared singleton), so — exactly
// as with the user slot above — the host publishes its *active* Theme and
// remotes read it via `@myek/ui`'s `useTheme()`. The shape is intentionally
// structural (host `Theme` assigns to it directly); `@myek/ui` casts it back
// to its own `Theme`. Subscribers (the `useTheme()` hooks) are notified
// synchronously on every change so federated UI re-renders on toggle.

/** Host theme published to remotes. Structurally matches the host's `Theme`. */
export interface PlatformTheme {
  mode: 'light' | 'dark';
  colors: Record<string, string>;
  spacing: (n: number) => number;
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  font: {
    family: string;
    weight: Record<string, string>;
    size: Record<string, number>;
  };
}

const themeSlot = createBridgeSlot<PlatformTheme>('theme');

export const setActiveTheme = themeSlot.set;
export const getActiveTheme = themeSlot.get;
/** Subscribe to active-theme changes. Returns an unsubscribe fn. */
export const subscribeTheme = themeSlot.subscribe;
