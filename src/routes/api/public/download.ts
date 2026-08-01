import { createFileRoute } from "@tanstack/react-router";

/**
 * Streams a remote media file back to the browser with a
 * `Content-Disposition: attachment` header so it lands in the native download
 * manager instead of opening in a new tab (the HTML `download` attribute is
 * ignored for cross-origin URLs such as the R2 public bucket).
 *
 * GET /api/public/download?url=<encoded file url>&name=<filename>
 */

function allowedHost(target: URL) {
  const allowed = new Set<string>();
  for (const name of ["R2_PUBLIC_URL", "R2_ACCOUNT_ID"]) {
    const value = process.env[name];
    if (!value) continue;
    try {
      allowed.add(
        name === "R2_ACCOUNT_ID"
          ? `${value}.r2.cloudflarestorage.com`
          : new URL(value).host,
      );
    } catch {
      /* ignore malformed config */
    }
  }
  return allowed.size === 0 ? false : allowed.has(target.host);
}

function safeName(name: string) {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 150) || "download";
}

export const Route = createFileRoute("/api/public/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const raw = params.get("url") ?? "";
        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("Invalid url", { status: 400 });
        }
        if (target.protocol !== "https:" || !allowedHost(target)) {
          return new Response("URL not allowed", { status: 403 });
        }

        const range = request.headers.get("range");
        const upstream = await fetch(target.toString(), {
          headers: range ? { range } : {},
        });
        if (!upstream.ok && upstream.status !== 206) {
          return new Response("File not available", { status: 502 });
        }

        const headers = new Headers();
        for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag"]) {
          const value = upstream.headers.get(key);
          if (value) headers.set(key, value);
        }
        const name = safeName((params.get("name") ?? target.pathname.split("/").pop()) || "download");
        headers.set("content-disposition", `attachment; filename="${name}"`);
        headers.set("cache-control", "private, max-age=0");

        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});
