# Deploying CALMALENG.NET to Vercel

The app is a TanStack Start (Nitro) app. `vercel.json` builds with the Nitro
`vercel` preset and outputs the Build Output API folder `.vercel/output`, so
API routes (`/api/r2/*`, `/api/pay/*`, `/api/public/*`) run as serverless
functions and all page routes are server-rendered — no rewrites file needed.

## 1. Import the repo
Vercel → Add New → Project → import this repository. Leave the framework
preset as "Other"; `vercel.json` supplies the build settings.

## 2. Uploads run on an external R2 server (Railway)

Uploads no longer touch Vercel. The browser asks the Railway signing server for
presigned URLs and sends the bytes straight to Cloudflare R2, so no serverless
function handles file data.

Server: `https://function-bun-production-fc40.up.railway.app`
(R2 credentials, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `UPLOAD_TOKEN`, and
`ALLOWED_ORIGINS` are configured there, not on Vercel.)

Optional Vercel/front-end overrides:

| Name | Purpose |
| --- | --- |
| `VITE_R2_API_URL` | point the app at a different signing server |
| `VITE_R2_UPLOAD_TOKEN` | must match `UPLOAD_TOKEN` on that server |

Also copy any Firebase/Mux/payment variables the app already uses.

## 3. R2 bucket CORS

`ExposeHeaders: ["ETag"]` is mandatory: the browser needs each part's ETag to
complete the multipart upload. The current wide-open policy works:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 86400
  }
]
```

## 4. Public access
Enable the bucket's public r2.dev URL or attach a custom domain and set
`R2_PUBLIC_BASE_URL` on the Railway server so uploaded videos are playable.
