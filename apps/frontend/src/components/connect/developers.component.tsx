'use client';

import { FC, useCallback, useState } from 'react';
import useSWR from 'swr';
import { useConnectFetch } from './connect.fetch';

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export const DevelopersComponent: FC = () => {
  const connectFetch = useConnectFetch();
  const [name, setName] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await connectFetch('/v1/developers/keys');
    const data = await res.json();
    return (data.keys || []) as KeyRow[];
  }, [connectFetch]);

  const { data: keys, mutate } = useSWR('connect-developer-keys', load, {
    revalidateOnFocus: false,
  });

  const issue = useCallback(async () => {
    setBusy(true);
    try {
      const res = await connectFetch('/v1/developers/keys', {
        method: 'POST',
        body: JSON.stringify({ name: name || 'default', mode: 'live' }),
      });
      const data = await res.json();
      if (data.rawKey) setRevealed(data.rawKey);
      setName('');
      await mutate();
    } finally {
      setBusy(false);
    }
  }, [connectFetch, name, mutate]);

  const revoke = useCallback(
    async (id: string) => {
      await connectFetch(`/v1/developers/keys/${id}`, { method: 'DELETE' });
      await mutate();
    },
    [connectFetch, mutate]
  );

  return (
    <div className="flex flex-col gap-[16px] text-white">
      <div>
        <h1 className="text-[24px] font-[600]">Developers</h1>
        <p className="text-white/60 text-[14px]">
          API keys for the DuabaConnect integrator API
          (<span className="font-mono">automateapi.duabaconnect.com</span>).
        </p>
      </div>

      {revealed && (
        <div className="rounded-[8px] border border-[#8b5cf6] bg-[#8b5cf6]/10 p-[16px]">
          <div className="text-[13px] text-white/70 mb-[6px]">
            Copy this key now — it won&apos;t be shown again.
          </div>
          <div className="font-mono text-[14px] break-all">{revealed}</div>
          <button
            className="mt-[10px] text-[13px] underline"
            onClick={() => setRevealed(null)}
          >
            Done
          </button>
        </div>
      )}

      <div className="flex gap-[10px] items-center">
        <input
          className="flex-1 rounded-[8px] bg-[#1A1919] border border-white/10 px-[12px] py-[8px] text-[14px]"
          placeholder="Key name (e.g. prod)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="rounded-[8px] bg-[#8b5cf6] px-[16px] py-[8px] text-[14px] font-[600] disabled:opacity-50"
          onClick={issue}
          disabled={busy}
        >
          New key
        </button>
      </div>

      <div className="rounded-[8px] border border-white/10 divide-y divide-white/10">
        {(keys || []).length === 0 && (
          <div className="p-[16px] text-white/50 text-[14px]">No keys yet.</div>
        )}
        {(keys || []).map((k) => (
          <div key={k.id} className="flex items-center gap-[12px] p-[14px]">
            <div className="flex-1">
              <div className="text-[14px] font-[500]">{k.name}</div>
              <div className="text-[12px] text-white/50 font-mono">
                {k.prefix}…{k.lastFour}
                {k.lastUsedAt
                  ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                  : ' · never used'}
              </div>
            </div>
            {k.revokedAt ? (
              <span className="text-[12px] text-white/40">revoked</span>
            ) : (
              <button
                className="text-[13px] text-red-400 hover:underline"
                onClick={() => revoke(k.id)}
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
