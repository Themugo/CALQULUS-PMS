import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'tenant_claim_token';

interface ClaimPreview {
  manager_name: string | null;
  property_name: string | null;
  unit_number: string | null;
  expires_at: string;
}

/** Reads the one-time token from the URL fragment (never sent to a server) and removes it from the address bar. */
function readToken(): string | null {
  try {
    const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('t');
    if (fromHash && /^[0-9a-f]{64}$/.test(fromHash)) {
      sessionStorage.setItem(STORAGE_KEY, fromHash);
      window.history.replaceState(null, '', window.location.pathname);
      return fromHash;
    }
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored && /^[0-9a-f]{64}$/.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

const clearToken = () => {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
};

/**
 * A tenant reviews and approves (or declines) a manager's request to associate
 * their account with a property. Server-side RPCs enforce identity binding,
 * expiry and single use; this page only presents the choice.
 */
const TenantClaimConsent = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [token] = useState<string | null>(() => readToken());
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'done' | 'declined'>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!token) { setState('invalid'); return; }
    if (!user) return; // prompt to sign in below
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('preview_tenant_claim', { p_token: token });
      if (cancelled) return;
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) { setState('invalid'); return; }
      setPreview(row as ClaimPreview);
      setState('ready');
    })();
    return () => { cancelled = true; };
  }, [loading, token, user]);

  const respond = async (accept: boolean) => {
    if (!token) return;
    setBusy(true);
    const { data, error } = accept
      ? await supabase.rpc('accept_tenant_claim', { p_token: token })
      : await supabase.rpc('decline_tenant_claim', { p_token: token });
    setBusy(false);
    // accept returns NULL when the request expired or is no longer valid.
    if (error || (accept && !data)) { clearToken(); setState('invalid'); return; }
    clearToken();
    setState(accept ? 'done' : 'declined');
  };

  const shell = (children: React.ReactNode) => (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-10">
      <div className="flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" aria-hidden /><h1 className="font-heading text-xl font-semibold">Property association request</h1></div>
      {children}
    </main>
  );

  if (loading || (state === 'loading' && user)) {
    return shell(<p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" /> Checking your request…</p>);
  }
  if (!user && token) {
    return shell(
      <>
        <p className="text-sm text-muted-foreground">Sign in with the email address this request was sent to, then reopen this page.</p>
        <Button asChild><Link to="/tenant/login">Sign in</Link></Button>
      </>,
    );
  }
  if (state === 'invalid') {
    return shell(
      <>
        <p className="text-sm text-muted-foreground" role="alert">This request is invalid, expired, or was sent to a different account.</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go to my account</Button>
      </>,
    );
  }
  if (state === 'done' || state === 'declined') {
    return shell(
      <>
        <p className="text-sm" role="status">{state === 'done' ? 'Done. Your account is now linked to this property.' : 'You declined the request. Nothing was changed.'}</p>
        <Button onClick={() => navigate('/')}>Continue</Button>
      </>,
    );
  }
  return shell(
    <>
      <p className="text-sm text-muted-foreground">
        {preview?.manager_name ?? 'A property manager'} asked to add you to <strong>{preview?.property_name ?? 'a property'}</strong>
        {preview?.unit_number ? <> (unit {preview.unit_number})</> : null}. Nothing changes unless you approve.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => respond(true)} disabled={busy}>Approve</Button>
        <Button variant="outline" onClick={() => respond(false)} disabled={busy}>Decline</Button>
      </div>
    </>,
  );
};

export default TenantClaimConsent;
