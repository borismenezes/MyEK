/**
 * Contract-test harness for federated widgets (@myek/sdk/testing).
 *
 * Renders a widget the way the HOST mounts it: full WidgetProps, wrapped in a
 * QueryClientProvider (self-fetching widgets call useQuery; in tests their
 * api-client query errors — base URL unset — and the widget must fall back to
 * the props payload, which is exactly the cross-version contract being
 * verified). A widget whose render throws against its recorded fixture fails
 * here, in CI, instead of on a device after publish.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { WidgetComponent, WidgetConfig, WidgetProps } from '../src';

export interface RenderWidgetOptions {
  config?: WidgetConfig;
  /** Tile sizes to render. Default: both grid sizes. */
  sizes?: Array<'small' | 'large'>;
}

/**
 * Render `Widget` with `payload` at each size. Throws (failing the test) if
 * any render throws. Returns the renderers for optional extra assertions.
 */
export function renderWidget<T>(
  Widget: WidgetComponent<T>,
  payload: T,
  opts: RenderWidgetOptions = {},
): ReactTestRenderer[] {
  const sizes = opts.sizes ?? ['small', 'large'];
  // retry:0 + no refetch so the (expected) api-client failure settles fast
  // and the test never depends on network or timers.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnMount: false, gcTime: Infinity } },
  });

  return sizes.map(size => {
    const props: WidgetProps<T> = {
      config: { ...(opts.config ?? {}), layout: { size } },
      data: payload,
      loading: false,
      error: null,
      isStale: false,
      onRefresh: () => {},
    };
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <QueryClientProvider client={client}>
          <Widget {...props} />
        </QueryClientProvider>,
      );
    });
    return renderer;
  });
}
