'use client';

import { useCallback } from 'react';
import { useVariables } from '@gitroom/react/helpers/variable.context';

// Fetch wrapper for the DuabaConnect automation backend
// (api.automate.duabaconnect.com). Sends the shared `.duabaconnect.com` session
// cookie; the backend's SessionGuard verifies it.
export const useConnectFetch = () => {
  const { connectUrl } = useVariables();
  return useCallback(
    async (path: string, init?: RequestInit) => {
      return fetch(`${connectUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    },
    [connectUrl]
  );
};
