'use client';

import { FC, useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { useConnectFetch } from './connect.fetch';
import { useUser } from '@gitroom/frontend/components/layout/user.context';

interface AdminItem {
  id: string;
  workflowKey: string;
  name: string;
  category?: string;
  pricingModel?: string;
  priceGhs: number;
  subscriptionInterval?: string | null;
  active: boolean;
  template?: {
    nodeCount: number;
    credentialCount: number;
    variableKeys: string[];
  } | null;
}

// Automations are billed as a monthly running price only — no outright purchases.
const PRICING_MODELS = ['free', 'subscription'];

// Super-admin space to manage the automation catalog: add new workflows, retune
// pricing, activate/retire, and remove. Talks to the automation backend's
// /v1/admin/* CRUD (SuperAdminGuard-gated), so ordinary users never reach it.
export const AdminAutomationsComponent: FC = () => {
  const connectFetch = useConnectFetch();
  const user = useUser();
  // @ts-ignore — Postiz user carries admin
  const isAdmin = !!user?.admin;

  const load = useCallback(async () => {
    const res = await connectFetch('/v1/admin/catalog');
    if (!res.ok) throw new Error(`admin catalog ${res.status}`);
    return ((await res.json()).catalog || []) as AdminItem[];
  }, [connectFetch]);

  const { data, error, mutate, isLoading } = useSWR(
    isAdmin ? 'admin-catalog' : null,
    load,
    { revalidateOnFocus: false }
  );

  if (!isAdmin) {
    return (
      <div className="text-newTextColor/60 text-[14px] p-[24px]">
        This area is available to platform administrators only.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[24px] text-textColor">
      <div className="flex items-start">
        <div className="flex-1">
          <h1 className="text-[24px] font-[600]">Manage automations</h1>
          <p className="text-newTextColor/60 text-[14px]">
            Add new workflows, adjust pricing, and activate or retire what
            appears in the Marketplace.
          </p>
        </div>
        <AddWorkflow onSaved={() => mutate()} />
      </div>

      {error && (
        <div className="text-red-400 text-[13px]">
          Couldn&apos;t load the catalog — {String(error.message || error)}.
        </div>
      )}
      {isLoading && <div className="text-newTextColor/50 text-[14px]">Loading…</div>}

      <div className="rounded-[8px] border border-newBgLineColor divide-y divide-newBgLineColor">
        {(data || []).map((item) => (
          <Row key={item.id} item={item} onChange={() => mutate()} />
        ))}
        {data && data.length === 0 && (
          <div className="p-[16px] text-newTextColor/50 text-[14px]">
            No workflows yet. Use “Add workflow” to create the first one.
          </div>
        )}
      </div>
    </div>
  );
};

const Row: FC<{ item: AdminItem; onChange: () => void }> = ({
  item,
  onChange,
}) => {
  const connectFetch = useConnectFetch();
  const [model, setModel] = useState(item.pricingModel || 'free');
  const [price, setPrice] = useState(String(item.priceGhs ?? 0));
  const [active, setActive] = useState(item.active);
  const [busy, setBusy] = useState(false);

  const dirty =
    model !== (item.pricingModel || 'free') ||
    Number(price) !== item.priceGhs ||
    active !== item.active;

  const save = useCallback(async () => {
    setBusy(true);
    try {
      await connectFetch(`/v1/admin/catalog/${item.workflowKey}`, {
        method: 'PATCH',
        body: JSON.stringify({
          pricingModel: model,
          priceGhs: model === 'free' ? 0 : Number(price) || 0,
          subscriptionInterval: model === 'subscription' ? 'month' : null,
          active,
        }),
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }, [connectFetch, item.workflowKey, model, price, active, onChange]);

  const remove = useCallback(async () => {
    if (!confirm(`Remove “${item.name}” from the catalog?`)) return;
    setBusy(true);
    try {
      await connectFetch(`/v1/admin/catalog/${item.workflowKey}`, {
        method: 'DELETE',
      });
      onChange();
    } finally {
      setBusy(false);
    }
  }, [connectFetch, item.workflowKey, item.name, onChange]);

  return (
    <div className="flex flex-wrap items-center gap-[12px] p-[14px]">
      <div className="min-w-[220px] flex-1">
        <div className="text-[14px] font-[500]">{item.name}</div>
        <div className="text-[12px] text-newTextColor/40 font-mono">
          {item.workflowKey}
          {item.category ? ` · ${item.category}` : ''}
          {item.template ? ` · ${item.template.nodeCount} nodes` : ''}
        </div>
      </div>

      <select
        className="bg-newBgColorInner border border-newBgLineColor rounded-[6px] px-[8px] py-[6px] text-[13px]"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      >
        {PRICING_MODELS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-[6px]">
        <span className="text-[12px] text-newTextColor/40">GHS</span>
        <input
          className="w-[80px] bg-newBgColorInner border border-newBgLineColor rounded-[6px] px-[8px] py-[6px] text-[13px] disabled:opacity-40"
          type="number"
          min="0"
          value={price}
          disabled={model === 'free'}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-[6px] text-[13px] text-newTextColor/70 cursor-pointer">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Active
      </label>

      <button
        className="rounded-[6px] bg-[#8b5cf6] px-[12px] py-[6px] text-[13px] font-[600] disabled:opacity-40"
        onClick={save}
        disabled={!dirty || busy}
      >
        {busy ? '…' : 'Save'}
      </button>
      <button
        className="text-[13px] text-red-400 hover:underline disabled:opacity-40"
        onClick={remove}
        disabled={busy}
      >
        Delete
      </button>
    </div>
  );
};

const AddWorkflow: FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const connectFetch = useConnectFetch();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    workflowKey: '',
    name: '',
    category: '',
    description: '',
    pricingModel: 'subscription',
    priceGhs: '200',
    exportJson: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const previewNodes = useMemo(() => {
    if (!form.exportJson.trim()) return null;
    try {
      const p = JSON.parse(form.exportJson);
      return Array.isArray(p?.nodes) ? p.nodes.length : 0;
    } catch {
      return -1; // invalid JSON
    }
  }, [form.exportJson]);

  const submit = useCallback(async () => {
    setErr(null);
    if (!form.workflowKey.trim() || !form.name.trim()) {
      setErr('A key and a name are required.');
      return;
    }
    let workflow: any = undefined;
    if (form.exportJson.trim()) {
      try {
        const p = JSON.parse(form.exportJson);
        workflow = {
          nodes: p.nodes || [],
          connections: p.connections || {},
          settings: p.settings || {},
        };
      } catch {
        setErr('The n8n export is not valid JSON.');
        return;
      }
    }
    setBusy(true);
    try {
      const res = await connectFetch('/v1/admin/catalog', {
        method: 'POST',
        body: JSON.stringify({
          workflowKey: form.workflowKey.trim(),
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          description: form.description.trim() || undefined,
          pricingModel: form.pricingModel,
          priceGhs: form.pricingModel === 'free' ? 0 : Number(form.priceGhs) || 0,
          subscriptionInterval:
            form.pricingModel === 'subscription' ? 'month' : null,
          active: true,
          workflow,
        }),
      });
      if (!res.ok) throw new Error(`save failed (${res.status})`);
      setOpen(false);
      setForm({
        workflowKey: '',
        name: '',
        category: '',
        description: '',
        pricingModel: 'subscription',
        priceGhs: '200',
        exportJson: '',
      });
      onSaved();
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }, [connectFetch, form, onSaved]);

  if (!open) {
    return (
      <button
        className="rounded-[8px] bg-[#8b5cf6] px-[14px] py-[8px] text-[13px] font-[600]"
        onClick={() => setOpen(true)}
      >
        + Add workflow
      </button>
    );
  }

  return (
    <div className="w-full mt-[12px] rounded-[10px] border border-newBgLineColor bg-newBgColorInner p-[16px] flex flex-col gap-[10px]">
      <div className="flex gap-[10px]">
        <input
          className="flex-1 bg-newBgColor border border-newBgLineColor rounded-[6px] px-[10px] py-[8px] text-[13px]"
          placeholder="workflow-key (unique slug)"
          value={form.workflowKey}
          onChange={(e) => set('workflowKey', e.target.value)}
        />
        <input
          className="flex-1 bg-newBgColor border border-newBgLineColor rounded-[6px] px-[10px] py-[8px] text-[13px]"
          placeholder="Display name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div className="flex gap-[10px]">
        <input
          className="flex-1 bg-newBgColor border border-newBgLineColor rounded-[6px] px-[10px] py-[8px] text-[13px]"
          placeholder="Category (e.g. sellub)"
          value={form.category}
          onChange={(e) => set('category', e.target.value)}
        />
        <select
          className="bg-newBgColor border border-newBgLineColor rounded-[6px] px-[10px] py-[8px] text-[13px]"
          value={form.pricingModel}
          onChange={(e) => set('pricingModel', e.target.value)}
        >
          {PRICING_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-[6px]">
          <span className="text-[12px] text-newTextColor/40">GHS</span>
          <input
            className="w-[90px] bg-newBgColor border border-newBgLineColor rounded-[6px] px-[10px] py-[8px] text-[13px] disabled:opacity-40"
            type="number"
            min="0"
            value={form.priceGhs}
            disabled={form.pricingModel === 'free'}
            onChange={(e) => set('priceGhs', e.target.value)}
          />
        </div>
      </div>
      <input
        className="bg-newBgColor border border-newBgLineColor rounded-[6px] px-[10px] py-[8px] text-[13px]"
        placeholder="Short description"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
      />
      <textarea
        className="bg-newBgColor border border-newBgLineColor rounded-[6px] px-[10px] py-[8px] text-[12px] font-mono h-[140px]"
        placeholder="Paste the n8n workflow export JSON here (nodes + connections)…"
        value={form.exportJson}
        onChange={(e) => set('exportJson', e.target.value)}
      />
      <div className="text-[12px] text-newTextColor/40">
        {previewNodes === null
          ? 'Optional — you can add the n8n graph now or later.'
          : previewNodes === -1
          ? 'That doesn’t parse as JSON yet.'
          : `Parsed ${previewNodes} node${previewNodes === 1 ? '' : 's'}.`}
      </div>
      {err && <div className="text-red-400 text-[13px]">{err}</div>}
      <div className="flex gap-[10px] justify-end">
        <button
          className="text-[13px] text-newTextColor/60 hover:underline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
        <button
          className="rounded-[8px] bg-[#8b5cf6] px-[16px] py-[8px] text-[13px] font-[600] disabled:opacity-40"
          onClick={submit}
          disabled={busy || previewNodes === -1}
        >
          {busy ? 'Saving…' : 'Save workflow'}
        </button>
      </div>
    </div>
  );
};
