import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { bad, cleanStr, getProject, json, rateLimit } from "@/lib/public-api";

/** Lightweight "similar ideas" lookup for the dedup prompt while typing. */
export async function GET(req: NextRequest) {
  if (!rateLimit(req, "similar", 120, 60_000)) return bad("rate_limited", 429);
  const key = req.nextUrl.searchParams.get("key");
  const q = cleanStr(req.nextUrl.searchParams.get("q"), 140);
  const project = await getProject(key);
  if (!project) return bad("unknown_project", 404);
  if (q.length < 3) return json({ similar: [] });

  const words = q.toLowerCase().split(/[^a-z0-9áéíóúñü]+/i).filter((w) => w.length > 3).slice(0, 5);
  if (words.length === 0) return json({ similar: [] });

  const db = supabaseAdmin();
  const ors = words.map((w) => `title.ilike.%${w}%`).join(",");
  const { data } = await db
    .from("suggestions")
    .select("id,title,votes")
    .eq("project_id", project.id)
    .neq("status", "discarded")
    .or(ors)
    .order("votes", { ascending: false })
    .limit(3);
  return json({ similar: data ?? [] });
}
