import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ADMIN_EMAIL, firebaseConfig } from "@/lib/firebase-config";

/* ---------------- Firebase ID token verification (admin only) ---------------- */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${firebaseConfig.projectId}`,
      audience: firebaseConfig.projectId,
    });
    const email = typeof payload["email"] === "string" ? payload["email"] : "";
    return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

/* ---------------- R2 client ---------------- */

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured. Add it in your project secrets / Vercel env.`);
  return value;
}

function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    // R2 rejects the checksum headers the AWS SDK adds by default, which makes
    // presigned part uploads fail with SignatureDoesNotMatch / 400.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
}


function publicUrl(key: string) {
  const base = env("R2_PUBLIC_URL").replace(/\/+$/, "");
  return `${base}/${key}`;
}

function safeName(filename: string) {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-120);
}

export async function createMultipartUpload(input: {
  filename: string;
  contentType: string;
  size: number;
  folder: string;
}) {
  const key = `${input.folder}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName(input.filename)}`;
  const out = await client().send(
    new CreateMultipartUploadCommand({
      Bucket: env("R2_BUCKET"),
      Key: key,
      ContentType: input.contentType,
    }),
  );
  if (!out.UploadId) throw new Error("R2 did not return an upload id.");
  return { key, uploadId: out.UploadId, publicUrl: publicUrl(key) };
}

export async function signParts(input: { key: string; uploadId: string; partNumbers: number[] }) {
  const s3 = client();
  const bucket = env("R2_BUCKET");
  const urls: Record<number, string> = {};
  await Promise.all(
    input.partNumbers.map(async (partNumber) => {
      urls[partNumber] = await getSignedUrl(
        s3,
        new UploadPartCommand({
          Bucket: bucket,
          Key: input.key,
          UploadId: input.uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 60 * 60 * 6 },
      );
    }),
  );
  return urls;
}

export async function completeUpload(input: {
  key: string;
  uploadId: string;
  parts: { PartNumber: number; ETag: string }[];
}) {
  await client().send(
    new CompleteMultipartUploadCommand({
      Bucket: env("R2_BUCKET"),
      Key: input.key,
      UploadId: input.uploadId,
      MultipartUpload: {
        Parts: [...input.parts].sort((a, b) => a.PartNumber - b.PartNumber),
      },
    }),
  );
  return { url: publicUrl(input.key), key: input.key };
}

export async function abortUpload(input: { key: string; uploadId: string }) {
  await client().send(
    new AbortMultipartUploadCommand({
      Bucket: env("R2_BUCKET"),
      Key: input.key,
      UploadId: input.uploadId,
    }),
  );
}