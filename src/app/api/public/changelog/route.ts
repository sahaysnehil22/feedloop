import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { bad, getProject, json, rateLimit } from "@/lib/public-api";

export async function GET(req: NextRequest) {
  if (!rateLimit(req, "changelog", 120, 60_000)) return bad("rate_limited", 429);
  const key = req.nextUrl.searchParams.get("key");
  const project = await getProject(key);
  if (!project) return bad("unknown_project", 404);

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("changelog_entries")
    .select("id,title,body,published_at")
    .eq("project_id", project.id)
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) return bad("db_error", 500);
  return json({ entries: data });
}
