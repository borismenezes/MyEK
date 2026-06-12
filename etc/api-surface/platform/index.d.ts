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
/**
 * Bridge protocol version. Bump ONLY on a breaking slot-shape change (see
 * contract rules above). v1: user / theme / openProfile / copyToClipboard.
 */
export declare const PROTOCOL_VERSION = 1;
/** Host-side: publish the protocol version this host shell speaks. */
export declare function publishBridgeProtocol(): void;
/** The protocol version the host published, or null pre-bridge/standalone. */
export declare function getHostBridgeProtocol(): number | null;
/**
 * Remote-side sanity check: warn (dev only — release strips console) when this
 * bundle's compiled-in protocol differs from the host's published one. Returns
 * whether the versions are compatible (same major; absent host = compatible,
 * the remote is rendering standalone or pre-bridge).
 */
export declare function checkBridgeProtocol(): boolean;
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
/**
 * Host-side: publish (or clear) the signed-in user. Subscribers (remotes via
 * usePlatformUser) re-render when the host republishes — e.g. once Graph /me
 * overrides employeeId with the real value. Without this the federated card
 * would read stale token-derived data.
 */
export declare const setPlatformUser: (value: PlatformUser | null) => void;
export declare const getPlatformUser: () => PlatformUser | null;
/** Subscribe to platform-user changes. Returns an unsubscribe fn. */
export declare const subscribeUser: (cb: () => void) => () => void;
/** Host-side: register the action handlers this shell supports (PlatformBridge). */
export declare function registerHostActions(handlers: HostActionHandlers | null): void;
/** Invoke a host action from a remote (typed by name via @myek/sdk). */
export declare function hostAction<K extends HostActionName>(name: K, ...payload: HostActionPayloads[K] extends void ? [] : [HostActionPayloads[K]]): void;
/** @deprecated Host-side: register via registerHostActions; kept for old bundles. */
export declare const setOpenProfile: (fn: (() => void) | null) => void;
/** @deprecated Use `hostAction('openProfile')`. */
export declare function openProfile(): void;
/** @deprecated Host-side: register via registerHostActions; kept for old bundles. */
export declare const setCopyToClipboard: (fn: ((text: string, label?: string) => void) | null) => void;
/** @deprecated Use `hostAction('copyToClipboard', { text, label })`. */
export declare function copyToClipboard(text: string, label?: string): void;
/** Host theme published to remotes. Structurally matches the host's `Theme`. */
export interface PlatformTheme {
    mode: 'light' | 'dark';
    colors: Record<string, string>;
    spacing: (n: number) => number;
    radius: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
        pill: number;
    };
    font: {
        family: string;
        weight: Record<string, string>;
        size: Record<string, number>;
    };
}
export declare const setActiveTheme: (value: PlatformTheme | null) => void;
export declare const getActiveTheme: () => PlatformTheme | null;
/** Subscribe to active-theme changes. Returns an unsubscribe fn. */
export declare const subscribeTheme: (cb: () => void) => () => void;
