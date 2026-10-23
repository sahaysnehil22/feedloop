import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { bad, getProject, json, rateLimit } from "@/lib/public-api";

const VOTER_RE = /^[A-Za-z0-9_-]{8,128}$/;

export async function POST(req: NextRequest) {
  if (!rateLimit(req, "vote", 60, 60_000)) return bad("rate_limited", 429);
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("bad_json");
  }

  const project = await getProject(body.key);
  if (!project) return bad("unknown_project", 404);

  const suggestionId = typeof body.suggestion_id === "string" ? body.suggestion_id : "";
  const voterId = typeof body.voter_id === "string" ? body.voter_id : "";
  const action = body.action === "down" ? "down" : "up";
  if (!VOTER_RE.test(voterId)) return bad("bad_voter");

  const db = supabaseAdmin();

  // Make sure the suggestion belongs to this project and is votable.
  const { data: sugg } = await db
    .from("suggestions")
    .select("id,project_id,status")
    .eq("id", suggestionId)
    .eq("project_id", project.id)
    .single();
  if (!sugg || sugg.status === "discarded") return bad("unknown_suggestion", 404);

  if (action === "up") {
    const { error } = await db
      .from("votes")
      .insert({ suggestion_id: suggestionId, voter_id: voterId });
    if (error) {
      // 23505 = already voted; treat as idempotent success.
      if (error.code !== "23505") return bad("db_error", 500);
    }
  } else {
    await db
      .from("votes")
      .delete()
      .eq("suggestion_id", suggestionId)
      .eq("voter_id", voterId);
  }

  const { data: updated } = await db
    .from("suggestions")
    .select("votes")
    .eq("id", suggestionId)
    .single();
  return json({ ok: true, votes: updated?.votes ?? 0, voted: action === "up" });
}
