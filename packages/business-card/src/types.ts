import type React from 'react';
export interface WidgetConfig { size?: 'small' | 'medium' | 'large'; [key: string]: unknown; }
export interface WidgetProps<T = unknown> { config: WidgetConfig; data: T | null; loading: boolean; error: string | null; isStale: boolean; onRefresh: () => void; preview?: boolean; }
export type WidgetComponent = React.ComponentType<WidgetProps<any>>;
export interface BusinessCardPayload { fullName: string; jobTitle: string; organization: string; email: string; phone: string; }
