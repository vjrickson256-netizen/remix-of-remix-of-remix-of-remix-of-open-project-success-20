import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useApp } from "@/store/app-store";

export interface SubscriptionState {
  plan: string | null;
  expiresAt: string | null;
  active: boolean;
  /** Agent page plan status — unlocks only Agent titles. */
  agentPlan: string | null;
  agentExpiresAt: string | null;
  agentActive: boolean;
  loading: boolean;
}

/** Realtime subscription status for the signed-in user. */
export function useSubscription(): SubscriptionState {
  const { user, isAdmin } = useApp();
  const [state, setState] = useState<SubscriptionState>({
    plan: null,
    expiresAt: null,
    active: false,
    agentPlan: null,
    agentExpiresAt: null,
    agentActive: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({
        plan: null,
        expiresAt: null,
        active: false,
        agentPlan: null,
        agentExpiresAt: null,
        agentActive: false,
        loading: false,
      });
      return;
    }
    const unsub = onSnapshot(
      doc(db, "subscriptions", user.uid),
      (snap) => {
        const data = snap.data() as
          | { plan?: string; expiresAt?: string; agentPlan?: string; agentExpiresAt?: string }
          | undefined;
        const expiresAt = data?.expiresAt ?? null;
        const agentExpiresAt = data?.agentExpiresAt ?? null;
        setState({
          plan: data?.plan ?? null,
          expiresAt,
          active: !!expiresAt && new Date(expiresAt).getTime() > Date.now(),
          agentPlan: data?.agentPlan ?? null,
          agentExpiresAt,
          agentActive: !!agentExpiresAt && new Date(agentExpiresAt).getTime() > Date.now(),
          loading: false,
        });
      },
      (err) => {
        console.error("Subscription listener failed", err);
        setState({
          plan: null,
          expiresAt: null,
          active: false,
          agentPlan: null,
          agentExpiresAt: null,
          agentActive: false,
          loading: false,
        });
      },
    );
    return unsub;
  }, [user?.uid]);

  // Admins always have full access.
  return isAdmin
    ? { ...state, active: true, agentActive: true, plan: state.plan ?? "ADMIN", loading: false }
    : state;
}