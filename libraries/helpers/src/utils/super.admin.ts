/**
 * Env-driven super-admin. List admin emails in SUPER_ADMIN_EMAILS
 * (comma-separated) and toggle the feature with SUPER_ADMIN_ENABLED. Same var
 * names as the automation backend so one config designates who bypasses the
 * paywall and deploys workflows for free — no DB edits required.
 */
export function isConfiguredSuperAdmin(email?: string | null): boolean {
  if ((process.env.SUPER_ADMIN_ENABLED ?? 'true') === 'false') return false;
  if (!email) return false;
  const list = (process.env.SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(String(email).toLowerCase());
}
