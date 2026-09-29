// Builds a complete, self-contained HTML page from Jev's settings and the
// written copy. No AI in here: this is the code that "acts on" the decisions.
import { CTAS, DENSITY, PALETTES, ROUNDNESS, TYPES } from "./decisions.js";

export const esc = (s) =>
    String(s ?? "").replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c],
    );

const PADDING = [96, 68, 46, 30];
const BUTTON_RADIUS = [0, 8, 16, 999];
const CARD_RADIUS = [0, 6, 14, 22];

// Copy that has not arrived yet renders as a shimmering placeholder, so the
// page is complete the moment Jev has decided.
const slot = (value, tag = "span", attrs = "") =>
    value === undefined || value === null || value === ""
        ? `<${tag} class="ph" ${attrs}>&nbsp;</${tag}>`
        : `<${tag} ${attrs}>${esc(value)}</${tag}>`;

const three = (list) => Array.from({ length: 3 }, (_, i) => list?.[i]);
const six = (list) => Array.from({ length: 6 }, (_, i) => list?.[i]);
const initials = (name) =>
    String(name ?? "?")
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

const SECTION_TITLES = {
    features: "Why it works",
    gallery: "A closer look",
    pricing: "Simple pricing",
    testimonials: "What people say",
    team: "Who is behind it",
    faq: "Questions, answered",
    newsletter: "Stay in the loop",
    contact_form: "Say hello",
};

const sections = {
    features: (copy) =>
        `<div class="grid3">${three(copy?.features)
            .map(
                (f) =>
                    `<article class="card">${slot(f?.title, "h3")}${slot(f?.text, "p")}</article>`,
            )
            .join("")}</div>`,

    gallery: (copy) =>
        `<div class="gallery">${six(copy?.gallery)
            .map(
                (caption, i) =>
                    `<figure class="tile t${i}"><figcaption>${slot(caption)}</figcaption></figure>`,
            )
            .join("")}</div>`,

    pricing: (copy) =>
        `<div class="grid3">${three(copy?.pricing)
            .map(
                (
                    tier,
                    i,
                ) => `<article class="card price ${i === 1 ? "hot" : ""}">${slot(tier?.name, "h3")}
                <p class="amount">${slot(tier?.price)}</p>${slot(tier?.note, "p", 'class="muted"')}
                <ul>${three(tier?.perks)
                    .map((perk) => `<li>${slot(perk)}</li>`)
                    .join("")}</ul>
                <a class="btn ${i === 1 ? "" : "ghost"}" href="#cta">Choose</a></article>`,
            )
            .join("")}</div>`,

    testimonials: (copy) =>
        `<div class="grid3">${three(copy?.testimonials)
            .map(
                (t) =>
                    `<blockquote class="card">${slot(t?.quote, "p")}${slot(t?.who, "cite")}</blockquote>`,
            )
            .join("")}</div>`,

    team: (copy) =>
        `<div class="grid3">${three(copy?.team)
            .map(
                (m) =>
                    `<article class="card person"><div class="avatar">${m ? esc(initials(m.name)) : "&nbsp;"}</div>${slot(m?.name, "h3")}${slot(m?.role, "p", 'class="muted"')}</article>`,
            )
            .join("")}</div>`,

    faq: (copy) =>
        `<div class="faq">${three(copy?.faq)
            .map(
                (f) =>
                    `<details><summary>${slot(f?.q)}</summary>${slot(f?.a, "p")}</details>`,
            )
            .join("")}</div>`,

    newsletter: () =>
        `<div class="row"><input type="email" placeholder="you@example.com" aria-label="Email address"><button class="btn" type="button">Subscribe</button></div>`,

    contact_form:
        () => `<div class="form"><input placeholder="Your name" aria-label="Your name"><input type="email" placeholder="Email" aria-label="Email">
        <textarea rows="4" placeholder="Message" aria-label="Message"></textarea><button class="btn" type="button">Send</button></div>`,
};

export function cssFor(settings) {
    const p = PALETTES[settings.palette];
    const t = TYPES[settings.type];
    const pad = PADDING[settings.density];
    const btn = BUTTON_RADIUS[settings.roundness];
    const card = CARD_RADIUS[settings.roundness];
    return `:root{--bg:${p.bg};--surface:${p.surface};--ink:${p.ink};--muted:${p.muted};--accent:${p.accent};--accent2:${p.accent2};--on:${p.onAccent};--pad:${pad}px;--btn:${btn}px;--card:${card}px}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 ${t.body}}
h1,h2,h3{font-family:${t.head};font-weight:${t.weight};line-height:1.12;margin:0 0 .4em;letter-spacing:-.01em}
h1{font-size:clamp(2.2rem,6vw,3.8rem)}h2{font-size:clamp(1.6rem,4vw,2.3rem)}h3{font-size:1.15rem}
p{margin:.4em 0}.muted{color:var(--muted)}a{color:inherit}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.bar{background:var(--accent);color:var(--on);text-align:center;padding:9px 16px;font-weight:600;font-size:.95rem}
nav{display:flex;align-items:center;justify-content:space-between;padding:16px 0}
nav b{font:${t.weight} 1.2rem ${t.head}}
.btn{display:inline-block;background:var(--accent);color:var(--on);padding:12px 22px;border-radius:var(--btn);font-weight:700;text-decoration:none;border:2px solid var(--accent);cursor:pointer;font-size:1rem}
.btn.ghost{background:transparent;color:var(--ink);border-color:var(--ink)}
.hero{padding:calc(var(--pad) * .9) 0}
.hero p.lead{font-size:1.2rem;max-width:34em;color:var(--muted)}
.hero.centered{text-align:center}.hero.centered p.lead{margin-left:auto;margin-right:auto}
.hero.split .wrap{display:grid;grid-template-columns:1.1fr .9fr;gap:36px;align-items:center}
.art{aspect-ratio:4/3;border-radius:var(--card);background:linear-gradient(135deg,var(--accent),var(--accent2));box-shadow:0 18px 50px rgba(0,0,0,.18);background-size:cover;background-position:center}
.hero.banner{background:linear-gradient(120deg,var(--accent),var(--accent2));color:var(--on)}
.hero.banner p.lead{color:inherit;opacity:.9}.hero.banner .btn{background:var(--on);color:var(--accent);border-color:var(--on)}
section.block{padding:var(--pad) 0}
section.block>.wrap>h2{margin-bottom:.9em}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px}
.card{background:var(--surface);border-radius:var(--card);padding:22px;border:1px solid color-mix(in srgb,var(--ink) 12%,transparent);margin:0}
.price .amount{font:${t.weight} 2rem ${t.head}}.price ul{padding-left:1.1em;margin:.8em 0 1.2em}.price.hot{border:2px solid var(--accent);box-shadow:0 12px 34px rgba(0,0,0,.14)}
blockquote.card cite{display:block;margin-top:.6em;color:var(--muted);font-style:normal;font-weight:600}
.avatar{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:var(--on);display:grid;place-items:center;font-weight:800;margin-bottom:10px}
.person{text-align:center}.person .avatar{margin-left:auto;margin-right:auto}
.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.tile{margin:0;aspect-ratio:1;border-radius:var(--card);display:flex;align-items:flex-end;padding:10px;color:var(--on);font-weight:600;font-size:.9rem;background:linear-gradient(135deg,var(--accent),var(--accent2))}
.tile.t1{background:linear-gradient(200deg,var(--accent2),var(--accent))}.tile.t2{background:linear-gradient(45deg,var(--accent),var(--ink))}
.tile.t3{background:linear-gradient(315deg,var(--accent2),var(--ink))}.tile.t4{background:linear-gradient(90deg,var(--accent),var(--accent2))}.tile.t5{background:linear-gradient(160deg,var(--ink),var(--accent))}
.faq details{background:var(--surface);border-radius:var(--card);padding:14px 18px;margin-bottom:10px;border:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}
.faq summary{font-weight:700;cursor:pointer}
.row,.form{display:flex;gap:10px;max-width:520px}.form{flex-direction:column}
input,textarea{font:inherit;padding:12px 14px;border-radius:var(--btn);border:1px solid color-mix(in srgb,var(--ink) 25%,transparent);background:var(--surface);color:var(--ink);width:100%}
.form textarea{border-radius:min(var(--card),18px)}
.band{background:var(--ink);color:var(--bg);text-align:center;padding:var(--pad) 20px}.band h2{margin-bottom:.6em}.band .btn{background:var(--accent);border-color:var(--accent);color:var(--on)}
footer{padding:26px 0;text-align:center;color:var(--muted);font-size:.9rem}
.ph{display:inline-block;min-width:6em;border-radius:6px;background:linear-gradient(90deg,color-mix(in srgb,var(--ink) 10%,transparent),color-mix(in srgb,var(--ink) 20%,transparent),color-mix(in srgb,var(--ink) 10%,transparent));background-size:200% 100%;animation:sh 1.3s linear infinite;color:transparent}
@keyframes sh{to{background-position:-200% 0}}
@media(max-width:700px){.hero.split .wrap{grid-template-columns:1fr}.gallery{grid-template-columns:repeat(2,1fr)}}
@media(prefers-reduced-motion:reduce){.ph{animation:none}html{scroll-behavior:auto}}`;
}

// settings: the resolved decisions. copy: written text, or null while it is being written.
export function assemble(settings, copy, { heroImage } = {}) {
    const label = copy?.cta_label || CTAS[settings.cta] || "Learn more";
    const art = heroImage
        ? `<div class="art" style="background-image:url('${esc(heroImage)}')" role="img" aria-label="Hero image"></div>`
        : `<div class="art" aria-hidden="true"></div>`;
    const heroText = `${slot(copy?.hero_title, "h1")}${slot(copy?.hero_text, "p", 'class="lead"')}<p><a class="btn" href="#cta">${esc(label)}</a></p>`;
    const hero = {
        centered: `<div class="wrap">${heroText}</div>`,
        split: `<div class="wrap"><div>${heroText}</div>${art}</div>`,
        banner: `<div class="wrap">${heroText}</div>`,
    }[settings.hero];
    const blocks = settings.sections
        .map(
            (name) =>
                `<section class="block" id="${name}"><div class="wrap"><h2>${esc(SECTION_TITLES[name])}</h2>${sections[name](copy)}</div></section>`,
        )
        .join("\n");
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(copy?.name || "Your page")}</title><style>${cssFor(settings)}</style></head><body id="top">
${settings.urgent ? `<div class="bar">${slot(copy?.banner)}</div>` : ""}
<div class="wrap"><nav><b>${slot(copy?.name)}</b><a class="btn" href="#cta">${esc(label)}</a></nav></div>
<header class="hero ${settings.hero}">${hero}</header>
${blocks}
<section class="band" id="cta"><h2>${slot(copy?.cta_line)}</h2><a class="btn" href="#top">${esc(label)}</a></section>
<footer>${slot(copy?.name)} · made with Jev Assembler</footer>
</body></html>`;
}

export const roundnessLabel = (i) => ROUNDNESS[i];
export const densityLabel = (i) => DENSITY[i];
