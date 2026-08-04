import { readUploadConfig } from "@/lib/upload-config";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
const PART_SIZE = 64 * 1024 * 1024; // 64 MB per part → 5 GB = 80 parts
const CONCURRENCY = 4;

export type UploadFolder = "videos" | "audio" | "images";

async function api<T>(action: string, body: unknown): Promise<T> {
  const { apiUrl, token } = readUploadConfig();
  const res = await fetch(`${apiUrl}/uploads/${action}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(data.error || `Upload request failed (${res.status}).`);
  return data;
}

function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void, signal?: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag") ?? xhr.getResponseHeader("etag");
        if (!etag) {
          reject(new Error("R2 did not return an ETag — check the bucket CORS ExposeHeaders setting."));
          return;
        }
        resolve(etag.replace(/"/g, ""));
      } else {
        reject(new Error(`Chunk upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading a chunk."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(blob);
  });
}

/**
 * Uploads a file straight to Cloudflare R2 in 64 MB chunks using presigned
 * multipart URLs. Handles files up to 5 GB (well past the 300 MB limit of the
 * Cloudflare dashboard uploader) and never routes bytes through the server.
 */
export async function uploadToR2(
  file: File,
  opts: {
    folder: UploadFolder;
    onProgress?: (percent: number, uploadedBytes: number) => void;
    signal?: AbortSignal;
  },
): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("File is larger than the 5 GB limit.");

  const { key, uploadId } = await api<{ key: string; uploadId: string; publicUrl: string }>("create", {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    folder: opts.folder,
  });

  const totalParts = Math.max(1, Math.ceil(file.size / PART_SIZE));
  const loaded = new Array<number>(totalParts).fill(0);
  const parts: { partNumber: number; etag: string }[] = [];
  const report = () => {
    const done = loaded.reduce((a, b) => a + b, 0);
    opts.onProgress?.(Math.min(99, Math.round((done / file.size) * 100)), done);
  };

  try {
    let next = 1;
    const worker = async () => {
      for (;;) {
        const batchStart = next;
        if (batchStart > totalParts) return;
        next += 1;
        const partNumber = batchStart;
        const { urls } = await api<{ urls: { partNumber: number; url: string }[] }>("sign", {
          key,
          uploadId,
          partNumbers: [partNumber],
        });
        const url = urls.find((u) => u.partNumber === partNumber)?.url;
        if (!url) throw new Error("Could not sign upload chunk.");
        const blob = file.slice((partNumber - 1) * PART_SIZE, partNumber * PART_SIZE);
        const etag = await putPart(
          url,
          blob,
          (bytes) => {
            loaded[partNumber - 1] = bytes;
            report();
          },
          opts.signal,
        );
        loaded[partNumber - 1] = blob.size;
        report();
        parts.push({ partNumber, etag });
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, totalParts) }, worker));

    const { publicUrl } = await api<{ publicUrl: string }>("complete", { key, uploadId, parts });
    opts.onProgress?.(100, file.size);
    return publicUrl;
  } catch (err) {
    void api("abort", { key, uploadId }).catch(() => {});
    throw err;
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}