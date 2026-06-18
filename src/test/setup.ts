import "@testing-library/jest-dom/vitest";
import { vi } from 'vitest';

// Mock Supabase client for unit tests
const mockAdminDeleteUser = vi.fn().mockResolvedValue({ error: null });
let userCounter = 0;
const mockAdminCreateUser = vi.fn().mockResolvedValue(() => ({
  data: { user: { id: `test-user-${++userCounter}` } },
  error: null,
}));
const mockSignUp = vi.fn().mockResolvedValue(() => ({
  data: { user: { id: `test-user-${++userCounter}` }, session: null },
  error: null,
}));
const mockSignIn = vi.fn().mockResolvedValue({
  data: { user: { id: 'test-user-id' }, session: null },
  error: null,
});
const mockSignOut = vi.fn().mockResolvedValue({ error: null });

// Mock data storage for tests
const mockDatabase = new Map<string, any[]>();

// ── Schema constraint definitions (mirrors production CHECK/FK constraints) ──
// Tables with a monetary column that must be > 0 (CHECK constraint)
const POSITIVE_AMOUNT_COLUMNS: Record<string, string> = {
  payment_transactions: 'amount',
  invoices: 'amount',
  payment_allocations: 'allocated_amount',
};

// Foreign-key relationships enforced on insert: table -> { column -> referenced table }
const FOREIGN_KEYS: Record<string, Record<string, string>> = {
  payment_transactions: { invoice_id: 'invoices' },
  payment_allocations: { transaction_id: 'payment_transactions', invoice_id: 'invoices' },
  invoices: { tenant_id: 'tenants', property_id: 'properties', unit_id: 'units' },
};

function checkConstraints(table: string, data: any): { message: string } | null {
  const amountField = POSITIVE_AMOUNT_COLUMNS[table];
  if (amountField && Object.prototype.hasOwnProperty.call(data, amountField)) {
    const value = Number(data[amountField]);
    if (!(value > 0)) {
      return {
        message: `new row for relation "${table}" violates check constraint "${table}_${amountField}_positive_check"`,
      };
    }
  }

  const fks = FOREIGN_KEYS[table];
  if (fks) {
    for (const [column, refTable] of Object.entries(fks)) {
      const value = data[column];
      if (value === undefined || value === null) continue;
      const refRows = mockDatabase.get(refTable) || [];
      const exists = refRows.some((row: any) => row.id === value);
      if (!exists) {
        return {
          message: `insert or update on table "${table}" violates foreign key constraint "${table}_${column}_fkey"`,
        };
      }
    }
  }

  return null;
}

// Parse a PostgREST-style select string for embedded relations, e.g.
// "*, invoices(*)" -> ["invoices"]
function parseRelations(selectArg?: string): string[] {
  if (!selectArg) return [];
  const matches = selectArg.matchAll(/(\w+)\s*\(/g);
  return Array.from(matches, (m) => m[1]);
}

// Resolve embedded relations for a row using FK columns named "<relation>_id"
function hydrateRelations(table: string, row: any, relations: string[]): any {
  if (!row || relations.length === 0) return row;
  const hydrated = { ...row };
  for (const relation of relations) {
    const fkColumn = `${relation.endsWith('s') ? relation.slice(0, -1) : relation}_id`;
    const fkValue = row[fkColumn];
    if (fkValue === undefined) continue;
    const relatedRows = mockDatabase.get(relation) || [];
    const match = relatedRows.find((r: any) => r.id === fkValue) || null;
    hydrated[relation] = match;
  }
  return hydrated;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      admin: {
        deleteUser: mockAdminDeleteUser,
        createUser: (...args: any[]) => ({
          data: { user: { id: `test-user-${++userCounter}` } },
          error: null,
        }),
      },
      signUp: (...args: any[]) => ({
        data: { user: { id: `test-user-${++userCounter}` }, session: null },
        error: null,
      }),
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
    },
    from: vi.fn((table: string) => {
      const tableData = mockDatabase.get(table) || [];
      return {
        select: vi.fn((selectArg?: string) => {
          const relations = parseRelations(selectArg);
          return {
            eq: vi.fn((field: string, value: any) => {
              const filtered = tableData.filter((d: any) => d[field] === value);
              return {
                single: vi.fn(() => {
                  const item = filtered[0] || null;
                  return Promise.resolve({
                    data: item ? hydrateRelations(table, item, relations) : null,
                    error: null,
                  });
                }),
                maybeSingle: vi.fn(() => {
                  const item = filtered[0] || null;
                  return Promise.resolve({
                    data: item ? hydrateRelations(table, item, relations) : null,
                    error: null,
                  });
                }),
                // Return array when not using single/maybeSingle
                then: vi.fn((resolve: any) =>
                  resolve({
                    data: filtered.map((d: any) => hydrateRelations(table, d, relations)),
                    error: null,
                  })
                ),
                catch: vi.fn(() => ({ data: filtered, error: null })),
              };
            }),
            // Handle select without eq
            then: vi.fn((resolve: any) =>
              resolve({
                data: tableData.map((d: any) => hydrateRelations(table, d, relations)),
                error: null,
              })
            ),
            catch: vi.fn(() => ({ data: tableData, error: null })),
          };
        }),
        insert: vi.fn((data: any) => {
          const constraintError = checkConstraints(table, data);
          if (constraintError) {
            return {
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: constraintError })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: constraintError })),
              })),
              then: vi.fn((resolve: any) => resolve({ data: null, error: constraintError })),
            };
          }

          const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data
          };
          tableData.push(newItem);
          mockDatabase.set(table, tableData);
          return {
            select: vi.fn((selectArg?: string) => {
              const relations = parseRelations(selectArg);
              const hydrated = hydrateRelations(table, newItem, relations);
              return {
                single: vi.fn(() => Promise.resolve({ data: hydrated, error: null })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: hydrated, error: null })),
              };
            }),
            then: vi.fn((resolve: any) => resolve({ data: newItem, error: null })),
          };
        }),
        update: vi.fn((data: any) => ({
          eq: vi.fn((field: string, value: any) => ({
            single: vi.fn(() => {
              const index = tableData.findIndex((d: any) => d[field] === value);
              if (index !== -1) {
                tableData[index] = { ...tableData[index], ...data, updated_at: new Date().toISOString() };
                mockDatabase.set(table, tableData);
                return Promise.resolve({ data: tableData[index], error: null });
              }
              return Promise.resolve({ data: null, error: { message: 'Not found' } });
            }),
            then: vi.fn((resolve: any) => {
              const index = tableData.findIndex((d: any) => d[field] === value);
              if (index !== -1) {
                tableData[index] = { ...tableData[index], ...data, updated_at: new Date().toISOString() };
                mockDatabase.set(table, tableData);
                return resolve({ data: tableData[index], error: null });
              }
              return resolve({ data: null, error: null });
            }),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((field: string, value: any) => {
            const remaining = tableData.filter((d: any) => d[field] !== value);
            mockDatabase.set(table, remaining);
            return {
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
              then: vi.fn((resolve: any) => resolve({ data: null, error: null })),
            };
          }),
        })),
      };
    }),
  },
}));

// Helper function to generate valid UUID v4
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
