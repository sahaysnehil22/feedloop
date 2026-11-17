import Script from "next/script";
import { getStrings, normalizeLang, type Strings } from "@/lib/i18n";
import { appUrl } from "@/lib/firebase";
import type { Lang } from "@/lib/types";

const FEAT_ICONS = ["◈", "⧉", "✎", "☰", "↗", "◉"];
const POWER_TAGS = ["landing.power.addon", "landing.power.included", "landing.power.included"] as const;

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
  const faq = [1, 2, 3, 4, 5, 6] as const;

  return (
    <>
      <nav className="nav">
        <div className="wrap nav-inner">
          <a className="brand" href={`/${lang}`}>
            <span className="brand-mark">F</span>FeedLoop
          </a>
          <div className="nav-links">
            <a href="#features">{s["landing.nav.features"]}</a>
            <a href="#pricing">{s["landing.nav.pricing"]}</a>
            <a href="#faq">{s["landing.faq.kicker"]}</a>
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
          <span className="kicker"><span className="dot" />{s["landing.badge"]}</span>
          <h1>
            {s["landing.hero.title"].split(".")[0]}.
            <br />
            {s["landing.hero.title"].split(".")[1]?.trim()}
          </h1>
          <p className="lead">{s["landing.hero.sub"]}</p>
          <div className="hero-cta">
            <a className="btn" href="/dashboard">{s["landing.hero.cta"]}</a>
            <a className="btn btn-ghost" href="#how">{s["landing.hero.secondary"]}</a>
          </div>
          <p className="hero-note">{s["landing.hero.note"]}</p>
        </div>
      </header>

      <section className="section" id="how" style={{ paddingTop: 8 }}>
        <div className="wrap-narrow">
          <div className="center">
            <p className="eyebrow">01 — {lang === "es" ? "Instalación" : "Install"}</p>
            <h2>{s["landing.install.title"]}</h2>
            <p className="sub">{s["landing.install.sub"]}</p>
          </div>
          <div className="code-card">
            <span className="cm">&lt;!-- {lang === "es" ? "pégalo una vez, en cualquier parte de tu sitio" : "paste once, anywhere on your site"} --&gt;</span>
            {"\n"}
            <span className="kw">&lt;script</span> <span className="cm">async</span> <span className="cm">src</span>=<span className="st">"{origin}/loader.js"</span>
            {"\n        "}<span className="cm">data-feedloop-key</span>=<span className="st">"pk_..."</span>
            <span className="kw">&gt;&lt;/script&gt;</span>
          </div>
          <p className="hero-note" style={{ textAlign: "center", marginTop: 18 }}>{snippet ? "" : ""}{s["landing.hero.note"]}</p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">02 — {s["landing.loop.kicker"]}</p>
          <h2>{s["landing.loop.title"]}</h2>
          <p className="sub">{s["landing.loop.sub"]}</p>
          <div className="steps">
            {([1, 2, 3] as const).map((n, i) => (
              <div className="step" key={n}>
                <span className="n">0{n}</span>
                <h3>{s[`landing.loop.s${n}t` as keyof Strings]}</h3>
                <p>{s[`landing.loop.s${n}d` as keyof Strings]}</p>
                {i === 0 && <div className="demo-votes">+142 {s["widget.votes"]}</div>}
                {i === 1 && <div className="demo-votes">{s["status.in_progress"]}</div>}
                {i === 2 && <div className="demo-votes">{s["status.launched"]} · v0.9</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt" id="features">
        <div className="wrap">
          <p className="eyebrow">03 — {s["landing.nav.features"]}</p>
          <h2>{s["landing.features.title"]}</h2>
          <p className="sub">{s["landing.features.sub"]}</p>
          <div className="feat-grid">
            {(["spam", "dedup", "notes", "board", "roadmap", "team"] as const).map((f, i) => (
              <div className="feat" key={f}>
                <div className="ico">{FEAT_ICONS[i]}</div>
                <h3>{s[`landing.f.${f}.t` as keyof Strings]}</h3>
                <p>{s[`landing.f.${f}.d` as keyof Strings]}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <p className="eyebrow">04 — {s["landing.power.kicker"]}</p>
          <h2>{s["landing.power.title"]}</h2>
          <p className="sub">{s["landing.power.sub"]}</p>
          <div className="powers">
            {(["badge", "loop", "integrations"] as const).map((p, i) => (
              <div className="power" key={p}>
                <h3>{s[`landing.power.${p}.t` as keyof Strings]}</h3>
                <p>{s[`landing.power.${p}.d` as keyof Strings]}</p>
                <span className="tag">{s[POWER_TAGS[i]]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap-narrow">
          <div className="center">
            <p className="eyebrow">05 — {s["landing.light.kicker"]}</p>
            <h2>{s["landing.light.title"]}</h2>
            <p className="sub">{s["landing.light.sub"]}</p>
          </div>
          <div className="proof">
            <div className="bar-row">
              <div className="lbl-row"><span>{s["landing.light.us"]}</span><span className="v">~2.1 KB</span></div>
              <div className="bar-track"><div className="bar-fill us" /></div>
            </div>
            <div className="bar-row">
              <div className="lbl-row"><span>{s["landing.light.them"]}</span><span className="v">~190 KB+</span></div>
              <div className="bar-track"><div className="bar-fill them" /></div>
            </div>
            <p className="proof-note">{s["landing.light.note"]}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap-narrow">
          <p className="eyebrow">06 — {s["landing.public.kicker"]}</p>
          <h2>{s["landing.public.title"]}</h2>
          <div style={{ height: 18 }} />
          <ul className="check-list">
            {([1, 2, 3, 4] as const).map((n) => (
              <li key={n}>{s[`landing.public.b${n}` as keyof Strings]}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section alt" id="pricing">
        <div className="wrap">
          <div className="center">
            <p className="eyebrow">07 — {s["landing.nav.pricing"]}</p>
            <h2>{s["landing.pricing.title"]}</h2>
            <p className="sub">{s["landing.pricing.sub"]}</p>
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
              <a className="btn" href="/dashboard">{s["landing.cta.start"]}</a>
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

      <section className="section" id="faq">
        <div className="wrap-narrow">
          <div className="center">
            <p className="eyebrow">08 — {s["landing.faq.kicker"]}</p>
            <h2>{s["landing.faq.title"]}</h2>
            <div style={{ height: 26 }} />
          </div>
          <div className="faq">
            {faq.map((n) => (
              <details className="faq-item" key={n}>
                <summary>{s[`landing.faq.q${n}` as keyof Strings]}</summary>
                <div className="a">{s[`landing.faq.a${n}` as keyof Strings]}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap-narrow">
          <h2>{s["landing.cta2.title"]}</h2>
          <p>{s["landing.cta2.sub"]}</p>
          <a className="btn" href="/dashboard">{s["landing.hero.cta"]}</a>
          <p className="hero-note" style={{ marginTop: 22 }}>{s["landing.demo.sub"]}</p>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footer-inner">
          <a className="brand" href={`/${lang}`} style={{ fontSize: 15 }}>
            <span className="brand-mark">F</span>FeedLoop
          </a>
          <div className="flinks">
            <a href="#features">{s["landing.nav.features"]}</a>
            <a href="#pricing">{s["landing.nav.pricing"]}</a>
            <a href="/dashboard">{s["landing.nav.dashboard"]}</a>
          </div>
          <span className="mono" style={{ fontSize: 12 }}>
            {s["landing.footer.tag"]} © 2026
          </span>
        </div>
      </footer>

      {demoKey ? (
        <Script src="/loader.js" data-feedloop-key={demoKey} strategy="lazyOnload" />
      ) : null}
    </>
  );
}
