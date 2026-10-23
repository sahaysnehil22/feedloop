import Script from "next/script";
import { getStrings, normalizeLang, type Strings } from "@/lib/i18n";
import { appUrl } from "@/lib/supabase";
import type { Lang } from "@/lib/types";

export default async function Landing({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: raw } = await params;
  const lang: Lang = normalizeLang(raw === "es" ? "es" : raw === "en" ? "en" : null);
  const s = getStrings(lang);
  const origin = appUrl();
  const demoKey = process.env.NEXT_PUBLIC_DEMO_KEY || "";

  const snippet = `<script async src="${origin}/loader.js"\n        data-feedloop-key="pk_..."></script>`;

  return (
    <>
      <nav className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href={`/${lang}`}>
            Feed<span>Loop</span>
          </a>
          <div className="nav-links">
            <a href="#features">{s["landing.nav.features"]}</a>
            <a href="#pricing">{s["landing.nav.pricing"]}</a>
          </div>
          <div className="nav-right">
            <div className="lang-switch">
              <a href="/en" className={lang === "en" ? "active" : ""}>EN</a>
              <a href="/es" className={lang === "es" ? "active" : ""}>ES</a>
            </div>
            <a className="btn btn-sm" href="/dashboard">
              {s["landing.nav.dashboard"]}
            </a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap-narrow">
          <span className="kicker">{s["landing.badge"]}</span>
          <h1>
            {s["landing.hero.title"].split(".")[0]}.
            <br />
            <em>{s["landing.hero.title"].split(".")[1]?.trim()}</em>
          </h1>
          <p className="lead">{s["landing.hero.sub"]}</p>
          <div className="hero-cta">
            <a className="btn btn-accent" href="/dashboard">
              {s["landing.hero.cta"]}
            </a>
            <a className="btn btn-ghost" href="#how">
              {s["landing.hero.secondary"]}
            </a>
          </div>
          <p className="hero-note">{s["landing.hero.note"]}</p>
        </div>
      </header>

      <section className="section" id="how" style={{ paddingTop: 24 }}>
        <div className="wrap-narrow">
          <div className="section-head" style={{ textAlign: "center" }}>
            <h2>{s["landing.install.title"]}</h2>
            <p className="sub" style={{ margin: "0 auto 28px" }}>
              {s["landing.install.sub"]}
            </p>
          </div>
          <div className="code-card">
            <span className="cm">&lt;!-- {lang === "es" ? "pégalo una vez, en cualquier parte de tu sitio" : "paste once, anywhere on your site"} --&gt;</span>
            {"\n"}
            {snippet.split("\n").map((line, i) => (
              <span key={i}>
                {line
                  .replace(origin, `\u0000${origin}\u0000`)
                  .split("\u0000")
                  .map((part, j) =>
                    part === origin ? (
                      <span key={j} className="st">{part}</span>
                    ) : (
                      <span key={j}>{part}</span>
                    )
                  )}
                {"\n"}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="kicker">{s["landing.loop.kicker"]}</p>
          <h2>{s["landing.loop.title"]}</h2>
          <p className="sub">{s["landing.loop.sub"]}</p>
          <div className="steps">
            {([1, 2, 3] as const).map((n) => (
              <div className="step" key={n}>
                <span className="n">0{n}</span>
                <h3>{s[`landing.loop.s${n}t` as keyof Strings]}</h3>
                <p>{s[`landing.loop.s${n}d` as keyof Strings]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="features" style={{ background: "var(--bg-soft)" }}>
        <div className="wrap">
          <h2>{s["landing.features.title"]}</h2>
          <p className="sub">{s["landing.features.sub"]}</p>
          <div className="feat-grid">
            {(["spam", "dedup", "notes", "board", "roadmap", "team"] as const).map((f) => (
              <div className="feat" key={f}>
                <h3>{s[`landing.f.${f}.t` as keyof Strings]}</h3>
                <p>{s[`landing.f.${f}.d` as keyof Strings]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="wrap">
          <div style={{ textAlign: "center" }}>
            <h2>{s["landing.pricing.title"]}</h2>
            <p className="sub" style={{ margin: "0 auto 40px" }}>{s["landing.pricing.sub"]}</p>
          </div>
          <div className="pricing">
            <div className="plan">
              <span className="pname">{s["landing.plan.free"]}</span>
              <div className="price">$0</div>
              <ul>
                {[s["landing.f1"], s["landing.f2"], s["landing.f3"], s["landing.f4"]].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a className="btn btn-ghost" href="/dashboard">{s["landing.cta.start"]}</a>
            </div>
            <div className="plan hot">
              <span className="pname">{s["landing.plan.plus"]}</span>
              <div className="price">$19<small>{s["landing.perMonth"]}</small></div>
              <ul>
                {[s["landing.f5"], s["landing.f6"], s["landing.f7"], s["landing.f8"]].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a className="btn btn-accent" href="/dashboard">{s["landing.cta.start"]}</a>
            </div>
            <div className="plan">
              <span className="pname">{s["landing.plan.pro"]}</span>
              <div className="price">$49<small>{s["landing.perMonth"]}</small></div>
              <ul>
                {[s["landing.f9"], s["landing.f10"], s["landing.f7"], s["landing.f11"]].map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a className="btn btn-ghost" href="/dashboard">{s["landing.cta.start"]}</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap-narrow" style={{ textAlign: "center" }}>
          <h2>{s["landing.demo"]}</h2>
          <p className="sub" style={{ margin: "0 auto" }}>{s["landing.demo.sub"]}</p>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footer-inner">
          <a className="brand" href={`/${lang}`} style={{ fontSize: 18 }}>
            Feed<span>Loop</span>
          </a>
          <span>
            {s["landing.footer.tag"]} © 2026 FeedLoop. {s["landing.footer.rights"]}
          </span>
        </div>
      </footer>

      {demoKey ? (
        <Script
          src="/loader.js"
          data-feedloop-key={demoKey}
          strategy="lazyOnload"
        />
      ) : null}
    </>
  );
}
