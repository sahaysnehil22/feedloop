"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { firebaseAuth, firebaseDb, newPublicKey, toISO } from "@/lib/firebase";
import type { Project } from "@/lib/types";

export default function DashboardHome() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth(), async (u) => {
      if (!u) { router.push("/dashboard/login"); return; }
      setUser(u);
      const snap = await getDocs(
        query(collection(firebaseDb(), "projects"), where("owner_id", "==", u.uid))
      );
      const list: Project[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name as string,
          public_key: data.public_key as string,
          accent_color: (data.accent_color as string) || "#111111",
          widget_position: (data.widget_position as "bottom-right" | "bottom-left") || "bottom-right",
          theme: (data.theme as "light" | "dark") || "light",
          language: (data.language as "en" | "es") || "en",
          hide_badge: !!data.hide_badge,
          created_at: toISO(data.created_at),
        };
      });
      list.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setProjects(list);
      setLoading(false);
    });
    return unsub;
  }, [router]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating || !user) return;
    setCreating(true);
    const ref = await addDoc(collection(firebaseDb(), "projects"), {
      name: name.trim(),
      owner_id: user.uid,
      public_key: newPublicKey(),
      accent_color: "#111111",
      widget_position: "bottom-right",
      theme: "light",
      language: "en",
      hide_badge: false,
      created_at: new Date(),
    });
    setCreating(false);
    setName("");
    router.push(`/dashboard/${ref.id}`);
  }

  async function doSignOut() {
    await signOut(firebaseAuth());
    router.push("/dashboard/login");
  }

  if (loading) return <div className="dash-wrap"><p>Loading…</p></div>;

  return (
    <div className="dash-wrap">
      <div className="dash-top">
        <h1>Your projects</h1>
        <span className="spacer" />
        <button className="mini-btn" onClick={doSignOut}>Sign out</button>
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
