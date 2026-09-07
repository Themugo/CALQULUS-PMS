import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADMIN_SURFACE_ACCENT,
  WEBHOST_ROUTES,
  webhostSurface,
  webhostSurfaceLabel,
} from "@/features/webhost/lib/webhostPaths";
import { roleRouteConfigs } from "@/app/routes";

const root = resolve(__dirname, "..");

function source(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("admin + webhost identities", () => {
  it("has a navy admin accent token alongside the cyan webhost accent", () => {
    const css = source("index.css");
    expect(css).toContain("--calqulus-indigo: #123B5D");
    expect(css).toContain("--calqulus-teal-deep: #06B6D4");
    expect(ADMIN_SURFACE_ACCENT).toBe("#123B5D");
  });

  it("splits surfaces: control-plane is infrastructure, admin is platform control", () => {
    expect(webhostSurface("/webhost")).toBe("control-plane");
    expect(webhostSurface("/webhost/applications")).toBe("control-plane");
    expect(webhostSurface("/webhost/applications/calqulus-pms")).toBe("control-plane");
    expect(webhostSurface("/webhost/deployments")).toBe("control-plane");
    expect(webhostSurface("/webhost/operations")).toBe("control-plane");
    for (const adminPath of [
      "/webhost/organizations",
      "/webhost/organizations/abc",
      "/webhost/users",
      "/webhost/subscriptions",
      "/webhost/audit",
      "/webhost/security",
      "/webhost/settings",
      "/webhost/issues",
    ]) {
      expect(webhostSurface(adminPath)).toBe("admin");
    }
  });

  it("labels surfaces for the header breadcrumb", () => {
    expect(webhostSurfaceLabel("control-plane")).toBe("WebHost");
    expect(webhostSurfaceLabel("admin")).toBe("Admin");
  });
});

describe("webhost layout — control plane vs administration", () => {
  const layout = source("features/webhost/components/WebhostLayout.tsx");
  // Nav groups/items now live in the shared navigation module; WebhostLayout
  // only owns the visibility/permission gating for them.
  const nav = source("shared/navigation/portalNavigation.ts");

  it("groups nav into master control, platform operations, commercial control and account", () => {
    for (const group of ['"Master control"', '"Platform operations"', '"Commercial control"', '"Access & public experience"', '"Exceptions"', '"Account"']) {
      expect(nav).toContain(`label: ${group}`);
    }
  });

  it("prioritizes Applications, Deployments, Operations on the control plane", () => {
    const controlPlane = nav.split('"Platform operations"')[1]?.split('"Commercial control"')[0] ?? "";
    for (const item of ['"Dashboard"', '"Applications"', '"Deployments"', '"Operations"']) {
      expect(controlPlane).toContain(`label: ${item}`);
    }
  });

  it("keeps admin control (orgs, users, subscriptions, audit, security) in their current master-control groups", () => {
    const master = nav.split('"Master control"')[1]?.split('"Platform operations"')[0] ?? "";
    const commercial = nav.split('"Commercial control"')[1]?.split('"Access & public experience"')[0] ?? "";
    const access = nav.split('"Access & public experience"')[1]?.split('"Exceptions"')[0] ?? "";
    for (const item of ['"Organizations"', '"Users"']) expect(master).toContain(`label: ${item}`);
    for (const item of ['"Subscriptions"', '"Contracts"']) expect(commercial).toContain(`label: ${item}`);
    for (const item of ['"Audit Log"', '"Security"', '"Public Site"', '"Brand Studio"']) expect(access).toContain(`label: ${item}`);
  });

  it("applies the resolved surface identity to the shared shell", () => {
    expect(layout).toContain("WEBHOST_SURFACE_IDENTITY[surface]");
    expect(layout).toContain("surfaceIdentity.accent");
    expect(layout).toContain("webhostSurface(location.pathname)");
  });
});

describe("status vocabulary — never colour alone", () => {
  const cell = source("features/webhost/components/operations/ServiceStatusCell.tsx");

  it("renders dot + icon + text label for every status", () => {
    expect(cell).toContain("never colour alone");
    expect(cell).toContain("StatusIcon");
    expect(cell).toContain("meta.label");
    expect(cell).toContain("meta.dot");
  });

  it("uses the four canonical statuses", () => {
    const infra = source("features/webhost/lib/infrastructure.ts");
    for (const status of ["operational", "warning", "degraded", "down"]) {
      expect(infra).toContain(`${status}:`);
    }
    for (const label of ['"Operational"', '"Warning"', '"Degraded"', '"Down"']) {
      expect(infra).toContain(`label: ${label}`);
    }
  });
});

describe("secrets never reach the screen", () => {
  it("audit log viewers mask metadata through the shared secrets lib", () => {
    for (const rel of [
      "features/webhost/components/ActivityLog.tsx",
      "features/webhost/components/SecurityAuditLogs.tsx",
    ]) {
      const src = source(rel);
      expect(src).toContain("stringifyMasked");
      expect(src).not.toContain("JSON.stringify(entry.metadata");
      expect(src).not.toContain("JSON.stringify(log.metadata");
      expect(src).not.toContain("JSON.stringify(selectedLog.metadata");
    }
  });

  it("error logs use the shared isSecretKey — no duplicated pattern", () => {
    const src = source("features/webhost/components/ErrorLogsTab.tsx");
    expect(src).toContain("import { isSecretKey } from '@/features/webhost/lib/secrets'");
    expect(src).not.toContain("const isSecretKey =");
  });

  it("the secret pattern covers passwords, tokens, api keys, private keys, secrets", () => {
    const secrets = source("features/webhost/lib/secrets.ts");
    for (const shape of ["password", "secret", "token", "api[_-]?key", "private[_-]?key"]) {
      expect(secrets).toContain(shape);
    }
  });
});

describe("authorization model unchanged", () => {
  it("all webhost routes stay protected", () => {
    const config = roleRouteConfigs.find((entry) => entry.role === "webhost");
    const desk = (config?.routes ?? []).filter((route) => route.path.startsWith("/webhost") && route.path !== "/webhost/invite");
    for (const route of desk) {
      if (route.redirect) continue;
      expect(route.protected).toBe(true);
    }
  });

  it("permission-gated pages keep their gates", () => {
    expect(source("features/webhost/pages/AdminOrganizations.tsx")).toContain('permission="can_manage_managers"');
    expect(source("features/webhost/pages/AdminSubscriptions.tsx")).toContain('permission="can_manage_billing"');
    expect(source("features/webhost/pages/AdminAuditLog.tsx")).toContain('permission="can_view_activity_logs"');
  });

  it("no route changes were introduced — paths match the existing route map", () => {
    const config = roleRouteConfigs.find((entry) => entry.role === "webhost");
    const paths = (config?.routes ?? []).map((route) => route.path);
    for (const expected of Object.values(WEBHOST_ROUTES)) {
      expect(paths).toContain(expected);
    }
  });
});

describe("webhost control plane — no fabricated health", () => {
  it("deployments and history are declared not instrumented, never invented", () => {
    const infra = source("features/webhost/lib/infrastructure.ts");
    expect(infra).toContain("DEPLOYMENTS_NOT_INSTRUMENTED");
    const deployments = source("features/webhost/pages/AdminDeployments.tsx");
    expect(deployments).toContain("Not recorded");
    expect(deployments).toContain("Current live build");
  });

  it("admin tables stay compact technical tables", () => {
    for (const rel of [
      "features/webhost/pages/AdminApplications.tsx",
      "features/webhost/pages/AdminDeployments.tsx",
      "features/webhost/pages/AdminDashboard.tsx",
    ]) {
      const src = source(rel);
      expect(src).toContain("<table");
      expect(src).toContain("font-mono");
    }
  });
});
