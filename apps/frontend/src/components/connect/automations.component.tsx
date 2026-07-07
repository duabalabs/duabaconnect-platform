'use client';

import { FC, useCallback } from 'react';
import useSWR from 'swr';
import { useConnectFetch } from './connect.fetch';

interface CatalogItem {
  id: string;
  workflowKey: string;
  name: string;
  pricingModel?: string;
  priceGhs: number;
  subscriptionInterval?: string | null;
}
interface Instance {
  id: string;
  name: string;
  workflowKey?: string;
  status: string;
}

const priceLabel = (c: CatalogItem) =>
  !c.priceGhs || c.pricingModel === 'free'
    ? 'Free'
    : `GHS ${c.priceGhs}/${c.subscriptionInterval || 'month'}`;

export const AutomationsComponent: FC = () => {
  const connectFetch = useConnectFetch();

  const loadCatalog = useCallback(async () => {
    const res = await connectFetch('/v1/automations/catalog');
    return ((await res.json()).catalog || []) as CatalogItem[];
  }, [connectFetch]);
  const loadInstances = useCallback(async () => {
    const res = await connectFetch('/v1/automations/instances?clientRef=self');
    return ((await res.json()).instances || []) as Instance[];
  }, [connectFetch]);

  const { data: catalog } = useSWR('connect-catalog', loadCatalog, {
    revalidateOnFocus: false,
  });
  const { data: instances } = useSWR('connect-instances', loadInstances, {
    revalidateOnFocus: false,
  });

  return (
    <div className="flex flex-col gap-[24px] text-white">
      <div>
        <h1 className="text-[24px] font-[600]">Automations</h1>
        <p className="text-white/60 text-[14px]">
          Prebuilt, Ghana-ready workflows. Open one to see what it does, configure
          it, and deploy.
        </p>
      </div>

      {!!instances?.length && (
        <div>
          <h2 className="text-[16px] font-[600] mb-[10px]">Your automations</h2>
          <div className="rounded-[8px] border border-white/10 divide-y divide-white/10">
            {instances.map((i) => (
              <a
                key={i.id}
                href={`/automations/${i.workflowKey}`}
                className="flex items-center gap-[12px] p-[14px] hover:bg-white/5"
              >
                <div className="flex-1">
                  <div className="text-[14px] font-[500]">{i.name}</div>
                  <div className="text-[12px] text-white/50">{i.status}</div>
                </div>
                <span className="text-[13px] text-[#8b5cf6]">Open →</span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[16px] font-[600] mb-[10px]">Marketplace</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[12px]">
          {(catalog || []).map((c) => (
            <a
              key={c.id}
              href={`/automations/${c.workflowKey}`}
              className="rounded-[8px] border border-white/10 bg-[#1A1919] p-[16px] flex flex-col gap-[8px] hover:border-[#8b5cf6]/60 transition-colors"
            >
              <div className="text-[15px] font-[600]">{c.name}</div>
              <div className="text-[13px] text-white/50">{priceLabel(c)}</div>
              <span className="mt-auto text-[13px] text-[#8b5cf6]">
                View &amp; deploy →
              </span>
            </a>
          ))}
          {(catalog || []).length === 0 && (
            <div className="text-white/50 text-[14px]">
              No automations in the catalog yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
