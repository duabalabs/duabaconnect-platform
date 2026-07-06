// Whether paid billing is active — i.e. tier limits are enforced and orgs are
// NOT all granted top-tier access. True when a payment provider is configured:
// Stripe (upstream) OR an external billing portal (e.g. Sellub/Paystack, whose
// presence is signalled by EXTERNAL_BILLING_PORTAL_URL). With neither, the
// instance runs in open/self-hosted mode where every org is ULTIMATE.
//
// Read this instead of `process.env.STRIPE_PUBLISHABLE_KEY` at every gating
// site so external billing enforces the same limits Stripe does.
export function isBillingEnabled(): boolean {
  return (
    !!process.env.STRIPE_PUBLISHABLE_KEY ||
    !!process.env.EXTERNAL_BILLING_PORTAL_URL
  );
}
