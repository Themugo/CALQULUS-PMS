import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Home,
  Info,
  LayoutDashboard,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { BrandMark } from "@/shared/components/branding/BrandMark";
import { PortalPreviewCanvas } from "@/shared/components/branding/PortalPreviewCanvas";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { PageHeader } from "@/shared/components/layout/PageHeader";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { ErrorState } from "@/shared/components/ui/error-state";
import { LoadingState } from "@/shared/components/ui/loading-state";
import { CALQULUS_BRAND, CALQULUS_COLOR, CALQULUS_PORTAL_ACCENT, CALQULUS_TYPE } from "@/shared/theme/tokens";
import { CALQULUS_PORTALS, type PortalId } from "@/core/product/portals";
import { PLATFORM_BRAND_CONFIG } from "@/core/brand/platformBrand";
import { term } from "@/core/brand/terms";
import { PortalAccentBar, portalSurfaceProps } from "@/core/design";
import { deriveBrandPalette } from "@/core/design/deriveBrandPalette";
import { PUBLIC_ROUTES } from "@/features/marketing/publicConfig";
import { cn } from "@/shared/lib/utils";

type PreviewId =
  | "homepage"
  | PortalId
  | "login"
  | "properties"
  | "tenants"
  | "billing"
  | "payments"
  | "maintenance"
  | "reports"
  | "tables"
  | "forms"
  | "buttons"
  | "badges"
  | "alerts"
  | "tabs"
  | "dialogs"
  | "loading"
  | "empty"
  | "error"
  | "success"
  | "brand";

const LIVE_DESK: Partial<Record<PreviewId, { href: string; label: string }>> = {
  homepage: { href: PUBLIC_ROUTES.home, label: "Open live homepage" },
  manager: { href: PUBLIC_ROUTES.managerSignIn, label: "Open Manager login" },
  landlord: { href: PUBLIC_ROUTES.landlordLogin, label: "Open Landlord login" },
  agency: { href: PUBLIC_ROUTES.agencyLogin, label: "Open Agency login" },
  tenant: { href: PUBLIC_ROUTES.tenantLogin, label: "Open Tenant login" },
  platform_admin: { href: PUBLIC_ROUTES.webhostLogin, label: "Open Platform Admin login" },
  login: { href: PUBLIC_ROUTES.managerSignIn, label: "Open live login" },
  properties: { href: "/properties", label: "Open Properties (session required)" },
  tenants: { href: "/tenants", label: "Open Tenants (session required)" },
  billing: { href: "/billing", label: "Open Billing (session required)" },
  payments: { href: "/payments", label: "Open Payments (session required)" },
  maintenance: { href: "/maintenance", label: "Open Maintenance (session required)" },
  reports: { href: "/reports", label: "Open Reports (session required)" },
};

function LiveDeskLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to={href}>{label}</Link>
    </Button>
  );
}

const NAV: { id: PreviewId; label: string }[] = [
  { id: "homepage", label: "Homepage" },
  { id: "manager", label: "Manager" },
  { id: "landlord", label: "Landlord" },
  { id: "agency", label: "Agency" },
  { id: "tenant", label: "Tenant" },
  { id: "platform_admin", label: "Platform Admin" },
  { id: "login", label: "Login" },
  { id: "properties", label: "Properties" },
  { id: "tenants", label: "Tenants" },
  { id: "billing", label: "Billing" },
  { id: "payments", label: "Payments" },
  { id: "maintenance", label: "Maintenance" },
  { id: "reports", label: "Reports" },
  { id: "tables", label: "Tables" },
  { id: "forms", label: "Forms" },
  { id: "buttons", label: "Buttons" },
  { id: "badges", label: "Badges" },
  { id: "alerts", label: "Alerts" },
  { id: "tabs", label: "Tabs" },
  { id: "dialogs", label: "Dialogs" },
  { id: "loading", label: "Loading" },
  { id: "empty", label: "Empty" },
  { id: "error", label: "Error" },
  { id: "success", label: "Success" },
  { id: "brand", label: "Brand Studio" },
];

export default function DesignPreview() {
  const [active, setActive] = useState<PreviewId>("homepage");
  const [trialHex, setTrialHex] = useState<string>(CALQULUS_COLOR.primary);
  const trial = useMemo(() => deriveBrandPalette(trialHex), [trialHex]);
  const liveDesk = LIVE_DESK[active];

  return (
    <div className="min-h-screen bg-background text-foreground" data-preview="design">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <BrandMark size="nav" showWordmark subtitle="Design Bible" forcePlatform />
          <p className="type-meta hidden sm:block">Preview chrome — not live operations</p>
          <Link to={PUBLIC_ROUTES.home} className="text-xs font-medium text-navy-mid hover:underline">
            Public site
          </Link>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
        <nav aria-label="Design preview screens" className="lg:sticky lg:top-20 self-start">
          <ul className="grid grid-cols-2 lg:grid-cols-1 gap-1">
            {NAV.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2 text-sm min-h-11",
                    active === item.id
                      ? "bg-primary/10 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main-content" tabIndex={-1} className="space-y-6 outline-none">
          <div>
            <h1 className={CALQULUS_TYPE.pageTitle}>CALQULUS design preview</h1>
            <p className="type-body text-muted-foreground mt-1 max-w-2xl">
              One product: white desks, navy chrome, interactive blue. Outfit stays. Portal colour is a 2px accent, not a second system. Every page answers where you are, what matters, what needs attention, and what to do next. Live branding is Settings → Company.
            </p>
            {liveDesk ? (
              <div className="mt-3">
                <LiveDeskLink href={liveDesk.href} label={liveDesk.label} />
              </div>
            ) : null}
          </div>

          {active === "homepage" && <HomepagePreview />}
          {isPortal(active) && <PortalHierarchyPreview portal={active} />}
          {active === "login" && <LoginPreview />}
          {active === "properties" && <RecordPreview title="Properties" icon={Building2} attention="Occupancy" action="Add property" inspect="Units" />}
          {active === "tenants" && <RecordPreview title="Tenants" icon={Home} attention="Invites" action="Invite" inspect="Lease" />}
          {active === "billing" && <RecordPreview title="Billing" icon={CreditCard} attention="Overdue" action="Issue invoice" inspect="Statement" />}
          {active === "payments" && <RecordPreview title="Payments" icon={CreditCard} attention="Unreconciled" action="Record" inspect="Receipt" />}
          {active === "maintenance" && <RecordPreview title="Maintenance" icon={Wrench} attention="Urgent" action="Assign" inspect="Work order" />}
          {active === "reports" && <RecordPreview title="Reports" icon={FileText} attention="Period" action="Export" inspect="Filters" />}
          {active === "tables" && <TablesPreview />}
          {active === "forms" && <FormsPreview />}
          {active === "buttons" && <ButtonsPreview />}
          {active === "badges" && <BadgesPreview />}
          {active === "alerts" && <AlertsPreview />}
          {active === "tabs" && <TabsPreview />}
          {active === "dialogs" && <DialogsPreview />}
          {active === "loading" && <LoadingState label="Loading records…" variant="skeleton" rows={5} />}
          {active === "empty" && (
            <EmptyState title="No records yet" description="Hierarchy stays quiet until there is something to operate." />
          )}
          {active === "error" && (
            <ErrorState title="Could not load this desk" message="Keep the layout. Show a retry. Do not invent numbers." />
          )}
          {active === "success" && <SuccessPreview />}
          {active === "brand" && (
            <BrandStudioPreview trialHex={trialHex} onTrialHex={setTrialHex} trial={trial} />
          )}
        </main>
      </div>
    </div>
  );
}

function isPortal(id: PreviewId): id is PortalId {
  return id in CALQULUS_PORTALS;
}

function HomepagePreview() {
  const foundation = [
    { label: "Deep Navy", hex: CALQULUS_COLOR.navyDeep },
    { label: "Mid Navy", hex: CALQULUS_COLOR.navyPrimary },
    { label: "Secondary Navy", hex: CALQULUS_COLOR.navySecondary },
    { label: "Interactive", hex: CALQULUS_COLOR.primary },
    { label: "White", hex: CALQULUS_COLOR.white },
    { label: "Soft surface", hex: CALQULUS_COLOR.background },
    { label: "Border", hex: CALQULUS_COLOR.border },
    { label: "Text", hex: CALQULUS_COLOR.textPrimary },
  ] as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle className={CALQULUS_TYPE.cardTitle}>Public website</CardTitle>
        <CardDescription>
          Light workspace. Navy header and footer. The desk is the hero — not a property brochure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="type-label mb-2">Colour foundation</p>
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {foundation.map((swatch) => (
              <li key={swatch.hex} className="flex items-center gap-2 min-h-11">
                <span
                  className="h-6 w-6 shrink-0 rounded-md border border-border"
                  style={{ backgroundColor: swatch.hex }}
                  aria-hidden
                />
                <span className="text-xs text-muted-foreground">
                  {swatch.label}
                  <span className="block font-mono text-[10px]">{swatch.hex}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="bg-navy-primary px-4 py-2 text-xs font-medium text-white">CALQULUS</div>
          <div className="bg-card px-4 py-6">
            <p className="text-xs uppercase tracking-wider text-primary">Property operations, connected</p>
            <p className="mt-1 font-heading text-xl font-bold text-foreground">
              Run your properties with clarity and control.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Opening this page should feel like opening an enterprise operating system.
            </p>
            <Button className="mt-4" asChild>
              <Link to={PUBLIC_ROUTES.managerSignUp}>Start managing</Link>
            </Button>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link to={PUBLIC_ROUTES.home}>Open the live homepage</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function PortalHierarchyPreview({ portal }: { portal: PortalId }) {
  const accent = CALQULUS_PORTAL_ACCENT[portal];
  const meta = CALQULUS_PORTALS[portal];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accent.hex }} aria-hidden />
        <p className="text-sm font-semibold">{meta.label} · {accent.label}</p>
      </div>
      <PortalPreviewCanvas companyName={CALQULUS_BRAND.product} portal={portal} />
    </div>
  );
}

function LoginPreview() {
  return (
    <div {...portalSurfaceProps("manager")} className="rounded-lg border border-border overflow-hidden bg-background">
      <PortalAccentBar />
      <div className="p-6 max-w-md space-y-4">
        <BrandMark size="md" showWordmark subtitle="Manager" forcePlatform />
        <h2 className={CALQULUS_TYPE.sectionTitle}>Sign in</h2>
        <p className="type-body text-muted-foreground">Login chrome stays CALQULUS even when desks are white-labelled.</p>
        <div className="space-y-2">
          <Label htmlFor="preview-email">Email</Label>
          <Input id="preview-email" type="email" placeholder="manager@company.co.ke" autoComplete="off" />
        </div>
        <Button type="button">Sign in</Button>
      </div>
    </div>
  );
}

function RecordPreview({
  title,
  icon: Icon,
  attention,
  action,
  inspect,
}: {
  title: string;
  icon: typeof LayoutDashboard;
  attention: string;
  action: string;
  inspect: string;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-background">
      <PageHeader
        title={title}
        description="Where you are · what needs attention · the next action"
        className="px-4 py-4"
        status={<Icon className="h-4 w-4 text-primary" aria-hidden />}
        actions={<Button size="sm" type="button">{action}</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-3 p-4">
        <PreviewStat label="Needs attention" value={attention} />
        <PreviewStat label="Can do" value={action} />
        <PreviewStat label="Can inspect" value={inspect} />
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="type-label">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

function TablesPreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={CALQULUS_TYPE.cardTitle}>Tables</CardTitle>
        <CardDescription>Dense records on white. No colourful card grid.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Record</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Unit</TableCell>
              <TableCell><Badge variant="outline">Occupied</Badge></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="ghost" type="button">Open</Button></TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Invoice</TableCell>
              <TableCell><Badge variant="destructive">Overdue</Badge></TableCell>
              <TableCell className="text-right"><Button size="sm" variant="ghost" type="button">Open</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function FormsPreview() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className={CALQULUS_TYPE.cardTitle}>Forms</CardTitle>
        <CardDescription>
          Shared field chrome. Tab through fields — the focus ring is cyan (`ring-ring`), not a per-portal colour.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="preview-name">Name</Label>
          <Input id="preview-name" placeholder="Record name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preview-note">Note</Label>
          <Input id="preview-note" placeholder="Optional" />
        </div>
        <Button type="button">Save</Button>
      </CardContent>
    </Card>
  );
}

function DialogsPreview() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button">Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Dialogs use the same radius, type, and navy overlay — not a black scrim.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline">Cancel</Button>
          <Button type="button">Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BrandStudioPreview({
  trialHex,
  onTrialHex,
  trial,
}: {
  trialHex: string;
  onTrialHex: (value: string) => void;
  trial: ReturnType<typeof deriveBrandPalette>;
}) {
  const config = PLATFORM_BRAND_CONFIG;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className={CALQULUS_TYPE.cardTitle}>Brand configuration</CardTitle>
          <CardDescription>
            Named BrandConfig fields. Colours are validated before they become active. Semantic status colours never move.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p><span className="type-label">Identity</span> {config.identity.name}</p>
            <p><span className="type-label">{term(config, "tenant")}</span> terminology</p>
            <p><span className="type-label">Legal</span> {config.legal.footer}</p>
            <p><span className="type-label">Documents</span> {config.documents.invoices.title}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trial-hex">Trial primary (not saved)</Label>
            <div className="flex items-center gap-2">
              <input
                id="trial-hex"
                type="color"
                value={/^#[0-9A-Fa-f]{6}$/.test(trialHex) ? trialHex : CALQULUS_COLOR.primary}
                onChange={(event) => onTrialHex(event.target.value.toUpperCase())}
                className="h-10 w-12 rounded border border-input"
              />
              <Input value={trialHex} onChange={(event) => onTrialHex(event.target.value)} className="font-mono w-36" />
            </div>
          </div>
          {trial.approved ? (
            <p className="text-sm text-success">Approved. Derived hover, active, muted, border, surface, and focus.</p>
          ) : (
            <p className="text-sm text-destructive flex items-start gap-2">
              <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
              {trial.reasons.join(" ")}
            </p>
          )}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {(["hex", "hover", "active", "muted", "border", "surface", "focus", "onColor"] as const).map((key) => (
              <div key={key} className="space-y-1">
                <div className="h-8 rounded border border-border" style={{ backgroundColor: trial[key] }} />
                <p className="type-label truncate">{key}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <PortalPreviewCanvas primaryColor={trial.approved ? trial.hex : CALQULUS_COLOR.primary} />
    </div>
  );
}

function ButtonsPreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={CALQULUS_TYPE.cardTitle}>Buttons</CardTitle>
        <CardDescription>
          One hierarchy: primary action is interactive blue, everything else recedes. No portal colour on buttons.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="type-label">Variant</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button">Default</Button>
            <Button type="button" variant="secondary">Secondary</Button>
            <Button type="button" variant="outline">Outline</Button>
            <Button type="button" variant="ghost">Ghost</Button>
            <Button type="button" variant="link">Link</Button>
            <Button type="button" variant="destructive">Destructive</Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="type-label">Size</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm">Small</Button>
            <Button type="button" size="default">Default</Button>
            <Button type="button" size="lg">Large</Button>
            <Button type="button" size="icon" aria-label="Icon action"><Wrench className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="type-label">State</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" loading>Loading</Button>
            <Button type="button" disabled>Disabled</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BadgesPreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={CALQULUS_TYPE.cardTitle}>Badges</CardTitle>
        <CardDescription>
          Status colour is semantic only - success / warning / danger / info. Never used to fake a second palette.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="slate">Slate</Badge>
      </CardContent>
    </Card>
  );
}

function AlertsPreview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={CALQULUS_TYPE.cardTitle}>Alerts</CardTitle>
        <CardDescription>Inline, dismissible-by-context. Not a modal, not a toast.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>This is informational only - no action required.</AlertDescription>
        </Alert>
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>Your changes were recorded.</AlertDescription>
        </Alert>
        <Alert variant="warning">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Needs attention</AlertTitle>
          <AlertDescription>Something needs a decision before it can proceed.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>Keep the form data. Let the person retry.</AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function TabsPreview() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className={CALQULUS_TYPE.cardTitle}>Tabs</CardTitle>
        <CardDescription>For switching views within one record, not for primary navigation.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="type-body text-muted-foreground pt-3">
            Summary content for the record lives here.
          </TabsContent>
          <TabsContent value="activity" className="type-body text-muted-foreground pt-3">
            A chronological log of what happened.
          </TabsContent>
          <TabsContent value="documents" className="type-body text-muted-foreground pt-3">
            Attached files and generated statements.
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SuccessPreview() {
  return (
    <div className="space-y-4 max-w-lg">
      <Alert variant="success">
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Payment recorded</AlertTitle>
        <AlertDescription>The invoice is closed and the tenant has been notified.</AlertDescription>
      </Alert>
      <div className="flex items-center gap-2">
        <Badge variant="success">Paid</Badge>
        <Badge variant="success">Active</Badge>
        <Badge variant="success">Verified</Badge>
      </div>
      <Button type="button" disabled className="opacity-100">
        <CheckCircle2 className="h-4 w-4" />
        Saved
      </Button>
    </div>
  );
}
