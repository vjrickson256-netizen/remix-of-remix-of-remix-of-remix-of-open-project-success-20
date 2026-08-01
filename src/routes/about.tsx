import { createFileRoute } from "@tanstack/react-router";
import { Film, Languages, Mic2, Sparkles } from "lucide-react";
import rickson from "@/assets/vj-rickson.jpg.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About VJ Rickson — CALMALENG.NET" },
      {
        name: "description",
        content:
          "Meet VJ Rickson, the voice behind CALMALENG.NET — Luo translated movies, series and animation for Uganda and beyond.",
      },
      { property: "og:title", content: "About VJ Rickson — CALMALENG.NET" },
      {
        property: "og:description",
        content: "The voice behind CALMALENG.NET — Luo translated movies, series and animation.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const highlights = [
  { icon: Mic2, title: "Live VJ narration", text: "Every title is narrated live in Luo, keeping the story close to home." },
  { icon: Languages, title: "Luo translation", text: "Hollywood, Bollywood and Nollywood turned into the language you dream in." },
  { icon: Film, title: "Movies & series", text: "Blockbusters, box sets and cartoons translated and released every week." },
  { icon: Sparkles, title: "Clean HD releases", text: "Sharp picture, balanced sound and downloads that work on any phone." },
];

function AboutPage() {
  return (
    <div className="min-h-full pb-12">
      <section className="grid gap-6 px-4 py-6 md:grid-cols-[280px_minmax(0,1fr)] md:px-6">
        <img
          src={rickson.url}
          alt="VJ Rickson, founder and narrator of CALMALENG.NET"
          className="w-full rounded-3xl object-cover shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]"
          loading="lazy"
        />
        <div className="self-center">
          <p className="text-[10px] font-bold tracking-[0.18em] text-mb-green">ABOUT US</p>
          <h1 className="mt-2 text-2xl font-extrabold text-mb-text">VJ RICKSON</h1>
          <p className="mt-1 text-[12px] font-semibold tracking-[0.08em] text-mb-muted">
            Founder & narrator — CALMALENG<span className="text-mb-green">.NET</span>
          </p>
          <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-mb-muted">
            CALMALENG.NET started with one microphone and one idea: that a great film should never be lost
            in translation. VJ Rickson narrates and translates films into Luo so families across northern
            Uganda — and the diaspora everywhere — can laugh, cry and cheer in their own language.
          </p>
          <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-mb-muted">
            What began in a small video hall now streams on this platform: movies, series, animation and the
            song of the week, plus an Agent section for exclusive releases. Every title you see here was
            recorded, translated and uploaded by the man in this picture.
          </p>
        </div>
      </section>

      <section className="grid gap-3 px-4 md:grid-cols-2 md:px-6">
        {highlights.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl bg-white/[0.04] p-4">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-mb-green" />
              <h2 className="text-[12px] font-bold tracking-[0.06em] text-mb-text">{title}</h2>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-mb-muted">{text}</p>
          </div>
        ))}
      </section>

      <section className="px-4 pt-5 md:px-6">
        <div className="rounded-2xl bg-mb-green/[0.07] p-5 ring-1 ring-mb-green/20">
          <h2 className="text-[12px] font-bold tracking-[0.08em] text-mb-text">WORK WITH VJ RICKSON</h2>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-mb-muted">
            For translation requests, event bookings, adverts or agent partnerships, reach out through the
            contact details in Settings and the team will get back to you.
          </p>
        </div>
      </section>
    </div>
  );
}