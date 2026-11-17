import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
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

  const db = adminDb();
  if (!db) return bad("db_error", 500);

  const suggRef = db.collection("suggestions").doc(suggestionId);
  const voteRef = db.collection("votes").doc(`${suggestionId}_${voterId}`);

  let votes = 0;
  try {
    votes = await db.runTransaction(async (tx) => {
      const suggSnap = await tx.get(suggRef);
      if (!suggSnap.exists) throw new Error("unknown_suggestion");
      const sugg = suggSnap.data()!;
      if (sugg.project_id !== project.id || sugg.status === "discarded") {
        throw new Error("unknown_suggestion");
      }
      const voteSnap = await tx.get(voteRef);
      const current = typeof sugg.votes === "number" ? sugg.votes : 0;
      if (action === "up") {
        if (!voteSnap.exists) {
          tx.set(voteRef, { suggestion_id: suggestionId, voter_id: voterId, created_at: new Date() });
          tx.update(suggRef, { votes: current + 1 });
          return current + 1;
        }
        return current;
      }
      // down
      if (voteSnap.exists) {
        tx.delete(voteRef);
        tx.update(suggRef, { votes: Math.max(0, current - 1) });
        return Math.max(0, current - 1);
      }
      return current;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "unknown_suggestion") {
      return bad("unknown_suggestion", 404);
    }
    return bad("db_error", 500);
  }

  return json({ ok: true, votes, voted: action === "up" });
}
