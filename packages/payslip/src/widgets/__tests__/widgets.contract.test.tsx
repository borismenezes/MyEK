/**
 * Widget contract test — renders every widget this remote exposes against its
 * recorded fixture payload, exactly as the host mounts it. Breaks in CI when
 * a payload-shape or props-contract change would break the published tile.
 */
import { renderWidget } from '@myek/sdk/testing';
import widgets from '../index';
import payslipFixture from '../../__fixtures__/payslip.json';

const fixtures: Record<string, unknown> = {
  payslip: payslipFixture,
};

describe('payslip remote widget contract', () => {
  it('exposes at least one widget', () => {
    expect(Object.keys(widgets).length).toBeGreaterThan(0);
  });

  it.each(Object.keys(widgets))('renders "%s" with its fixture at both sizes', widgetId => {
    const fixture = fixtures[widgetId];
    expect(fixture).toBeDefined(); // every exposed widget must have a recorded fixture
    const renderers = renderWidget(widgets[widgetId], fixture as never, {
      config: { widgetId, applicationName: 'payslip' },
    });
    for (const r of renderers) {
      expect(r.toJSON()).not.toBeNull();
    }
  });
});
