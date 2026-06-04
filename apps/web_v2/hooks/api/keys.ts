/**
 * Centralised React Query key factory.
 * Every hook references these so invalidation stays consistent.
 */
export const queryKeys = {
  currentUser: ["currentUser"] as const,
  organization: ["organization", "current"] as const,
  accountDefaults: ["account", "defaults"] as const,
  media: {
    all: ["media"] as const,
    asset: (assetId: string) => ["media", assetId] as const,
  },

  projects: {
    all: ["projects"] as const,
    list: (params?: Record<string, unknown>) =>
      ["projects", "list", params ?? {}] as const,
    detail: (slug: string) => ["projects", slug] as const,
    members: (slug: string) => ["projects", slug, "members"] as const,
    memberInvites: (slug: string) =>
      ["projects", slug, "member-invites"] as const,
    allowedOrigins: (slug: string) =>
      ["projects", slug, "allowed-origins"] as const,
    publicSurfaceHosts: (slug: string) =>
      ["projects", slug, "public-surface-hosts"] as const,
  },

  responses: {
    list: (slug: string, params?: Record<string, unknown>) =>
      ["projects", slug, "responses", params ?? {}] as const,
    detail: (slug: string, id: string) =>
      ["projects", slug, "responses", id] as const,
  },

  forms: {
    list: (slug: string) => ["projects", slug, "forms"] as const,
    detail: (slug: string, formId: string) =>
      ["projects", slug, "forms", formId] as const,
    draft: (slug: string, formId: string) =>
      ["projects", slug, "forms", formId, "draft"] as const,
  },

  widgets: {
    list: (slug: string) => ["projects", slug, "widgets"] as const,
    detail: (slug: string, widgetId: string) =>
      ["projects", slug, "widgets", widgetId] as const,
    draft: (slug: string, widgetId: string) =>
      ["projects", slug, "widgets", widgetId, "draft"] as const,
  },

  apiKeys: {
    list: (slug: string) => ["projects", slug, "api-keys"] as const,
    events: (slug: string, keyId: string) =>
      ["projects", slug, "api-keys", keyId, "events"] as const,
  },

  agentAccess: {
    overview: (slug: string) => ["projects", slug, "agent-access"] as const,
    actions: (slug: string) =>
      ["projects", slug, "agent-access", "actions"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    list: (params?: Record<string, unknown>) =>
      ["notifications", "list", params ?? {}] as const,
    unreadCount: ["notifications", "unread-count"] as const,
    preferences: ["notifications", "preferences"] as const,
  },

  analytics: {
    dashboard: (slug: string, params?: Record<string, unknown>) =>
      ["projects", slug, "analytics", "dashboard", params ?? {}] as const,
  },

  publicSurfaces: {
    resolve: (params: Record<string, unknown>) =>
      ["public-surfaces", "resolve", params] as const,
  },

  projectAudit: {
    list: (slug: string, params?: Record<string, unknown>) =>
      ["projects", slug, "action-audit", params ?? {}] as const,
  },

  outboundWebhooks: {
    all: (slug: string) => ["projects", slug, "outbound-webhooks"] as const,
    detail: (slug: string, endpointId: string) =>
      ["projects", slug, "outbound-webhooks", endpointId] as const,
    deliveries: (slug: string, params?: Record<string, unknown>) =>
      [
        "projects",
        slug,
        "outbound-webhooks",
        "deliveries",
        params ?? {},
      ] as const,
    delivery: (slug: string, deliveryId: string) =>
      [
        "projects",
        slug,
        "outbound-webhooks",
        "deliveries",
        deliveryId,
      ] as const,
  },

  exports: {
    deliveries: (slug: string, params?: Record<string, unknown>) =>
      ["projects", slug, "exports", "deliveries", params ?? {}] as const,
    delivery: (slug: string, deliveryId: string) =>
      ["projects", slug, "exports", "deliveries", deliveryId] as const,
  },

  integrations: {
    connections: (slug: string) =>
      ["projects", slug, "integrations", "connections"] as const,
  },
} as const;
