/** Columns the tenant portal actually renders — avoid select('*') payloads. */
export const TENANT_INVOICE_COLUMNS =
  'id, invoice_number, amount, balance_due, due_date, paid_date, status, description';
