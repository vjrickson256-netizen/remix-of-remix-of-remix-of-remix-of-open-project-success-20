import { collection, deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

/**
 * Subscription plans are created and priced by the admin in
 * Admin → Subscriptions → Plans. Every place that offers or activates a plan
 * (the subscribe modal, manual activation, billing tables) reads from here so
 * there is a single source of truth.
 */
export interface Plan {
  id: string;
  name: string;
  price: number;
  /** Duration in days — used to compute the expiry date on activation. */
  days: number;
  features: string[];
  featured?: boolean;
  /** Agent page plan — sold in its own modal, unlocks only Agent titles. */
  agent?: boolean;
  createdAt?: string;
}

const PLANS = "plans";

export function planPriceLabel(price: number) {
  return `UGX ${price.toLocaleString()}`;
}

/** Duration in days between today and a yyyy-mm-dd end date (min 1). */
export function daysUntil(dateValue: string) {
  const end = new Date(`${dateValue}T23:59:59`).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(1, Math.ceil((end - Date.now()) / 86400000));
}

/** yyyy-mm-dd for "today + days", handy for date inputs. */
export function dateAfterDays(days: number) {
  const d = new Date(Date.now() + Math.max(days, 1) * 86400000);
  return d.toISOString().slice(0, 10);
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, PLANS),
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            name: (data["name"] as string) ?? "",
            price: Number(data["price"] ?? 0),
            days: Number(data["days"] ?? 30),
            features: Array.isArray(data["features"]) ? (data["features"] as string[]) : [],
            featured: Boolean(data["featured"]),
            agent: Boolean(data["agent"]),
            createdAt: (data["createdAt"] as string) ?? "",
          } satisfies Plan;
        });
        setPlans(rows.sort((a, b) => a.price - b.price));
        setReady(true);
      },
      (err) => {
        console.error("Plans listener failed", err);
        setReady(true);
      },
    );
    return unsub;
  }, []);

  return { plans, ready };
}

export async function savePlan(plan: Plan) {
  await setDoc(
    doc(db, PLANS, plan.id),
    {
      name: plan.name,
      price: plan.price,
      days: plan.days,
      features: plan.features,
      featured: !!plan.featured,
      agent: !!plan.agent,
      createdAt: plan.createdAt || new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function removePlan(id: string) {
  await deleteDoc(doc(db, PLANS, id));
}
