/** Shared loading placeholders so pages show structure instead of a blank screen. */

export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function PosterSkeleton() {
  return (
    <div className="w-[130px] shrink-0">
      <Shimmer className="aspect-[2/3] w-full rounded-xl" />
      <Shimmer className="mt-2 h-2.5 w-4/5 rounded-full" />
      <Shimmer className="mt-1.5 h-2 w-1/3 rounded-full" />
    </div>
  );
}

export function RowSkeleton({ count = 8 }: { count?: number }) {
  return (
    <section className="px-6 py-5">
      <Shimmer className="mb-4 h-3.5 w-32 rounded-full" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <PosterSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export function GridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-3.5 px-6 py-5">
      {Array.from({ length: count }).map((_, i) => (
        <PosterSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="px-6 pt-5">
      <Shimmer className="h-[240px] w-full rounded-3xl sm:h-[320px]" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-full pb-10">
      <HeroSkeleton />
      <RowSkeleton />
      <RowSkeleton />
      <RowSkeleton />
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Shimmer key={i} className="h-8 w-full rounded-xl" />
      ))}
    </div>
  );
}
