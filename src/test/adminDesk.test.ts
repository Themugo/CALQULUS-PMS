import { describe, expect, it } from "vitest";
import {
  WEBHOST_LOGIN,
  WEBHOST_OPS_ROUTES,
  WEBHOST_ROUTES,
  isWebhostDeskPath,
  isWebhostPublicPath,
  webhostOrganizationPath,
} from "@/features/webhost/lib/webhostPaths";
import { assembleAdminHealthProbes, PAYMENTS_HEALTH_DETAIL } from "@/features/webhost/lib/adminHealth";
import { groupSecurityEvents, isTenantEntityType } from "@/features/webhost/lib/adminSecurity";
import { pickRoleForPath } from "@/features/auth/lib/roleResolution";
import { roleRouteConfigs } from "@/app/routes";
import { CALQULUS_PORTAL_ACCENT } from "@/shared/theme/tokens";

describe("webhost desk paths", () => {
  it("treats named pages as the platform admin desk", () => {
    expect(isWebhostDeskPath(WEBHOST_ROUTES.dashboard)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_ROUTES.organizations)).toBe(true);
    expect(isWebhostDeskPath(webhostOrganizationPath("abc"))).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_ROUTES.users)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_ROUTES.subscriptions)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_ROUTES.audit)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_ROUTES.security)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_ROUTES.settings)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_ROUTES.brand)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_OPS_ROUTES.issues)).toBe(true);
  });

  it("does not treat login as the desk", () => {
    expect(isWebhostPublicPath(WEBHOST_LOGIN)).toBe(true);
    expect(isWebhostDeskPath(WEBHOST_LOGIN)).toBe(false);
    expect(isWebhostDeskPath("/properties")).toBe(false);
  });
});

describe("webhost role routing", () => {
  const manager = { role: "manager" as const, tenant_id: null, approval_status: "approved" as const };
  const webhost = { role: "webhost" as const, tenant_id: null, approval_status: "approved" as const };

  it("keeps a dual-role user on platform admin desk pages", () => {
    expect(pickRoleForPath([manager, webhost], WEBHOST_ROUTES.dashboard, "u1", false).role).toBe("webhost");
    expect(pickRoleForPath([manager, webhost], webhostOrganizationPath("org1"), "u1", false).role).toBe("webhost");
    expect(pickRoleForPath([manager, webhost], "/properties", "u1", false).role).toBe("manager");
  });

  it("registers every named platform admin page", () => {
    const config = roleRouteConfigs.find((c) => c.role === "webhost");
    const paths = (config?.routes ?? []).map((r) => r.path);
    expect(paths).toEqual(
      expect.arrayContaining([
        WEBHOST_ROUTES.dashboard,
        WEBHOST_ROUTES.organizations,
        "/webhost/organizations/:userId",
        WEBHOST_ROUTES.users,
        WEBHOST_ROUTES.subscriptions,
        WEBHOST_ROUTES.audit,
        WEBHOST_ROUTES.security,
        WEBHOST_ROUTES.settings,
        WEBHOST_ROUTES.brand,
      ]),
    );
  });
});

describe("platform admin identity", () => {
  it("uses indigo as the 2px accent", () => {
    expect(CALQULUS_PORTAL_ACCENT.platform_admin.hex).toBe("#426B94");
    expect(CALQULUS_PORTAL_ACCENT.platform_admin.label).toBe("Steel Navy");
  });
});

describe("tenant firewall on audit rows", () => {
  it("hides tenant entity types from the security slice", () => {
    expect(isTenantEntityType("tenant")).toBe(true);
    expect(isTenantEntityType("tenant_invitation")).toBe(true);
    expect(isTenantEntityType("manager")).toBe(false);

    const grouped = groupSecurityEvents([
      { action: "login_failed", entity_type: "user" },
      { action: "login_success", entity_type: "session" },
      { action: "failed_login", entity_type: "tenant" },
      { action: "permission_updated", entity_type: "admin_permissions" },
      { action: "error:edge", entity_type: "system" },
      { action: "warning:queue", entity_type: "tenant_lease" },
    ]);

    expect(grouped.counts.failedLogins).toBe(1);
    expect(grouped.counts.authEvents).toBe(2);
    expect(grouped.counts.permissionEvents).toBe(1);
    expect(grouped.counts.alerts).toBe(1);
    expect(grouped.visible.some((row) => isTenantEntityType(row.entity_type))).toBe(false);
  });
});

describe("system health probes", () => {
  it("never marks payments or notifications as healthy", () => {
    const probes = assembleAdminHealthProbes({
      local: [
        {
          component: "supabase",
          status: "healthy",
          lastChecked: "2026-08-20T00:00:00.000Z",
          latency: 12,
        },
      ],
      edge: {
        checks: {
          database: { status: "healthy", latencyMs: 8 },
          storage: { status: "healthy", latencyMs: 20 },
          edgeFunctions: { status: "healthy", latencyMs: 15 },
        },
      },
      edgeReachable: true,
      edgeError: "",
    });

    const byId = Object.fromEntries(probes.map((probe) => [probe.id, probe]));
    expect(byId.database.status).toBe("healthy");
    expect(byId.api.status).toBe("healthy");
    expect(byId.storage.status).toBe("healthy");
    expect(byId.payments.status).toBe("unavailable");
    expect(byId.payments.detail).toBe(PAYMENTS_HEALTH_DETAIL);
    expect(byId.notifications.status).toBe("unavailable");
  });

  it("leaves storage unprobed when health-check omits it", () => {
    const probes = assembleAdminHealthProbes({
      local: [],
      edge: { checks: { database: { status: "degraded" } } },
      edgeReachable: true,
      edgeError: "",
    });
    const storage = probes.find((probe) => probe.id === "storage");
    expect(storage?.status).toBe("unavailable");
    expect(storage?.detail).toBe("No live probe");
  });
});
