export const ADMIN_ROLES = ["operator", "manager", "owner"];

export const PERMISSIONS = [
  "dashboard.read",
  "buyers.read",
  "buyers.sensitive.read",
  "buyers.review",
  "buyers.suspend",
  "inquiries.read",
  "inquiries.manage",
  "catalog.read",
  "catalog.write",
  "catalog.publish",
  "prices.read",
  "prices.write",
  "quotes.read",
  "quotes.write",
  "analytics.read",
  "admins.read",
  "admins.manage",
  "audit.read"
];

export const ADMIN_ROLE_PERMISSIONS = {
  operator: [
    "dashboard.read",
    "buyers.read",
    "inquiries.read",
    "inquiries.manage",
    "catalog.read",
    "catalog.write",
    "prices.read",
    "quotes.read",
    "analytics.read"
  ],
  manager: [
    "dashboard.read",
    "buyers.read",
    "buyers.sensitive.read",
    "buyers.review",
    "buyers.suspend",
    "inquiries.read",
    "inquiries.manage",
    "catalog.read",
    "catalog.write",
    "catalog.publish",
    "prices.read",
    "prices.write",
    "quotes.read",
    "quotes.write",
    "analytics.read",
    "audit.read"
  ],
  owner: PERMISSIONS
};

export function normalizeAdminRole(role) {
  return ADMIN_ROLES.includes(role) ? role : "operator";
}

function isActiveOverride(override, now) {
  if (!override?.permissionKey || !PERMISSIONS.includes(override.permissionKey)) {
    return false;
  }
  if (!override.expiresAt) {
    return true;
  }
  return new Date(override.expiresAt).getTime() > now.getTime();
}

export function resolveAdminPermissions({ adminRole = "operator", overrides = [], now = new Date() } = {}) {
  const role = normalizeAdminRole(adminRole);
  if (role === "owner") {
    return {
      adminRole: role,
      permissions: [...PERMISSIONS],
      deniedPermissions: []
    };
  }

  const permissions = new Set(ADMIN_ROLE_PERMISSIONS[role] || []);
  const deniedPermissions = new Set();

  for (const override of overrides) {
    if (!isActiveOverride(override, now)) continue;
    if (override.effect === "deny") {
      permissions.delete(override.permissionKey);
      deniedPermissions.add(override.permissionKey);
    } else if (override.effect === "allow" && !deniedPermissions.has(override.permissionKey)) {
      permissions.add(override.permissionKey);
    }
  }

  return {
    adminRole: role,
    permissions: [...permissions].sort(),
    deniedPermissions: [...deniedPermissions].sort()
  };
}

export function hasAdminPermission(adminViewer, permissionKey) {
  if (!PERMISSIONS.includes(permissionKey)) {
    return false;
  }
  return Array.isArray(adminViewer?.permissions) && adminViewer.permissions.includes(permissionKey);
}
