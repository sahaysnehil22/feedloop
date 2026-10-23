"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const db = supabaseBrowser();
      const res =
        mode === "in"
          ? await db.auth.signInWithPassword({ email, password })
          : await db.auth.signUp({ email, password });
      if (res.error) throw res.error;
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card auth-card">
        <h1>FeedLoop</h1>
        <p className="sub">
          {mode === "in" ? "Sign in to manage your feedback boards." : "Create your account to get started."}
        </p>
        {error && <div className="toast err">{error}</div>}
        <form onSubmit={submit}>
          <label className="lbl">Email</label>
          <input
            className="input" type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email"
          />
          <label className="lbl">Password</label>
          <input
            className="input" type="password" required value={password}
            onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"}
          />
          <div style={{ height: 18 }} />
          <button className="btn btn-accent" style={{ width: "100%" }} disabled={busy}>
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="auth-switch">
          <button onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
