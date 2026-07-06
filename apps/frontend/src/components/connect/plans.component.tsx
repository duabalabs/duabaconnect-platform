'use client';

import { FC } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

// DuabaConnect billing/plans (external billing via Sellub/Paystack). Kept simple:
// the plans grid links out to the Sellub-hosted checkout; on return, the Sellub
// webhook applies the tier to this org (POST /public/modify-subscription).
const PLANS: { tier: string; name: string; priceGhs: number; blurb: string }[] = [
  { tier: 'STANDARD', name: 'Starter', priceGhs: 150, blurb: '5 channels · scheduling · AI captions' },
  { tier: 'PRO', name: 'Growth', priceGhs: 400, blurb: '30 channels · automations · analytics' },
  { tier: 'TEAM', name: 'Team', priceGhs: 800, blurb: '10 seats · everything in Growth' },
];

export const PlansComponent: FC = () => {
  const { externalBillingPortalUrl } = useVariables();
  const user = useUser();

  const subscribe = (tier: string) => {
    // The external portal takes the org + tier and starts the Paystack checkout.
    const url = new URL(externalBillingPortalUrl || '/plans', window.location.origin);
    url.searchParams.set('tier', tier);
    // @ts-ignore — user carries orgId
    if (user?.orgId) url.searchParams.set('orgId', user.orgId);
    window.location.href = url.toString();
  };

  return (
    <div className="flex flex-col gap-[24px] text-white">
      <div>
        <h1 className="text-[24px] font-[600]">Plans</h1>
        <p className="text-white/60 text-[14px]">
          Unlock your full social workspace. Secure checkout via Paystack.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
        {PLANS.map((p) => (
          <div
            key={p.tier}
            className="rounded-[10px] border border-white/10 bg-[#1A1919] p-[20px] flex flex-col gap-[12px]"
          >
            <div className="text-[16px] font-[600]">{p.name}</div>
            <div className="text-[28px] font-[700]">
              GHS {p.priceGhs}
              <span className="text-[14px] font-[400] text-white/50">/mo</span>
            </div>
            <div className="text-[13px] text-white/60 flex-1">{p.blurb}</div>
            <button
              className="rounded-[8px] bg-[#8b5cf6] px-[16px] py-[9px] text-[14px] font-[600]"
              onClick={() => subscribe(p.tier)}
            >
              Choose {p.name}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
