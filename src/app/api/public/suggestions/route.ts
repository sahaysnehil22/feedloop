import { NextRequest } from "next/server";
import { adminDb, toISO } from "@/lib/firebase-admin";
import { bad, cleanStr, getProject, json, looksSpam, rateLimit } from "@/lib/public-api";

export async function GET(req: NextRequest) {
  if (!rateLimit(req, "sugg_read", 120, 60_000)) return bad("rate_limited", 429);
  const key = req.nextUrl.searchParams.get("key");
  const project = await getProject(key);
  if (!project) return bad("unknown_project", 404);

  const db = adminDb();
  if (!db) return bad("db_error", 500);
  const snap = await db
    .collection("suggestions")
    .where("project_id", "==", project.id)
    .limit(200)
    .get();
  type Row = { id: string; title?: unknown; description?: unknown; status?: string; votes?: number; created_at?: unknown };
  const rows: Row[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  const list = rows
    .filter((s) => s.status !== "discarded")
    .sort((a, b) => {
      const av = a.votes ?? 0;
      const bv = b.votes ?? 0;
      if (bv !== av) return bv - av;
      return toISO(b.created_at).localeCompare(toISO(a.created_at));
    })
    .map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      status: s.status,
      votes: s.votes ?? 0,
      created_at: toISO(s.created_at),
    }));
  return json({ suggestions: list });
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

  const db = adminDb();
  if (!db) return bad("db_error", 500);
  const now = new Date();
  const ref = await db.collection("suggestions").add({
    project_id: project.id,
    title,
    description,
    voter_email: email || null,
    status: "open",
    votes: 0,
    created_at: now,
  });
  return json(
    {
      ok: true,
      suggestion: {
        id: ref.id,
        title,
        description,
        status: "open",
        votes: 0,
        created_at: now.toISOString(),
      },
    },
    201
  );
}
