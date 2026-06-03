/**
 * Site configuration - loads from localStorage for instant apply.
 * Settings page writes here, Sidebar and index.html read it.
 */

const CONFIG_KEY = 'reservation_safari_config';

export const defaultConfig = {
  appName: 'Reservation Safari',
  logoUrl: '',
  accentColor: '137 72% 45%', // HSL string for --primary
  navPermissions: {
    // null means unrestricted — admin sees everything (handled in Sidebar)
    admin: null,
    user:   ['/', '/bookings', '/calendar', '/messages', '/profile'],
    agent:  ['/agent-dashboard', '/bookings', '/clients', '/packages', '/calendar', '/messages', '/profile', '/quotes'],
    guide:  ['/guide-dashboard', '/bookings', '/vehicles', '/calendar', '/messages', '/profile'],
    driver: ['/driver', '/profile'],
    client: [],   // client uses portal layout, not AppLayout
    other:  ['/messages', '/profile'],
  }
};

// Paths added in later versions — must be auto-granted to any admin config that
// was saved before these routes existed, otherwise the new nav items stay hidden.
const NEW_ADMIN_PATHS = ['/safari-library', '/safari-quote-builder', '/package-import', '/when-to-visit', '/trip-planner'];

function migrateConfig(cfg) {
  if (!cfg?.navPermissions) return cfg;
  const perms = { ...cfg.navPermissions };
  // Admin: if stored as an explicit array, merge in any newly added paths.
  if (Array.isArray(perms.admin)) {
    const missing = NEW_ADMIN_PATHS.filter(p => !perms.admin.includes(p));
    if (missing.length) perms.admin = [...perms.admin, ...missing];
  }
  return { ...cfg, navPermissions: perms };
}

export function getSiteConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return migrateConfig({ ...defaultConfig, ...JSON.parse(raw) });
  } catch {}
  return defaultConfig;
}

export function saveSiteConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Trigger storage event so Sidebar reacts in same tab
  window.dispatchEvent(new StorageEvent('storage', { key: CONFIG_KEY }));
  applyAccentColor(config.accentColor || defaultConfig.accentColor);
  if (config.appName) document.title = config.appName;
}

export function applyAccentColor(hslString) {
  const root = document.documentElement;
  root.style.setProperty('--primary', hslString);
  root.style.setProperty('--accent', hslString);
  root.style.setProperty('--ring', hslString);
  root.style.setProperty('--sidebar-primary', hslString);
  root.style.setProperty('--sidebar-ring', hslString);
}

// Auto-apply on load
const cfg = getSiteConfig();
applyAccentColor(cfg.accentColor || defaultConfig.accentColor);
if (cfg.appName) document.title = cfg.appName;