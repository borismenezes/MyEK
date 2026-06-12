import React from 'react';
/**
 * In-tile error state for SELF-FETCHING widgets.
 *
 * When a remote's own query fails and there's no host-fed fallback payload,
 * the tile must say so — a blank tile on outage is silent degradation (the
 * project's no-silent-fallback rule). One shared implementation so every
 * remote's failure mode looks and behaves the same.
 */
export declare const WidgetErrorState: React.FC<{
    message?: string;
    /** Re-runs the widget's query (e.g. `() => void query.refetch()`). */
    onRetry?: () => void;
}>;
