import { useRef, useState } from "react";
import { toast } from "sonner";
import { UploadCloud, X } from "lucide-react";
import { inputClass } from "@/components/admin/ui";
import { MAX_UPLOAD_BYTES, formatBytes, uploadToR2, type UploadFolder } from "@/lib/r2-upload";

type Props = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (url: string) => void;
  folder: UploadFolder;
  accept: string;
};

/** URL field with a "send file" button that uploads straight to Cloudflare R2 (up to 5 GB). */
export function UploadField({ label, placeholder, value, onChange, folder, accept }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  async function handleFile(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error("That file is over the 5 GB limit.");
      return;
    }
    controller.current = new AbortController();
    setPercent(0);
    setStatus(`${file.name} — ${formatBytes(file.size)}`);
    try {
      const url = await uploadToR2(file, {
        folder,
        signal: controller.current.signal,
        onProgress: (p) => setPercent(p),
      });
      onChange(url);
      toast.success(`${file.name} uploaded to R2`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setPercent(null);
      setStatus("");
      controller.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = percent !== null;

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <input
          className={`${inputClass} flex-1`}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn-solid-slate shrink-0 px-3 py-2 text-[9px] font-semibold tracking-[0.08em] text-mb-text disabled:opacity-60"
          title={`Upload ${label} file (up to 5 GB)`}
        >
          <span className="flex items-center gap-1.5">
            <UploadCloud className="size-3.5" />
            SEND FILE
          </span>
        </button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" aria-label={`Upload ${label}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      {busy && (
        <div className="card-solid rounded-2xl px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[9px] tracking-[0.08em] text-mb-muted">
            <span className="truncate">{status}</span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              {percent}%
              <button
                type="button"
                aria-label="Cancel upload"
                onClick={() => controller.current?.abort()}
                className="text-mb-dim hover:text-[#f87171]"
              >
                <X className="size-3" />
              </button>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-mb-green transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}