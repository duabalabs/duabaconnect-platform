'use client';

import { FC, useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import useSWR from 'swr';
import { useConnectFetch } from './connect.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';

interface Detail {
  workflowKey: string;
  name: string;
  pricingModel?: string;
  priceGhs: number;
  subscriptionInterval?: string | null;
  category?: string | null;
  description?: string | null;
  blueprint?: string | null;
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

// ── tiny, safe blueprint renderer (headings / bold / code / lists / tables) ──
const inline = (s: string, k: number) => {
  const parts: any[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**'))
      parts.push(<strong key={parts.length}>{t.slice(2, -2)}</strong>);
    else
      parts.push(
        <code key={parts.length} className="bg-white/10 rounded px-[4px] py-[1px] text-[12px]">
          {t.slice(1, -1)}
        </code>
      );
    last = m.index + t.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return <Fragment key={k}>{parts}</Fragment>;
};

const Blueprint: FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const out: any[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const content = line.replace(/^#+\s/, '');
      const cls =
        level === 1
          ? 'text-[22px] font-[700] mt-[8px]'
          : level === 2
          ? 'text-[16px] font-[650] mt-[20px] text-white'
          : 'text-[14px] font-[600] mt-[14px] text-white/90';
      out.push(
        <div key={i} className={cls}>
          {content.replace(/^\d+\.\s*/, '')}
        </div>
      );
      i++;
    } else if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s/, ''));
        i++;
      }
      out.push(
        <ul key={i} className="list-disc ps-[20px] flex flex-col gap-[4px] text-white/70 text-[13px]">
          {items.map((it, n) => (
            <li key={n}>{inline(it, n)}</li>
          ))}
        </ul>
      );
    } else if (line.includes('|') && line.trim().startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        rows.push(lines[i]);
        i++;
      }
      const parse = (r: string) =>
        r.split('|').slice(1, -1).map((c) => c.trim());
      const header = parse(rows[0]);
      // A markdown separator row's cells are all dashes (with optional colons).
      // NOTE: do not use a bracketed regex char-class containing a colon here —
      // Tailwind's content scanner mistakes it for an arbitrary-property class
      // and emits invalid CSS that breaks the Turbopack build.
      const isSeparator = (r: string) =>
        parse(r).every((c) => /^:?-+:?$/.test(c));
      const body = rows.slice(1).filter((r) => !isSeparator(r));
      out.push(
        <div key={i} className="overflow-x-auto">
          <table className="text-[12px] text-white/70 border-collapse">
            <thead>
              <tr>
                {header.map((h, n) => (
                  <th key={n} className="text-left border-b border-white/15 py-[6px] pe-[16px] font-[600] text-white/80">
                    {inline(h, n)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, rn) => (
                <tr key={rn}>
                  {parse(r).map((c, cn) => (
                    <td key={cn} className="border-b border-white/5 py-[6px] pe-[16px] align-top">
                      {inline(c, cn)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (line.trim() === '') {
      i++;
    } else {
      out.push(
        <p key={i} className="text-white/70 text-[13px] leading-[1.6]">
          {inline(line, i)}
        </p>
      );
      i++;
    }
  }
  return <div className="flex flex-col gap-[8px]">{out}</div>;
};

const price = (d: Detail) =>
  !d.priceGhs || d.pricingModel === 'free'
    ? 'Free'
    : `GHS ${d.priceGhs}/${d.subscriptionInterval || 'month'}`;

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
    return <div className="text-white/50 text-[14px] p-[24px]">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-[24px] text-white max-w-[900px]">
      {/* header */}
      <div className="flex flex-wrap items-start gap-[16px]">
        <div className="flex-1 min-w-[240px]">
          <a href="/automations" className="text-[13px] text-white/40 hover:underline">
            ← Automations
          </a>
          <h1 className="text-[24px] font-[600] mt-[6px]">{detail.name}</h1>
          <div className="text-[13px] text-white/50 mt-[2px]">
            {detail.category ? `${detail.category} · ` : ''}
            {detail.nodeCount} steps · {price(detail)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-[6px]">
          {instance ? (
            <span className="text-[13px] text-[#8b5cf6]">
              Deployed · {instance.status}
            </span>
          ) : canDeploy ? (
            <button
              className="rounded-[8px] bg-[#8b5cf6] px-[18px] py-[9px] text-[14px] font-[600] disabled:opacity-50"
              onClick={deploy}
              disabled={busy}
            >
              {busy
                ? 'Deploying…'
                : isAdmin && paid
                ? 'Deploy (admin, free)'
                : 'Deploy'}
            </button>
          ) : (
            <button
              className="rounded-[8px] bg-[#8b5cf6] px-[18px] py-[9px] text-[14px] font-[600]"
              onClick={subscribe}
            >
              Subscribe — {price(detail)}
            </button>
          )}
          {isAdmin && paid && !instance && (
            <span className="text-[11px] text-white/40">
              Admins deploy without payment
            </span>
          )}
        </div>
      </div>

      {/* configure — shown before deploy when the user can deploy */}
      {!instance && canDeploy && Object.keys(detail.variables || {}).length > 0 && (
        <div className="rounded-[10px] border border-white/10 bg-[#1A1919] p-[18px] flex flex-col gap-[12px]">
          <div className="text-[15px] font-[600]">Configure</div>
          <p className="text-[12px] text-white/50">
            These values are applied to your copy of the workflow. Secrets
            (tokens, keys) are attached later per the setup guide.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
            {Object.entries(detail.variables).map(([k, v]) => (
              <label key={k} className="flex flex-col gap-[4px]">
                <span className="text-[12px] text-white/60 font-mono">{k}</span>
                <input
                  className="bg-[#111] border border-white/10 rounded-[6px] px-[10px] py-[7px] text-[13px]"
                  value={config[k] ?? String(v ?? '')}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, [k]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* deployed instance controls + executions */}
      {instance && (
        <div className="rounded-[10px] border border-white/10 bg-[#1A1919] p-[18px] flex flex-col gap-[12px]">
          <div className="flex items-center">
            <div className="flex-1">
              <div className="text-[15px] font-[600]">Executions</div>
              {instance.statusDetail && (
                <div className="text-[12px] text-white/40">
                  {instance.statusDetail}
                </div>
              )}
            </div>
            <button
              className="rounded-[6px] bg-[#8b5cf6] px-[12px] py-[6px] text-[13px] font-[600] disabled:opacity-50"
              onClick={run}
              disabled={busy}
            >
              {busy ? '…' : 'Run now'}
            </button>
          </div>

          <div className="flex flex-col gap-[6px]">
            {(output?.runs || []).length === 0 && (
              <div className="text-[13px] text-white/40">
                No runs yet. Scheduled workflows run on their own cadence; use
                “Run now” to trigger one.
              </div>
            )}
            {(output?.runs || []).map((r: any) => (
              <div
                key={r.id}
                className="flex items-center gap-[12px] text-[13px] border-b border-white/5 py-[6px]"
              >
                <span className="font-mono text-white/40 text-[11px]">
                  {new Date(r.startedAt || r.createdAt).toLocaleString()}
                </span>
                <span className="text-white/70">{r.status}</span>
              </div>
            ))}
          </div>

          {(output?.outputs || []).length > 0 && (
            <div className="flex flex-col gap-[8px]">
              <div className="text-[14px] font-[600] mt-[6px]">Results</div>
              {(output.outputs || []).map((o: any) => (
                <pre
                  key={o.id}
                  className="bg-[#111] rounded-[6px] p-[10px] text-[11px] text-white/70 overflow-x-auto"
                >
                  {JSON.stringify(o.kpis || o.items || o, null, 2)}
                </pre>
              ))}
            </div>
          )}
        </div>
      )}

      {/* blueprint / what it does */}
      {detail.blueprint && (
        <div className="rounded-[10px] border border-white/10 bg-[#1A1919] p-[20px]">
          <Blueprint text={detail.blueprint} />
        </div>
      )}
    </div>
  );
};
