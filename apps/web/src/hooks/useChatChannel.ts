'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FetchError } from '@/lib/api';

/* Per-channel chat history from `GET /chat/:channel?limit=50`.
 *
 * Channel is public-readable (the stub does not require JWT for GET) so
 * guests still see the latest 50 messages. Sending requires auth — the
 * chat page handles that via `api.post` directly, this hook just exposes
 * the read side + a refresh callback so the same hook can be re-armed
 * after a successful send.
 *
 * Poll cadence: 5s on the active tab — chat is real-time-ish, so a faster
 * cadence than the 30s reused by buffs/roster. When a tab is not the
 * active one the page simply doesn't call this hook for it, keeping
 * unread traffic down. */

export interface ChatChannelMessage {
  id: string;
  userId: string;
  username: string;
  race: string;
  content: string;
  /** ISO timestamp from the server. UI formats to a short HH:MM string. */
  timestamp: string;
}

export interface ChatChannelResponse {
  channel: string;
  messages: ChatChannelMessage[];
}

interface UseChatChannelResult {
  data: ChatChannelResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const POLL_MS = 5_000;

export function useChatChannel(
  channel: 'global' | 'guild' | 'dm' | null,
  limit = 50,
): UseChatChannelResult {
  const [data, setData] = useState<ChatChannelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bump, setBump] = useState(0);

  const refresh = useCallback(() => setBump((n) => n + 1), []);

  useEffect(() => {
    if (!channel) {
      setLoading(false);
      setData(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      try {
        const json = await api.get<ChatChannelResponse>(
          `/chat/${channel}?limit=${limit}`,
        );
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof FetchError) {
            // 401 is fine — the read endpoint is public per stub, but a
            // bad token gets normalized to a null result so the consumer
            // falls back to the local mock messages.
            setError(err.message);
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(fetchOnce, POLL_MS);
        }
      }
    }

    fetchOnce();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [channel, limit, bump]);

  return { data, loading, error, refresh };
}
