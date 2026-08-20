import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Loader2, Building2, Upload, X, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { logError, toUserFacingError } from "@/shared/lib/errorLogger";
import { useAuth } from "@/features/auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import type { Json } from "@/integrations/supabase/types";
import { invalidateManagerActivation } from "@/features/dashboard/hooks/useManagerActivation";
import { imageExtension, publicStoragePath } from "@/features/settings/lib/storagePaths";
import { useSignedStorageUrl } from "@/shared/hooks/useSignedStorageUrl";
import { Switch } from "@/shared/components/ui/switch";
import { useFeatureAccess } from "@/shared/hooks/useFeatureAccess";
import { CALQULUS_COLOR } from "@/shared/theme/tokens";
import { ALLOWED_FONTS, type AllowedFont } from "@/core/brand/BrandConfig";
import { compactBrandOverlay } from "@/core/brand/parseOrgRecord";
import { isHexColor } from "@/core/brand/resolve";
import { deriveBrandPalette } from "@/core/design/deriveBrandPalette";

function nestedString(root: unknown, path: string[]): string {
  let cur: unknown = root;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" ? cur : "";
}

function asAllowedFont(value: string): AllowedFont {
  return (ALLOWED_FONTS as readonly string[]).includes(value) ? (value as AllowedFont) : "Outfit";
}

// Helper to get current user ID for manager_user_id

export const CompanySettings = () => {
  const { toast } = useToast();
  const { isAgency, isManager, user } = useAuth();
  const canManageCompany = isManager || isAgency;
  const { enabled: whiteLabelOnPlan } = useFeatureAccess("white_label");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [county, setCounty] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyWhatsapp, setCompanyWhatsapp] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [kraPin, setKraPin] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [brandPrimaryHex, setBrandPrimaryHex] = useState<string>(CALQULUS_COLOR.primary);
  const [whiteLabelEnabled, setWhiteLabelEnabled] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [tagline, setTagline] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [logoDarkUrl, setLogoDarkUrl] = useState("");
  const [headingFont, setHeadingFont] = useState<AllowedFont>("Outfit");
  const [emailFromName, setEmailFromName] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [legalFooter, setLegalFooter] = useState("");
  const [privacyUrl, setPrivacyUrl] = useState("");
  const [termsUrl, setTermsUrl] = useState("");
  const [termProperty, setTermProperty] = useState("");
  const [termTenant, setTermTenant] = useState("");
  const [termLandlord, setTermLandlord] = useState("");
  const [termManager, setTermManager] = useState("");
  const [invoiceTitle, setInvoiceTitle] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const displayLogoUrl = useSignedStorageUrl(logoUrl);
  const brandPalette = useMemo(() => deriveBrandPalette(brandPrimaryHex), [brandPrimaryHex]);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!canManageCompany) {
        setLoading(false);
        return;
      }

      try {
        // Load core company settings
        const { data, error } = await supabase
          .from("company_settings")
          .select("*")
          .eq("manager_user_id", user!.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setCompanyId(data.id);
          setCompanyName(data.company_name || "");
          setAddress(data.address || "");
          setCity(data.city || "");
          setState(data.state || "");
          setZipCode(data.zip_code || "");
          setCompanyEmail(data.email || "");
          setCompanyPhone(data.phone || "");
          setCompanyWebsite(data.website || "");
          setLogoUrl(data.logo_url || null);
          setBrandPrimaryHex(
            typeof data.brand_primary_hex === "string" && isHexColor(data.brand_primary_hex)
              ? data.brand_primary_hex
              : CALQULUS_COLOR.primary,
          );
          setWhiteLabelEnabled(data.white_label_enabled === true);
          const overlay = data.brand_config;
          setLegalName(nestedString(overlay, ["identity", "legalName"]));
          setTagline(nestedString(overlay, ["identity", "tagline"]));
          setFaviconUrl(nestedString(overlay, ["identity", "favicon"]));
          setLogoDarkUrl(nestedString(overlay, ["identity", "logoDark"]));
          setHeadingFont(asAllowedFont(nestedString(overlay, ["typography", "heading"])));
          setEmailFromName(nestedString(overlay, ["communications", "email", "fromName"]));
          setSmsSenderId(nestedString(overlay, ["communications", "sms", "senderId"]));
          setCustomDomain(nestedString(overlay, ["domains", "customDomain"]));
          setLegalFooter(nestedString(overlay, ["legal", "footer"]));
          setPrivacyUrl(nestedString(overlay, ["legal", "privacyUrl"]));
          setTermsUrl(nestedString(overlay, ["legal", "termsUrl"]));
          setTermProperty(nestedString(overlay, ["terminology", "property"]));
          setTermTenant(nestedString(overlay, ["terminology", "tenant"]));
          setTermLandlord(nestedString(overlay, ["terminology", "landlord"]));
          setTermManager(nestedString(overlay, ["terminology", "manager"]));
          setInvoiceTitle(nestedString(overlay, ["documents", "invoices", "title"]));
          setReceiptFooter(nestedString(overlay, ["documents", "receipts", "footerNote"]));
        }

        // Load extended fields from agencies table (migration 014)
        if (user?.id) {
          const { data: agency } = await (supabase.from('agencies')
            .select('phone, email, address, county, kra_pin, registration_number, whatsapp, website')
            .eq('manager_id', user.id)
            .maybeSingle());
          if (agency) {
            const a = agency as { whatsapp?: string; county?: string; kra_pin?: string; registration_number?: string; phone?: string; email?: string; address?: string };
            setCompanyWhatsapp(a.whatsapp || "");
            setCounty(a.county || "");
            setKraPin(a.kra_pin || "");
            setRegistrationNumber(a.registration_number || "");
            const d = data as { phone?: string; email?: string; address?: string } | null;
            if (!d?.phone)   setCompanyPhone(a.phone || "");
            if (!d?.email)   setCompanyEmail(a.email || "");
            if (!d?.address) setAddress(a.address || "");
          }
        }
      } catch (error) {
        toast({
          title: "Company Settings Load Failed",
          description: error instanceof Error ? error.message : "Could not load company settings.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCompanySettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageCompany, user?.id]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      if (!user?.id) throw new Error("You must be signed in to upload a logo.");

      const fileExt = imageExtension(file);
      const fileName = `${user.id}/logo.${fileExt}`;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = publicStoragePath(logoUrl, "company-logos");
        if (oldPath && oldPath !== fileName) {
          const { error: removeError } = await supabase.storage.from("company-logos").remove([oldPath]);
          if (removeError) logError("CompanySettings.logoCleanup", removeError);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(fileName, file, { cacheControl: "3600", contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(fileName);

      const newLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update database
      const { data: company, error: updateError } = await supabase
        .from("company_settings")
        .upsert({
          id: companyId ?? undefined,
          manager_user_id: user.id,
          company_name: companyName || "My Company",
          address,
          city,
          state,
          zip_code: zipCode,
          email: companyEmail,
          phone: companyPhone,
          website: companyWebsite,
          logo_url: newLogoUrl,
        })
        .select("id")
        .single();
      if (updateError) throw updateError;
      setCompanyId(company.id);
      setLogoUrl(newLogoUrl);

      toast({
        title: "Logo Uploaded",
        description: "Company logo has been updated.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl || !companyId) return;

    setUploading(true);
    try {
      // Delete from storage
      const fileName = publicStoragePath(logoUrl, "company-logos");
      if (fileName) {
        const { error: removeError } = await supabase.storage.from("company-logos").remove([fileName]);
        if (removeError) throw removeError;
      }

      // Update database
      const { error } = await supabase
        .from("company_settings")
        .update({ logo_url: null })
        .eq("id", companyId);

      if (error) throw error;

      setLogoUrl(null);
      toast({
        title: "Logo Removed",
        description: "Company logo has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!user?.id) throw new Error("You must be signed in to save company details.");

      // Fields company_settings actually has
      const companyPayload = {
        company_name: companyName,
        address,
        city,
        state,
        zip_code: zipCode,
        email: companyEmail,
        phone: companyPhone,
        website: companyWebsite,
        logo_url: logoUrl,
        brand_primary_hex: brandPalette.approved ? brandPalette.hex : null,
        white_label_enabled: whiteLabelOnPlan ? whiteLabelEnabled : false,
        brand_config: compactBrandOverlay({
          identity: {
            legalName,
            tagline,
            favicon: faviconUrl,
            logoDark: logoDarkUrl,
          },
          typography: { heading: headingFont },
          communications: {
            email: { fromName: emailFromName },
            sms: { senderId: smsSenderId },
          },
          domains: { customDomain },
          legal: { footer: legalFooter, privacyUrl, termsUrl },
          terminology: {
            property: termProperty,
            tenant: termTenant,
            landlord: termLandlord,
            manager: termManager,
          },
          documents: {
            invoices: { title: invoiceTitle },
            receipts: { footerNote: receiptFooter },
          },
        }) as Json,
      };

      if (companyId) {
        const { error } = await supabase
          .from("company_settings")
          .update(companyPayload)
          .eq("id", companyId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("company_settings")
          .insert({ ...companyPayload, manager_user_id: user?.id })
          .select()
          .single();
        if (error) throw error;
        setCompanyId(data.id);
      }

      // Sync extended fields (county, kra_pin, whatsapp, registration_number)
      // to agencies table — these columns were added in migration 014
      if (user?.id) {
        const { error: agencyError } = await (supabase.from('agencies').upsert({
          manager_id: user.id,
          name: companyName || 'My Agency',
          email: companyEmail || null,
          phone: companyPhone || null,
          address: address || null,
          county: county || null,
          kra_pin: kraPin || null,
          registration_number: registrationNumber || null,
          whatsapp: companyWhatsapp || null,
          website: companyWebsite || null,
        }, { onConflict: 'manager_id' }));
        if (agencyError) throw agencyError;
      }

      toast({
        title: "Company Details Saved",
        description: "Your company information has been updated.",
      });
      invalidateManagerActivation(queryClient);
      queryClient.invalidateQueries({ queryKey: ["org-brand"] });
    } catch (error) {
      toast({
        title: "Couldn't save company details",
        description: toUserFacingError(error, "Your details are still here. Check the fields and try again."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!canManageCompany) {
    return null;
  }

  return (
    <Card className="card-shadow animate-fade-in" style={{ animationDelay: "100ms" }}>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Details
        </CardTitle>
        <CardDescription>
          Shown on contracts and invoices. With white-label, Manager, Landlord, Agency, and Tenant desks use this brand instead of CALQULUS.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Logo Upload Section */}
            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <>
                      <img
                        src={displayLogoUrl}
                        alt="Company logo"
                        className="h-full w-full object-contain"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        aria-label="Remove logo"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={handleRemoveLogo}
                        disabled={uploading}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {logoUrl ? "Change Logo" : "Upload Logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Documents</p>
              <p className="text-xs text-muted-foreground">
                Invoices and receipts always use this company as the issuer, even when desk chrome stays CALQULUS.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invoiceTitle">Invoice title</Label>
                  <Input
                    id="invoiceTitle"
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    placeholder="INVOICE"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiptFooter">Receipt footer</Label>
                  <Input
                    id="receiptFooter"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    placeholder="Thank you for your payment."
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">White-label desks</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Replace the CALQULUS mark with your name, logo, and interaction color on Manager, Landlord, Agency, and Tenant desks. Login and Platform Admin stay CALQULUS.
                  </p>
                </div>
                <Switch
                  checked={whiteLabelEnabled}
                  disabled={!whiteLabelOnPlan}
                  onCheckedChange={setWhiteLabelEnabled}
                  aria-label="Enable white-label"
                />
              </div>
              {!whiteLabelOnPlan && (
                <p className="text-xs text-muted-foreground">
                  White-label is included on Enterprise. Name and logo still print on invoices without it.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="brandPrimary">Interaction color</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="brandPrimary"
                    type="color"
                    value={isHexColor(brandPrimaryHex) ? brandPrimaryHex : CALQULUS_COLOR.primary}
                    onChange={(e) => setBrandPrimaryHex(e.target.value.toUpperCase())}
                    disabled={!whiteLabelOnPlan}
                    className="h-10 w-12 cursor-pointer rounded border border-input bg-transparent"
                  />
                  <Input
                    value={brandPrimaryHex}
                    onChange={(e) => setBrandPrimaryHex(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    className="font-mono w-32"
                    placeholder={CALQULUS_COLOR.primary}
                  />
                </div>
                {!brandPalette.approved && (
                  <p className="text-xs text-destructive">{brandPalette.reasons[0]}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="legalName">Legal name</Label>
                  <Input
                    id="legalName"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    placeholder="Ridgeview Estates Ltd"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="headingFont">Heading font</Label>
                  <select
                    id="headingFont"
                    value={headingFont}
                    onChange={(e) => setHeadingFont(asAllowedFont(e.target.value))}
                    disabled={!whiteLabelOnPlan}
                    className="flex h-10 w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                  >
                    {ALLOWED_FONTS.map((font) => (
                      <option key={font} value={font}>{font}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  disabled={!whiteLabelOnPlan}
                  placeholder="Property operations for your portfolio"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="logoDark">Logo for dark chrome (URL)</Label>
                  <Input
                    id="logoDark"
                    value={logoDarkUrl}
                    onChange={(e) => setLogoDarkUrl(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    placeholder="https://…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">Favicon (URL)</Label>
                  <Input
                    id="faviconUrl"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    placeholder="https://…/favicon.ico"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emailFromName">Email from-name</Label>
                  <Input
                    id="emailFromName"
                    value={emailFromName}
                    onChange={(e) => setEmailFromName(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    placeholder="Ridgeview Estates"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smsSenderId">SMS sender ID</Label>
                  <Input
                    id="smsSenderId"
                    value={smsSenderId}
                    onChange={(e) => setSmsSenderId(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    placeholder="RIDGEVIEW"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom domain</Label>
                <Input
                  id="customDomain"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  disabled={!whiteLabelOnPlan}
                  placeholder="app.ridgeview.co.ke"
                />
                <p className="text-xs text-muted-foreground">Stored on the brand record. DNS and TLS provisioning are not applied from this screen.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="privacyUrl">Privacy URL</Label>
                  <Input
                    id="privacyUrl"
                    value={privacyUrl}
                    onChange={(e) => setPrivacyUrl(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    placeholder="/legal?tab=privacy"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="termsUrl">Terms URL</Label>
                  <Input
                    id="termsUrl"
                    value={termsUrl}
                    onChange={(e) => setTermsUrl(e.target.value)}
                    disabled={!whiteLabelOnPlan}
                    placeholder="/legal?tab=terms"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalFooter">Footer line</Label>
                <Textarea
                  id="legalFooter"
                  value={legalFooter}
                  onChange={(e) => setLegalFooter(e.target.value)}
                  disabled={!whiteLabelOnPlan}
                  placeholder="© Ridgeview Estates"
                  rows={2}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Terminology</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="termProperty">Property</Label>
                    <Input id="termProperty" value={termProperty} onChange={(e) => setTermProperty(e.target.value)} disabled={!whiteLabelOnPlan} placeholder="Property" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="termTenant">Tenant</Label>
                    <Input id="termTenant" value={termTenant} onChange={(e) => setTermTenant(e.target.value)} disabled={!whiteLabelOnPlan} placeholder="Tenant" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="termLandlord">Landlord</Label>
                    <Input id="termLandlord" value={termLandlord} onChange={(e) => setTermLandlord(e.target.value)} disabled={!whiteLabelOnPlan} placeholder="Landlord" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="termManager">Manager</Label>
                    <Input id="termManager" value={termManager} onChange={(e) => setTermManager(e.target.value)} disabled={!whiteLabelOnPlan} placeholder="Manager" />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter business address"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="ZIP"
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-sm font-medium mb-3">Contact Information</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="company@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">Phone</Label>
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="companyWebsite">Website</Label>
                <Input
                  id="companyWebsite"
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWhatsapp">WhatsApp number</Label>
                <Input
                  id="companyWhatsapp"
                  value={companyWhatsapp}
                  onChange={(e) => setCompanyWhatsapp(e.target.value)}
                  placeholder="2547XXXXXXXX (international format)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Input
                  id="county"
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g. Nairobi, Mombasa, Kisumu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kraPin">KRA PIN</Label>
                <Input
                  id="kraPin"
                  value={kraPin}
                  onChange={(e) => setKraPin(e.target.value.toUpperCase())}
                  placeholder="A012345678Z"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registrationNumber">Business registration no.</Label>
                <Input
                  id="registrationNumber"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                  placeholder="e.g. CPR/2024/1234567"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 col-span-2">
                This contact information will appear on invoices and contracts
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Company Details
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
