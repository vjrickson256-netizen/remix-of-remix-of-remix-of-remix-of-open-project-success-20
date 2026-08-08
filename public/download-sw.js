self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin || requestUrl.pathname !== "/__download") return;

  event.respondWith(
    (async () => {
      const source = requestUrl.searchParams.get("url");
      const filename = requestUrl.searchParams.get("filename") || "video.mp4";
      if (!source) return new Response("Missing download URL", { status: 400 });

      try {
        const upstream = await fetch(source, { mode: "cors" });
        if (!upstream.ok || !upstream.body) {
          return new Response("The video could not be downloaded", { status: upstream.status || 502 });
        }

        const headers = new Headers();
        headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
        headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        const length = upstream.headers.get("Content-Length");
        if (length) headers.set("Content-Length", length);
        const ranges = upstream.headers.get("Accept-Ranges");
        if (ranges) headers.set("Accept-Ranges", ranges);

        return new Response(upstream.body, { status: 200, headers });
      } catch {
        return new Response("The video host blocked the download request", { status: 502 });
      }
    })(),
  );
});