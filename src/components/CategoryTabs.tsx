import { Filter } from "lucide-react";

export interface CategoryItem {
  /** Value used for filtering. */
  value: string;
  /** Display label. */
  label: string;
  /** Optional background artwork (poster / backdrop URL). */
  image?: string | undefined;
}

const TINTS = [
  "linear-gradient(120deg, rgba(31,41,55,0.92), rgba(31,41,55,0.55))",
  "linear-gradient(120deg, rgba(37,72,120,0.92), rgba(37,72,120,0.5))",
  "linear-gradient(120deg, rgba(112,72,52,0.92), rgba(112,72,52,0.5))",
  "linear-gradient(120deg, rgba(88,58,110,0.92), rgba(88,58,110,0.5))",
  "linear-gradient(120deg, rgba(126,62,36,0.92), rgba(126,62,36,0.5))",
  "linear-gradient(120deg, rgba(52,74,102,0.92), rgba(52,74,102,0.5))",
  "linear-gradient(120deg, rgba(46,88,78,0.92), rgba(46,88,78,0.5))",
];

/**
 * Soft artwork-backed category cards (MovieBox style) replacing the old
 * uppercase filter chips.
 */
export function CategoryTabs({
  items,
  active,
  onChange,
}: {
  items: CategoryItem[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <section className="px-1 pt-2 md:px-6 md:pt-3">
      <div className="hide-scrollbar flex flex-nowrap gap-2 overflow-x-auto pb-1 md:gap-2.5">
        {items.map((item, i) => {
          const isActive = active === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onChange(item.value)}
              className={`relative h-[54px] w-[104px] shrink-0 sm:h-[62px] sm:w-[128px] overflow-hidden rounded-xl border text-left transition-all md:h-[70px] md:w-[144px] ${
                isActive
                  ? "border-white/30 ring-1 ring-white/20"
                  : "border-white/[0.06] hover:border-white/20"
              }`}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              <span
                className="absolute inset-0"
                style={{ backgroundImage: TINTS[i % TINTS.length] }}
              />
              <span className="relative flex h-full items-center justify-between gap-1 px-3">
                <span
                  className={`text-[13px] font-semibold leading-tight ${
                    isActive ? "text-white" : "text-white/85"
                  }`}
                >
                  {item.label}
                </span>
                {i === 0 && <Filter className="size-4 shrink-0 text-white/80" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
