import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, EmptyRow, Pill, Table, inputClass } from "@/components/admin/ui";
import { deleteActivity } from "@/lib/admin-data";
import type { ActivityEntry } from "@/store/app-store";

export function ActivitiesPanel({
  activities,
  onClearAll,
}: {
  activities: ActivityEntry[];
  onClearAll: () => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");

  const types = useMemo(
    () => ["ALL", ...Array.from(new Set(activities.map((a) => a.type.toUpperCase())))],
    [activities],
  );

  const rows = activities.filter(
    (a) =>
      (type === "ALL" || a.type.toUpperCase() === type) &&
      `${a.detail} ${a.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Card
      title={`ACTIVITY LOG — ${activities.length}`}
      action={
        <div className="flex items-center gap-1.5">
          <input
            className={`${inputClass} max-w-40`}
            placeholder="Search activity"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select aria-label="Type" className={`${inputClass} max-w-28`} value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            onClick={onClearAll}
            className="whitespace-nowrap btn-solid-slate border-[#f87171] px-2.5 py-1 text-[9px] font-semibold tracking-[0.08em] text-[#f87171]"
          >
            CLEAR ALL
          </button>
        </div>
      }
    >
      <Table head={["TYPE", "DETAIL", "USER", "WHEN", ""]}>
        {rows.length === 0 && <EmptyRow cols={5} text="No activity recorded yet." />}
        {rows.map((a) => (
          <tr key={a.id} className="border-t border-white/[0.05] text-mb-muted">
            <td className="px-3 py-2">
              <Pill tone="green">{a.type.toUpperCase()}</Pill>
            </td>
            <td className="max-w-[320px] truncate px-3 py-2 text-mb-text">{a.detail}</td>
            <td className="px-3 py-2">{a.email ?? "—"}</td>
            <td className="whitespace-nowrap px-3 py-2 text-[10px] text-mb-dim">{new Date(a.at).toLocaleString()}</td>
            <td className="px-3 py-2 text-right">
              <button
                aria-label="Delete activity"
                onClick={() => {
                  void deleteActivity(a.id)
                    .then(() => toast.success("Activity deleted"))
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
  );
}
