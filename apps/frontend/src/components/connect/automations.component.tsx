'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useConnectFetch } from './connect.fetch';

interface CatalogItem {
  id: string;
  workflowKey: string;
  name: string;
  pricingModel?: string;
  priceGhs: number;
}
interface Instance {
  id: string;
  name: string;
  workflowKey?: string;
  status: string;
  createdAt: string;
}

// The integrator API is clientRef-scoped. In the Studio the signed-in user is
// their own client, so we use a stable self ref derived from the session.
const SELF_REF = 'self';

export const AutomationsComponent: FC = () => {
  const connectFetch = useConnectFetch();
  const [busy, setBusy] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    const res = await connectFetch('/v1/automations/catalog');
    return ((await res.json()).catalog || []) as CatalogItem[];
  }, [connectFetch]);
  const loadInstances = useCallback(async () => {
    const res = await connectFetch(
      `/v1/automations/instances?clientRef=${SELF_REF}`
    );
    return ((await res.json()).instances || []) as Instance[];
  }, [connectFetch]);

  const { data: catalog } = useSWR('connect-catalog', loadCatalog, {
    revalidateOnFocus: false,
  });
  const { data: instances, mutate } = useSWR(
    'connect-instances',
    loadInstances,
    { revalidateOnFocus: false }
  );

  const deploy = useCallback(
    async (workflowKey: string) => {
      setBusy(workflowKey);
      try {
        await connectFetch('/v1/automations/deploy', {
          method: 'POST',
          body: JSON.stringify({ clientRef: SELF_REF, workflowKey, params: {} }),
        });
        await mutate();
      } finally {
        setBusy(null);
      }
    },
    [connectFetch, mutate]
  );

  const run = useCallback(
    async (id: string) => {
      await connectFetch(`/v1/automations/instances/${id}/run`, {
        method: 'POST',
        body: JSON.stringify({ clientRef: SELF_REF, params: {} }),
      });
    },
    [connectFetch]
  );

  return (
    <div className="flex flex-col gap-[24px] text-white">
      <div>
        <h1 className="text-[24px] font-[600]">Automations</h1>
        <p className="text-white/60 text-[14px]">
          Deploy prebuilt automation workflows for your commerce journey.
        </p>
      </div>

      {!!instances?.length && (
        <div>
          <h2 className="text-[16px] font-[600] mb-[10px]">Your automations</h2>
          <div className="rounded-[8px] border border-white/10 divide-y divide-white/10">
            {instances.map((i) => (
              <div key={i.id} className="flex items-center gap-[12px] p-[14px]">
                <div className="flex-1">
                  <div className="text-[14px] font-[500]">{i.name}</div>
                  <div className="text-[12px] text-white/50">{i.status}</div>
                </div>
                <button
                  className="text-[13px] text-[#8b5cf6] hover:underline"
                  onClick={() => run(i.id)}
                >
                  Run
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[16px] font-[600] mb-[10px]">Marketplace</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
          {(catalog || []).map((c) => (
            <div
              key={c.id}
              className="rounded-[8px] border border-white/10 bg-[#1A1919] p-[16px] flex flex-col gap-[10px]"
            >
              <div className="text-[15px] font-[600]">{c.name}</div>
              <div className="text-[13px] text-white/50">
                {c.pricingModel === 'free' || !c.priceGhs
                  ? 'Free'
                  : `GHS ${c.priceGhs}`}
              </div>
              <button
                className="mt-auto self-start rounded-[8px] bg-[#8b5cf6] px-[14px] py-[7px] text-[13px] font-[600] disabled:opacity-50"
                onClick={() => deploy(c.workflowKey)}
                disabled={busy === c.workflowKey}
              >
                {busy === c.workflowKey ? 'Deploying…' : 'Deploy'}
              </button>
            </div>
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
