"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStrings, normalizeLang, statusLabel, t } from "@/lib/i18n";
import { ROADMAP_STATUSES, type ChangelogEntry, type Lang, type Suggestion } from "@/lib/types";

interface Cfg {
  accent_color: string;
  widget_position: string;
  theme: string;
  language: Lang;
  hide_badge: boolean;
  name: string;
}

function voterIdFor(key: string): string {
  const k = `feedloop_voter_${key}`;
  try {
    let v = localStorage.getItem(k);
    if (!v) {
      v = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "v_" + Math.random().toString(36).slice(2);
  }
}

export default function Widget({ projKey, init }: { projKey: string; init: Partial<Cfg> }) {
  const [cfg, setCfg] = useState<Cfg>({
    accent_color: init.accent_color || "#111111",
    widget_position: init.widget_position || "bottom-right",
    theme: init.theme || "light",
    language: normalizeLang(init.language),
    hide_badge: !!init.hide_badge,
    name: init.name || "Feedback",
  });
  const s = getStrings(cfg.language);
  const [tab, setTab] = useState<"board" | "roadmap" | "news">("board");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [email, setEmail] = useState("");
  const [similar, setSimilar] = useState<Suggestion[]>([]);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  const [unread, setUnread] = useState(0);
  const [broken, setBroken] = useState(false);
  const voter = useMemo(() => voterIdFor(projKey), [projKey]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [c, sg, ne] = await Promise.all([
        fetch(`/api/public/config?key=${encodeURIComponent(projKey)}`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/public/suggestions?key=${encodeURIComponent(projKey)}`).then((r) => r.json()),
        fetch(`/api/public/changelog?key=${encodeURIComponent(projKey)}`).then((r) => r.json()),
      ]);
      if (!c) { setBroken(true); return; }
      setCfg({
        accent_color: c.accent_color,
        widget_position: c.widget_position,
        theme: c.theme,
        language: normalizeLang(c.language),
        hide_badge: !!c.hide_badge,
        name: c.name || "Feedback",
      });
      setSuggestions(sg.suggestions || []);
      const list: ChangelogEntry[] = ne.entries || [];
      setEntries(list);
      try {
        const seen = Number(localStorage.getItem(`feedloop_seen_${projKey}`) || 0);
        setUnread(list.filter((e) => new Date(e.published_at).getTime() > seen).length);
      } catch { /* ignore */ }
      try {
        const v = JSON.parse(localStorage.getItem(`feedloop_voted_${projKey}`) || "{}");
        setVoted(v);
      } catch { /* ignore */ }
    } catch {
      setBroken(true);
    }
  }, [projKey]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (title.trim().length < 3) { setSimilar([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/public/similar?key=${encodeURIComponent(projKey)}&q=${encodeURIComponent(title)}`
        ).then((r) => r.json());
        setSimilar((r.similar || []).filter((x: Suggestion) => x.title.toLowerCase() !== title.trim().toLowerCase()));
      } catch { /* ignore */ }
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [title, projKey]);

  function persistVoted(next: Record<string, boolean>) {
    setVoted(next);
    try { localStorage.setItem(`feedloop_voted_${projKey}`, JSON.stringify(next)); } catch { /* ignore */ }
  }

  async function toggleVote(sugg: Suggestion) {
    const isVoted = !!voted[sugg.id];
    // Optimistic update.
    setSuggestions((prev) =>
      prev.map((x) => (x.id === sugg.id ? { ...x, votes: x.votes + (isVoted ? -1 : 1) } : x))
    );
    persistVoted({ ...voted, [sugg.id]: !isVoted });
    try {
      const r = await fetch("/api/public/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: projKey,
          suggestion_id: sugg.id,
          voter_id: voter,
          action: isVoted ? "down" : "up",
        }),
      }).then((r) => r.json());
      if (typeof r.votes === "number") {
        setSuggestions((prev) => prev.map((x) => (x.id === sugg.id ? { ...x, votes: r.votes } : x)));
      }
    } catch {
      // Revert on failure.
      setSuggestions((prev) =>
        prev.map((x) => (x.id === sugg.id ? { ...x, votes: x.votes + (isVoted ? 1 : -1) } : x))
      );
      persistVoted({ ...voted, [sugg.id]: isVoted });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setToast(null);
    try {
      const r = await fetch("/api/public/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: projKey,
          title: title.trim(),
          description: desc.trim(),
          email: email.trim(),
          company_website: "",
        }),
      }).then((r) => r.json());
      if (r.error) throw new Error(r.error);
      setTitle(""); setDesc(""); setEmail(""); setSimilar([]); setShowForm(false);
      setToast({ msg: s["widget.thanks"] });
      load();
    } catch {
      setToast({ msg: s["widget.error"], err: true });
    }
  }

  function openNews() {
    setTab("news");
    setUnread(0);
    try { localStorage.setItem(`feedloop_seen_${projKey}`, String(Date.now())); } catch { /* ignore */ }
  }

  const filtered = suggestions.filter(
    (x) =>
      !search ||
      x.title.toLowerCase().includes(search.toLowerCase()) ||
      x.description.toLowerCase().includes(search.toLowerCase())
  );

  if (broken) {
    return (
      <div className="widget-shell" data-theme={cfg.theme}>
        <div className="widget-body">
          <div className="toast err">FeedLoop: unknown project key.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-shell" data-theme={cfg.theme}>
      <div className="widget-head">
        <span className="ttl">{cfg.name}</span>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === "board" ? "active" : ""}`} onClick={() => setTab("board")}>
          {s["widget.tabs.board"]}
        </button>
        <button className={`tab ${tab === "roadmap" ? "active" : ""}`} onClick={() => setTab("roadmap")}>
          {s["widget.tabs.roadmap"]}
        </button>
        <button className={`tab ${tab === "news" ? "active" : ""}`} onClick={openNews}>
          {s["widget.tabs.news"]}
          {unread > 0 && <span className="pill">{unread} {s["widget.unread"]}</span>}
        </button>
      </div>

      <div className="widget-body">
        {toast && <div className={`toast ${toast.err ? "err" : ""}`}>{toast.msg}</div>}

        {tab === "board" && (
          <>
            <div className="search-row">
              <input
                className="input"
                placeholder={s["widget.search"]}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {!showForm ? (
              <button className="fab-new" onClick={() => setShowForm(true)}>
                + {s["widget.suggest"]}
              </button>
            ) : (
              <form className="form-card" onSubmit={submit}>
                <input
                  className="input"
                  placeholder={s["widget.title.ph"]}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={140}
                  autoFocus
                />
                {similar.length > 0 && (
                  <div className="similar-box">
                    <div style={{ marginBottom: 6, color: "var(--ink-soft)" }}>{s["widget.similar"]}</div>
                    {similar.map((x) => (
                      <div
                        className="sugg"
                        key={x.id}
                        onClick={() => { setShowForm(false); setTitle(""); setSimilar([]); toggleVote(x); }}
                      >
                        <h4>{x.title}</h4>
                        <span className="status-tag">{x.votes} {s["widget.votes"]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ height: 8 }} />
                <textarea
                  className="textarea"
                  placeholder={s["widget.desc.ph"]}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  maxLength={2000}
                />
                <div style={{ height: 8 }} />
                <input
                  className="input"
                  placeholder={s["widget.email.ph"]}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
                <input type="text" name="company_website" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button type="submit" className="btn btn-accent btn-sm" style={{ flex: 1 }}>
                    {s["widget.submit"]}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
                    {s["widget.cancel"]}
                  </button>
                </div>
              </form>
            )}
            {filtered.length === 0 && (
              <div className="empty">{search ? s["widget.emptySearch"] : s["widget.empty"]}</div>
            )}
            {filtered.map((x) => (
              <div className="sugg" key={x.id}>
                <div className="sugg-top">
                  <button
                    className={`vote-btn ${voted[x.id] ? "on" : ""}`}
                    onClick={() => toggleVote(x)}
                    aria-label={voted[x.id] ? s["widget.voted"] : s["widget.vote"]}
                    style={voted[x.id] ? { background: cfg.accent_color, borderColor: cfg.accent_color } : undefined}
                  >
                    <span className="c">{x.votes}</span>
                    <span className="l">{voted[x.id] ? s["widget.voted"] : s["widget.vote"]}</span>
                  </button>
                  <div>
                    <h4>{x.title}</h4>
                    {x.description && <p>{x.description}</p>}
                    {x.status !== "open" && (
                      <span className={`status-tag st-${x.status}`}>{statusLabel(cfg.language, x.status)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "roadmap" && (
          <>
            {ROADMAP_STATUSES.map((st) => {
              const items = suggestions.filter((x) => x.status === st);
              return (
                <div key={st} style={{ marginBottom: 18 }}>
                  <h4 style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-soft)" }}>
                    {statusLabel(cfg.language, st)}
                  </h4>
                  {items.length === 0 && <div style={{ fontSize: 13, color: "var(--ink-faint)" }}>{s["widget.roadmap.empty"]}</div>}
                  {items.map((x) => (
                    <div className="sugg" key={x.id}>
                      <h4>{x.title}</h4>
                      <span className="status-tag">{x.votes} {s["widget.votes"]}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}

        {tab === "news" && (
          <>
            {entries.length === 0 && <div className="empty">{s["widget.news.empty"]}</div>}
            {entries.map((e) => (
              <div className="news-item" key={e.id}>
                <div className="date">
                  {new Date(e.published_at).toLocaleDateString(cfg.language === "es" ? "es-ES" : "en-US", {
                    year: "numeric", month: "short", day: "numeric",
                  })}
                </div>
                <h4>{e.title}</h4>
                {e.body && <p>{e.body}</p>}
              </div>
            ))}
          </>
        )}
      </div>

      {!cfg.hide_badge && (
        <div className="widget-foot">
          <a href="https://feedloop.app" target="_blank" rel="noreferrer">{s["widget.powered"]}</a>
        </div>
      )}
    </div>
  );
}
