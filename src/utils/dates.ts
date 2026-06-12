/**
 * "May 2026" — the calendar month *before* `now`. Payslips are always issued for
 * the prior month, so both the payslip widget and the drawer label off this
 * rather than whatever month the (demo) data happens to carry. Handles the
 * year boundary (January → December of the previous year) via Date normalisation.
 */
export function previousMonthLabel(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
