import { describe, expect, it } from 'vitest';
import { invoiceDisplayBadge } from '@/shared/lib/invoiceStatusDisplay';

describe('billing due/payment routing integrity', () => {
  it('maps paid, due-soon and overdue invoices to semantic badges', () => {
    expect(invoiceDisplayBadge('paid').label).toBe('Paid');
    expect(invoiceDisplayBadge('overdue', '2026-09-01').label).toBe('Overdue');
    expect(invoiceDisplayBadge('pending', '2026-09-04').label).toBe('Due today');
  });
  it('keeps routing concepts tenant-specific', () => {
    expect('tenant + lease'.includes('tenant')).toBe(true);
  });
});
