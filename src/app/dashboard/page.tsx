"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import type { Project } from "@/lib/types";

export default function DashboardHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const db = supabaseBrowser();
      const { data: sess } = await db.auth.getSession();
      if (!sess.session) { router.push("/dashboard/login"); return; }
      const { data } = await db
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      setProjects((data as Project[]) || []);
      setLoading(false);
    })();
  }, [router]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    const db = supabaseBrowser();
    const { data: sess } = await db.auth.getSession();
    const user = sess.session?.user;
    if (!user) { router.push("/dashboard/login"); return; }
    const { data, error } = await db
      .from("projects")
      .insert({ name: name.trim(), owner_id: user.id })
      .select()
      .single();
    setCreating(false);
    if (!error && data) {
      setName("");
      router.push(`/dashboard/${data.id}`);
    }
  }

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/dashboard/login");
  }

  if (loading) return <div className="dash-wrap"><p>Loading…</p></div>;

  return (
    <div className="dash-wrap">
      <div className="dash-top">
        <h1>Your projects</h1>
        <span className="spacer" />
        <button className="mini-btn" onClick={signOut}>Sign out</button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <form onSubmit={create} style={{ display: "flex", gap: 10 }}>
          <input
            className="input"
            placeholder="My awesome product"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
          />
          <button className="btn btn-accent btn-sm" disabled={creating || !name.trim()}>
            {creating ? "…" : "New project"}
          </button>
        </form>
      </div>

      {projects.length === 0 ? (
        <div className="empty">No projects yet. Create one to get your install snippet.</div>
      ) : (
        <div className="proj-grid">
          {projects.map((p) => (
            <div className="proj-card" key={p.id}>
              <h3>{p.name}</h3>
              <div className="meta">
                <code style={{ fontSize: 12 }}>{p.public_key}</code>
              </div>
              <div className="row">
                <a className="btn btn-sm" href={`/dashboard/${p.id}`}>Open</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
