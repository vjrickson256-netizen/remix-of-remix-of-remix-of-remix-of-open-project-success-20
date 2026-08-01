import { useCallback, useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;

/**
 * Real browser install (PWA) support for the "Download App" button.
 * Chrome/Edge/Android fire `beforeinstallprompt`; on iOS Safari there is no
 * event, so we return guidance instead.
 */
export function useInstallApp() {
  const [canInstall, setCanInstall] = useState(!!deferred);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);

    function onPrompt(e: Event) {
      e.preventDefault();
      deferred = e as InstallPromptEvent;
      setCanInstall(true);
    }
    function onInstalled() {
      deferred = null;
      setCanInstall(false);
      setInstalled(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<{
    outcome: "accepted" | "dismissed" | "unsupported";
    hint: string;
  }> => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        deferred = null;
        setCanInstall(false);
      }
      return { outcome: choice.outcome, hint: "" };
    }
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    return {
      outcome: "unsupported",
      hint: isIOS
        ? "Tap the Share button in Safari, then \u201cAdd to Home Screen\u201d."
        : "Open your browser menu and choose \u201cInstall app\u201d / \u201cAdd to Home screen\u201d.",
    };
  }, []);

  return { canInstall, installed, install };
}
