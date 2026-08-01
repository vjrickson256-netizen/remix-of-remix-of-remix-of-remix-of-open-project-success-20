import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Cloudflare R2 direct-to-bucket upload endpoints.
 *
 * The browser never streams the file through this server: we hand back
 * presigned S3 URLs and the browser PUTs each chunk straight to R2.
 * That removes the 300 MB dashboard limit and any serverless body limit —
 * uploads up to 5 TB (we cap at 5 GB) work fine.
 *
 * POST /api/r2/create   { filename, contentType, size, folder }
 * POST /api/r2/sign     { key, uploadId, partNumbers[] }
 * POST /api/r2/complete { key, uploadId, parts[] }
 * POST /api/r2/abort    { key, uploadId }
 */

const MAX_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function requireAdmin(request: Request) {
  const { verifyAdminToken } = await import("@/lib/r2.server");
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) return "Missing auth token.";
  return (await verifyAdminToken(token)) ? null : "Not authorized.";
}

const createSchema = z.object({
  filename: z.string().min(1).max(300),
  contentType: z.string().min(1).max(200).default("application/octet-stream"),
  size: z.number().int().positive().max(MAX_BYTES),
  folder: z.enum(["videos", "audio", "images"]).default("videos"),
});

const signSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  partNumbers: z.array(z.number().int().min(1).max(10000)).min(1).max(50),
});

const completeSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z
    .array(z.object({ PartNumber: z.number().int().min(1), ETag: z.string().min(1) }))
    .min(1),
});

const abortSchema = z.object({ key: z.string().min(1), uploadId: z.string().min(1) });

export const Route = createFileRoute("/api/r2/$action")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const denied = await requireAdmin(request);
        if (denied) return json({ error: denied }, 401);

        const r2 = await import("@/lib/r2.server");
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body." }, 400);
        }

        try {
          switch (params.action) {
            case "check": {
              const missing = [
                "R2_ACCOUNT_ID",
                "R2_ACCESS_KEY_ID",
                "R2_SECRET_ACCESS_KEY",
                "R2_BUCKET",
                "R2_PUBLIC_URL",
              ].filter((name) => !process.env[name]);
              return json({ ok: missing.length === 0, missing });
            }
            case "create": {
              const input = createSchema.parse(body);
              return json(await r2.createMultipartUpload(input));
            }
            case "sign": {
              const input = signSchema.parse(body);
              return json({ urls: await r2.signParts(input) });
            }
            case "complete": {
              const input = completeSchema.parse(body);
              return json(await r2.completeUpload(input));
            }
            case "abort": {
              const input = abortSchema.parse(body);
              await r2.abortUpload(input);
              return json({ ok: true });
            }
            default:
              return json({ error: "Unknown action." }, 404);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload request failed.";
          console.error("[r2]", params.action, message);
          return json({ error: message }, 400);
        }
      },
    },
  },
});