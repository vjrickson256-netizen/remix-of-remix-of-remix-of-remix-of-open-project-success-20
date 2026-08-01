import { useEffect, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { payApi, type ChargeResponse } from "@/lib/pay-client";
import { activateSubscription, addTransaction, updateTransaction } from "@/lib/admin-data";
import { planPriceLabel, usePlans, type Plan } from "@/lib/plans";

/**
 * Standalone floating modal for the Agent page plans only. It never shows the
 * regular site plans, and the plans it sells unlock Agent titles only.
 */
export function AgentSubscribeModal() {
  const { agentSubscribeOpen, closeAgentSubscribe, isLoggedIn, openAuth, logActivity, user } = useApp();
  const { plans: allPlans, ready: plansReady } = usePlans();
  const plans = allPlans.filter((p) => p.agent);
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const pollRef = useRef<number | null>(null);
  const txDocRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!agentSubscribeOpen) {
      setCheckout(null);
      setStatusText("");
      setBusy(false);
      if (pollRef.current) window.clearInterval(pollRef.current);
    }
  }, [agentSubscribeOpen]);

  if (!agentSubscribeOpen) return null;

  function start(plan: Plan) {
    if (!isLoggedIn || !user) {
      closeAgentSubscribe();
      openAuth("login");
      return;
    }
    setStatusText("");
    setCheckout(plan);
  }

  async function finish(plan: Plan) {
    if (!user) return;
    await activateSubscription(
      { uid: user.uid, email: user.email },
      { name: plan.name, price: plan.price, days: plan.days, agent: true },
      { recordTransaction: false, phone },
    );
    logActivity("subscribe", `Paid ${planPriceLabel(plan.price)} for the Agent plan — ${plan.name}`);
    closeAgentSubscribe();
    toast.success(`${plan.name} activated`, {
      description: `Agent page unlocked for ${plan.days} days`,
    });
  }

  async function pay(plan: Plan) {
    if (!user) return;
    setBusy(true);
    setStatusText("Checking your number…");
    try {
      const check = await payApi<{ valid: boolean; name: string; message: string }>("validate", { phone });
      if (!check.valid) throw new Error(check.message || "That mobile money number is not valid.");
      setStatusText(check.name ? `Sending request to ${check.name}…` : "Sending payment request…");

      const data = await payApi<ChargeResponse>("init", { plan: plan.name, amount: plan.price, phone });
      setStatusText(data.message || "Approve the prompt on your phone…");

      const txRef = data.txRef;
      txDocRef.current = await addTransaction({
        uid: user.uid,
        email: user.email,
        type: "credit",
        amount: plan.price,
        detail: `Agent plan — ${plan.name} (${planPriceLabel(plan.price)})`,
        status: "pending",
        phone,
        txRef,
        plan: plan.name,
      }).catch(() => null);

      let tries = 0;
      const stop = () => {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
      };
      pollRef.current = window.setInterval(() => {
        tries += 1;
        void (async () => {
          try {
            const out = await payApi<ChargeResponse>("status", { txRef });
            if (out.status === "successful") {
              stop();
              setBusy(false);
              setStatusText("Payment received — unlocking the Agent page…");
              if (txDocRef.current) await updateTransaction(txDocRef.current, { status: "successful" });
              await finish(plan);
            } else if (out.status === "failed") {
              stop();
              setBusy(false);
              if (txDocRef.current) await updateTransaction(txDocRef.current, { status: "failed" });
              setStatusText(out.message || "Payment was not completed. Please try again.");
            } else if (tries > 180) {
              stop();
              setBusy(false);
              setStatusText("Timed out waiting for approval. Please try again.");
            }
          } catch {
            /* keep polling */
          }
        })();
      }, 1000);
    } catch (err) {
      console.error(err);
      setBusy(false);
      setStatusText(err instanceof Error ? err.message : "Payment failed.");
      toast.error(err instanceof Error ? err.message : "Payment failed.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(6,11,18,0.88)] p-4 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAgentSubscribe();
      }}
    >
      <div className="relative w-full max-w-[520px] rounded-3xl bg-mb-sidebar/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.65)] ring-1 ring-mb-green/25">
        <button
          aria-label="Close"
          onClick={closeAgentSubscribe}
          className="absolute right-2.5 top-2.5 rounded p-1.5 text-mb-muted transition-all hover:bg-white/5 hover:text-mb-text"
        >
          <X className="size-3.5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-mb-green/15">
            <BadgeCheck className="size-5 text-mb-green" />
          </div>
          <div>
            <p className="text-base font-semibold leading-none text-mb-text">Agent Access</p>
            <p className="mt-1 text-[11px] font-normal text-mb-muted">
              A separate plan that unlocks the Agent page only.
            </p>
          </div>
        </div>

        {checkout ? (
          <div className="grid gap-3">
            <button
              onClick={() => setCheckout(null)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-mb-muted hover:text-mb-text"
            >
              <ArrowLeft className="size-3.5" /> Back to agent plans
            </button>
            <div className="rounded-2xl bg-white/[0.04] p-4">
              <p className="text-[12px] font-medium text-mb-muted">
                {checkout.name} · {planPriceLabel(checkout.price)} · {checkout.days} days
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-mb-text">
                <Smartphone className="size-4 text-mb-green" /> Pay with mobile money
              </p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="07XX XXX XXX"
                aria-label="Mobile money phone number"
                className="mt-2.5 w-full rounded-xl bg-mb-bg/70 px-3 py-2.5 text-[13px] text-mb-text placeholder:text-mb-dim focus:outline-none focus:ring-1 focus:ring-mb-green"
              />
              <button
                disabled={busy || phone.trim().length < 9}
                onClick={() => void pay(checkout)}
                className="btn-solid-green mt-2.5 w-full rounded-xl py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60"
              >
                {busy ? "Waiting for approval…" : `Pay ${planPriceLabel(checkout.price)}`}
              </button>
              {statusText ? (
                <p className="mt-2 text-center text-[10px] font-bold text-mb-muted">{statusText}</p>
              ) : null}
            </div>
          </div>
        ) : plans.length === 0 ? (
          <p className="rounded-2xl bg-white/[0.04] px-4 py-8 text-center text-[12px] text-mb-muted">
            {plansReady ? "No agent plan has been set up yet." : "Loading agent plans…"}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-2xl bg-mb-green/[0.07] p-3 text-center ring-1 ring-mb-green/20">
                <p className="mt-1 text-[12px] font-medium text-mb-muted">{plan.name}</p>
                <div className="mt-1 text-[22px] font-bold leading-tight text-mb-text">
                  {plan.price.toLocaleString()}
                </div>
                <p className="text-[10px] font-normal text-mb-muted">
                  UGX / {plan.days} {plan.days === 1 ? "day" : "days"}
                </p>
                <button
                  onClick={() => start(plan)}
                  className="btn-solid-green mt-2.5 flex w-full items-center justify-center rounded-xl py-2 text-[12px] font-semibold transition-all hover:opacity-90"
                >
                  Unlock agent page
                </button>
                <ul className="mt-3 flex flex-1 flex-col gap-1.5 text-left">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] font-normal text-mb-text">
                      <span className="text-mb-green">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-[11px] font-normal text-mb-dim">
          Agent plan · unlocks agent titles only · MTN MoMo & Airtel Money
        </p>
      </div>
    </div>
  );
}