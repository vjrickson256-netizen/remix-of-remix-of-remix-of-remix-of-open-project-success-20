import { useState } from "react";
import { toast } from "sonner";
import { Ban, CheckCircle2, Trash2, X } from "lucide-react";
import { Card, EmptyRow, Pill, SubTabs, Table, inputClass } from "@/components/admin/ui";
import { planPriceLabel, usePlans } from "@/lib/plans";
import {
  type AdminUser,
  type PlanName,
  type Subscription,
  activateSubscription,
  cancelSubscription,
  deleteUserActivities,
  deleteUserRecord,
  isActive,
  setUserBlocked,
  timeLeft,
} from "@/lib/admin-data";

function PlanModal({
  user,
  current,
  onClose,
}: {
  user: AdminUser;
  current?: PlanName;
  onClose: () => void;
}) {
  const { plans } = usePlans();
  const [planId, setPlanId] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = plans.find((p) => p.id === planId) ?? plans.find((p) => p.name === current) ?? plans[0];

  async function save() {
    if (!selected) {
      toast.error("Add a plan first in the Subscriptions tab.");
      return;
    }
    setBusy(true);
    try {
      await activateSubscription({ uid: user.uid, email: user.email }, selected, {
        recordTransaction: false,
      });
      toast.success(`${selected.name} activated for ${user.email}`);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Activation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(6,11,18,0.85)] p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[320px] rounded-2xl border border-[#22314a] bg-[#0e1520] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-2.5 top-2.5 rounded p-1.5 text-mb-muted hover:text-mb-text"
        >
          <X className="size-3.5" />
        </button>
        <h3 className="text-[10px] font-semibold tracking-[0.14em] text-mb-text">
          {current ? "CHANGE PLAN" : "ACTIVATE PLAN"}
        </h3>
        <p className="mt-1 mb-3 text-[10px] text-mb-dim">{user.email}</p>
        {plans.length === 0 ? (
          <p className="text-[10px] text-mb-muted">
            No plans exist yet. Create one under Subscriptions → Add subscription plan.
          </p>
        ) : (
          <>
            <select
              aria-label="Plan"
              className={inputClass}
              value={selected?.id ?? ""}
              onChange={(e) => setPlanId(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {planPriceLabel(p.price)} · {p.days}d
                </option>
              ))}
            </select>
            {selected && (
              <p className="mt-2 text-[9px] text-mb-dim">
                Expires {new Date(Date.now() + selected.days * 86400000).toLocaleString()}
              </p>
            )}
            <button
              disabled={busy}
              onClick={() => void save()}
              className="btn-solid-blue mt-3 w-full px-3 py-2 text-[10px] font-semibold tracking-[0.1em] disabled:opacity-60"
            >
              {busy ? "SAVING…" : current ? "UPDATE PLAN" : "ACTIVATE"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}


export function UsersPanel({ users, subscriptions }: { users: AdminUser[]; subscriptions: Subscription[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "active">("all");
  const [modal, setModal] = useState<{ user: AdminUser; current?: PlanName } | null>(null);

  const subFor = (uid: string) => subscriptions.find((s) => s.uid === uid);

  const searched = users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const activeUsers = searched.filter((u) => {
    const s = subFor(u.uid);
    return !!s && isActive(s);
  });
  const others = searched.filter((u) => !activeUsers.includes(u));
  const rows = tab === "active" ? activeUsers : [...activeUsers, ...others];

  async function remove(u: AdminUser) {
    setBusy(u.uid);
    try {
      await deleteUserRecord(u.uid);
      await deleteUserActivities(u.uid);
      toast.success(`${u.email} removed`);
    } catch (err) {
      console.error(err);
      toast.error("Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlock(u: AdminUser) {
    setBusy(u.uid);
    try {
      await setUserBlocked(u.uid, !u.blocked);
      toast.success(u.blocked ? `${u.email} unblocked` : `${u.email} blocked`);
    } catch (err) {
      console.error(err);
      toast.error("Update failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3">
      <SubTabs
        tabs={[
          { key: "all", label: `ALL — ${searched.length}` },
          { key: "active", label: `ACTIVE — ${activeUsers.length}` },
        ]}
        active={tab}
        onChange={setTab}
      />
      <Card
        title={`USERS — ${rows.length}`}
        action={
          <input
            className={`${inputClass} max-w-48`}
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        }
      >
        <Table head={["NAME", "EMAIL", "PHONE", "PLAN", "SUBSCRIBED", "TIME LEFT", "ACTIONS"]}>
          {rows.length === 0 && <EmptyRow cols={7} text="No users to show." />}
          {rows.map((u) => {
            const sub = subFor(u.uid);
            const active = !!sub && isActive(sub);
            return (
              <tr key={u.uid} className="border-t border-white/[0.05] text-mb-muted">
                <td className="px-3 py-2 font-semibold text-mb-text">
                  {u.name}
                  {u.isAdmin && (
                    <span className="ml-2">
                      <Pill tone="green">ADMIN</Pill>
                    </span>
                  )}
                  {u.blocked && (
                    <span className="ml-2">
                      <Pill tone="red">BLOCKED</Pill>
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{sub?.phone ?? "—"}</td>
                <td className="px-3 py-2">
                  {sub ? (
                    active ? (
                      <Pill tone="green">{sub.plan} ACTIVE</Pill>
                    ) : (
                      <Pill tone="red">{sub.plan} EXPIRED</Pill>
                    )
                  ) : (
                    <Pill>FREE</Pill>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[10px]">
                  {sub ? (
                    <>
                      {new Date(sub.startedAt).toLocaleDateString()}
                      <span className="ml-1 text-mb-dim">{new Date(sub.startedAt).toLocaleTimeString()}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[10px]">
                  {sub ? (active ? timeLeft(sub) : "expired") : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setModal(active && sub ? { user: u, current: sub.plan } : { user: u })}
                      className="btn-solid-blue whitespace-nowrap px-2.5 py-1 text-[9px] font-semibold tracking-[0.08em]"
                    >
                      {active ? "CHANGE PLAN" : "ACTIVATE"}
                    </button>
                    {sub && (
                      <button
                        onClick={() => {
                          void cancelSubscription(u.uid)
                            .then(() => toast.success("Subscription deactivated"))
                            .catch(() => toast.error("Deactivate failed."));
                        }}
                        className="btn-solid-slate whitespace-nowrap px-2 py-1 text-[9px] font-semibold tracking-[0.08em] text-mb-muted hover:text-mb-text"
                      >
                        DEACTIVATE
                      </button>
                    )}
                    <button
                      aria-label={u.blocked ? `Unblock ${u.email}` : `Block ${u.email}`}
                      disabled={busy === u.uid}
                      onClick={() => void toggleBlock(u)}
                      className={`${u.blocked ? "text-mb-green" : "text-mb-dim hover:text-[#fbbf24]"} disabled:opacity-50`}
                    >
                      {u.blocked ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
                    </button>
                    <button
                      aria-label={`Delete ${u.email}`}
                      disabled={busy === u.uid}
                      onClick={() => void remove(u)}
                      className="text-mb-dim hover:text-[#f87171] disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {modal && (
        <PlanModal
          user={modal.user}
          {...(modal.current ? { current: modal.current } : {})}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
