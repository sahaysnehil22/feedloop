import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { bad, cleanStr, getProject, json, looksSpam, rateLimit } from "@/lib/public-api";

export async function GET(req: NextRequest) {
  if (!rateLimit(req, "sugg_read", 120, 60_000)) return bad("rate_limited", 429);
  const key = req.nextUrl.searchParams.get("key");
  const project = await getProject(key);
  if (!project) return bad("unknown_project", 404);

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("suggestions")
    .select("id,title,description,status,votes,created_at")
    .eq("project_id", project.id)
    .neq("status", "discarded")
    .order("votes", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return bad("db_error", 500);
  return json({ suggestions: data });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(req, "sugg_write", 10, 60_000)) return bad("rate_limited", 429);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("bad_json");
  }

  // Honeypot: bots fill it, humans never see it.
  if (typeof body.company_website === "string" && body.company_website.length > 0) {
    return json({ ok: true, trapped: true });
  }

  const project = await getProject(body.key);
  if (!project) return bad("unknown_project", 404);

  const title = cleanStr(body.title, 140);
  const description = cleanStr(body.description, 2000);
  const email = cleanStr(body.email, 160);
  if (title.length < 3) return bad("title_too_short");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("bad_email");
  if (looksSpam(title + " " + description)) return bad("spam_detected");

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("suggestions")
    .insert({
      project_id: project.id,
      title,
      description,
      voter_email: email || null,
    })
    .select("id,title,description,status,votes,created_at")
    .single();
  if (error) return bad("db_error", 500);
  return json({ ok: true, suggestion: data }, 201);
}
