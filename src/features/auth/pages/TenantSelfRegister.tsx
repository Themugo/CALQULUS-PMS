import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import {
  CheckCircle, XCircle, Eye, EyeOff, ChevronRight,
  User, Home, KeyRound, Loader2,
} from 'lucide-react';
import calqulusLogo from '@/assets/calqulus-logo-new.png';

const STEPS = [
  { id: 'verify', title: 'Verify invite',  icon: KeyRound },
  { id: 'profile', title: 'Your details', icon: User     },
  { id: 'done',    title: 'All set!',      icon: CheckCircle },
];

const TenantSelfRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') ?? '');
  const [inviteData, setInviteData] = useState<{ id: string; email: string; unit?: string; property?: string } | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getPasswordStrength = (pw: string) => ({
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  });
  const strength = getPasswordStrength(password);

  const verifyInvite = async () => {
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_invitations')
        .select('id, email, unit, property, status')
        .eq('invite_code', inviteCode.trim())
        .eq('status', 'pending')
        .maybeSingle();
      if (error || !data) throw new Error('Invalid or expired invitation code');
      setInviteData({ id: data.id, email: data.email, unit: data.unit, property: data.property });
      setEmail(data.email ?? '');
      setStep(1);
    } catch (err) {
      toast({ title: 'Invalid code', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const createAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteData) return;
    setIsLoading(true);
    try {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, phone } },
      });
      if (signUpError) throw signUpError;
      if (data.user) {
        await supabase.from('tenant_invitations')
          .update({ status: 'accepted', accepted_by: data.user.id, accepted_at: new Date().toISOString() })
          .eq('id', inviteData.id);
      }
      setStep(2);
    } catch (err) {
      toast({ title: 'Registration failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (inviteCode && searchParams.get('code')) verifyInvite();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center hero-gradient px-4 py-12">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `linear-gradient(hsl(42 51% 55% / 0.5) 1px, transparent 1px),
                          linear-gradient(90deg, hsl(42 51% 55% / 0.5) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      <div className="relative z-10 w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-12 w-auto object-contain" />
        </div>
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-white mb-2">Create your tenant account</h1>
          <p className="text-white/50 text-sm">You've been invited to join CALQULUS PMS</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6 px-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                    active ? 'bg-amber-400 border-amber-400 text-slate-900' :
                             'bg-white/5 border-white/15 text-white/30'
                  }`}>
                    {done ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-white/30'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-3 mb-5 transition-colors ${i < step ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.round((step / (STEPS.length - 1)) * 100)}%` }} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-xl p-6 sm:p-8 shadow-2xl">

          {/* Step 0 — Verify invite */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-heading text-lg font-bold text-white mb-1">Enter your invitation code</h2>
                <p className="text-sm text-white/50">Your property manager sent this to you via email or SMS.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-sm">Invitation code</Label>
                <Input
                  value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. INV-2A4F8C"
                  className="bg-white/8 border-white/15 text-white font-mono tracking-widest placeholder:text-white/30 placeholder:tracking-normal focus:border-amber-400/60 h-11 text-center text-lg"
                />
              </div>
              <Button className="w-full h-11 btn-brand font-bold" onClick={verifyInvite}
                disabled={isLoading || !inviteCode.trim()}>
                {isLoading
                  ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying…</span>
                  : <span className="flex items-center gap-2">Verify Code <ChevronRight className="h-4 w-4" /></span>
                }
              </Button>
              <p className="text-xs text-white/30 text-center">
                Already have an account?{' '}
                <button onClick={() => navigate('/tenant/login')} className="text-amber-400/70 hover:text-amber-400 transition-colors">
                  Sign in here
                </button>
              </p>
            </div>
          )}

          {/* Step 1 — Profile */}
          {step === 1 && inviteData && (
            <form onSubmit={createAccount} className="space-y-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-white mb-0.5">Complete your profile</h2>
                <p className="text-sm text-white/50">
                  {inviteData.unit && inviteData.property
                    ? `Joining ${inviteData.property} · ${inviteData.unit}`
                    : 'Set up your account to access the tenant portal'}
                </p>
              </div>

              {/* Invite summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8">
                <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-emerald-300">Invitation verified</p>
                  <p className="text-xs text-white/50 truncate">{inviteData.email}</p>
                </div>
              </div>

              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Full name <span className="text-red-400">*</span></Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Wanjiru"
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-10" />
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Phone number</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712 345 678"
                  className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-10" />
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Email address <span className="text-red-400">*</span></Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="bg-white/8 border-white/15 text-white focus:border-amber-400/60 h-10" />
              </div>
              <div>
                <Label className="text-white/70 text-sm mb-1.5 block">Password <span className="text-red-400">*</span></Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    required minLength={8} placeholder="Min. 8 characters"
                    className="bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 h-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password && (
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {[
                      { pass: strength.length,  label: '8+ chars' },
                      { pass: strength.upper,   label: 'Uppercase' },
                      { pass: strength.lower,   label: 'Lowercase' },
                      { pass: strength.number,  label: 'Number' },
                    ].map((c, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-xs ${c.pass ? 'text-emerald-400' : 'text-white/30'}`}>
                        {c.pass ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1 border-white/15 text-white/60 hover:bg-white/8 h-11"
                  onClick={() => setStep(0)}>Back</Button>
                <Button type="submit" className="flex-1 h-11 btn-brand font-bold" disabled={isLoading}>
                  {isLoading
                    ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creating…</span>
                    : <span className="flex items-center gap-2">Create Account <ChevronRight className="h-4 w-4" /></span>
                  }
                </Button>
              </div>
            </form>
          )}

          {/* Step 2 — Done */}
          {step === 2 && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
              </div>
              <div>
                <h2 className="font-heading text-2xl font-bold text-white mb-2">Account created!</h2>
                <p className="text-white/50 text-sm">Sign in to access your tenant portal and view your invoices, documents, and maintenance requests.</p>
              </div>
              <Button className="w-full h-12 btn-brand font-bold gap-2" onClick={() => navigate('/tenant/login')}>
                <Home className="h-4 w-4" /> Go to tenant login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantSelfRegister;
