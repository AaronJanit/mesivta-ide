import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const SESSION_COOKIE = "webide_session";
const MAX_AGE_DAYS = 7;

interface SessionPayload {
  userId: string;
  username: string;
  exp: number; // epoch ms
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET must be set (>=32 chars). Run: openssl rand -hex 32");
  }
  return s;
}

// HMAC-SHA256 sign + verify. Format: base64url(payload).signature
async function sign(payload: SessionPayload): Promise<string> {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const key = await crypto.subtle.importKey(
    "raw",
    Buffer.from(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, Buffer.from(body));
  return `${body}.${Buffer.from(sig).toString("base64url")}`;
}

async function verify(token: string): Promise<SessionPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await crypto.subtle.importKey(
    "raw",
    Buffer.from(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("HMAC", key, Buffer.from(sig, "base64url"), Buffer.from(body));
  if (!ok) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function setSession(payload: { userId: string; username: string }) {
  const token = await sign({
    ...payload,
    exp: Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ userId: string; username: string } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const p = await verify(token);
  if (!p) return null;
  return { userId: p.userId, username: p.username };
}