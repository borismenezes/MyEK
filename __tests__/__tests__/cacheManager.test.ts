import { cacheManager, widgetCacheKey } from '@offline/cacheManager';
import { useCacheStore } from '@store/useCacheStore';
import type { WidgetConfig } from '@/types';

const config: WidgetConfig = {
  widgetId: 'leave',
  apiVersion: 'v1',
  endpoint: '/leave/balance',
  layout: { size: 'small' },
};

describe('cacheManager', () => {
  beforeEach(() => useCacheStore.getState().clearAll());

  it('returns null for an unknown key', () => {
    expect(cacheManager.read(config)).toBeNull();
  });

  it('round-trips a payload', () => {
    const payload = { total: 30, used: 5 };
    cacheManager.write(config, payload);
    const got = cacheManager.read<typeof payload>(config);
    expect(got).not.toBeNull();
    expect(got!.data).toEqual(payload);
    expect(got!.isStale).toBe(false);
  });

  it('produces stable cache keys per (widget, version, params)', () => {
    expect(widgetCacheKey(config)).toBe('widget:leave:v1:');
    expect(widgetCacheKey({ ...config, params: { period: 'month' } })).toBe(
      'widget:leave:v1:{"period":"month"}',
    );
    expect(widgetCacheKey({ ...config, apiVersion: 'v2' })).toBe('widget:leave:v2:');
  });

  it('invalidates a single key without nuking others', () => {
    cacheManager.write(config, { a: 1 });
    cacheManager.write({ ...config, widgetId: 'payslip' }, { b: 2 });
    cacheManager.invalidate(config);
    expect(cacheManager.read(config)).toBeNull();
    expect(cacheManager.read({ ...config, widgetId: 'payslip' })?.data).toEqual({ b: 2 });
  });
});
