import { NextRequest } from "next/server";
import { adminDb, toISO } from "@/lib/firebase-admin";
import { bad, getProject, json, rateLimit } from "@/lib/public-api";

export async function GET(req: NextRequest) {
  if (!rateLimit(req, "changelog", 120, 60_000)) return bad("rate_limited", 429);
  const key = req.nextUrl.searchParams.get("key");
  const project = await getProject(key);
  if (!project) return bad("unknown_project", 404);

  const db = adminDb();
  if (!db) return bad("db_error", 500);
  const snap = await db
    .collection("changelog_entries")
    .where("project_id", "==", project.id)
    .limit(50)
    .get();
  type Row = { id: string; title?: unknown; body?: unknown; published_at?: unknown };
  const rows: Row[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  const entries = rows
    .sort((a, b) => toISO(b.published_at).localeCompare(toISO(a.published_at)))
    .map((e) => ({
      id: e.id,
      title: e.title,
      body: e.body,
      published_at: toISO(e.published_at),
    }));
  return json({ entries });
}
