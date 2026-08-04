import { useCallback, useEffect, useState } from "react";

/**
 * Where uploads are signed. The site itself is fully static/serverless — the
 * browser asks this external signing server for presigned URLs and then sends
 * the file bytes straight to Cloudflare R2. The admin can point the app at a
 * different server at any time from the admin dashboard.
 */
export interface UploadConfig {
  /** Base URL of the R2 signing server, no trailing slash. */
  apiUrl: string;
  /** Must match UPLOAD_TOKEN on that server. */
  token: string;
}

const KEY = "calmaleng:upload-backend";
const EVENT = "calmaleng:upload-backend-change";

export const defaultUploadConfig: UploadConfig = {
  apiUrl:
    ((import.meta.env["VITE_R2_API_URL"] as string | undefined) ??
      "https://function-bun-production-fc40.up.railway.app").replace(/\/+$/, ""),
  token: (import.meta.env["VITE_R2_UPLOAD_TOKEN"] as string | undefined) ?? "*",
};

export function readUploadConfig(): UploadConfig {
  if (typeof window === "undefined") return defaultUploadConfig;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<UploadConfig>) : {};
    const apiUrl = (parsed.apiUrl || defaultUploadConfig.apiUrl).replace(/\/+$/, "");
    return { apiUrl, token: parsed.token || defaultUploadConfig.token };
  } catch {
    return defaultUploadConfig;
  }
}

export function writeUploadConfig(next: UploadConfig) {
  if (typeof window === "undefined") return;
  const value: UploadConfig = {
    apiUrl: next.apiUrl.trim().replace(/\/+$/, ""),
    token: next.token.trim(),
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable — the change lives for this session only */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function resetUploadConfig() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Reactive access to the upload backend settings. */
export function useUploadConfig() {
  const [config, setConfig] = useState<UploadConfig>(defaultUploadConfig);

  useEffect(() => {
    const sync = () => setConfig(readUploadConfig());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const save = useCallback((next: UploadConfig) => writeUploadConfig(next), []);
  const reset = useCallback(() => resetUploadConfig(), []);

  return { config, save, reset };
}

/** Quick reachability check used by the admin dashboard. */
export async function pingUploadBackend(apiUrl: string) {
  const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/health`, { method: "GET" });
  if (!res.ok) throw new Error(`Server responded with ${res.status}.`);
  return (await res.json().catch(() => ({}))) as { ok?: boolean; service?: string };
}
