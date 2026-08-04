import { useCallback, useEffect, useState } from "react";

/**
 * Where mobile-money payments are processed. The website is fully static —
 * the browser talks to this external Relworx service directly. The admin can
 * point the app at a different server at any time from the dashboard.
 */
export interface PayConfig {
  /** Base URL of the payment server, no trailing slash. */
  apiUrl: string;
}

const KEY = "calmaleng:pay-backend";
const EVENT = "calmaleng:pay-backend-change";

export const defaultPayConfig: PayConfig = {
  apiUrl: (
    (import.meta.env["VITE_PAY_API_URL"] as string | undefined) ??
    "https://function-bun-production-341f.up.railway.app"
  ).replace(/\/+$/, ""),
};

export function readPayConfig(): PayConfig {
  if (typeof window === "undefined") return defaultPayConfig;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<PayConfig>) : {};
    return { apiUrl: (parsed.apiUrl || defaultPayConfig.apiUrl).replace(/\/+$/, "") };
  } catch {
    return defaultPayConfig;
  }
}

export function writePayConfig(next: PayConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ apiUrl: next.apiUrl.trim().replace(/\/+$/, "") }),
    );
  } catch {
    /* storage unavailable — the change lives for this session only */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function resetPayConfig() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Reactive access to the payment backend settings. */
export function usePayConfig() {
  const [config, setConfig] = useState<PayConfig>(defaultPayConfig);

  useEffect(() => {
    const sync = () => setConfig(readPayConfig());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: PayConfig) => writePayConfig(next), []);
  const reset = useCallback(() => resetPayConfig(), []);

  return { config, save, reset };
}

/** Quick reachability check used by the admin dashboard. */
export async function pingPayBackend(apiUrl: string) {
  const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/health`, { method: "GET" });
  if (!res.ok) throw new Error(`Server responded with ${res.status}.`);
  return (await res.json().catch(() => ({}))) as { success?: boolean; service?: string };
}
