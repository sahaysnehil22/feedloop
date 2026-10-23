import { NextRequest } from "next/server";
import { bad, getProject, json, rateLimit } from "@/lib/public-api";

/** Public widget config for one project key. Cached by the loader. */
export async function GET(req: NextRequest) {
  if (!rateLimit(req, "config", 120, 60_000)) return bad("rate_limited", 429);
  const key = req.nextUrl.searchParams.get("key");
  const project = await getProject(key);
  if (!project) return bad("unknown_project", 404);
  return json({
    accent_color: project.accent_color,
    widget_position: project.widget_position,
    theme: project.theme,
    language: project.language,
    hide_badge: project.hide_badge,
    name: project.name,
  });
}
