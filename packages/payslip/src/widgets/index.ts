import type { WidgetComponent } from '../types';
import { PayslipWidget } from './PayslipWidget';
const widgets: Record<string, WidgetComponent> = { payslip: PayslipWidget };
export default widgets;
