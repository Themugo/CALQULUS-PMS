import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { Mail, CheckCircle, Lock } from 'lucide-react';

interface ForgotPasswordDialogProps {
  trigger?: React.ReactNode;
  variant?: 'default' | 'landlord' | 'tenant';
}

const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({
  trigger,
  variant = 'default',
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const portal = variant === 'tenant' ? 'tenant' : 'manager';
    const redirectUrl = `${window.location.origin}/reset-password?portal=${portal}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setEmailSent(true);
    }
    setIsSubmitting(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => { setEmail(''); setEmailSent(false); }, 300);
  };

  // All variants now use the same clean CALQULUS design system
  const isDark = variant !== 'default';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button type="button" className="text-amber-600 hover:text-amber-500 text-sm font-medium">
            Forgot password?
          </button>
        )}
      </DialogTrigger>
      <DialogContent className={isDark
        ? 'border-white/10 bg-[#0F1E36] backdrop-blur-xl text-white'
        : ''}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-amber-400/15 border border-amber-400/25 flex items-center justify-center shadow-sm">
              {emailSent
                ? <CheckCircle className="h-6 w-6 text-emerald-400" />
                : <Mail className="h-6 w-6 text-amber-400" />
              }
            </div>
          </div>
          <DialogTitle className={`text-center ${isDark ? 'text-white' : ''}`}>
            {emailSent ? 'Check your email' : 'Reset your password'}
          </DialogTitle>
          <DialogDescription className={`text-center ${isDark ? 'text-white/50' : ''}`}>
            {emailSent
              ? `We sent a reset link to ${email}`
              : "Enter your email and we'll send a link to reset your password."
            }
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="space-y-4 py-2">
            <p className={`text-sm text-center ${isDark ? 'text-white/40' : 'text-muted-foreground'}`}>
              Didn't receive it? Check your spam folder or try again.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className={`flex-1 ${isDark ? 'border-white/15 text-white/70 hover:bg-white/8' : ''}`}
                onClick={() => setEmailSent(false)}>
                Try again
              </Button>
              <Button className="flex-1 btn-brand font-semibold" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className={isDark ? 'text-white/70' : ''}>
                Email address
              </Label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-white/30' : 'text-muted-foreground/50'}`} />
                <Input
                  id="reset-email" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  className={`pl-9 ${isDark
                    ? 'bg-white/8 border-white/15 text-white placeholder:text-white/30 focus:border-amber-400/60 focus:ring-amber-400/20'
                    : ''
                  }`}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline"
                className={`flex-1 ${isDark ? 'border-white/15 text-white/70 hover:bg-white/8' : ''}`}
                onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 btn-brand font-semibold" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
