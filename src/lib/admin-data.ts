import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";

/** A plan name is whatever the admin called it in Admin → Subscriptions. */
export type PlanName = string;

/** Minimal shape needed to activate someone — matches `Plan` from @/lib/plans. */
export interface ActivatablePlan {
  name: string;
  price: number;
  days: number;
  /** Agent page plan — unlocks Agent titles only. */
  agent?: boolean;
}


export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  provider?: string | undefined;
  isAdmin?: boolean | undefined;
  blocked?: boolean | undefined;
  avatar?: string | undefined;
}

export interface Subscription {
  id: string;
  uid: string;
  email: string;
  plan: PlanName;
  price: number;
  startedAt: string;
  expiresAt: string;
  phone?: string | undefined;
}

export interface Transaction {
  id: string;
  uid?: string | undefined;
  email?: string | undefined;
  type: "credit" | "debit";
  amount: number;
  detail: string;
  at: string;
  status?: "successful" | "pending" | "failed" | undefined;
  phone?: string | undefined;
  txRef?: string | undefined;
  plan?: string | undefined;
}

export function isActive(sub: Subscription) {
  return new Date(sub.expiresAt).getTime() > Date.now();
}

/** Generic realtime collection hook. */
function useCollection<T>(
  path: string,
  mapper: (id: string, data: Record<string, unknown>) => T,
  enabled = true,
): T[] {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    if (!enabled) {
      setRows([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => setRows(snap.docs.map((d) => mapper(d.id, d.data() as Record<string, unknown>))),
      (err) => console.error(`${path} listener failed`, err),
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled]);
  return rows;
}

export function useAdminUsers(enabled = true) {
  return useCollection<AdminUser>(
    "users",
    (id, d) => ({
      uid: id,
      name: (d["name"] as string) ?? "",
      email: (d["email"] as string) ?? "",
      provider: d["provider"] as string | undefined,
      isAdmin: d["isAdmin"] as boolean | undefined,
      blocked: d["blocked"] as boolean | undefined,
      avatar: d["avatar"] as string | undefined,
    }),
    enabled,
  );
}

export function useSubscriptions(enabled = true) {
  return useCollection<Subscription>(
    "subscriptions",
    (id, d) => ({
      id,
      uid: (d["uid"] as string) ?? "",
      email: (d["email"] as string) ?? "",
      plan: ((d["plan"] as PlanName) ?? "FREE"),
      price: Number(d["price"] ?? 0),
      startedAt: (d["startedAt"] as string) ?? new Date().toISOString(),
      expiresAt: (d["expiresAt"] as string) ?? new Date().toISOString(),
      phone: d["phone"] as string | undefined,
    }),
    enabled,
  );
}

export function useTransactions(enabled = true) {
  const rows = useCollection<Transaction>(
    "transactions",
    (id, d) => ({
      id,
      uid: d["uid"] as string | undefined,
      email: d["email"] as string | undefined,
      type: ((d["type"] as "credit" | "debit") ?? "credit"),
      amount: Number(d["amount"] ?? 0),
      detail: (d["detail"] as string) ?? "",
      at: (d["at"] as string) ?? new Date().toISOString(),
      status: (d["status"] as Transaction["status"]) ?? "successful",
      phone: d["phone"] as string | undefined,
      txRef: d["txRef"] as string | undefined,
      plan: d["plan"] as string | undefined,
    }),
    enabled,
  );
  return [...rows].sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function walletBalance(transactions: Transaction[]) {
  return transactions
    .filter((t) => (t.status ?? "successful") === "successful")
    .reduce((sum, t) => sum + (t.type === "credit" ? t.amount : -t.amount), 0);
}

/**
 * Activate an admin-defined plan for a user (manual activation or checkout).
 * The plan object comes from the `plans` collection, so pricing and duration
 * always match what the admin configured.
 */
export async function activateSubscription(
  user: { uid: string; email: string },
  plan: ActivatablePlan,
  options: { recordTransaction?: boolean; phone?: string } = {},
) {
  const started = new Date();
  const expires = new Date(started.getTime() + Math.max(plan.days, 1) * 86400000);
  await setDoc(
    doc(db, "subscriptions", user.uid),
    {
      uid: user.uid,
      email: user.email,
      ...(plan.agent
        ? {
            agentPlan: plan.name,
            agentPrice: plan.price,
            agentDays: plan.days,
            agentStartedAt: started.toISOString(),
            agentExpiresAt: expires.toISOString(),
          }
        : {
            plan: plan.name,
            price: plan.price,
            days: plan.days,
            startedAt: started.toISOString(),
            expiresAt: expires.toISOString(),
          }),
      ...(options.phone ? { phone: options.phone } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  if (options.recordTransaction !== false && plan.price > 0) {
    await addTransaction({
      uid: user.uid,
      email: user.email,
      type: "credit",
      amount: plan.price,
      detail: `${plan.name} subscription — UGX ${plan.price.toLocaleString()}`,
      plan: plan.name,
      ...(options.phone ? { phone: options.phone } : {}),
    });
  }
}


export async function cancelSubscription(uid: string) {
  await deleteDoc(doc(db, "subscriptions", uid));
}

export async function addTransaction(tx: Omit<Transaction, "id" | "at"> & { at?: string }) {
  const clean = Object.fromEntries(Object.entries(tx).filter(([, v]) => v !== undefined));
  const ref = await addDoc(collection(db, "transactions"), {
    ...clean,
    status: tx.status ?? "successful",
    at: tx.at ?? new Date().toISOString(),
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Patches an existing transaction (used when a pending payment settles). */
export async function updateTransaction(id: string, patch: Partial<Transaction>) {
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  await setDoc(doc(db, "transactions", id), clean, { merge: true });
}

/** Blocks or unblocks a user account. */
export async function setUserBlocked(uid: string, blocked: boolean) {
  await setDoc(doc(db, "users", uid), { blocked }, { merge: true });
}

/** Human readable time left on a subscription. */
export function timeLeft(sub: Subscription) {
  const ms = new Date(sub.expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${days}d ${hours}h ${minutes}m`;
}

export async function removeTransaction(id: string) {
  await deleteDoc(doc(db, "transactions", id));
}

/** Removes the user profile document and any subscription attached to it. */
export async function deleteUserRecord(uid: string) {
  await deleteDoc(doc(db, "users", uid));
  const sub = await getDoc(doc(db, "subscriptions", uid));
  if (sub.exists()) await deleteDoc(sub.ref);
}

export async function deleteActivity(id: string) {
  await deleteDoc(doc(db, "activities", id));
}

export async function deleteUserActivities(uid: string) {
  const snap = await getDocs(query(collection(db, "activities"), where("uid", "==", uid)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
