import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Save, ShieldQuestion, Trash2 } from "lucide-react";
import WebhostLayout from "@/features/webhost/components/WebhostLayout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Field } from "@/shared/components/ui/field";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";
import {
  canEditLandingSection,
  resolveLandingEditorRole,
  type LandingEditorRole,
  type LandingSectionKey,
} from "@/features/marketing/landing/contentService";
import type { LandingPageConfig } from "@/features/marketing/landing/landingContent";
import { landingContent } from "@/features/marketing/landing/contentService";
import { LandingPageInner } from "@/features/marketing/landing/LandingPage";
import { landingThemeToCssVars } from "@/features/marketing/theme/landingTheme";
import { supabase } from "@/integrations/supabase/client";

type Tab = LandingSectionKey;

const SECTION_META: Record<Tab, string> = {
  brand: "Brand",
  theme: "Theme",
  header: "Header",
  hero: "Hero",
  dashboard: "Dashboard",
  trust: "Trust",
  capabilities: "Capabilities",
  roles: "Roles",
  propertyTypes: "Property types",
  metrics: "Metrics",
  finalCta: "Final CTA",
  footer: "Footer",
  sections: "Order",
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  trust: "Trust strip",
  capabilities: "Capabilities",
  roles: "Roles",
  propertyTypes: "Property types",
  metrics: "Metrics",
  finalCta: "Final CTA",
};

function TextField({
  label,
  value,
  onChange,
  textarea,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  helper?: string;
}) {
  return (
    <Field label={label} helper={helper} htmlFor={label}>
      {textarea ? (
        <Textarea id={label} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input id={label} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

function CtaEditor({
  label,
  cta,
  onChange,
}: {
  label: string;
  cta: { label: string; href: string; external?: boolean };
  onChange: (cta: { label: string; href: string; external?: boolean }) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-3">
      <TextField label={`${label} label`} value={cta.label} onChange={(v) => onChange({ ...cta, label: v })} />
      <TextField label={`${label} href`} value={cta.href} onChange={(v) => onChange({ ...cta, href: v })} />
      <label className="flex items-end gap-2 pb-1.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={!!cta.external}
          onChange={(e) => onChange({ ...cta, external: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        External link
      </label>
    </div>
  );
}

/** Image asset field: paste a URL or upload to the landing asset store. */
function AssetField({
  label,
  value,
  folder,
  onChange,
  onUpload,
}: {
  label: string;
  value: string;
  folder: string;
  onChange: (v: string) => void;
  onUpload?: (file: File) => Promise<{ ok: boolean; url?: string; error?: string }>;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <Field label={label} helper="Paste an image URL or upload one to the asset store." htmlFor={label}>
      <div className="space-y-2">
        <Input id={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or /assets/…" />
        <div className="flex items-center gap-2">
          <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted">
            {uploading ? "Uploading…" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file || !onUpload) return;
                setUploading(true);
                setUploadError(null);
                void onUpload(file).then((res) => {
                  setUploading(false);
                  if (res.ok && res.url) onChange(res.url);
                  else setUploadError(res.error ?? "Upload failed");
                });
              }}
            />
          </label>
          {value ? (
            <a href={value} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline hover:text-foreground">
              Preview
            </a>
          ) : null}
        </div>
        {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
      </div>
    </Field>
  );
}

/** Record a landing-content edit in the audit log (non-blocking). */
async function logLandingEdit({
  section,
  editorRole,
  editorId,
}: {
  section: string;
  editorRole: LandingEditorRole;
  editorId: string | null;
}): Promise<void> {
  try {
    await supabase.rpc("log_activity", {
      p_action: "content_edit",
      p_entity_type: "landing_page_content",
      p_entity_id: "landing",
      p_entity_label: section,
      p_property_id: null,
      p_manager_id: null,
      p_metadata: { section, editorRole },
    });
  } catch {
    // Audit failures must never break the save flow.
  }
}

export default function AdminLandingContent() {
  const { user, userRole, platformAdminInfo } = useAuth();

  const editorRole = useMemo(
    () =>
      resolveLandingEditorRole(
        userRole?.role,
        platformAdminInfo?.admin_type,
        platformAdminInfo?.can_manage_platform_settings,
      ),
    [userRole, platformAdminInfo],
  );

  const [base, setBase] = useState<LandingPageConfig | null>(null);
  const [draft, setDraft] = useState<LandingPageConfig | null>(null);
  const [tab, setTab] = useState<Tab>("hero");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void landingContent.getConfig().then((cfg) => {
      if (!active) return;
      const copy = structuredClone(cfg);
      setBase(copy);
      setDraft(copy);
    });
    return () => {
      active = false;
    };
  }, []);

  if (userRole?.role !== "webhost" || !editorRole) {
    return (
      <WebhostLayout title="Landing Content" description="Edit the public homepage.">
        <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
          <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-[var(--portal-accent)]" />
          <div>
            <p className="font-medium text-foreground">You do not have permission to edit landing content.</p>
            <p className="mt-1">Webhost platform accounts manage the public homepage; scoped admins manage a subset.</p>
          </div>
        </div>
      </WebhostLayout>
    );
  }

  if (!draft) {
    return (
      <WebhostLayout title="Landing Content" description="Edit the public homepage.">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </WebhostLayout>
    );
  }

  const canEdit = (s: LandingSectionKey) => canEditLandingSection(editorRole, s);

  const setSection = <K extends LandingSectionKey>(section: K, value: LandingPageConfig[K]) => {
    setDraft((d) => (d ? { ...d, [section]: value } : d));
    setSaveState("idle");
  };

  const visibleTabs = (Object.keys(SECTION_META) as Tab[]).filter(canEdit);

  const dirty = base
    ? (Object.keys(SECTION_META) as Tab[]).some((s) => JSON.stringify(draft[s]) !== JSON.stringify(base[s]))
    : false;

  const handleSave = async () => {
    if (!draft || !canEdit(tab)) return;
    setSaveState("saving");
    const payload = structuredClone(draft[tab]);
    const result = await landingContent.saveSection?.(tab, payload as LandingPageConfig[LandingSectionKey]);
    if (result?.ok) {
      const nextBase = structuredClone(draft);
      setBase(nextBase);
      setSaveState("saved");
      setSaveError(null);
      // Audit the content change (non-blocking; backend is authoritative).
      await logLandingEdit({ section: tab, editorRole, editorId: user?.id ?? null });
    } else {
      setSaveState("error");
      setSaveError(result?.error ?? "Save failed");
    }
  };

  return (
    <WebhostLayout
      title="Landing Content"
      description="Edit the public homepage copy and presentation. Saved per section, served immediately."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Editor pane */}
        <div className="lg:col-span-5">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Landing sections">
              {visibleTabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => {
                    setTab(t);
                    setSaveState("idle");
                  }}
                  className={cn(
                    "min-h-8 rounded-md px-2.5 text-xs font-medium",
                    tab === t ? "bg-primary/12 text-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {SECTION_META[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-5 rounded-xl border border-border bg-card p-4">
            <SectionEditor tab={tab} config={draft} onChange={setSection} upload={landingContent.uploadLandingAsset} />

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className={cn("text-xs", saveState === "error" ? "text-destructive" : "text-muted-foreground")}>
                {saveState === "saved"
                  ? "Saved ✓"
                  : saveState === "error"
                    ? saveError
                    : dirty
                      ? "Unsaved changes"
                      : "No pending changes"}
              </p>
              <Button onClick={() => void handleSave()} loading={saveState === "saving"} disabled={!dirty || !canEdit(tab)}>
                <Save className="h-4 w-4" />
                Save {SECTION_META[tab]}
              </Button>
            </div>

            {editorRole === "admin" ? (
              <p className="text-xs text-muted-foreground">
                Admin scope: hero, capabilities, roles and metrics. Platform webhost owns the rest.
              </p>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted-foreground" id="scope-note" role="status">
            Permission scope follows your platform tier. Backend RLS remains authoritative.
          </p>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-7">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            <Eye className="h-4 w-4 text-[var(--portal-accent)]" />
            Live preview reflects the current draft. Press Save to publish to the public homepage.
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
            <div className="pointer-events-none max-h-[75vh] overflow-y-auto">
              <div style={landingThemeToCssVars(draft.theme)}>
                <LandingPageInner config={draft} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WebhostLayout>
  );
}

function SectionEditor({
  tab,
  config,
  onChange,
  upload,
}: {
  tab: Tab;
  config: LandingPageConfig;
  onChange: <K extends LandingSectionKey>(section: K, value: LandingPageConfig[K]) => void;
  upload?: (file: File, folder?: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
}) {
  const set = <K extends LandingSectionKey>(section: K, value: LandingPageConfig[K]) => onChange(section, value);
  const c = config;

  switch (tab) {
    case "brand":
      return (
        <div className="space-y-4">
          <TextField label="Platform name" value={c.brand.name} onChange={(v) => set("brand", { ...c.brand, name: v })} />
          <TextField label="Product" value={c.brand.product} onChange={(v) => set("brand", { ...c.brand, product: v })} />
          <TextField label="Tagline" value={c.brand.tagline} onChange={(v) => set("brand", { ...c.brand, tagline: v })} />
          <TextField label="Wordmark" value={c.brand.wordmark} onChange={(v) => set("brand", { ...c.brand, wordmark: v })} />
        </div>
      );
    case "theme":
      return (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Theme tokens map to CSS variables consumed by every landing component. Refresh after saving to see the new palette.
          </p>
          {(Object.keys(c.theme) as (keyof typeof c.theme)[]).map((key) => (
            <TextField key={key} label={key} value={c.theme[key]} onChange={(v) => set("theme", { ...c.theme, [key]: v })} />
          ))}
        </div>
      );
    case "header":
      return (
        <div className="space-y-4">
          <CtaEditor label="Sign in" cta={c.header.signIn} onChange={(cta) => set("header", { ...c.header, signIn: cta })} />
          <CtaEditor label="Primary CTA" cta={c.header.primaryCta} onChange={(cta) => set("header", { ...c.header, primaryCta: cta })} />
          <OptionsList
            label="Navigation links"
            items={c.header.nav}
            keyOf={(n) => n.label + n.hash}
            onChange={(items) => set("header", { ...c.header, nav: items })}
            render={(n, onChange) => (
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Label" value={n.label} onChange={(v) => onChange({ ...n, label: v })} />
                <TextField label="Hash" value={n.hash} onChange={(v) => onChange({ ...n, hash: v })} />
              </div>
            )}
          />
        </div>
      );
    case "hero":
      return (
        <div className="space-y-4">
          <TextField label="Eyebrow" value={c.hero.eyebrow} onChange={(v) => set("hero", { ...c.hero, eyebrow: v })} />
          <TextField label="Headline A" value={c.hero.lineA} onChange={(v) => set("hero", { ...c.hero, lineA: v })} />
          <TextField label="Headline B" value={c.hero.lineB} onChange={(v) => set("hero", { ...c.hero, lineB: v })} />
          <TextField label="Supporting" value={c.hero.supporting} onChange={(v) => set("hero", { ...c.hero, supporting: v })} textarea />
          <CtaEditor label="Primary" cta={c.hero.primaryCta} onChange={(cta) => set("hero", { ...c.hero, primaryCta: cta })} />
          <CtaEditor label="Secondary" cta={c.hero.secondaryCta} onChange={(cta) => set("hero", { ...c.hero, secondaryCta: cta })} />
          <OptionsList
            label="Trust points"
            items={c.hero.trustPoints}
            keyOf={(tp) => tp.label}
            onChange={(items) => set("hero", { ...c.hero, trustPoints: items })}
            render={(tp, onChange) => (
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Label" value={tp.label} onChange={(v) => onChange({ ...tp, label: v })} />
                <TextField
                  label="Icon"
                  value={tp.icon}
                  onChange={(v) => onChange({ ...tp, icon: v })}
                  helper="Registered icon name (e.g. ShieldCheck)."
                />
              </div>
            )}
          />
        </div>
      );
    case "dashboard":
      return (
        <div className="space-y-4">
          <TextField label="Title" value={c.dashboard.title} onChange={(v) => set("dashboard", { ...c.dashboard, title: v })} />
          <TextField label="Caption" value={c.dashboard.caption} onChange={(v) => set("dashboard", { ...c.dashboard, caption: v })} />
          <TextField
            label="Disclaimer"
            value={c.dashboard.disclaimer}
            onChange={(v) => set("dashboard", { ...c.dashboard, disclaimer: v })}
            textarea
          />
        </div>
      );
    case "trust":
      return (
        <div className="space-y-4">
          <TextField label="Eyebrow" value={c.trust.eyebrow} onChange={(v) => set("trust", { ...c.trust, eyebrow: v })} />
          <StringList label="Items" items={c.trust.items} onChange={(items) => set("trust", { ...c.trust, items })} />
        </div>
      );
    case "capabilities":
      return (
        <OptionsList
          label="Capabilities"
          items={c.capabilities}
          keyOf={(i) => i.id}
          onChange={(items) => set("capabilities", items)}
          render={(item, onChange) => (
            <div className="space-y-2 rounded-lg border border-border bg-background p-3">
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Title" value={item.title} onChange={(v) => onChange({ ...item, title: v })} />
                <TextField label="Icon" value={item.icon} onChange={(v) => onChange({ ...item, icon: v })} />
              </div>
              <TextField label="Copy" value={item.copy} onChange={(v) => onChange({ ...item, copy: v })} />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Accent" value={item.accent} onChange={(v) => onChange({ ...item, accent: v })} />
              </div>
              <AssetField
                label="Image (optional)"
                value={item.image ?? ""}
                folder="capabilities"
                onChange={(v) => onChange({ ...item, image: v || undefined })}
                onUpload={upload}
              />
            </div>
          )}
        />
      );
    case "roles":
      return (
        <OptionsList
          label="Roles"
          items={c.roles}
          keyOf={(i) => i.id}
          onChange={(items) => set("roles", items)}
          render={(item, onChange) => (
            <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Title" value={item.title} onChange={(v) => onChange({ ...item, title: v })} />
                <TextField label="Icon" value={item.icon} onChange={(v) => onChange({ ...item, icon: v })} />
              </div>
              <TextField label="Copy" value={item.copy} onChange={(v) => onChange({ ...item, copy: v })} />
              <CtaEditor label="CTA" cta={item.cta} onChange={(cta) => onChange({ ...item, cta })} />
              <div className="grid grid-cols-2 gap-2">
                <TextField label="Accent" value={item.accent} onChange={(v) => onChange({ ...item, accent: v })} />
                <TextField label="CTA label override" value={item.ctaLabel} onChange={(v) => onChange({ ...item, ctaLabel: v })} />
              </div>
            </div>
          )}
        />
      );
    case "propertyTypes":
      return (
        <OptionsList
          label="Property types"
          items={c.propertyTypes}
          keyOf={(i) => i.id}
          onChange={(items) => set("propertyTypes", items)}
          render={(item, onChange) => (
            <div className="space-y-2 rounded-lg border border-border bg-background p-3">
              <TextField label="Name" value={item.name} onChange={(v) => onChange({ ...item, name: v })} />
              <TextField label="Tagline" value={item.tagline} onChange={(v) => onChange({ ...item, tagline: v })} />
              <TextField label="Icon" value={item.icon} onChange={(v) => onChange({ ...item, icon: v })} />
            </div>
          )}
        />
      );
    case "metrics":
      return (
        <OptionsList
          label="Metrics"
          items={c.metrics}
          keyOf={(i) => i.label + i.value}
          onChange={(items) => set("metrics", items)}
          render={(item, onChange) => (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-background p-3">
              <TextField label="Value" value={item.value} onChange={(v) => onChange({ ...item, value: v })} />
              <TextField label="Label" value={item.label} onChange={(v) => onChange({ ...item, label: v })} />
              <TextField label="Icon" value={item.icon} onChange={(v) => onChange({ ...item, icon: v })} />
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!!item.illustrative}
                  onChange={(e) => onChange({ ...item, illustrative: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Illustrative
              </label>
            </div>
          )}
        />
      );
    case "finalCta":
      return (
        <div className="space-y-4">
          <TextField label="Eyebrow" value={c.finalCta.eyebrow} onChange={(v) => set("finalCta", { ...c.finalCta, eyebrow: v })} />
          <TextField label="Title" value={c.finalCta.title} onChange={(v) => set("finalCta", { ...c.finalCta, title: v })} />
          <TextField label="Copy" value={c.finalCta.copy} onChange={(v) => set("finalCta", { ...c.finalCta, copy: v })} textarea />
          <CtaEditor label="Primary" cta={c.finalCta.primary} onChange={(cta) => set("finalCta", { ...c.finalCta, primary: cta })} />
          <CtaEditor label="Secondary" cta={c.finalCta.secondary} onChange={(cta) => set("finalCta", { ...c.finalCta, secondary: cta })} />
        </div>
      );
    case "sections":
      return (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Controls the order (and visibility) of homepage sections. Move items up/down; remove to hide. Changes apply on the next published read.
          </p>
          <OrderEditor
            items={c.sections}
            onChange={(items) => set("sections", items)}
            labelFor={(id) => SECTION_LABELS[id] ?? id}
          />
        </div>
      );
    case "footer":
      return (
        <div className="space-y-4">
          <TextField label="Tagline" value={c.footer.tagline} onChange={(v) => set("footer", { ...c.footer, tagline: v })} />
          <TextField label="Copyright" value={c.footer.copyright} onChange={(v) => set("footer", { ...c.footer, copyright: v })} />
          <OptionsList
            label="Columns"
            items={c.footer.columns}
            keyOf={(i) => i.id}
            onChange={(items) => set("footer", { ...c.footer, columns: items })}
            render={(col, onChange) => (
              <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
                <TextField label="Column title" value={col.title} onChange={(v) => onChange({ ...col, title: v })} />
                <OptionsList
                  label="Links"
                  items={col.links}
                  keyOf={(l) => l.label + l.href}
                  onChange={(links) => onChange({ ...col, links })}
                  render={(l, onChange) => <CtaEditor label="Link" cta={l} onChange={onChange} />}
                />
              </div>
            )}
          />
        </div>
      );
    default:
      return null;
  }
}

function StringList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <Field label={label} helper="One item per line.">
      <Textarea
        id={label}
        value={items.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
        rows={4}
      />
    </Field>
  );
}

function OptionsList<T>({
  label,
  items,
  onChange,
  render,
  keyOf,
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  render: (item: T, onChange: (next: T) => void) => React.ReactNode;
  keyOf: (item: T) => string;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (k: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {items.map((item, i) => {
        const k = keyOf(item);
        const expanded = open.has(k);
        return (
          <div key={`${k}-${i}`} className="rounded-lg border border-border">
            <div className="flex items-center justify-between px-3 py-2">
              <button
                type="button"
                onClick={() => toggle(k)}
                className="truncate text-left text-sm font-medium hover:text-foreground"
              >
                {String((item as { title?: string }).title) || (item as { name?: string }).name || `Item ${i + 1}`}
              </button>
              <div className="flex shrink-0 items-center gap-2 text-xs">
                <button type="button" onClick={() => toggle(k)} className="text-muted-foreground hover:underline">
                  {expanded ? "Collapse" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => onChange([...items.slice(0, i), ...items.slice(i + 1)])}
                  className="text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
            {expanded ? (
              <div className="border-t border-border p-3">
                {render(item, (next) => onChange(items.map((it, j) => (j === i ? next : it))))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/** Ordered, reorderable list with move up/down and remove. */
function OrderEditor<T extends string>({
  items,
  onChange,
  labelFor,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  labelFor: (id: T) => string;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i: number) => onChange([...items.slice(0, i), ...items.slice(i + 1)]);

  return (
    <div className="space-y-2">
      {items.map((id, i) => (
        <div key={id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="w-5 text-center text-xs font-medium text-muted-foreground">{i + 1}</span>
            <span className="text-sm font-medium">{labelFor(id)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Move ${labelFor(id)} up`}
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Move ${labelFor(id)} down`}
              disabled={i === items.length - 1}
              onClick={() => move(i, 1)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Hide ${labelFor(id)}`}
              onClick={() => remove(i)}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}