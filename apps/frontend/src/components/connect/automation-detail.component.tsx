'use client';

import { FC, ReactNode, useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { useConnectFetch } from './connect.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';

interface Overview {
  tagline: string | null;
  problem: string | null;
  value: { outcome?: string; measurable?: string; benefits?: string };
  steps: { title: string; detail?: string }[];
  triggers: string[];
  integrations: { concern: string; choice: string }[];
  outputs: string[];
  ghana: string[];
}
interface Detail {
  workflowKey: string;
  name: string;
  pricingModel?: string;
  priceGhs: number;
  subscriptionInterval?: string | null;
  category?: string | null;
  description?: string | null;
  overview: Overview | null;
  variables: Record<string, string>;
  requiredCredentials: any[];
  nodeCount: number;
}
interface Instance {
  id: string;
  workflowKey?: string;
  status: string;
  statusDetail?: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  sellub: 'Commerce',
  duabaconnect: 'Social',
  'ai-platform': 'Intelligence',
  dps: 'Infrastructure',
  duabanti: 'Nonprofit',
  javalabs: 'Logistics',
  proxyfidelity: 'Property',
};

const priceText = (d: Detail) =>
  !d.priceGhs || d.pricingModel === 'free'
    ? 'Free'
    : `GHS ${d.priceGhs}`;
const priceUnit = (d: Detail) =>
  !d.priceGhs || d.pricingModel === 'free'
    ? ''
    : `/${d.subscriptionInterval || 'month'}`;

// ── small presentational pieces ─────────────────────────────────────────────
const Section: FC<{ eyebrow: string; title: string; children: ReactNode }> = ({
  eyebrow,
  title,
  children,
}) => (
  <section className="flex flex-col gap-[16px]">
    <div>
      <div className="text-[11px] font-[700] tracking-[0.14em] uppercase text-[#8b5cf6]">
        {eyebrow}
      </div>
      <h2 className="text-[19px] font-[650] mt-[4px]">{title}</h2>
    </div>
    {children}
  </section>
);

const Chip: FC<{ children: ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-newBgLineColor bg-newBgLineColor px-[12px] py-[6px] text-[13px] text-newTextColor/80">
    {children}
  </span>
);

export const AutomationDetailComponent: FC<{ workflowKey: string }> = ({
  workflowKey,
}) => {
  const connectFetch = useConnectFetch();
  const user = useUser();
  const { externalBillingPortalUrl } = useVariables();
  // @ts-ignore — Postiz user carries admin
  const isAdmin = !!user?.admin;

  const { data: detail } = useSWR<Detail>(`wf-${workflowKey}`, async () => {
    const r = await connectFetch(`/v1/automations/catalog/${workflowKey}`);
    return (await r.json()).workflow;
  });
  const { data: ent } = useSWR(detail ? `ent-${workflowKey}` : null, async () => {
    const r = await connectFetch(
      `/v1/automations/entitlement?clientRef=self&workflowKey=${workflowKey}`
    );
    return await r.json();
  });
  const { data: instances, mutate: mutateInstances } = useSWR<Instance[]>(
    'connect-instances',
    async () => {
      const r = await connectFetch('/v1/automations/instances?clientRef=self');
      return (await r.json()).instances || [];
    }
  );
  const instance = (instances || []).find((i) => i.workflowKey === workflowKey);
  const { data: output, mutate: mutateOutput } = useSWR(
    instance ? `out-${instance.id}` : null,
    async () => {
      const r = await connectFetch(
        `/v1/automations/instances/${instance!.id}/output?clientRef=self`
      );
      return await r.json();
    }
  );

  const [config, setConfig] = useState<Record<string, string>>({});
  const [showConfig, setShowConfig] = useState(false);
  useEffect(() => {
    if (detail?.variables) setConfig({ ...detail.variables });
  }, [detail?.workflowKey]);

  const paid = !!detail && detail.pricingModel !== 'free' && !!detail.priceGhs;
  const entitled = !!ent?.entitled;
  const canDeploy = !paid || isAdmin || entitled;

  const [busy, setBusy] = useState(false);
  const deploy = useCallback(async () => {
    setBusy(true);
    try {
      await connectFetch('/v1/automations/deploy', {
        method: 'POST',
        body: JSON.stringify({ clientRef: 'self', workflowKey, params: config }),
      });
      await mutateInstances();
    } finally {
      setBusy(false);
    }
  }, [connectFetch, workflowKey, config, mutateInstances]);

  const run = useCallback(async () => {
    if (!instance) return;
    setBusy(true);
    try {
      await connectFetch(`/v1/automations/instances/${instance.id}/run`, {
        method: 'POST',
        body: JSON.stringify({ clientRef: 'self', params: {} }),
      });
      await mutateOutput();
    } finally {
      setBusy(false);
    }
  }, [connectFetch, instance, mutateOutput]);

  const subscribe = useCallback(() => {
    const url = new URL(
      externalBillingPortalUrl || '/plans',
      window.location.origin
    );
    url.searchParams.set('workflowId', workflowKey);
    // @ts-ignore
    if (user?.orgId) url.searchParams.set('orgId', user.orgId);
    window.location.href = url.toString();
  }, [externalBillingPortalUrl, workflowKey, user]);

  if (!detail) {
    return (
      <div className="text-newTextColor/40 text-[14px] py-[40px] text-center">
        Loading…
      </div>
    );
  }

  const ov = detail.overview;
  const cat = detail.category
    ? CATEGORY_LABEL[detail.category] || detail.category
    : null;
  const runsOn =
    ov?.triggers?.some((t) => /schedule|every|daily|hourly/i.test(t))
      ? 'Runs on a schedule'
      : ov?.triggers?.some((t) => /webhook|event/i.test(t))
      ? 'Event-triggered'
      : 'Automated';

  const cta = (
    <div className="rounded-[14px] border border-newBgLineColor bg-newBgColorInner p-[20px] flex flex-col gap-[14px]">
      <div className="flex items-baseline gap-[4px]">
        <span className="text-[28px] font-[700]">{priceText(detail)}</span>
        <span className="text-[14px] text-newTextColor/50">{priceUnit(detail)}</span>
      </div>
      {instance ? (
        <div className="rounded-[8px] bg-[#8b5cf6]/15 text-[#8b5cf6] text-[13px] px-[12px] py-[10px] text-center font-[600]">
          Deployed · {instance.status}
        </div>
      ) : canDeploy ? (
        <button
          className="rounded-[10px] bg-[#8b5cf6] hover:bg-[#7c3aed] px-[16px] py-[11px] text-[14px] font-[700] disabled:opacity-50 transition-colors"
          onClick={() =>
            Object.keys(detail.variables || {}).length && !showConfig
              ? setShowConfig(true)
              : deploy()
          }
          disabled={busy}
        >
          {busy
            ? 'Deploying…'
            : isAdmin && paid
            ? 'Deploy free (admin)'
            : Object.keys(detail.variables || {}).length && !showConfig
            ? 'Configure & deploy'
            : 'Deploy'}
        </button>
      ) : (
        <button
          className="rounded-[10px] bg-[#8b5cf6] hover:bg-[#7c3aed] px-[16px] py-[11px] text-[14px] font-[700] transition-colors"
          onClick={subscribe}
        >
          Subscribe to deploy
        </button>
      )}
      <div className="text-[12px] text-newTextColor/45 leading-[1.5]">
        {instance
          ? 'Manage runs and results below.'
          : isAdmin && paid
          ? 'Admins deploy any workflow without payment.'
          : paid && !entitled
          ? 'Monthly running price. Cancel anytime.'
          : 'Free to deploy on your workspace.'}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-[44px] text-textColor pb-[40px]">
      {/* ── hero ── */}
      <div className="flex flex-col gap-[24px]">
        <a
          href="/automations"
          className="text-[13px] text-newTextColor/40 hover:text-newTextColor/70 w-fit"
        >
          ← All automations
        </a>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-[28px] items-start">
          <div className="flex flex-col gap-[14px]">
            <div className="flex flex-wrap items-center gap-[8px]">
              {cat && <Chip>{cat}</Chip>}
              <Chip>{detail.nodeCount} steps</Chip>
              <Chip>{runsOn}</Chip>
            </div>
            <h1 className="text-[32px] leading-[1.15] font-[700] tracking-[-0.02em]">
              {detail.name.replace(/^[^—]+—\s*/, '')}
            </h1>
            {(ov?.tagline || detail.description) && (
              <p className="text-[16px] text-newTextColor/65 leading-[1.55] max-w-[62ch]">
                {ov?.tagline || detail.description}
              </p>
            )}
          </div>
          <div className="lg:sticky lg:top-[16px]">{cta}</div>
        </div>
      </div>

      {/* ── business value ── */}
      {ov &&
        (ov.value.outcome || ov.value.measurable || ov.value.benefits) && (
          <Section eyebrow="Why deploy it" title="What you get">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[14px]">
              {[
                { k: 'The outcome', v: ov.value.outcome },
                { k: 'The payoff', v: ov.value.measurable },
                { k: 'Who it helps', v: ov.value.benefits },
              ]
                .filter((x) => x.v)
                .map((x) => (
                  <div
                    key={x.k}
                    className="rounded-[12px] border border-newBgLineColor bg-newBgColorInner p-[18px] flex flex-col gap-[8px]"
                  >
                    <div className="text-[12px] font-[700] uppercase tracking-[0.08em] text-[#8b5cf6]">
                      {x.k}
                    </div>
                    <div className="text-[13.5px] text-newTextColor/75 leading-[1.55]">
                      {x.v}
                    </div>
                  </div>
                ))}
            </div>
          </Section>
        )}

      {/* ── the challenge ── */}
      {ov?.problem && (
        <Section eyebrow="The problem" title="Why this matters">
          <p className="text-[15px] text-newTextColor/70 leading-[1.7] max-w-[74ch]">
            {ov.problem}
          </p>
        </Section>
      )}

      {/* ── how it works ── */}
      {!!ov?.steps?.length && (
        <Section eyebrow="Under the hood" title="How it works">
          <div className="flex flex-col">
            {ov.steps.map((s, i) => (
              <div key={i} className="flex gap-[16px]">
                <div className="flex flex-col items-center">
                  <div className="w-[28px] h-[28px] rounded-full bg-[#8b5cf6]/15 text-[#8b5cf6] text-[12px] font-[700] flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  {i < ov.steps.length - 1 && (
                    <div className="w-[2px] flex-1 bg-newBgLineColor my-[4px]" />
                  )}
                </div>
                <div className="pb-[18px]">
                  <div className="text-[14.5px] font-[600]">{s.title}</div>
                  {s.detail && (
                    <div className="text-[13px] text-newTextColor/50 mt-[2px] leading-[1.5]">
                      {s.detail}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── triggers + integrations ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[36px]">
        {!!ov?.triggers?.length && (
          <Section eyebrow="Cadence" title="When it runs">
            <div className="flex flex-col gap-[8px]">
              {ov.triggers.map((t, i) => (
                <div
                  key={i}
                  className="text-[13.5px] text-newTextColor/70 leading-[1.5] flex gap-[8px]"
                >
                  <span className="text-[#8b5cf6] mt-[1px]">◆</span>
                  {t}
                </div>
              ))}
            </div>
          </Section>
        )}
        {!!ov?.integrations?.length && (
          <Section eyebrow="Stack" title="Works with">
            <div className="flex flex-col divide-y divide-newBgLineColor">
              {ov.integrations.map((it, i) => (
                <div key={i} className="flex gap-[12px] py-[8px] text-[13.5px]">
                  <span className="text-newTextColor/45 min-w-[120px]">
                    {it.concern}
                  </span>
                  <span className="text-newTextColor/80 flex-1">{it.choice}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* ── outputs ── */}
      {!!ov?.outputs?.length && (
        <Section eyebrow="Results" title="What it delivers">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {ov.outputs.map((o, i) => (
              <div key={i} className="flex gap-[10px] text-[13.5px] text-newTextColor/70">
                <span className="text-[#8b5cf6] mt-[2px]">✓</span>
                <span className="leading-[1.5]">{o}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── built for Ghana ── */}
      {!!ov?.ghana?.length && (
        <div className="rounded-[14px] border border-[#8b5cf6]/25 bg-[#8b5cf6]/[0.06] p-[22px] flex flex-col gap-[12px]">
          <div className="text-[11px] font-[700] tracking-[0.14em] uppercase text-[#8b5cf6]">
            Built for Ghana
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {ov.ghana.map((g, i) => (
              <div key={i} className="flex gap-[10px] text-[13px] text-newTextColor/70">
                <span className="text-[#8b5cf6] mt-[2px]">•</span>
                <span className="leading-[1.5]">{g}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── configure (before deploy) ── */}
      {!instance &&
        canDeploy &&
        showConfig &&
        Object.keys(detail.variables || {}).length > 0 && (
          <Section eyebrow="Setup" title="Configure">
            <p className="text-[13px] text-newTextColor/50 -mt-[6px]">
              These non-secret settings shape how your copy behaves. Secret
              credentials (tokens, API keys) are attached securely during setup.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
              {Object.entries(detail.variables).map(([k, v]) => (
                <label key={k} className="flex flex-col gap-[5px]">
                  <span className="text-[12px] text-newTextColor/55 font-mono">{k}</span>
                  <input
                    className="bg-newBgColor border border-newBgLineColor rounded-[8px] px-[11px] py-[8px] text-[13px] focus:border-[#8b5cf6]/60 outline-none"
                    value={config[k] ?? String(v ?? '')}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, [k]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
            <button
              className="self-start rounded-[10px] bg-[#8b5cf6] hover:bg-[#7c3aed] px-[20px] py-[10px] text-[14px] font-[700] disabled:opacity-50 transition-colors"
              onClick={deploy}
              disabled={busy}
            >
              {busy ? 'Deploying…' : 'Deploy now'}
            </button>
          </Section>
        )}

      {/* ── what you'll need ── */}
      {!!detail.requiredCredentials?.length && (
        <Section eyebrow="Prerequisites" title="What you'll need">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {detail.requiredCredentials.map((c: any, i: number) => (
              <div
                key={i}
                className="rounded-[10px] border border-newBgLineColor bg-newBgColorInner px-[14px] py-[11px]"
              >
                <div className="text-[13.5px] font-[600]">
                  {c.name || c.n8nType || 'Credential'}
                </div>
                {c.n8nType && c.name && (
                  <div className="text-[12px] text-newTextColor/40 mt-[1px]">
                    {c.n8nType}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── executions & results (deployed) ── */}
      {instance && (
        <Section eyebrow="Activity" title="Executions & results">
          <div className="rounded-[12px] border border-newBgLineColor bg-newBgColorInner p-[18px] flex flex-col gap-[14px]">
            <div className="flex items-center">
              <div className="flex-1 text-[13px] text-newTextColor/50">
                {instance.statusDetail || 'Trigger a run or wait for the schedule.'}
              </div>
              <button
                className="rounded-[8px] bg-[#8b5cf6] hover:bg-[#7c3aed] px-[14px] py-[7px] text-[13px] font-[600] disabled:opacity-50 transition-colors"
                onClick={run}
                disabled={busy}
              >
                {busy ? '…' : 'Run now'}
              </button>
            </div>
            <div className="flex flex-col">
              {(output?.runs || []).length === 0 && (
                <div className="text-[13px] text-newTextColor/40">No runs yet.</div>
              )}
              {(output?.runs || []).map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center gap-[12px] text-[13px] border-b border-newBgLineColor py-[8px]"
                >
                  <span className="font-mono text-newTextColor/40 text-[11px] min-w-[150px]">
                    {new Date(r.startedAt || r.createdAt).toLocaleString()}
                  </span>
                  <span className="text-newTextColor/70">{r.status}</span>
                </div>
              ))}
            </div>
            {(output?.outputs || []).length > 0 && (
              <div className="flex flex-col gap-[8px]">
                {(output.outputs || []).map((o: any) => (
                  <pre
                    key={o.id}
                    className="bg-newBgColor rounded-[8px] p-[12px] text-[11px] text-newTextColor/70 overflow-x-auto"
                  >
                    {JSON.stringify(o.kpis || o.items || o, null, 2)}
                  </pre>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
};
