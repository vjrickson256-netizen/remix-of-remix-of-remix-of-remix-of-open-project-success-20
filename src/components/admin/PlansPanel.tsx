import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, EmptyRow, Pill, Table, inputClass } from "@/components/admin/ui";
import {
  dateAfterDays,
  daysUntil,
  planPriceLabel,
  removePlan,
  savePlan,
  usePlans,
  type Plan,
} from "@/lib/plans";

const emptyForm = {
  name: "",
  price: "",
  days: "30",
  endDate: dateAfterDays(30),
  features: "",
  featured: false,
  agent: false,
};

/** Create, update and delete the subscription plans the whole site sells. */
export function PlansPanel() {
  const { plans } = usePlans();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setForm({ ...emptyForm });
      return;
    }
    setForm({
      name: editing.name,
      price: String(editing.price),
      days: String(editing.days),
      endDate: dateAfterDays(editing.days),
      features: editing.features.join(", "),
      featured: !!editing.featured,
      agent: !!editing.agent,
    });
  }, [editing]);

  function setDays(value: string) {
    const days = Number(value);
    setForm((f) => ({
      ...f,
      days: value,
      endDate: days > 0 ? dateAfterDays(days) : f.endDate,
    }));
  }

  function setEndDate(value: string) {
    setForm((f) => ({ ...f, endDate: value, days: String(daysUntil(value) || f.days) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const days = Number(form.days);
    if (!form.name.trim()) {
      toast.error("Give the plan a name.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    if (!Number.isFinite(days) || days < 1) {
      toast.error("Duration must be at least 1 day.");
      return;
    }
    const plan: Plan = {
      id: editing ? editing.id : `${Date.now()}`,
      name: form.name.trim().toUpperCase(),
      price,
      days,
      features: form.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      featured: form.featured,
      agent: form.agent,
      ...(editing?.createdAt ? { createdAt: editing.createdAt } : {}),
    };
    setSaving(true);
    try {
      if (plan.featured) {
        await Promise.all(
          plans
            .filter((p) => p.featured && p.id !== plan.id)
            .map((p) => savePlan({ ...p, featured: false })),
        );
      }
      await savePlan(plan);
      toast.success(editing ? `${plan.name} updated` : `${plan.name} plan added`);
      setEditing(null);
      setForm({ ...emptyForm });
    } catch (err) {
      console.error(err);
      toast.error("Could not save the plan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card
        title={editing ? `EDIT PLAN — ${editing.name}` : "ADD SUBSCRIPTION PLAN"}
        action={
          editing ? (
            <button
              onClick={() => setEditing(null)}
              className="text-[9px] font-semibold tracking-[0.08em] text-mb-dim hover:text-mb-text"
            >
              CANCEL
            </button>
          ) : undefined
        }
      >
        <form onSubmit={submit} className="grid gap-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Plan name * (e.g. PREMIUM)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className={inputClass}
              inputMode="numeric"
              placeholder="Price in UGX *"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            <div className="grid gap-1">
              <label className="text-[9px] font-semibold tracking-[0.1em] text-mb-dim">DURATION (DAYS)</label>
              <input
                className={inputClass}
                inputMode="numeric"
                placeholder="30"
                value={form.days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <label className="text-[9px] font-semibold tracking-[0.1em] text-mb-dim">OR ENDS ON</label>
              <input
                type="date"
                aria-label="Plan end date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <input
            className={inputClass}
            placeholder="Features, comma separated (Unlimited watching, No ads…)"
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-mb-muted">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            MARK AS MOST POPULAR
          </label>
          <label className="flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-mb-green">
            <input
              type="checkbox"
              checked={form.agent}
              onChange={(e) => setForm((f) => ({ ...f, agent: e.target.checked, featured: false }))}
            />
            AGENT PAGE PLAN (OWN POP-UP, UNLOCKS AGENT TITLES ONLY)
          </label>
          <button
            type="submit"
            disabled={saving}
            className="btn-solid-blue justify-self-start px-4 py-2 text-[10px] font-semibold tracking-[0.08em] disabled:opacity-60"
          >
            {saving ? "SAVING…" : editing ? "UPDATE PLAN" : "ADD PLAN"}
          </button>
          <p className="text-[9px] text-mb-dim">
            These plans are what users see in the subscribe pop-up and what admins pick when activating
            someone manually.
          </p>
        </form>
      </Card>

      <Card title={`PLANS — ${plans.length}`} className="self-start">
        <Table head={["PLAN", "PRICE", "DURATION", "FEATURES", ""]}>
          {plans.length === 0 && <EmptyRow cols={5} text="No plans yet — add one to start selling." />}
          {plans.map((p) => (
            <tr key={p.id} className="border-t border-white/[0.05] text-mb-muted">
              <td className="px-3 py-2 font-semibold text-mb-text">
                {p.name}
                {p.agent && (
                  <span className="ml-2">
                    <Pill tone="green">AGENT</Pill>
                  </span>
                )}
                {p.featured && (
                  <span className="ml-2">
                    <Pill tone="gold">POPULAR</Pill>
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2">{planPriceLabel(p.price)}</td>
              <td className="whitespace-nowrap px-3 py-2">{p.days} days</td>
              <td className="px-3 py-2 text-[10px]">{p.features.join(" · ") || "—"}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditing(p)}
                    className="btn-solid-slate px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-mb-text hover:border-mb-green/35"
                  >
                    EDIT
                  </button>
                  <button
                    aria-label={`Delete ${p.name} plan`}
                    onClick={() => {
                      void removePlan(p.id)
                        .then(() => toast.success(`${p.name} removed`))
                        .catch(() => toast.error("Delete failed."));
                    }}
                    className="text-mb-dim hover:text-[#f87171]"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
