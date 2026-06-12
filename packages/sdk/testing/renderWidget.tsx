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

/**
 * Render a SELF-FETCHING widget with NO payload at all (data: null, no host
 * fallback) and let its query settle into the error state — under jest the
 * api-client base URL is unset, so the widget's own fetch rejects, exactly
 * like an outage on device. The no-silent-fallback contract: the widget must
 * render *something* (an error/retry state), never a blank tile. Assert
 * `(await renderWidgetSelfFetchError(W)).toJSON()` is non-null.
 */
export async function renderWidgetSelfFetchError<T>(
  Widget: WidgetComponent<T>,
  opts: Pick<RenderWidgetOptions, 'config'> = {},
): Promise<ReactTestRenderer> {
  // Unlike renderWidget's client this one MUST fetch on mount — the whole
  // point is letting the widget's own query run and fail.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const props: WidgetProps<T> = {
    config: { ...(opts.config ?? {}), layout: { size: 'large' } },
    data: null,
    loading: false,
    error: null,
    isStale: false,
    onRefresh: () => {},
  };
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <QueryClientProvider client={client}>
        <Widget {...props} />
      </QueryClientProvider>,
    );
  });
  // Second act pass: the rejected queryFn settles through TanStack's
  // retryer/notify chain only after the mount act has flushed — one short
  // sleep here reliably lands the hook in isError before the caller asserts.
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50));
  });
  return renderer;
}
