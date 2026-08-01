import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-[10px] border border-[#2a3a51] bg-[#0d1520] px-3.5 py-2.5 text-[11px] text-mb-text placeholder:text-[#7d8ea6] focus:border-[#6366f1] focus:outline-none";

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-solid overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center gap-2 border-b border-[#1f2c3d] bg-[#16202f] px-5 py-3">
          <h2 className="mr-auto text-[10px] font-semibold tracking-[0.14em] text-[#e8edf5]">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const statTones = {
  indigo: "bg-[#4f46e5] text-white",
  green: "bg-[#16a34a] text-white",
  gold: "bg-[#f59e0b] text-[#1a1206]",
  pink: "bg-[#db2777] text-white",
  cyan: "bg-[#0891b2] text-white",
  violet: "bg-[#7c3aed] text-white",
} as const;

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "indigo",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof statTones;
}) {
  return (
    <div className="card-solid p-4 transition-transform hover:-translate-y-0.5">
      <div className={`mb-2.5 flex size-9 items-center justify-center rounded-[12px] ${statTones[tone]}`}>
        {icon}
      </div>
      <p className="text-xl font-semibold leading-none tracking-tight text-mb-text">{value}</p>
      <p className="mt-1.5 text-[9px] font-semibold tracking-[0.12em] text-mb-muted">{label}</p>
      {hint && <p className="mt-1 text-[9px] text-mb-dim">{hint}</p>}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="hide-scrollbar overflow-x-auto rounded-2xl">
      <table className="w-full text-left text-[11px]">
        <thead className="bg-[#1b2739] text-[9px] font-semibold tracking-[0.12em] text-[#a8b8cc]">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-4 py-3 first:rounded-l-2xl last:rounded-r-2xl">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-6 text-center text-[11px] text-[#8ea0b8]">
        {text}
      </td>
    </tr>
  );
}

export function Pill({ tone = "muted", children }: { tone?: "muted" | "green" | "red" | "gold"; children: ReactNode }) {
  const tones = {
    muted: "border-[#33455e] bg-[#223044] text-[#c3d0e0]",
    green: "border-[#22c55e] bg-[#16a34a] text-white",
    red: "border-[#f87171] bg-[#dc2626] text-white",
    gold: "border-[#fbbf24] bg-[#f59e0b] text-[#1a1206]",
  } as const;
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[8px] font-semibold tracking-[0.12em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SubTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3.5 py-1.5 text-[9px] font-semibold tracking-[0.1em] ${
            active === t.key
              ? "btn-solid-blue"
              : "btn-solid-slate hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
