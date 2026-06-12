import React from 'react';
/**
 * Shared vector icons (subset of the host's Icon), so federated remotes render
 * the exact same glyphs as the host instead of falling back to emoji. Same
 * 24×24 viewBox + stroke style as src/components/Icon.tsx. Extend as remotes
 * need more names.
 */
export type IconName = 'calendar' | 'clock' | 'mail' | 'phone' | 'wallet' | 'timesheet';
interface IconProps {
    name: IconName;
    size?: number;
    color?: string;
    stroke?: number;
}
export declare const Icon: React.FC<IconProps>;
export {};
