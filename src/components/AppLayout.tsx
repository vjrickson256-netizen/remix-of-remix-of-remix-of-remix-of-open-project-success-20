import { useEffect, type ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { AuthModal } from "@/components/AuthModal";
import { SubscribeModal } from "@/components/SubscribeModal";
import { AgentSubscribeModal } from "@/components/AgentSubscribeModal";
import { MobileNav } from "@/components/MobileNav";
import { useApp } from "@/store/app-store";

/** Records every meaningful click into the Firestore activity log. */
function useClickTracking() {
  const { isLoggedIn, logActivity } = useApp();

  useEffect(() => {
    if (!isLoggedIn) return;
    let last = "";
    let lastAt = 0;

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const el = target?.closest("a,button,[role='button'],[data-track]") as HTMLElement | null;
      if (!el) return;
      const label =
        el.getAttribute("data-track") ||
        el.getAttribute("aria-label") ||
        (el.textContent ?? "").trim().slice(0, 60) ||
        el.tagName.toLowerCase();
      const href = el.getAttribute("href");
      const detail = href ? `Clicked "${label}" → ${href}` : `Clicked "${label}"`;
      const now = Date.now();
      if (detail === last && now - lastAt < 1500) return;
      last = detail;
      lastAt = now;
      logActivity("click", detail);
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isLoggedIn, logActivity]);
}

export function AppLayout({ children }: { children: ReactNode }) {
  useClickTracking();
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-mb-bg">
      <AppHeader />
      <div className="flex min-h-0 flex-1 gap-0 pb-0 md:gap-2 md:px-2 md:pb-2">
        <AppSidebar />
        <main className="hide-scrollbar min-w-0 flex-1 overflow-y-auto rounded-none bg-mb-sidebar/40 pb-20 md:rounded-2xl md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
      <AuthModal />
      <SubscribeModal />
      <AgentSubscribeModal />
    </div>
  );
}
