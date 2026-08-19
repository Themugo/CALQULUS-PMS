// Open-access (no-login) development mode.
//
// When enabled the app:
//   1. Silently signs into the default dev account on boot (no login wall).
//   2. Skips login redirects and approval/role guards so every portal is
//      reachable without limitations.
//   3. Shows the 1-click account switcher for jumping between all portals.
//
// Production builds NEVER enable this, including when VITE_ENABLE_DEV_ACCESS
// is set. Preset passwords are omitted from the production bundle.

export interface DevPresetAccount {
  role: 'manager' | 'webhost' | 'tenant' | 'agency' | 'landlord';
  label: string;
  email: string;
  password: string;
  defaultPath: string;
}

export interface DevAccessEnv {
  PROD: boolean;
  DEV: boolean;
  VITE_ENABLE_DEV_ACCESS?: string;
}

/** Pure gate used by tests. Production (`PROD`) always wins. */
export function isDevAccessEnabledFromEnv(env: DevAccessEnv): boolean {
  if (env.PROD) return false;
  if (env.VITE_ENABLE_DEV_ACCESS === "false") return false;
  if (env.VITE_ENABLE_DEV_ACCESS === "true") return true;
  return env.DEV;
}

export const DEV_PRESET_ACCOUNTS: DevPresetAccount[] = import.meta.env.PROD
  ? []
  : [
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
  return isDevAccessEnabledFromEnv({
    PROD: import.meta.env.PROD,
    DEV: import.meta.env.DEV,
    VITE_ENABLE_DEV_ACCESS: import.meta.env.VITE_ENABLE_DEV_ACCESS,
  });
}

/** Account used for the silent auto-login. Defaults to the Manager account. */
const EMPTY_DEV_ACCOUNT: DevPresetAccount = {
  role: 'manager',
  label: '',
  email: '',
  password: '',
  defaultPath: '/',
};

export function getDevDefaultAccount(): DevPresetAccount {
  const base = DEV_PRESET_ACCOUNTS.find((a) => a.role === 'manager') ?? DEV_PRESET_ACCOUNTS[0] ?? EMPTY_DEV_ACCOUNT;
  const overrideEmail = import.meta.env.VITE_DEV_ACCESS_EMAIL;
  const overridePassword = import.meta.env.VITE_DEV_ACCESS_PASSWORD;
  if (!overrideEmail && !overridePassword) return base;
  return {
    ...base,
    email: overrideEmail || base.email,
    password: overridePassword || base.password,
  };
}
