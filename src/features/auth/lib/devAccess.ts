// Open-access (no-login) development mode.
//
// When enabled the app:
//   1. Silently signs into the default dev account on boot (no login wall).
//   2. Skips login redirects and approval/role guards so every portal is
//      reachable without limitations.
//   3. Shows the 1-click account switcher for jumping between all portals.
//
// Enabled when VITE_ENABLE_DEV_ACCESS=true (any environment) OR automatically
// in local dev (import.meta.env.DEV). Intended for development/staging only.

export interface DevPresetAccount {
  role: 'manager' | 'webhost' | 'tenant' | 'agency' | 'landlord';
  label: string;
  email: string;
  password: string;
  defaultPath: string;
}

export const DEV_PRESET_ACCOUNTS: DevPresetAccount[] = [
  {
    role: 'manager',
    label: 'Manager (Full Ops)',
    email: 'jimmythemugo@gmail.com',
    password: 'CALQULUS RMS@2026!',
    defaultPath: '/',
  },
  {
    role: 'webhost',
    label: 'Webhost / Admin',
    email: 'mugo.james27@gmail.com',
    password: 'CALQULUS RMS@2026!',
    defaultPath: '/webhost',
  },
  {
    role: 'tenant',
    label: 'Tenant Portal',
    email: 'kamauwamakena@gmail.com',
    password: 'CALQULUS RMS@2026!',
    defaultPath: '/portal',
  },
  {
    role: 'agency',
    label: 'Agency Portal',
    email: 'demo.manager@calqulusrms.com',
    password: 'Demo@2026',
    defaultPath: '/agency',
  },
  {
    role: 'landlord',
    label: 'Landlord Portal',
    email: 'demo.landlord@calqulusrms.com',
    password: 'Demo@2026',
    defaultPath: '/landlord/dashboard',
  },
];

export function isDevAccessEnabled(): boolean {
  if (import.meta.env.VITE_ENABLE_DEV_ACCESS === 'true') return true;
  return import.meta.env.DEV;
}

/** Account used for the silent auto-login. Defaults to the Manager account. */
export function getDevDefaultAccount(): DevPresetAccount {
  const base = DEV_PRESET_ACCOUNTS.find((a) => a.role === 'manager') ?? DEV_PRESET_ACCOUNTS[0];
  const overrideEmail = import.meta.env.VITE_DEV_ACCESS_EMAIL;
  const overridePassword = import.meta.env.VITE_DEV_ACCESS_PASSWORD;
  if (!overrideEmail && !overridePassword) return base;
  return {
    ...base,
    email: overrideEmail || base.email,
    password: overridePassword || base.password,
  };
}
