import { useCallback, useEffect, useState } from "react";
import { payApi } from "@/lib/pay-client";

import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, EmptyRow, Pill, StatCard, SubTabs, Table, inputClass } from "@/components/admin/ui";
import { PlansPanel } from "@/components/admin/PlansPanel";
import {
  type Subscription,
  type Transaction,
  addTransaction,
  cancelSubscription,
  isActive,
  removeTransaction,
  walletBalance,
} from "@/lib/admin-data";
import { CheckCircle2, Clock, CreditCard, Wallet, X } from "lucide-react";


const ugx = (n: number) => `UGX ${n.toLocaleString()}`;

export function SubscriptionsPanel({ subscriptions }: { subscriptions: Subscription[] }) {
  const [tab, setTab] = useState<"all" | "active" | "expired">("all");
  const active = subscriptions.filter(isActive);
  const expired = subscriptions.filter((s) => !isActive(s));
  const rows = tab === "active" ? active : tab === "expired" ? expired : subscriptions;

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<CreditCard className="size-4" />} label="TOTAL SUBSCRIPTIONS" value={subscriptions.length} />
        <StatCard icon={<CheckCircle2 className="size-4" />} label="ACTIVE" value={active.length} />
        <StatCard icon={<Clock className="size-4" />} label="EXPIRED" value={expired.length} />
      </div>
      <SubTabs
        tabs={[
          { key: "all", label: "ALL" },
          { key: "active", label: "ACTIVE" },
          { key: "expired", label: "EXPIRED" },
        ]}
        active={tab}
        onChange={setTab}
      />
      <Card title={`SUBSCRIPTIONS — ${rows.length}`}>
        <Table head={["USER", "PHONE", "PLAN", "PRICE", "STARTED", "EXPIRES", "STATUS", ""]}>
          {rows.length === 0 && <EmptyRow cols={8} text="No subscriptions yet." />}
          {rows.map((s) => (
            <tr key={s.id} className="border-t border-white/[0.05] text-mb-muted">
              <td className="px-3 py-2 font-semibold text-mb-text">{s.email}</td>
              <td className="whitespace-nowrap px-3 py-2">{s.phone ?? "—"}</td>
              <td className="px-3 py-2">{s.plan}</td>
              <td className="px-3 py-2">{ugx(s.price)}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[10px]">{new Date(s.startedAt).toLocaleDateString()}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[10px]">{new Date(s.expiresAt).toLocaleDateString()}</td>
              <td className="px-3 py-2">{isActive(s) ? <Pill tone="green">ACTIVE</Pill> : <Pill tone="red">EXPIRED</Pill>}</td>
              <td className="px-3 py-2 text-right">
                <button
                  aria-label={`Delete subscription for ${s.email}`}
                  onClick={() => {
                    void cancelSubscription(s.uid)
                      .then(() => toast.success("Subscription removed"))
                      .catch(() => toast.error("Delete failed."));
                  }}
                  className="text-mb-dim hover:text-[#f87171]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <PlansPanel />
    </div>
  );
}


export function WalletPanel({ transactions }: { transactions: Transaction[] }) {
  const recorded = walletBalance(transactions);
  const credits = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const debits = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const [live, setLive] = useState<{ balance: number; currency: string } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState("");
  const [form, setForm] = useState({ phone: "", amount: "", note: "" });
  const [holder, setHolder] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState("");
  const [open, setOpen] = useState(false);
  const [txTab, setTxTab] = useState<"all" | "successful" | "pending" | "failed">("all");

  const byStatus = (status: string) => transactions.filter((t) => (t.status ?? "successful") === status);
  const visibleTx = txTab === "all" ? transactions : byStatus(txTab);

  const loadBalance = useCallback(async () => {
    setLoadingBalance(true);
    setBalanceError("");
    try {
      setLive(await payApi<{ balance: number; currency: string }>("balance"));
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Could not load balance.");
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  async function verifyPhone() {
    setVerifying(true);
    setHolder("");
    try {
      const out = await payApi<{ valid: boolean; name: string; message: string }>("validate", {
        phone: form.phone,
      });
      if (!out.valid) throw new Error(out.message || "Number not valid.");
      setHolder(out.name || "Verified");
      toast.success(out.name ? `Number belongs to ${out.name}` : "Number verified");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function withdraw(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    if (!holder) {
      toast.error("Verify the phone number first.");
      return;
    }
    setSaving(true);
    setStage("Sending payout request\u2026");
    try {
      const out = await payApi<{ txRef: string; status: string; message: string; holder?: string }>(
        "withdraw",
        { phone: form.phone, amount, note: form.note.trim() || undefined },
      );

      // Only record the transaction once the money has really left the wallet:
      // poll the payout status until it settles.
      let status = out.status;
      let message = out.message;
      if (status !== "successful" && out.txRef) {
        setStage("Verifying payout with the mobile money network\u2026");
        for (let i = 0; i < 90 && status === "pending"; i += 1) {
          await new Promise((r) => setTimeout(r, 2000));
          const check = await payApi<{ status: string; message: string }>("withdraw-status", {
            txRef: out.txRef,
          }).catch(() => null);
          if (!check) continue;
          status = check.status;
          message = check.message || message;
        }
      }

      if (status !== "successful") {
        toast.error(
          status === "failed"
            ? message || "Withdrawal failed \u2014 nothing was recorded."
            : "Payout still pending \u2014 no transaction recorded yet. Check again shortly.",
        );
        return;
      }

      await addTransaction({
        type: "debit",
        amount,
        detail: `Withdrawal to ${form.phone}${out.holder ? ` (${out.holder})` : ""}${
          form.note.trim() ? ` \u2014 ${form.note.trim()}` : ""
        } \u00b7 ${out.txRef}`,
      });
      toast.success(`Withdrawal confirmed \u2014 ${ugx(amount)} sent to ${out.holder || form.phone}`);
      setForm({ phone: "", amount: "", note: "" });
      setHolder("");
      setOpen(false);
      void loadBalance();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      setSaving(false);
      setStage("");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <StatCard
            icon={<Wallet className="size-4" />}
            label="LIVE WALLET BALANCE"
            value={loadingBalance ? "…" : live ? ugx(live.balance) : "—"}
            {...(balanceError ? { hint: balanceError } : {})}
          />
          <button
            onClick={() => setOpen(true)}
            className="btn-solid-gold absolute right-3 top-3 px-3 py-1.5 text-[9px] font-semibold tracking-[0.1em]"
          >
            WITHDRAW
          </button>
        </div>
        <StatCard icon={<CreditCard className="size-4" />} label="COLLECTED (RECORDED)" value={ugx(credits)} />
        <StatCard icon={<Clock className="size-4" />} label="WITHDRAWN (RECORDED)" value={ugx(debits)} />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(6,11,18,0.85)] p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-[340px] rounded-2xl border border-[#22314a] bg-[#0e1520] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.65)]">
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-2.5 top-2.5 rounded p-1.5 text-mb-muted hover:text-mb-text"
            >
              <X className="size-3.5" />
            </button>
            <h3 className="text-[10px] font-semibold tracking-[0.14em] text-mb-text">WITHDRAW TO MOBILE MONEY</h3>
            <p className="mt-1 mb-3 text-[10px] text-mb-dim">
              Balance: {live ? ugx(live.balance) : "—"}
            </p>
            <form onSubmit={withdraw} className="grid gap-2.5">
              <input
                className={inputClass}
                placeholder="Phone (07XX XXX XXX)"
                value={form.phone}
                onChange={(e) => {
                  setHolder("");
                  setForm((f) => ({ ...f, phone: e.target.value }));
                }}
              />
              <input
                className={inputClass}
                placeholder="Amount (UGX)"
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
              <input
                className={inputClass}
                placeholder="Note (optional)"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void verifyPhone()}
                  disabled={verifying || form.phone.replace(/\D/g, "").length < 9}
                  className="btn-solid-slate flex-1 px-3 py-2 text-[10px] font-semibold tracking-[0.08em] disabled:opacity-60"
                >
                  {verifying ? "CHECKING…" : "VERIFY"}
                </button>
                <button
                  type="submit"
                  disabled={saving || !holder}
                  className="btn-solid-blue flex-1 px-4 py-2 text-[10px] font-semibold tracking-[0.08em] disabled:opacity-60"
                >
                  {saving ? "SENDING…" : "WITHDRAW"}
                </button>
              </div>
            </form>
            <p className="mt-2 text-[10px] text-mb-dim">
              {stage
                ? stage
                : holder
                ? `Verified: ${holder}. Recorded balance ${ugx(recorded)}.`
                : "Verify the number before sending — withdrawals cannot be reversed."}
            </p>
          </div>
        </div>
      )}

      <SubTabs
        tabs={[
          { key: "all", label: `ALL — ${transactions.length}` },
          { key: "successful", label: `SUCCESSFUL — ${byStatus("successful").length}` },
          { key: "pending", label: `PENDING — ${byStatus("pending").length}` },
          { key: "failed", label: `FAILED — ${byStatus("failed").length}` },
        ]}
        active={txTab}
        onChange={setTxTab}
      />
      <Card title={`TRANSACTIONS — ${visibleTx.length}`}>
        <Table head={["TYPE", "STATUS", "AMOUNT", "PHONE", "DETAIL", "USER", "WHEN", ""]}>
          {visibleTx.length === 0 && <EmptyRow cols={8} text="No transactions yet." />}
          {visibleTx.map((t) => (
            <tr key={t.id} className="border-t border-white/[0.05] text-mb-muted">
              <td className="px-3 py-2">{t.type === "credit" ? <Pill tone="green">IN</Pill> : <Pill tone="red">OUT</Pill>}</td>
              <td className="px-3 py-2">
                {(t.status ?? "successful") === "successful" ? (
                  <Pill tone="green">SUCCESSFUL</Pill>
                ) : (t.status ?? "") === "pending" ? (
                  <Pill tone="gold">PENDING</Pill>
                ) : (
                  <Pill tone="red">FAILED</Pill>
                )}
              </td>
              <td className="px-3 py-2 font-semibold text-mb-text">{ugx(t.amount)}</td>
              <td className="whitespace-nowrap px-3 py-2">{t.phone ?? "—"}</td>
              <td className="max-w-[280px] truncate px-3 py-2">{t.detail}</td>
              <td className="px-3 py-2">{t.email ?? "—"}</td>
              <td className="whitespace-nowrap px-3 py-2 text-[10px] text-mb-dim">{new Date(t.at).toLocaleString()}</td>
              <td className="px-3 py-2 text-right">
                <button
                  aria-label="Delete transaction"
                  onClick={() => {
                    void removeTransaction(t.id)
                      .then(() => toast.success("Transaction deleted"))
                      .catch(() => toast.error("Delete failed."));
                  }}
                  className="text-mb-dim hover:text-[#f87171]"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
