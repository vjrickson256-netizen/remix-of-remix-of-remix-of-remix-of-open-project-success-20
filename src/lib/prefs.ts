import { useCallback, useEffect, useState } from "react";

export interface Prefs {
  /** Start playback automatically when a watch page opens. */
  autoplay: boolean;
  /** Start playback muted (required by browsers for reliable autoplay). */
  muted: boolean;
}

const KEY = "calmaleng:prefs";
const EVENT = "calmaleng:prefs-change";

export const defaultPrefs: Prefs = { autoplay: false, muted: false };

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    return { ...defaultPrefs, ...parsed };
  } catch {
    return defaultPrefs;
  }
}

export function writePrefs(next: Prefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — preferences stay in memory for this session */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Reactive access to the user's playback preferences, shared across the app. */
export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);

  useEffect(() => {
    setPrefs(readPrefs());
    const sync = () => setPrefs(readPrefs());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    const next = { ...readPrefs(), [key]: value };
    setPrefs(next);
    writePrefs(next);
  }, []);

  return { prefs, setPref };
}
