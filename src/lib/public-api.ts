import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Project } from "@/lib/types";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function bad(message: string, status = 400) {
  return json({ error: message }, status);
}

/* ---------- simple in-memory rate limiting (per server instance) ---------- */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: NextRequest, name: string, max: number, windowMs: number): boolean {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    (req as unknown as { ip?: string }).ip ||
    "unknown";
  const k = `${name}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || now > b.reset) {
    buckets.set(k, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

/* ---------- project lookup by public key ---------- */
const KEY_RE = /^pk_[0-9a-f]{16,64}$/;

export async function getProject(key: unknown): Promise<Project | null> {
  if (typeof key !== "string" || !KEY_RE.test(key)) return null;
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("projects")
    .select("id,name,public_key,accent_color,widget_position,theme,language,hide_badge,created_at")
    .eq("public_key", key)
    .single();
  if (error || !data) return null;
  return data as Project;
}

const BANNED = [
  "viagra", "cialis", "casino", "porn", "xxx", "crypto giveaway",
  "free money", "make money fast",
];

export function looksSpam(text: string): boolean {
  const t = text.toLowerCase();
  if (/(.)\1{9,}/.test(t)) return true; // aaaaaaaaaa
  if (/https?:\/\//.test(t) && t.length < 60) return true; // bare link drops
  return BANNED.some((w) => t.includes(w));
}

export function cleanStr(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
