/**
 * DemoControlPanel
 * Route: /demo
 * Public route — no auth required.
 *
 * Shows all demo accounts with one-click login, current data state,
 * and a Reset button that wipes and re-seeds everything.
 * Aesthetic: dark industrial terminal — monospace precision,
 * amber/green status indicators, clean data density.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// ── Types ──────────────────────────────────────────────────────
interface DemoAccount {
  role:        string;
  label:       string;
  email:       string;
  password:    string;
  portal:      string;
  description: string;
  color:       string;
  accent:      string;
  badge:       string;
  stats?:      { label: string; value: string }[];
}

const ACCOUNTS: DemoAccount[] = [
  {
    role: 'manager',
    label: 'James Kariuki',
    email: 'demo.manager@rentflow.ink',
    password: 'Demo@2026',
    portal: '/',
    description: 'Manager · Nairobi Realty Group · Pro tier · 3 properties · 5 tenants',
    badge: 'MANAGER',
    color: '#1a2744',
    accent: '#4f8ef7',
    stats: [
      { label: 'Properties', value: '3' },
      { label: 'Tenants',    value: '5' },
      { label: 'Revenue',    value: 'KES 200K' },
      { label: 'Tier',       value: 'Pro' },
    ],
  },
  {
    role: 'tenant-linked',
    label: 'Grace Wanjiku',
    email: 'demo.tenant1@rentflow.ink',
    password: 'Demo@2026',
    portal: '/portal',
    description: 'Tenant · Sunset Gardens Flat A3 · 1 overdue invoice · active lease',
    badge: 'TENANT',
    color: '#1a2e22',
    accent: '#4ade80',
    stats: [
      { label: 'Unit',    value: 'Flat A3' },
      { label: 'Rent',    value: 'KES 8,500' },
      { label: 'Balance', value: 'KES 8,500 OD' },
      { label: 'Status',  value: 'Overdue' },
    ],
  },
  {
    role: 'tenant-linked',
    label: 'Brian Otieno',
    email: 'demo.tenant2@rentflow.ink',
    password: 'Demo@2026',
    portal: '/portal',
    description: 'Tenant · Valley View Bungalows B1 · all invoices paid · active lease',
    badge: 'TENANT',
    color: '#1a2e22',
    accent: '#4ade80',
    stats: [
      { label: 'Unit',    value: 'Bungalow B1' },
      { label: 'Rent',    value: 'KES 35,000' },
      { label: 'Balance', value: 'KES 0' },
      { label: 'Status',  value: 'Good standing' },
    ],
  },
  {
    role: 'tenant-orphan',
    label: 'Amina Hassan',
    email: 'demo.tenant3@rentflow.ink',
    password: 'Demo@2026',
    portal: '/portal',
    description: 'Orphan tenant · self-registered · Ngara Apartments Rm 12 · 3 self-logged payments',
    badge: 'ORPHAN',
    color: '#2a1f14',
    accent: '#fb923c',
    stats: [
      { label: 'Property', value: 'Ngara Apts' },
      { label: 'Rent',     value: 'KES 11,000' },
      { label: 'Payments', value: '3 logged' },
      { label: 'Status',   value: 'Unlinked' },
    ],
  },
  {
    role: 'landlord',
    label: 'Peter Mwangi',
    email: 'demo.landlord@rentflow.ink',
    password: 'Demo@2026',
    portal: '/landlord/login',
    description: 'Landlord · owns Sunset Gardens + Valley View · read-only statements',
    badge: 'LANDLORD',
    color: '#1f1a2e',
    accent: '#a78bfa',
    stats: [
      { label: 'Properties', value: '2' },
      { label: 'Manager',    value: 'J. Kariuki' },
      { label: 'Net rent',   value: 'KES 108K' },
      { label: 'Status',     value: 'Active' },
    ],
  },
  {
    role: 'agent',
    label: 'Fatuma Abubakar',
    email: 'demo.agent@rentflow.ink',
    password: 'Demo@2026',
    portal: '/submanager',
    description: 'Submanager / Agent · Nairobi Realty Group · can manage tenants + maintenance',
    badge: 'AGENT',
    color: '#1f2520',
    accent: '#86efac',
    stats: [
      { label: 'Role',        value: 'Submanager' },
      { label: 'Permissions', value: 'Tenants + Maint' },
      { label: 'Financials',  value: 'View only' },
      { label: 'Agency',      value: 'NRG' },
    ],
  },
];

type SeedState = 'idle' | 'seeding' | 'done' | 'resetting' | 'error';

const DemoControlPanel: React.FC = () => {
  const navigate  = useNavigate();
  const demoEnabled = import.meta.env.VITE_ENABLE_PUBLIC_DEMO === 'true';
  const demoSeedEnabled = import.meta.env.VITE_ENABLE_DEMO_SEED === 'true';
  const demoSeedSecret = import.meta.env.VITE_DEMO_SEED_SECRET;
  const [seedState, setSeedState] = useState<SeedState>('idle');
  const [seedLog, setSeedLog] = useState<string[]>([]);
  const [dataStats, setDataStats] = useState<Record<string, number>>({});
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  // Load quick stats
  useEffect(() => {
    if (!demoEnabled) return;
    Promise.all([
      supabase.from('properties').select('id', { count: 'exact', head: true }).eq('manager_id', '11111111-1111-1111-1111-111111111111'),
      supabase.from('tenants').select('id', { count: 'exact', head: true }).eq('manager_id', '11111111-1111-1111-1111-111111111111'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('manager_id', '11111111-1111-1111-1111-111111111111'),
      supabase.from('maintenance_requests').select('id', { count: 'exact', head: true }).eq('manager_id', '11111111-1111-1111-1111-111111111111'),
    ]).then(([p, t, i, m]) => {
      setDataStats({
        properties:  p.count ?? 0,
        tenants:     t.count ?? 0,
        invoices:    i.count ?? 0,
        maintenance: m.count ?? 0,
      });
    });
  }, [demoEnabled, seedState]);

  const copyToClipboard = (text: string, email: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const loginAs = async (account: DemoAccount) => {
    setLoggingIn(account.email);
    try {
      // Sign out first if logged in
      await supabase.auth.signOut();
      const { error } = await supabase.auth.signInWithPassword({
        email:    account.email,
        password: account.password,
      });
      if (error) throw error;
      navigate(account.portal);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setSeedLog([`❌ Login failed: ${message}`, 'Make sure demo data is seeded first → click ▶ SEED DEMO DATA']);
      setSeedState('error');
    } finally {
      setLoggingIn(null);
    }
  };

  const seedData = async () => {
    if (!demoSeedEnabled || !demoSeedSecret) {
      setSeedLog(['Demo seeding is disabled for this environment.']);
      setSeedState('error');
      return;
    }
    setSeedState('seeding');
    setSeedLog(['Seeding demo data...']);
    try {
      const { data, error } = await supabase.functions.invoke('seed-demo-data', {
        body: { action: 'seed' },
        headers: { 'X-Demo-Secret': demoSeedSecret },
      });
      if (error) throw error;
      setSeedLog(data?.results ?? ['Done']);
      setSeedState('done');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      setSeedLog([`Error: ${message}`]);
      setSeedState('error');
    }
  };

  const resetData = async () => {
    if (!demoSeedEnabled || !demoSeedSecret) {
      setSeedLog(['Demo reset is disabled for this environment.']);
      setSeedState('error');
      return;
    }
    if (!window.confirm('Reset all demo data? This will delete and re-create everything.')) return;
    setSeedState('resetting');
    setSeedLog(['Resetting demo data...']);
    try {
      const { error } = await supabase.functions.invoke('seed-demo-data', {
        headers: { 'X-Demo-Secret': demoSeedSecret },
      });
      if (error) throw error;
      setSeedLog(['✓ Reset complete. Re-seeding...']);
      await seedData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error';
      setSeedLog([`Error: ${message}`]);
      setSeedState('error');
    }
  };

  const hasData = dataStats.properties > 0;

  if (!demoEnabled) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0c0f',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        color: '#e2e8f0',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 520,
          background: '#0d1117',
          border: '1px solid #1e2d3d',
          borderRadius: 12,
          padding: 28,
        }}>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: '0.18em', marginBottom: 12 }}>
            RENTFLOW / DEMO DISABLED
          </div>
          <h1 style={{ color: '#f1f5f9', fontSize: 28, margin: 0, lineHeight: 1.15 }}>
            Demo access is not enabled for this environment.
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, marginTop: 14 }}>
            Enable it only in staging or demo deployments with VITE_ENABLE_PUBLIC_DEMO=true.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0c0f',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      color: '#e2e8f0',
      padding: '0',
    }}>
      {/* Header strip */}
      <div style={{
        borderBottom: '1px solid #1e2d3d',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#0d1117',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: hasData ? '#4ade80' : '#f87171',
            boxShadow: hasData ? '0 0 8px #4ade80' : '0 0 8px #f87171',
          }} />
          <span style={{ fontSize: 12, color: '#64748b', letterSpacing: '0.15em' }}>
            RENTFLOW / DEMO ENVIRONMENT
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Data health */}
          {Object.entries(dataStats).map(([k, v]) => (
            <span key={k} style={{ fontSize: 11, color: '#475569', letterSpacing: '0.1em' }}>
              {k.toUpperCase()}: <span style={{ color: v > 0 ? '#4ade80' : '#ef4444' }}>{v}</span>
            </span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 32px' }}>

        {/* Title */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, color: '#334155', letterSpacing: '0.3em', marginBottom: 12 }}>
            INTERACTIVE DEMO // ALL PASSWORDS: Demo@2026
          </div>
          <h1 style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#f1f5f9',
            margin: 0,
            lineHeight: 1.1,
          }}>
            RentFlow Demo<br />
            <span style={{ color: '#4f8ef7' }}>Control Panel</span>
          </h1>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
            Click any account to log in directly. Use the seed/reset controls to manage demo data state.
            All data resets to a clean scenario on demand.
          </p>
        </div>

        {/* Seed / Reset controls */}
        <div style={{
          background: '#0d1117',
          border: '1px solid #1e2d3d',
          borderRadius: 12,
          padding: 24,
          marginBottom: 40,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 24,
          flexWrap: 'wrap' as const,
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: '#334155', letterSpacing: '0.2em', marginBottom: 8 }}>
              DATA STATE
            </div>
            <div style={{ fontSize: 13, color: hasData ? '#4ade80' : '#f87171' }}>
              {hasData ? '● Demo data loaded' : '○ No demo data found'}
            </div>
            <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>
              {hasData
                ? `${dataStats.properties} props · ${dataStats.tenants} tenants · ${dataStats.invoices} invoices · ${dataStats.maintenance} jobs`
                : 'Run Seed to populate the database'
              }
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
            <button
              onClick={seedData}
              disabled={!demoSeedEnabled || seedState === 'seeding' || seedState === 'resetting'}
              style={{
                background: '#1a2744',
                border: '1px solid #4f8ef7',
                color: '#4f8ef7',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 12,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: !demoSeedEnabled || seedState === 'seeding' ? 0.5 : 1,
              }}
            >
              {seedState === 'seeding' ? '⟳ SEEDING...' : '▶ SEED DEMO DATA'}
            </button>

            <button
              onClick={resetData}
              disabled={!demoSeedEnabled || seedState === 'seeding' || seedState === 'resetting'}
              style={{
                background: '#2a1414',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '10px 20px',
                borderRadius: 8,
                fontSize: 12,
                letterSpacing: '0.1em',
                cursor: 'pointer',
                fontFamily: 'inherit',
                opacity: !demoSeedEnabled || seedState === 'resetting' ? 0.5 : 1,
              }}
            >
              {seedState === 'resetting' ? '⟳ RESETTING...' : '↺ RESET + RESEED'}
            </button>
          </div>

          {/* Seed log */}
          {seedLog.length > 0 && (
            <div style={{
              width: '100%',
              background: '#080c10',
              border: '1px solid #1e2d3d',
              borderRadius: 8,
              padding: '12px 16px',
              maxHeight: 160,
              overflowY: 'auto' as const,
            }}>
              {seedLog.map((line, i) => (
                <div key={i} style={{
                  fontSize: 11,
                  color: line.startsWith('✓') ? '#4ade80' : line.startsWith('⚠') ? '#fbbf24' : line.startsWith('Error') ? '#f87171' : '#64748b',
                  lineHeight: 1.8,
                }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Account cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {ACCOUNTS.map(account => (
            <AccountCard
              key={account.email}
              account={account}
              onLogin={() => loginAs(account)}
              onCopy={() => copyToClipboard(account.email, account.email)}
              copied={copiedEmail === account.email}
              isLoading={loggingIn === account.email}
            />
          ))}
        </div>

        {/* Demo scenario description */}
        <div style={{
          marginTop: 48,
          padding: 28,
          background: '#0d1117',
          border: '1px solid #1e2d3d',
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 11, color: '#334155', letterSpacing: '0.2em', marginBottom: 16 }}>
            DEMO SCENARIO
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {[
              { title: 'Properties', lines: [
                'Sunset Gardens — 4 flats, Westlands',
                'Valley View Bungalows — 3 units, Karen',
                'Westlands Office Complex — commercial',
              ]},
              { title: 'Payment states', lines: [
                'Grace (Flat A3): 1 overdue, 1 pending → trigger STK push',
                'Brian (Bungalow B1): all paid, 1 upcoming',
                'Amina (orphan): 3 self-logged cash/M-Pesa entries',
              ]},
              { title: 'Active workflows', lines: [
                'Maintenance: leaking tap (open), window lock (in-progress), electrical fault (urgent, assigned to Kamau)',
                'Messages: 3-message thread Grace ↔ James about overdue',
                'Service provider: Kamau Electrical (verified, 4.7★)',
              ]},
              { title: 'What to test', lines: [
                'Manager: Dashboard KPIs → Properties → Billing → Maintenance assign',
                'Tenant (Grace): Portal → overdue invoice → Pay via M-Pesa',
                'Orphan (Amina): Independent diary → log payment → condition photo',
                'Landlord: Dashboard → property statements → no tenant PII',
              ]},
            ].map(section => (
              <div key={section.title}>
                <div style={{ fontSize: 11, color: '#4f8ef7', marginBottom: 8, letterSpacing: '0.1em' }}>
                  {section.title.toUpperCase()}
                </div>
                {section.lines.map((line, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#64748b', lineHeight: 1.8 }}>
                    · {line}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: 'center' as const, color: '#1e2d3d', fontSize: 11, letterSpacing: '0.1em' }}>
          RENTFLOW DEMO // FOR TESTING ONLY // NOT REAL FINANCIAL DATA
        </div>
      </div>
    </div>
  );
};

// ── AccountCard component ────────────────────────────────────────────
const AccountCard: React.FC<{
  account: DemoAccount;
  onLogin: () => void;
  onCopy: () => void;
  copied: boolean;
  isLoading: boolean;
}> = ({ account, onLogin, onCopy, copied, isLoading }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: account.color,
        border: `1px solid ${hovered ? account.accent : '#1e2d3d'}`,
        borderRadius: 12,
        padding: 20,
        transition: 'border-color 0.15s, transform 0.1s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: 14,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, color: account.accent, letterSpacing: '0.2em', marginBottom: 4 }}>
            {account.badge}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>
            {account.label}
          </div>
        </div>
        <div style={{
          padding: '3px 8px',
          background: `${account.accent}22`,
          border: `1px solid ${account.accent}44`,
          borderRadius: 4,
          fontSize: 10,
          color: account.accent,
          letterSpacing: '0.1em',
          whiteSpace: 'nowrap' as const,
        }}>
          {account.portal}
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
        {account.description}
      </div>

      {/* Stats grid */}
      {account.stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {account.stats.map(s => (
            <div key={s.label} style={{
              background: '#00000033',
              borderRadius: 6,
              padding: '6px 10px',
            }}>
              <div style={{ fontSize: 9, color: '#334155', letterSpacing: '0.15em' }}>{s.label.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: account.accent, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Email row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1,
          background: '#00000044',
          borderRadius: 6,
          padding: '7px 10px',
          fontSize: 11,
          color: '#64748b',
          fontFamily: 'inherit',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' as const,
        }}>
          {account.email}
        </div>
        <button
          onClick={onCopy}
          style={{
            background: 'transparent',
            border: `1px solid #1e2d3d`,
            color: copied ? '#4ade80' : '#475569',
            padding: '7px 10px',
            borderRadius: 6,
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'color 0.15s',
            flexShrink: 0,
          }}
        >
          {copied ? '✓' : '⎘'}
        </button>
      </div>

      {/* Login button */}
      <button
        onClick={onLogin}
        disabled={isLoading}
        style={{
          background: isLoading ? '#1e2d3d' : account.accent,
          border: 'none',
          color: isLoading ? '#475569' : '#000',
          padding: '11px 16px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.1em',
          cursor: isLoading ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          transition: 'opacity 0.15s',
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? '⟳ LOGGING IN...' : `→ LOGIN AS ${account.badge}`}
      </button>
    </div>
  );
};

export default DemoControlPanel;
