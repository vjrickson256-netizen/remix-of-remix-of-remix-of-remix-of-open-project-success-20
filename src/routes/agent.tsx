import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BadgeCheck, Lock } from "lucide-react";
import { useCatalog } from "@/store/catalog-store";
import { useApp } from "@/store/app-store";
import { useSubscription } from "@/hooks/use-subscription";
import { EmptyState, MovieGrid, SortSelect, sortMovies } from "@/components/catalog";
import { GridSkeleton } from "@/components/Skeletons";

export const Route = createFileRoute("/agent")({
  head: () => ({
    meta: [
      { title: "Agent Exclusives — CALMALENG.NET" },
      {
        name: "description",
        content:
          "Agent-only movies and series on CALMALENG.NET. Unlock them with the separate Agent plan to watch and download.",
      },
      { property: "og:title", content: "Agent Exclusives — CALMALENG.NET" },
      { property: "og:description", content: "Agent-only movies and series, watch and download." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  const { agent, ready } = useCatalog();
  const { openAgentSubscribe, openAuth, isLoggedIn } = useApp();
  const { agentActive, agentExpiresAt } = useSubscription();
  const [sortBy, setSortBy] = useState("newest");
  const list = useMemo(() => sortMovies(agent, sortBy), [agent, sortBy]);

  return (
    <div className="min-h-full pb-10">
      <div className="flex flex-wrap items-center gap-3 px-4 pb-2 pt-4 md:px-6">
        <div className="flex size-9 items-center justify-center rounded-2xl bg-mb-green/15">
          <BadgeCheck className="size-4.5 text-mb-green" />
        </div>
        <div className="mr-auto">
          <h1 className="text-sm font-extrabold tracking-[0.08em] text-mb-text">AGENT EXCLUSIVES</h1>
          <p className="mt-0.5 text-[11px] text-mb-muted">
            {agentActive
              ? `Agent access active${agentExpiresAt ? ` until ${new Date(agentExpiresAt).toLocaleDateString()}` : ""} — watch and download freely.`
              : "These titles are only here. Unlock them with the Agent plan to watch and download."}
          </p>
        </div>
        {!agentActive && (
          <button
            onClick={() => (isLoggedIn ? openAgentSubscribe() : openAuth("login"))}
            className="btn-solid-green flex items-center gap-1.5 rounded-xl px-4 py-2 text-[10px] font-bold tracking-[0.1em]"
          >
            <Lock className="size-3" />
            {isLoggedIn ? "GET AGENT ACCESS" : "SIGN IN TO UNLOCK"}
          </button>
        )}
      </div>
      <div className="flex items-center justify-end px-4 pb-1 md:px-6">
        <SortSelect value={sortBy} onChange={setSortBy} />
      </div>
      {list.length ? (
        <MovieGrid movies={list} />
      ) : !ready ? (
        <GridSkeleton />
      ) : (
        <EmptyState message="No agent titles yet — mark a movie or series for the agent page in the admin dashboard." />
      )}
    </div>
  );
}