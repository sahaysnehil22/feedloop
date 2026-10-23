"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser, appUrl } from "@/lib/supabase";
import { ROADMAP_STATUSES, STATUSES, type ChangelogEntry, type InternalNote, type Project, type Status, type Suggestion } from "@/lib/types";

type Tab = "suggestions" | "roadmap" | "changelog" | "settings";

const STATUS_ORDER: Status[] = ["open", "planned", "in_progress", "launched", "discarded"];

export default function ProjectDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [notes, setNotes] = useState<Record<string, InternalNote[]>>({});
  const [openNotes, setOpenNotes] = useState<Record<string, boolean>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("suggestions");
  const [loading, setLoading] = useState(true);

  // changelog form
  const [newsTitle, setNewsTitle] = useState("");
  const [newsBody, setNewsBody] = useState("");
  const [newsLink, setNewsLink] = useState("");

  // settings form
  const [form, setForm] = useState({ name: "", accent_color: "#111111", widget_position: "bottom-right", theme: "light", language: "en", hide_badge: false });
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const load = useCallback(async () => {
    const db = supabaseBrowser();
    const { data: sess } = await db.auth.getSession();
    if (!sess.session) { router.push("/dashboard/login"); return; }
    const { data: proj } = await db.from("projects").select("*").eq("id", id).single();
    if (!proj) { router.push("/dashboard"); return; }
    setProject(proj as Project);
    setForm({
      name: proj.name,
      accent_color: proj.accent_color,
      widget_position: proj.widget_position,
      theme: proj.theme,
      language: proj.language,
      hide_badge: proj.hide_badge,
    });
    const [{ data: sg }, { data: ne }] = await Promise.all([
      db.from("suggestions").select("*").eq("project_id", id).order("votes", { ascending: false }),
      db.from("changelog_entries").select("*").eq("project_id", id).order("published_at", { ascending: false }),
    ]);
    setSuggestions((sg as Suggestion[]) || []);
    setEntries((ne as ChangelogEntry[]) || []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(suggId: string, status: Status) {
    const db = supabaseBrowser();
    const { error } = await db.from("suggestions").update({ status }).eq("id", suggId);
    if (!error) setSuggestions((p) => p.map((x) => (x.id === suggId ? { ...x, status } : x)));
  }

  async function removeSuggestion(suggId: string) {
    if (!confirm("Delete this suggestion?")) return;
    const db = supabaseBrowser();
    const { error } = await db.from("suggestions").delete().eq("id", suggId);
    if (!error) setSuggestions((p) => p.filter((x) => x.id !== suggId));
  }

  async function toggleNotes(suggId: string) {
    const open = !openNotes[suggId];
    setOpenNotes((p) => ({ ...p, [suggId]: open }));
    if (open && !notes[suggId]) {
      const db = supabaseBrowser();
      const { data } = await db.from("internal_notes").select("*").eq("suggestion_id", suggId).order("created_at", { ascending: true });
      setNotes((p) => ({ ...p, [suggId]: (data as InternalNote[]) || [] }));
    }
  }

  async function addNote(suggId: string) {
    const body = (noteDrafts[suggId] || "").trim();
    if (!body) return;
    const db = supabaseBrowser();
    const { data: sess } = await db.auth.getSession();
    const user = sess.session?.user;
    if (!user) return;
    const { data, error } = await db
      .from("internal_notes")
      .insert({ suggestion_id: suggId, author_id: user.id, body })
      .select()
      .single();
    if (!error && data) {
      setNotes((p) => ({ ...p, [suggId]: [...(p[suggId] || []), data as InternalNote] }));
      setNoteDrafts((p) => ({ ...p, [suggId]: "" }));
    }
  }

  async function publishNews(e: React.FormEvent) {
    e.preventDefault();
    if (!newsTitle.trim()) return;
    const db = supabaseBrowser();
    const { data, error } = await db
      .from("changelog_entries")
      .insert({
        project_id: id,
        title: newsTitle.trim(),
        body: newsBody.trim(),
        suggestion_id: newsLink || null,
      })
      .select()
      .single();
    if (!error && data) {
      setEntries((p) => [data as ChangelogEntry, ...p]);
      setNewsTitle(""); setNewsBody(""); setNewsLink("");
      if (newsLink) setStatus(newsLink, "launched");
    }
  }

  async function removeEntry(entryId: string) {
    if (!confirm("Delete this update?")) return;
    const db = supabaseBrowser();
    const { error } = await db.from("changelog_entries").delete().eq("id", entryId);
    if (!error) setEntries((p) => p.filter((x) => x.id !== entryId));
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const db = supabaseBrowser();
    const { error } = await db
      .from("projects")
      .update({
        name: form.name.trim() || project!.name,
        accent_color: form.accent_color,
        widget_position: form.widget_position,
        theme: form.theme,
        language: form.language,
        hide_badge: form.hide_badge,
      })
      .eq("id", id);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      load();
    }
  }

  async function deleteProject() {
    if (deleteConfirm !== "DELETE") return;
    const db = supabaseBrowser();
    const { error } = await db.from("projects").delete().eq("id", id);
    if (!error) router.push("/dashboard");
  }

  function moveRoadmap(suggId: string, dir: -1 | 1) {
    const sugg = suggestions.find((x) => x.id === suggId);
    if (!sugg) return;
    const i = ROADMAP_STATUSES.indexOf(sugg.status as Status);
    const next = ROADMAP_STATUSES[i + dir];
    if (next) setStatus(suggId, next);
  }

  if (loading || !project) return <div className="dash-wrap"><p>Loading…</p></div>;

  const snippet = `<script async src="${appUrl()}/loader.js"\n        data-feedloop-key="${project.public_key}"></script>`;
  const launched = suggestions.filter((x) => x.status === "launched");

  return (
    <div className="dash-wrap">
      <div className="dash-top">
        <a href="/dashboard" style={{ textDecoration: "none", color: "var(--ink-faint)", fontSize: 14 }}>← All projects</a>
      </div>
      <div className="dash-top" style={{ marginTop: -12 }}>
        <h1>{project.name}</h1>
        <span className="spacer" />
        <code style={{ fontSize: 12, color: "var(--ink-faint)" }}>{project.public_key}</code>
      </div>

      <div className="dash-tabs">
        {(["suggestions", "roadmap", "changelog", "settings"] as Tab[]).map((tb) => (
          <button key={tb} className={`tab ${tab === tb ? "active" : ""}`} onClick={() => setTab(tb)}>
            {tb === "suggestions" && `Suggestions (${suggestions.filter((x) => x.status !== "discarded").length})`}
            {tb === "roadmap" && "Roadmap"}
            {tb === "changelog" && "Changelog"}
            {tb === "settings" && "Settings"}
          </button>
        ))}
      </div>

      {tab === "suggestions" && (
        <>
          {suggestions.length === 0 && (
            <div className="empty">No suggestions yet. Share your install snippet (Settings tab) to start collecting feedback.</div>
          )}
          {suggestions.map((sg) => (
            <div className="sugg-row" key={sg.id}>
              <div className="vcount">{sg.votes}</div>
              <div className="body">
                <h4>{sg.title}</h4>
                {sg.description && <p>{sg.description}</p>}
                <div className="actions">
                  <select className="mini-select" value={sg.status} onChange={(e) => setStatus(sg.id, e.target.value as Status)}>
                    {STATUS_ORDER.map((st) => (
                      <option key={st} value={st}>{st.replace("_", " ")}</option>
                    ))}
                  </select>
                  <button className="mini-btn" onClick={() => toggleNotes(sg.id)}>
                    Notes ({(notes[sg.id] || []).length})
                  </button>
                  <button className="mini-btn danger" onClick={() => removeSuggestion(sg.id)}>Delete</button>
                </div>
                {openNotes[sg.id] && (
                  <div className="notes-box">
                    {(notes[sg.id] || []).map((n) => (
                      <div className="note" key={n.id}>
                        {n.body}
                        <div className="d">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <input
                        className="input"
                        placeholder="Write a private note for your team…"
                        value={noteDrafts[sg.id] || ""}
                        onChange={(e) => setNoteDrafts((p) => ({ ...p, [sg.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") addNote(sg.id); }}
                      />
                      <button className="btn btn-sm" onClick={() => addNote(sg.id)}>Add</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "roadmap" && (
        <div className="roadmap-cols">
          {ROADMAP_STATUSES.map((st) => (
            <div className="roadmap-col" key={st}>
              <h3>{st.replace("_", " ")}</h3>
              {suggestions.filter((x) => x.status === st).map((sg) => (
                <div className="roadmap-card" key={sg.id}>
                  <h4>{sg.title}</h4>
                  <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{sg.votes} votes</div>
                  <div className="mv">
                    <button className="mini-btn" onClick={() => moveRoadmap(sg.id, -1)}>←</button>
                    <button className="mini-btn" onClick={() => moveRoadmap(sg.id, 1)}>→</button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === "changelog" && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0 }}>Publish an update</h3>
            <form onSubmit={publishNews}>
              <input className="input" placeholder="What shipped?" value={newsTitle} onChange={(e) => setNewsTitle(e.target.value)} maxLength={140} />
              <div style={{ height: 10 }} />
              <textarea className="textarea" placeholder="Tell the story…" value={newsBody} onChange={(e) => setNewsBody(e.target.value)} />
              <div style={{ height: 10 }} />
              <select className="select" value={newsLink} onChange={(e) => setNewsLink(e.target.value)}>
                <option value="">No suggestion — standalone update</option>
                {launched.map((sg) => (
                  <option key={sg.id} value={sg.id}>{sg.title}</option>
                ))}
              </select>
              <div style={{ height: 14 }} />
              <button className="btn btn-accent btn-sm" disabled={!newsTitle.trim()}>Publish</button>
            </form>
          </div>
          {entries.length === 0 && <div className="empty">No updates published yet.</div>}
          {entries.map((e) => (
            <div className="sugg-row" key={e.id}>
              <div className="body">
                <h4>{e.title}</h4>
                <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 6 }}>
                  {new Date(e.published_at).toLocaleDateString()}
                </div>
                {e.body && <p style={{ whiteSpace: "pre-wrap" }}>{e.body}</p>}
                <div className="actions">
                  <button className="mini-btn danger" onClick={() => removeEntry(e.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "settings" && (
        <>
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0 }}>Install snippet</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>Paste once, anywhere on your site.</p>
            <div className="snippet">{snippet}</div>
          </div>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Appearance</h3>
            {saved && <div className="toast">Saved.</div>}
            <form onSubmit={saveSettings}>
              <label className="lbl">Project name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} />
              <div className="form-row">
                <div>
                  <label className="lbl">Accent color</label>
                  <input type="color" value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} style={{ width: 64, height: 40 }} />
                </div>
                <div>
                  <label className="lbl">Button position</label>
                  <select className="select" value={form.widget_position} onChange={(e) => setForm({ ...form, widget_position: e.target.value })}>
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Theme</label>
                  <select className="select" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Widget language</label>
                  <select className="select" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
              <label className="check-row">
                <input type="checkbox" checked={form.hide_badge} onChange={(e) => setForm({ ...form, hide_badge: e.target.checked })} />
                Hide “Powered by FeedLoop” badge
              </label>
              <div style={{ height: 18 }} />
              <button className="btn btn-accent btn-sm">Save changes</button>
            </form>
          </div>
          <div className="danger-zone">
            <h3>Danger zone</h3>
            <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
              Deleting a project removes its suggestions, roadmap, changelog and notes forever.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="input"
                style={{ maxWidth: 220 }}
                placeholder="Type DELETE to confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
              />
              <button className="mini-btn danger" disabled={deleteConfirm !== "DELETE"} onClick={deleteProject}>
                Delete project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
