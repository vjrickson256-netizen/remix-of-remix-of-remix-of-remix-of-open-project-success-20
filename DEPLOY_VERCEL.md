# Deploying CALMALENG.NET to Vercel

The app is a TanStack Start (Nitro) app. `vercel.json` builds with the Nitro
`vercel` preset and outputs the Build Output API folder `.vercel/output`, so
API routes (`/api/r2/*`, `/api/pay/*`, `/api/public/*`) run as serverless
functions and all page routes are server-rendered — no rewrites file needed.

## 1. Import the repo
Vercel → Add New → Project → import this repository. Leave the framework
preset as "Other"; `vercel.json` supplies the build settings.

## 2. Environment variables (Project → Settings → Environment Variables)

Required for uploads (Cloudflare R2):

| Name | Where to get it |
| --- | --- |
| `R2_ACCOUNT_ID` | Cloudflare dashboard → R2 → Account ID |
| `R2_ACCESS_KEY_ID` | R2 → Manage API Tokens → create token (Object Read & Write) |
| `R2_SECRET_ACCESS_KEY` | shown once when the token is created |
| `R2_BUCKET` | your bucket name |
| `R2_PUBLIC_URL` | the bucket's public dev URL or custom domain, e.g. `https://cdn.calmaleng.net` |

Also copy any Firebase/Mux/payment variables the app already uses.

## 3. R2 bucket CORS (required — chunked uploads fail without it)

Cloudflare → R2 → your bucket → Settings → CORS Policy:

```json
[
  {
    "AllowedOrigins": [
      "https://sweet-bug-squasher.vercel.app",
      "https://www.calmaleng.net",
      "https://calmaleng.net",
      "http://localhost:8080"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD", "DELETE"],
    "AllowedHeaders": [
      "content-type",
      "content-length",
      "content-md5",
      "authorization",
      "x-amz-content-sha256",
      "x-amz-date",
      "x-amz-acl",
      "x-amz-meta-*"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`ExposeHeaders: ["ETag"]` is mandatory: the browser needs each part's ETag to
complete the multipart upload.

If using the Cloudflare form instead of JSON, add `ETag` in the separate
**Expose headers** field. Putting `ETag` under **Allowed headers** is not
equivalent and uploads will still fail. Include both the `www` and apex custom
domains if visitors can open either one.

## 4. Public access
Enable the bucket's public r2.dev URL or attach a custom domain, then set
`R2_PUBLIC_URL` to it so uploaded videos are playable.
