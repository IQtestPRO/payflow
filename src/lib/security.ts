import crypto from "node:crypto";
import { authSecret } from "@/lib/env";

export async function sha256HmacHex(secret: string, payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function verifyHmacSignature(secret: string | undefined, payload: string, signatureHeader?: string | null) {
  if (!secret) return true;
  if (!signatureHeader) return false;

  const expected = await sha256HmacHex(secret, payload);
  const received = signatureHeader.replace(/^sha256=/, "");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

function encryptionKey() {
  const configured = process.env.CONFIG_ENCRYPTION_KEY || authSecret();
  return crypto.createHash("sha256").update(configured).digest();
}

export function encryptJson(value: unknown) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptJson<T>(value: string): T {
  const buffer = Buffer.from(value, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return JSON.parse(decrypted) as T;
}
