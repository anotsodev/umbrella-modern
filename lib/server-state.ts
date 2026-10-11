// Server-state helpers for the per-user progress sync that Phase 2
// introduces. Wraps the four `/api/me/*` endpoints behind a
// consistent shape so the runners don't have to inline fetch calls.
//
// Design choices:
//
//   - localStorage is the anonymous fallback. It is always written
//     so the same UX works for both anonymous and signed-in users,
//     and so we can offer a one-shot merge on first sign-in.
//
//   - Server writes are debounced (500ms by default) so a flurry
//     of checkbox clicks turns into one POST.
//
//   - Server reads happen on mount when signed in. If the server
//     has state, the caller decides whether to merge with
//     localStorage (and prompts the user) or replace it outright.
//
//   - Failures from the server are swallowed and surfaced via a
//     "lastSyncError" the runner can show. We don't want a flaky
//     network to lose local progress.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "./auth-client";

const PATHWAY_KEY_PREFIX = "umbrella.pathway.";
const FORM_KEY_PREFIX = "umbrella.form.";

const SERVER_DEBOUNCE_MS = 500;

type Synced = {
  status: "synced" | "local";
  lastSyncError: string | null;
  lastSyncedAt: number | null;
};

function pathwayKey(slug: string): string {
  return `${PATHWAY_KEY_PREFIX}${slug}.checked`;
}
function formKey(slug: string): string {
  return `${FORM_KEY_PREFIX}${slug}.answers`;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return (await res.json()) as T;
}

type PathwayResponse = { checked: Record<string, boolean> };
type FormResponse = { answers: Record<string, string | string[]> };

/** Hook that returns session + helpers for syncing pathway progress. */
export function usePathwaySync(slug: string, lang: string) {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  const [serverChecked, setServerChecked] = useState<Record<string, boolean> | null>(null);
  const [synced, setSynced] = useState<Synced>({
    status: "local",
    lastSyncError: null,
    lastSyncedAt: null,
  });

  // On mount (signed-in only), read server state. We don't read it
  // for anonymous users — there's no row to read.
  useEffect(() => {
    if (!isSignedIn) {
      setServerChecked(null);
      setHydratedFromServer(true);
      return;
    }
    let cancelled = false;
    setHydratedFromServer(false);
    (async () => {
      try {
        const body = await fetchJson<PathwayResponse>(
          `/api/me/pathway/${encodeURIComponent(slug)}`,
        );
        if (cancelled) return;
        setServerChecked(body.checked ?? {});
      } catch (err) {
        if (cancelled) return;
        // 401 here would be a sign-out race; treat as no-server-state.
        setServerChecked({});
      } finally {
        if (!cancelled) setHydratedFromServer(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, slug]);

  // Debounced server writer. Returns a function the caller invokes
  // with the latest snapshot. We hold a ref to the latest value so
  // the timer always uses the freshest state.
  const pendingRef = useRef<Record<string, boolean> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSync = useCallback(
    (checked: Record<string, boolean>) => {
      if (!isSignedIn) return;
      pendingRef.current = checked;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const snapshot = pendingRef.current;
        pendingRef.current = null;
        if (!snapshot) return;
        try {
          await fetchJson(`/api/me/pathway/${encodeURIComponent(slug)}/sync`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ checked: snapshot, lang }),
          });
          setSynced({
            status: "synced",
            lastSyncError: null,
            lastSyncedAt: Date.now(),
          });
        } catch (err) {
          setSynced((prev) => ({
            status: "local",
            lastSyncError:
              err instanceof Error ? err.message : "sync_failed",
            lastSyncedAt: prev.lastSyncedAt,
          }));
        }
      }, SERVER_DEBOUNCE_MS);
    },
    [isSignedIn, slug, lang],
  );

  return {
    isSignedIn,
    serverChecked,
    hydratedFromServer,
    synced,
    pathwayKey: pathwayKey(slug),
    scheduleSync,
  };
}

/** Hook that returns session + helpers for syncing form answers. */
export function useFormSync(slug: string, lang: string) {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session?.user?.id);

  const [hydratedFromServer, setHydratedFromServer] = useState(false);
  const [serverAnswers, setServerAnswers] = useState<
    Record<string, string | string[]> | null
  >(null);
  const [synced, setSynced] = useState<Synced>({
    status: "local",
    lastSyncError: null,
    lastSyncedAt: null,
  });

  useEffect(() => {
    if (!isSignedIn) {
      setServerAnswers(null);
      setHydratedFromServer(true);
      return;
    }
    let cancelled = false;
    setHydratedFromServer(false);
    (async () => {
      try {
        const body = await fetchJson<FormResponse>(
          `/api/me/form/${encodeURIComponent(slug)}`,
        );
        if (cancelled) return;
        setServerAnswers(body.answers ?? {});
      } catch {
        if (cancelled) return;
        setServerAnswers({});
      } finally {
        if (!cancelled) setHydratedFromServer(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, slug]);

  const pendingRef = useRef<Record<string, string | string[]> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<string | null>(null);

  const scheduleSync = useCallback(
    (
      answers: Record<string, string | string[]>,
      title?: string,
    ) => {
      if (!isSignedIn) return;
      pendingRef.current = answers;
      if (title !== undefined) titleRef.current = title;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const snapshot = pendingRef.current;
        const title = titleRef.current ?? undefined;
        pendingRef.current = null;
        if (!snapshot) return;
        try {
          await fetchJson(`/api/me/form/${encodeURIComponent(slug)}/sync`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ answers: snapshot, lang, title }),
          });
          setSynced({
            status: "synced",
            lastSyncError: null,
            lastSyncedAt: Date.now(),
          });
        } catch (err) {
          setSynced((prev) => ({
            status: "local",
            lastSyncError:
              err instanceof Error ? err.message : "sync_failed",
            lastSyncedAt: prev.lastSyncedAt,
          }));
        }
      }, SERVER_DEBOUNCE_MS);
    },
    [isSignedIn, slug, lang],
  );

  return {
    isSignedIn,
    serverAnswers,
    hydratedFromServer,
    synced,
    formKey: formKey(slug),
    scheduleSync,
  };
}

// Re-export the localStorage key helpers so callers that need to
// read/analyze them (e.g. the one-shot migration prompt on first
// sign-in) can use the same source of truth.
export const localStorageKeys = {
  pathway(slug: string): string {
    return pathwayKey(slug);
  },
  form(slug: string): string {
    return formKey(slug);
  },
};
