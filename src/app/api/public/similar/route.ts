import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
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

  const db = adminDb();
  if (!db) return bad("db_error", 500);
  const snap = await db
    .collection("suggestions")
    .where("project_id", "==", project.id)
    .limit(200)
    .get();
  type Row = { id: string; title?: unknown; status?: string; votes?: number };
  const rows: Row[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  const similar = rows
    .filter((s) => s.status !== "discarded")
    .filter((s) => {
      const title = String(s.title || "").toLowerCase();
      return words.some((w) => title.includes(w));
    })
    .sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))
    .slice(0, 3)
    .map((s) => ({ id: s.id, title: s.title, votes: s.votes ?? 0 }));
  return json({ similar });
}
