import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CreditCard, AlertCircle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

interface StripeSettingsPublic {
  id?: string;
  stripe_enabled: boolean;
  publishable_key_prefix: string; // Only stores prefix (pk_live_ or pk_test_)
  currency: string;
  is_live: boolean;
  has_secret_key: boolean;
  has_webhook_secret: boolean;
}

interface StripeSettingsUpdate {
  stripe_enabled?: boolean;
  publishable_key?: string;
  secret_key?: string;
  webhook_secret?: string;
  currency?: string;
  is_live?: boolean;
}

const defaultSettings: StripeSettingsPublic = {
  stripe_enabled: false,
  publishable_key_prefix: '',
  currency: 'KES',
  is_live: false,
  has_secret_key: false,
  has_webhook_secret: false,
};

interface StripeSettingsProps {
  propertyId?: string | null;
  propertyName?: string;
}

async function fetchStripeSettings(propertyId?: string | null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  
  const res = await supabase.functions.invoke('manage-stripe-settings', {
    method: 'GET',
    body: { propertyId: propertyId ?? null },
  });
  
  if (res.error) {
    throw new Error(res.error.message || 'Failed to load Stripe settings');
  }
  
  return res.data as StripeSettingsPublic;
}

export const StripeSettings = ({ propertyId, propertyName }: StripeSettingsProps = {}) => {
  const { user } = useAuth();
  const scopeLabel = propertyName
    ? `Property: ${propertyName}`
    : propertyId
      ? 'This property'
      : 'Company default (all properties without their own account)';
  
  const [settings, setSettings] = useState<StripeSettingsPublic>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const [credentialInputs, setCredentialInputs] = useState({
    publishable_key: '',
    secret_key: '',
    webhook_secret: '',
  });
  
  const [showSecrets, setShowSecrets] = useState({
    publishable_key: false,
    secret_key: false,
    webhook_secret: false,
  });

  const fetchSettings = useCallback(async () => {
    try {
      const data = await fetchStripeSettings(propertyId ?? null);
      if (data) setSettings(data);
    } catch {
      toast.error('Failed to load Stripe settings');
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const updateData: StripeSettingsUpdate = {
        propertyId: propertyId ?? null,
        stripe_enabled: settings.stripe_enabled,
        currency: settings.currency,
        is_live: settings.is_live,
      };

      if (credentialInputs.publishable_key) {
        updateData.publishable_key = credentialInputs.publishable_key;
      }
      if (credentialInputs.secret_key) {
        updateData.secret_key = credentialInputs.secret_key;
      }
      if (credentialInputs.webhook_secret) {
        updateData.webhook_secret = credentialInputs.webhook_secret;
      }

      const response = await supabase.functions.invoke('manage-stripe-settings', {
        method: 'POST',
        body: updateData,
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data?.settings) {
        setSettings(response.data.settings);
        setCredentialInputs({
          publishable_key: '',
          secret_key: '',
          webhook_secret: '',
        });
      }

      toast.success('Stripe settings saved successfully');
    } catch (error) {
      toast.error('Failed to save Stripe settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!user) return;

    setIsTesting(true);
    try {
      const response = await supabase.functions.invoke('test-stripe-connection', {
        method: 'POST',
        body: { propertyId: propertyId ?? null },
      });

      if (response.error) {
        throw response.error;
      }

      toast.success('Stripe connection test successful');
    } catch (error) {
      toast.error('Stripe connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const toggleShowSecret = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const CredentialStatus = ({ isConfigured, label }: { isConfigured: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {isConfigured ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Configured
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <XCircle className="h-3 w-3 mr-1" />
          Not Set
        </Badge>
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );

  const renderCredentialInput = (
    label: string,
    field: keyof typeof credentialInputs,
    isConfigured: boolean,
    placeholder: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={field}>{label}</Label>
        <CredentialStatus isConfigured={isConfigured} label="" />
      </div>
      <div className="relative">
        <Input
          id={field}
          type={showSecrets[field] ? 'text' : 'password'}
          value={credentialInputs[field]}
          onChange={(e) => setCredentialInputs(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={isConfigured ? "Enter new value to update..." : placeholder}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full"
          onClick={() => toggleShowSecret(field)}
        >
          {showSecrets[field] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
      {isConfigured && (
        <p className="text-xs text-muted-foreground">
          Leave empty to keep current value
        </p>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const stripeWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Stripe Payment Settings
        </CardTitle>
        <CardDescription>
          {scopeLabel} — Accept credit card payments via Stripe. Ideal for international tenants and larger payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            To use Stripe payments, you need a{' '}
            <a 
              href="https://dashboard.stripe.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Stripe account
            </a>
            {' '}with API keys and webhook endpoint configured.
          </AlertDescription>
        </Alert>

        {/* Environment Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Production Mode</Label>
            <p className="text-sm text-muted-foreground">
              {settings.is_live ? 'Using live Stripe API (real transactions)' : 'Using test mode (test transactions only)'}
            </p>
          </div>
          <Switch
            checked={settings.is_live}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_live: checked }))}
          />
        </div>

        {/* Enable Stripe */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label>Enable Stripe Payments</Label>
            <p className="text-sm text-muted-foreground">
              Accept credit card payments via Stripe checkout
            </p>
          </div>
          <Switch
            checked={settings.stripe_enabled}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, stripe_enabled: checked }))}
          />
        </div>

        {settings.stripe_enabled && (
          <div className="space-y-4 pl-4 border-l-2">
            {/* Currency Selection */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={settings.currency}
                onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">Kenyan Shilling (KES)</SelectItem>
                  <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                  <SelectItem value="GBP">British Pound (GBP)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Credentials */}
            <div className="space-y-4">
              <h3 className="font-medium">Stripe API Credentials</h3>
              <p className="text-sm text-muted-foreground">
                Your credentials are stored securely and never exposed to your browser.
              </p>
              
              {renderCredentialInput(
                'Publishable Key', 
                'publishable_key', 
                settings.has_secret_key, 
                'pk_live_... or pk_test_...'
              )}
              
              {renderCredentialInput(
                'Secret Key', 
                'secret_key', 
                settings.has_secret_key, 
                'sk_live_... or sk_test_...'
              )}
              
              {renderCredentialInput(
                'Webhook Secret', 
                'webhook_secret', 
                settings.has_webhook_secret, 
                'whsec_...'
              )}
            </div>

            {/* Webhook Setup Instructions */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2">
              <p className="text-xs font-semibold text-blue-900">Stripe Webhook Setup</p>
              <p className="text-xs text-blue-800">
                Register this webhook URL in your Stripe Dashboard so payment events are automatically processed:
              </p>
              <div className="flex items-center gap-2 bg-white rounded border border-blue-200 px-2 py-1.5">
                <code className="text-xs font-mono text-blue-900 flex-1 break-all">
                  {stripeWebhookUrl}
                </code>
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-800 shrink-0 font-medium"
                  onClick={() => {
                    navigator.clipboard.writeText(stripeWebhookUrl);
                    toast.success('Webhook URL copied to clipboard');
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-blue-700">
                In Stripe Dashboard → Developers → Webhooks, add this endpoint and select events:
                <br />
                <code className="text-xs">invoice.payment_failed, charge.failed, charge.refunded, checkout.session.completed</code>
              </p>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-3 w-3 text-blue-600" />
                <a
                  href="https://dashboard.stripe.com/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Open Stripe Webhooks Dashboard
                </a>
              </div>
            </div>

            {/* Test Connection */}
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || !settings.has_secret_key}
              variant="outline"
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Stripe Connection'
              )}
            </Button>
          </div>
        )}

        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Stripe Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
