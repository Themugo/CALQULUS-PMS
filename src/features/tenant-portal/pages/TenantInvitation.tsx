import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link2, ArrowRight, Home, CheckCircle2, AlertCircle, Loader2, ClipboardPaste, Mail, Phone } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

interface InvitationDetails {
  id: string;
  email: string;
  tenant_name: string;
  property_id: string;
  property_name: string;
  unit: string;
  status: string;
  expires_at: string;
  invited_by: string;
}

interface LandlordContact {
  full_name: string | null;
  email: string;
  phone: string | null;
}

const TenantInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invitationLink, setInvitationLink] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [landlordContact, setLandlordContact] = useState<LandlordContact | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Check if there's a token in URL params
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      const signupUrl = new URL('/tenant/signup', window.location.origin);
      signupUrl.searchParams.set('token', token);
      setInvitationLink(signupUrl.toString());
      validateToken(token);
    }
  }, [searchParams]);

  const extractToken = (input: string): string | null => {
    // Handle full URLs
    const urlMatch = input.match(/[?&]token=([a-f0-9-]+)/i);
    if (urlMatch) return urlMatch[1];
    
    // Handle direct token (UUID format)
    const uuidMatch = input.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i);
    if (uuidMatch) return uuidMatch[0];
    
    return null;
  };

  const validateToken = async (token: string) => {
    setIsValidating(true);
    setError(null);
    setInvitationDetails(null);
    setLandlordContact(null);
    
    try {
      const { data, error: rpcError } = await supabase.rpc('validate_invitation_token', {
        token_value: token
      });
      
      if (rpcError) {
        throw new Error(rpcError.message);
      }
      
      if (!data || data.length === 0) {
        setError('Invalid or expired invitation link. Please contact your property manager for a new invitation.');
        return;
      }
      
      const invitation = data[0] as InvitationDetails;
      
      if (invitation.status === 'used') {
        setError('This invitation has already been used. Please log in to your tenant portal.');
        return;
      }
      
      if (new Date(invitation.expires_at) < new Date()) {
        setError('This invitation has expired. Please contact your property manager for a new invitation.');
        return;
      }
      
      setInvitationDetails(invitation);
      
      // Fetch landlord contact details
      if (invitation.invited_by) {
        const { data: landlordData } = await supabase
          .from('profiles')
          .select('full_name, email, phone')
          .eq('id', invitation.invited_by)
          .single();
        
        if (landlordData) {
          setLandlordContact(landlordData);
        }
      }
    } catch (err: any) {
      setError('Unable to validate invitation. Please check the link and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInvitationLink(text);
      
      const token = extractToken(text);
      if (token) {
        validateToken(token);
      }
    } catch (err) {
      toast({
        title: "Clipboard access denied",
        description: "Please paste the link manually",
        variant: "destructive"
      });
    }
  };

  const handleValidate = () => {
    const token = extractToken(invitationLink);
    if (!token) {
      setError('Invalid invitation format. Please paste the complete invitation link.');
      return;
    }
    validateToken(token);
  };

  const handleProceedToSignup = () => {
    const token = extractToken(invitationLink);
    if (token) {
      navigate(`/tenant/signup?token=${token}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Link2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Join Your Property</CardTitle>
            <CardDescription className="text-base mt-2">
              Paste your invitation link to get started with RentFlow
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Paste Link Section */}
          <div className="space-y-3">
            <Label htmlFor="invitation-link">Invitation Link</Label>
            <div className="flex gap-2">
              <Input
                id="invitation-link"
                placeholder="Paste your invitation link here..."
                value={invitationLink}
                onChange={(e) => {
                  setInvitationLink(e.target.value);
                  setError(null);
                  setInvitationDetails(null);
                  setLandlordContact(null);
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePasteLink}
                title="Paste from clipboard"
              >
                <ClipboardPaste className="h-4 w-4" />
              </Button>
            </div>
            
            {!invitationDetails && !isValidating && (
              <Button
                onClick={handleValidate}
                disabled={!invitationLink.trim()}
                className="w-full"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Validate Link'
                )}
              </Button>
            )}
          </div>

          {/* Loading State */}
          {isValidating && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success State - Show invitation details */}
          {invitationDetails && (
            <div className="space-y-4">
              <Alert className="border-primary/50 bg-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary">
                  Valid invitation found!
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-foreground">Invitation Details</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{invitationDetails.tenant_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Property:</span>
                    <span className="font-medium">{invitationDetails.property_name}</span>
                  </div>
                  {invitationDetails.unit && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Unit:</span>
                      <span className="font-medium">{invitationDetails.unit}</span>
                    </div>
                  )}
                  {invitationDetails.email && !invitationDetails.email.includes('placeholder') && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{invitationDetails.email}</span>
                    </div>
                  )}
                </div>
                
                {/* Landlord Contact Section */}
                {landlordContact && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h5 className="font-medium text-foreground mb-2 text-sm">Your Landlord/Manager:</h5>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{landlordContact.full_name || 'Property Manager'}</p>
                      {landlordContact.email && (
                        <a 
                          href={`mailto:${landlordContact.email}`}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Mail className="h-4 w-4" />
                          {landlordContact.email}
                        </a>
                      )}
                      {landlordContact.phone && (
                        <a 
                          href={`tel:${landlordContact.phone}`}
                          className="flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          <Phone className="h-4 w-4" />
                          {landlordContact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <Button
                onClick={handleProceedToSignup}
                className="w-full"
                size="lg"
              >
                Continue to Sign Up
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Footer Links */}
          <div className="pt-4 border-t border-border space-y-3 text-center text-sm">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <a 
                href="/tenant/login" 
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </a>
            </p>
            
            <a 
              href="/" 
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to home
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantInvitation;
