import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, EmptyRow, Pill, SubTabs, Table, inputClass } from "@/components/admin/ui";
import { UploadField } from "@/components/admin/UploadField";
import { useCatalog } from "@/store/catalog-store";
import type { Episode, Movie } from "@/data/movies";
import type { Song } from "@/data/songs";

type ContentTab = "carousel" | "movies" | "series" | "episodes" | "song";

const tabs: { key: ContentTab; label: string }[] = [
  { key: "carousel", label: "CAROUSEL" },
  { key: "movies", label: "MOVIES" },
  { key: "series", label: "SERIES" },
  { key: "episodes", label: "EPISODES" },
  { key: "song", label: "SONG OF THE WEEK" },
];

export function ContentPanel() {
  const [tab, setTab] = useState<ContentTab>("carousel");
  return (
    <div className="grid gap-3">
      <SubTabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "carousel" && <CarouselTab />}
      {tab === "movies" && <TitlesTab type="movie" />}
      {tab === "series" && <TitlesTab type="series" />}
      {tab === "episodes" && <EpisodesTab />}
      {tab === "song" && <SongsTab />}
    </div>
  );
}

/* ---------------- CAROUSEL ---------------- */

function CarouselTab() {
  const { all, saveTitle } = useCatalog();
  const featured = all.filter((m) => m.hero);

  async function toggle(movie: Movie, hero: boolean) {
    try {
      await saveTitle({ ...movie, hero });
      toast.success(hero ? `${movie.title} added to carousel` : `${movie.title} removed from carousel`);
    } catch {
      toast.error("Update failed.");
    }
  }

  return (
    <div className="grid gap-3">
      <ManualSlides />
      <Card title={`HERO CAROUSEL — ${featured.length} FEATURED TITLES`}>
        <p className="mb-3 text-[10px] text-mb-dim">
          Pick which uploaded titles appear in the homepage carousel. A backdrop image gives the best result.
        </p>
        <Table head={["TITLE", "TYPE", "BACKDROP", "IN CAROUSEL", ""]}>
          {all.length === 0 && <EmptyRow cols={5} text="Upload a movie or series first." />}
          {all.map((m) => (
            <tr key={m.id} className="border-t border-white/[0.05] text-mb-muted">
              <td className="px-3 py-2 font-semibold text-mb-text">{m.title}</td>
              <td className="px-3 py-2">{(m.type ?? "movie").toUpperCase()}</td>
              <td className="px-3 py-2">{m.backdrop ? <Pill tone="green">YES</Pill> : <Pill>NONE</Pill>}</td>
              <td className="px-3 py-2">{m.hero ? <Pill tone="gold">FEATURED</Pill> : <Pill>NO</Pill>}</td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => void toggle(m, !m.hero)}
                  className="btn-solid-slate px-2.5 py-1 text-[9px] font-semibold tracking-[0.08em] text-mb-text hover:border-mb-green/35"
                >
                  {m.hero ? "REMOVE" : "ADD"}
                </button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}

/** Standalone carousel slides — an image the admin uploads that links to nothing. */
function ManualSlides() {
  const { slides, saveSlide, removeSlide } = useCatalog();
  const [form, setForm] = useState({ title: "", subtitle: "", image: "" });
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image.trim()) {
      toast.error("Add a slide image first.");
      return;
    }
    setSaving(true);
    try {
      await saveSlide({
        id: Date.now(),
        title: form.title.trim() || "Featured",
        image: form.image.trim(),
        ...(form.subtitle.trim() ? { subtitle: form.subtitle.trim() } : {}),
        linkId: null,
      });
      toast.success("Slide added to the carousel");
      setForm({ title: "", subtitle: "", image: "" });
    } catch {
      toast.error("Could not save the slide.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title={`MANUAL SLIDES — ${slides.length}`}>
      <p className="mb-3 text-[10px] text-mb-dim">
        Upload a banner straight to the carousel. These slides are not linked to any title — they only show the
        image and text.
      </p>
      <form onSubmit={add} className="grid gap-2.5 sm:grid-cols-2">
        <input
          className={inputClass}
          placeholder="Slide title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <input
          className={inputClass}
          placeholder="Subtitle (optional)"
          value={form.subtitle}
          onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
        />
        <div className="sm:col-span-2">
          <UploadField
            label="SLIDE IMAGE"
            placeholder="Image URL or upload a banner"
            value={form.image}
            onChange={(url) => setForm((f) => ({ ...f, image: url }))}
            folder="images"
            accept="image/*"
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-solid-blue px-4 py-2 text-[10px] font-semibold tracking-[0.1em] disabled:opacity-60"
          >
            {saving ? "SAVING…" : "ADD SLIDE"}
          </button>
        </div>
      </form>

      <div className="mt-4">
        <Table head={["PREVIEW", "TITLE", "SUBTITLE", ""]}>
          {slides.length === 0 && <EmptyRow cols={4} text="No manual slides yet." />}
          {slides.map((s) => (
            <tr key={s.id} className="border-t border-white/[0.05] text-mb-muted">
              <td className="px-3 py-2">
                <img src={s.image} alt={s.title} className="h-8 w-14 rounded object-cover" />
              </td>
              <td className="px-3 py-2 font-semibold text-mb-text">{s.title}</td>
              <td className="px-3 py-2">{s.subtitle ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <button
                  aria-label={`Delete ${s.title}`}
                  onClick={() => {
                    void removeSlide(s.id)
                      .then(() => toast.success("Slide removed"))
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
      </div>
    </Card>
  );
}


/* ---------------- MOVIES / SERIES ---------------- */

const emptyTitle = {
  title: "",
  year: String(new Date().getFullYear()),
  genres: "",
  language: "English",
  poster: "",
  backdrop: "",
  videoUrl: "",
  duration: "",
  seasons: "",
  description: "",
  hero: false,
  agent: false,
};

function TitlesTab({ type }: { type: "movie" | "series" }) {
  const { allTitles, saveTitle, removeTitle } = useCatalog();
  const list = allTitles
    .filter((m) => (m.type ?? "movie") === type)
    .sort((a, b) => a.title.localeCompare(b.title));
  const [editing, setEditing] = useState<Movie | null>(null);
  const [form, setForm] = useState({ ...emptyTitle });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setForm({ ...emptyTitle });
      return;
    }
    setForm({
      title: editing.title,
      year: String(editing.year ?? ""),
      genres: (editing.genres ?? []).join(", "),
      language: editing.language ?? "English",
      poster: editing.poster ?? "",
      backdrop: editing.backdrop ?? "",
      videoUrl: editing.videoUrl ?? "",
      duration: editing.duration ?? "",
      seasons: editing.seasons != null ? String(editing.seasons) : "",
      description: editing.description ?? "",
      hero: !!editing.hero,
      agent: !!editing.agent,
    });
  }, [editing]);

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.poster.trim()) {
      toast.error("Title and poster URL are required.");
      return;
    }
    const ids = allTitles.map((m) => m.id);
    const movie: Movie = {
      id: editing ? editing.id : ids.length ? Math.max(...ids) + 1 : 1,
      title: form.title.trim(),
      year: Number(form.year) || new Date().getFullYear(),
      genres: form.genres.split(",").map((g) => g.trim()).filter(Boolean),
      language: form.language.trim() || "English",
      poster: form.poster.trim(),
      type,
      hero: form.agent ? false : form.hero,
      agent: form.agent,
      ...(editing?.episodes ? { episodes: editing.episodes } : {}),
      ...(form.backdrop.trim() ? { backdrop: form.backdrop.trim() } : {}),
      ...(form.videoUrl.trim() ? { videoUrl: form.videoUrl.trim() } : {}),
      ...(form.duration.trim() ? { duration: form.duration.trim() } : {}),
      ...(form.seasons.trim() ? { seasons: Number(form.seasons) } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    };
    setSaving(true);
    try {
      await saveTitle(movie);
      toast.success(editing ? `${movie.title} updated` : `${movie.title} is live on the site`);
      setEditing(null);
      setForm({ ...emptyTitle });
    } catch (err) {
      console.error(err);
      toast.error("Save failed. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const label = type === "series" ? "SERIES" : "MOVIE";

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card
        title={editing ? `EDIT ${label}` : `UPLOAD ${label}`}
        action={
          editing ? (
            <button onClick={() => setEditing(null)} className="text-[9px] font-semibold tracking-[0.08em] text-mb-dim hover:text-mb-text">
              CANCEL
            </button>
          ) : undefined
        }
      >
        <form onSubmit={submit} className="grid gap-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input className={inputClass} placeholder="Title *" value={form.title} onChange={(e) => set("title", e.target.value)} />
            <input className={inputClass} placeholder="Year" value={form.year} onChange={(e) => set("year", e.target.value)} />
            <UploadField
              label="poster"
              placeholder="Poster image URL *"
              value={form.poster}
              onChange={(url) => set("poster", url)}
              folder="images"
              accept="image/*"
            />
            <UploadField
              label="backdrop"
              placeholder="Backdrop image URL"
              value={form.backdrop}
              onChange={(url) => set("backdrop", url)}
              folder="images"
              accept="image/*"
            />
            {type === "movie" && (
              <div className="sm:col-span-2">
                <UploadField
                  label="video"
                  placeholder="Video URL (mp4 / stream) — or send a file up to 5 GB"
                  value={form.videoUrl}
                  onChange={(url) => set("videoUrl", url)}
                  folder="videos"
                  accept="video/*,.mkv,.mp4,.mov,.m4v,.webm"
                />
              </div>
            )}
            <input className={inputClass} placeholder="Genres (comma separated)" value={form.genres} onChange={(e) => set("genres", e.target.value)} />
            <input className={inputClass} placeholder="Language" value={form.language} onChange={(e) => set("language", e.target.value)} />
            <input className={inputClass} placeholder="Duration (1h 58m)" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
            {type === "series" && (
              <input className={inputClass} placeholder="Seasons" value={form.seasons} onChange={(e) => set("seasons", e.target.value)} />
            )}
          </div>
          <textarea
            className={`${inputClass} min-h-20`}
            placeholder="Description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
          <label className="flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-mb-muted">
            <input
              type="checkbox"
              checked={form.hero}
              disabled={form.agent}
              onChange={(e) => set("hero", e.target.checked)}
            />
            SHOW IN HERO CAROUSEL
          </label>
          <label className="flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-mb-green">
            <input type="checkbox" checked={form.agent} onChange={(e) => set("agent", e.target.checked)} />
            MARK FOR AGENT PAGE (ONLY VISIBLE THERE UNTIL UNMARKED)
          </label>
          <button
            type="submit"
            disabled={saving}
            className="btn-solid-blue justify-self-start px-4 py-2 text-[10px] font-semibold tracking-[0.08em] disabled:opacity-60"
          >
            {saving ? "SAVING…" : editing ? "UPDATE" : `PUBLISH ${label}`}
          </button>
        </form>
      </Card>

      <Card title={`${label} LIBRARY — ${list.length}`} className="self-start">
        <Table head={type === "series" ? ["TITLE", "YEAR", "AGENT", "SEASONS", ""] : ["TITLE", "YEAR", "AGENT", "VIDEO", ""]}>
          {list.length === 0 && <EmptyRow cols={5} text={`No ${label.toLowerCase()} uploaded yet.`} />}
          {list.map((m) => (
            <tr key={m.id} className="border-t border-white/[0.05] text-mb-muted">
              <td className="px-3 py-2 font-semibold text-mb-text">{m.title}</td>
              <td className="px-3 py-2">{m.year}</td>
              <td className="px-3 py-2">{m.agent ? <Pill tone="green">AGENT</Pill> : <Pill>NO</Pill>}</td>
              <td className="px-3 py-2">{type === "series" ? (m.seasons ?? "—") : (m.videoUrl ? <Pill tone="green">READY</Pill> : <Pill>NONE</Pill>)}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditing(m)}
                    className="btn-solid-slate px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-mb-text hover:border-mb-green/35"
                  >
                    EDIT
                  </button>
                  <button
                    aria-label={`Delete ${m.title}`}
                    onClick={() => {
                      void removeTitle(m.id)
                        .then(() => toast.success(`Removed ${m.title}`))
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

/* ---------------- EPISODES ---------------- */

function EpisodesTab() {
  const { series, saveTitle } = useCatalog();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = series.find((s) => s.id === (selectedId ?? series[0]?.id));
  const [form, setForm] = useState({ number: "", title: "", duration: "", thumbnail: "", videoUrl: "" });
  const [saving, setSaving] = useState(false);
  const episodes = selected?.episodes ?? [];

  async function addEpisode(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!form.title.trim()) {
      toast.error("Episode title is required.");
      return;
    }
    const episode: Episode = {
      number: Number(form.number) || episodes.length + 1,
      title: form.title.trim(),
      duration: form.duration.trim() || "0m",
      thumbnail: form.thumbnail.trim() || selected.poster,
      ...(form.videoUrl.trim() ? { videoUrl: form.videoUrl.trim() } : {}),
    };
    const next = [...episodes.filter((ep) => ep.number !== episode.number), episode].sort(
      (a, b) => a.number - b.number,
    );
    setSaving(true);
    try {
      await saveTitle({ ...selected, episodes: next });
      toast.success(`Episode ${episode.number} saved`);
      setForm({ number: "", title: "", duration: "", thumbnail: "", videoUrl: "" });
    } catch {
      toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function removeEpisode(number: number) {
    if (!selected) return;
    try {
      await saveTitle({ ...selected, episodes: episodes.filter((ep) => ep.number !== number) });
      toast.success(`Episode ${number} removed`);
    } catch {
      toast.error("Delete failed.");
    }
  }

  if (series.length === 0) {
    return (
      <Card title="EPISODES">
        <p className="text-[11px] text-mb-dim">Upload a series first, then add its episodes here.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card title="ADD / UPDATE EPISODE">
        <form onSubmit={addEpisode} className="grid gap-2.5">
          <select
            aria-label="Series"
            className={inputClass}
            value={selected?.id ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
          >
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input className={inputClass} placeholder="Episode number" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
            <input className={inputClass} placeholder="Episode title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input className={inputClass} placeholder="Duration (42m)" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            <UploadField
              label="thumbnail"
              placeholder="Thumbnail URL"
              value={form.thumbnail}
              onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
              folder="images"
              accept="image/*"
            />
          </div>
          <UploadField
            label="episode video"
            placeholder="Episode video URL (mp4)"
            value={form.videoUrl}
            onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
            folder="videos"
            accept="video/*"
          />
          <p className="text-[10px] text-mb-dim">
            Each episode carries its own video — the series entry itself only needs a poster/trailer.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="btn-solid-blue justify-self-start px-4 py-2 text-[10px] font-semibold tracking-[0.08em] disabled:opacity-60"
          >
            {saving ? "SAVING…" : "SAVE EPISODE"}
          </button>
        </form>
      </Card>

      <Card title={`${selected?.title ?? ""} — ${episodes.length} EPISODES`} className="self-start">
        {episodes.length === 0 ? (
          <p className="text-[11px] text-[#8ea0b8]">No episodes yet.</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
            {episodes.map((ep) => (
              <div
                key={ep.number}
                title={`${ep.number}. ${ep.title}${ep.duration ? ` — ${ep.duration}` : ""}`}
                className="group relative rounded-[12px] border border-[#2a3a51] bg-[#16202f] p-2 text-center"
              >
                <button
                  aria-label={`Delete episode ${ep.number}`}
                  onClick={() => void removeEpisode(ep.number)}
                  className="absolute right-1 top-1 hidden text-[#8ea0b8] hover:text-[#f87171] group-hover:block"
                >
                  <Trash2 className="size-3" />
                </button>
                <p className="text-base font-bold leading-none text-white">{ep.number}</p>
                <p className="mt-1 truncate text-[9px] text-[#c3d0e0]">{ep.title}</p>
                <p className="text-[8px] text-[#8ea0b8]">{ep.duration || "—"}</p>
                <p className={`text-[8px] ${ep.videoUrl ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                  {ep.videoUrl ? "video" : "no video"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- SONG OF THE WEEK ---------------- */

const emptySong = {
  title: "",
  artist: "",
  genre: "",
  year: String(new Date().getFullYear()),
  rating: "",
  duration: "",
  coverUrl: "",
  videoUrl: "",
  featured: false,
};


function SongsTab() {
  const { songs, saveSong, removeSong } = useCatalog();
  const [editing, setEditing] = useState<Song | null>(null);
  const [form, setForm] = useState({ ...emptySong });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) {
      setForm({ ...emptySong });
      return;
    }
    setForm({
      title: editing.title,
      artist: editing.artist,
      genre: editing.genre ?? "",
      year: String(editing.year ?? ""),
      rating: editing.rating != null ? String(editing.rating) : "",
      duration: editing.duration ?? "",
      coverUrl: editing.coverUrl ?? "",
      videoUrl: editing.videoUrl ?? "",
      featured: !!editing.featured,
    });
  }, [editing]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.artist.trim() || !form.coverUrl.trim()) {
      toast.error("Title, artist and cover URL are required.");
      return;
    }
    const ids = songs.map((s) => s.id);
    const song: Song = {
      id: editing ? editing.id : ids.length ? Math.max(...ids) + 1 : 1,
      title: form.title.trim(),
      artist: form.artist.trim(),
      genre: form.genre.trim() || "Music",
      year: Number(form.year) || new Date().getFullYear(),
      rating: Number(form.rating) || 0,
      duration: form.duration.trim() || "0:00",
      coverUrl: form.coverUrl.trim(),
      featured: form.featured,
      ...(form.videoUrl.trim() ? { videoUrl: form.videoUrl.trim() } : {}),
    };
    setSaving(true);
    try {
      // Only one song of the week at a time.
      if (song.featured) {
        await Promise.all(
          songs.filter((s) => s.featured && s.id !== song.id).map((s) => saveSong({ ...s, featured: false })),
        );
      }
      await saveSong(song);
      toast.success(editing ? `${song.title} updated` : `${song.title} is live on the site`);
      setEditing(null);
      setForm({ ...emptySong });
    } catch (err) {
      console.error(err);
      toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card
        title={editing ? "EDIT SONG" : "UPLOAD SONG"}
        action={
          editing ? (
            <button onClick={() => setEditing(null)} className="text-[9px] font-semibold tracking-[0.08em] text-mb-dim hover:text-mb-text">
              CANCEL
            </button>
          ) : undefined
        }
      >
        <form onSubmit={submit} className="grid gap-2.5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input className={inputClass} placeholder="Song title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <input className={inputClass} placeholder="Artist *" value={form.artist} onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))} />
            <UploadField
              label="cover"
              placeholder="Cover image URL *"
              value={form.coverUrl}
              onChange={(url) => setForm((f) => ({ ...f, coverUrl: url }))}
              folder="images"
              accept="image/*"
            />
            <UploadField
              label="music video"
              placeholder="Music video URL (mp4)"
              value={form.videoUrl}
              onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
              folder="videos"
              accept="video/*"
            />

            <input className={inputClass} placeholder="Genre" value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} />
            <input className={inputClass} placeholder="Duration (3:42)" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
            <input className={inputClass} placeholder="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
            <input className={inputClass} placeholder="Rating (0-5)" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] text-mb-muted">
            <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
            SET AS SONG OF THE WEEK
          </label>
          <button
            type="submit"
            disabled={saving}
            className="btn-solid-blue justify-self-start px-4 py-2 text-[10px] font-semibold tracking-[0.08em] disabled:opacity-60"
          >
            {saving ? "SAVING…" : editing ? "UPDATE SONG" : "PUBLISH SONG"}
          </button>
        </form>
      </Card>

      <Card title={`MUSIC LIBRARY — ${songs.length}`} className="self-start">
        <Table head={["SONG", "ARTIST", "WEEK", ""]}>
          {songs.length === 0 && <EmptyRow cols={4} text="No songs uploaded yet." />}
          {songs.map((s) => (
            <tr key={s.id} className="border-t border-white/[0.05] text-mb-muted">
              <td className="px-3 py-2 font-semibold text-mb-text">{s.title}</td>
              <td className="px-3 py-2">{s.artist}</td>
              <td className="px-3 py-2">{s.featured ? <Pill tone="gold">SONG OF THE WEEK</Pill> : <Pill>—</Pill>}</td>
              <td className="px-3 py-2">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditing(s)}
                    className="btn-solid-slate px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-mb-text hover:border-mb-green/35"
                  >
                    EDIT
                  </button>
                  <button
                    aria-label={`Delete ${s.title}`}
                    onClick={() => {
                      void removeSong(s.id)
                        .then(() => toast.success(`Removed ${s.title}`))
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
