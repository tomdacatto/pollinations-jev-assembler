import { assemble, esc } from "./assemble.js";
import { cleanCopy, copyPrompt } from "./copy.js";
import {
    CTAS,
    DENSITY,
    decide,
    PALETTES,
    ROUNDNESS,
    resolve,
    SECTION_ORDER,
} from "./decisions.js";
import {
    balance,
    chatJson,
    completeSignIn,
    decisions,
    getSession,
    image,
    signIn,
    signOut,
} from "./pollen.js";

const $app = document.getElementById("app");

// Jev bills input tokens only (price per token, from /text/models).
const JEV_PRICE = 4.431e-8;

const EXAMPLES = [
    "A tiny bakery in Lisbon that sells pastel de nata, open 7am to 3pm, come early because they sell out",
    "An AI code review tool for engineering teams that catches bugs before merge; free for open source, paid plans for teams",
    "A shelter for rescued greyhounds that needs monthly donors and volunteers",
    "Portfolio of Maya, a freelance illustrator who makes children's books and wants commissions",
];

const state = {
    screen: "landing",
    error: "",
    pollen: null,
    brief: "",
    wantImage: false,
    status: "idle", // idle | deciding | writing | done
    decision: null,
    raw: null,
    ms: 0,
    overrides: {},
    copy: null,
    heroImage: null,
    view: "preview",
};

let run = 0;

const settings = () => resolve(state.decision, state.overrides);
const pct = (p) => `${Math.round(p * 100)}%`;
const label = (s) => String(s).replaceAll("_", " ");

function fail(e) {
    state.status = "idle";
    state.error = e?.message || "Something went wrong.";
    if (e?.status === 401) state.screen = "landing";
    render();
}

async function refreshPollen() {
    state.pollen = await balance();
    const chip = document.getElementById("pollen");
    if (chip && state.pollen != null) {
        chip.textContent = `${state.pollen.toFixed(2)} Pollen`;
        chip.hidden = false;
    }
}

const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

// --- views ---------------------------------------------------------------------

function header() {
    const signedIn = !!getSession();
    return `<header>
        <h1>Jev Assembler</h1>
        <div class="right">
            ${signedIn ? `<span class="chip" id="pollen" title="Your remaining Pollen budget" ${state.pollen == null ? "hidden" : ""}>${state.pollen == null ? "" : `${state.pollen.toFixed(2)} Pollen`}</span><button class="link" data-act="signout">Sign out</button>` : ""}
        </div>
    </header>`;
}

function landing() {
    return `<section class="hero">
        <p class="kicker">One decision call. One finished page.</p>
        <h2>Describe a page. Jev decides how it looks. Code builds it.</h2>
        <p>Jev answers small, bounded questions with calibrated probabilities: pick one option, give a score, or say how likely a yes is. This app asks it 16 of them in a single request (palette, type, layout, sections, call to action) and plain code assembles a real page from the answers, in about two seconds. A text model only writes the words.</p>
        <p>Every decision is shown with its probability, and you can overrule any of them: the page re-assembles instantly, because the code, not an AI, acts on the answers.</p>
        <p class="fine">Runs on Pollinations and is paid with <b>your own Pollen</b>. A page costs about a hundredth of a Pollen; the Jev call itself is a few thousandths of a cent.</p>
        <button class="btn primary big" data-act="signin">Sign in with Pollen</button>
    </section>`;
}

function studio() {
    return `<section class="studio">
        <label>Describe the page you want
            <textarea id="brief" rows="3" maxlength="300" placeholder="A rooftop cinema in Berlin, open in summer, tickets sell out fast">${esc(state.brief)}</textarea>
        </label>
        <div class="examples">${EXAMPLES.map((e, i) => `<button class="chipbtn" data-act="example" data-i="${i}">${esc(e.split(/[,;]/)[0].slice(0, 44))}</button>`).join("")}</div>
        <label class="check"><input type="checkbox" id="wantImage" ${state.wantImage ? "checked" : ""}> Also draw a hero image (about 0.002 Pollen more)</label>
        <button class="btn primary big" data-act="assemble" ${state.status === "deciding" ? "disabled" : ""}>${state.status === "deciding" ? "Jev is deciding…" : "Assemble the page"}</button>
        ${state.decision ? result() : ""}
    </section>`;
}

function result() {
    return `<div class="result">
        <div class="tabs" role="tablist">
            <button role="tab" class="${state.view === "preview" ? "on" : ""}" data-act="view" data-v="preview">Page</button>
            <button role="tab" class="${state.view === "decisions" ? "on" : ""}" data-act="view" data-v="decisions">Jev's decisions</button>
        </div>
        <div class="panes ${state.view}">
            <div class="pane previewpane">
                <div class="toolbar"><span id="status"></span><button class="btn small" data-act="download">Download HTML</button></div>
                <iframe id="preview" title="Assembled page" sandbox=""></iframe>
            </div>
            <div class="pane inspector" id="inspector"></div>
        </div>
    </div>`;
}

const bar = (p) => `<i style="width:${Math.round(p * 100)}%"></i>`;

function choiceGroup(
    title,
    key,
    options,
    current,
    jevPick,
    renderLabel = label,
) {
    return `<div class="group"><h4>${title}</h4><div class="opts">${Object.entries(
        options,
    )
        .sort((a, b) => b[1] - a[1])
        .map(
            ([name, p]) =>
                `<button class="opt ${name === current ? "on" : ""}" data-act="override" data-k="${key}" data-v="${esc(name)}">${bar(p)}<span>${key === "palette" ? `<i class="sw" style="background:linear-gradient(135deg,${PALETTES[name].accent},${PALETTES[name].accent2})"></i>` : ""}${esc(renderLabel(name))}${name === jevPick && current !== jevPick ? " · Jev" : ""}${name === current && current !== jevPick ? " · you" : ""}</span><b>${pct(p)}</b></button>`,
        )
        .join("")}</div></div>`;
}

function scaleGroup(title, key, rungs, current, jev) {
    return `<div class="group"><h4>${title} <span class="fine">Jev's score ${jev.score.toFixed(2)}</span></h4><div class="rungs">${rungs
        .map(
            (r, i) =>
                `<button class="opt rung ${i === current ? "on" : ""}" data-act="override" data-k="${key}" data-v="${i}"><span>${r}${i === jev.index && current !== jev.index ? " · Jev" : ""}${i === current && current !== jev.index ? " · you" : ""}</span></button>`,
        )
        .join("")}</div></div>`;
}

function inspector() {
    const d = state.decision;
    const s = settings();
    const cost = (state.raw?.usage?.input_tokens ?? 0) * JEV_PRICE;
    const paletteOptions = d.palette.options;
    return `<div class="callinfo"><b>One Jev request</b> · ${(state.ms / 1000).toFixed(1)} s · ${state.raw?.usage?.input_tokens ?? "?"} input tokens · about ${cost < 0.0001 ? "0.00005" : cost.toFixed(5)} Pollen · 16 questions
        <details><summary>Raw response</summary><pre>${esc(JSON.stringify(state.raw?.answers ?? {}, null, 1).slice(0, 3500))}</pre></details></div>
        <div class="group"><h4>Reading of the brief</h4><p class="fine">Kind of page: <b>${label(d.kind.value)}</b> (${pct(d.kind.options[d.kind.value])})</p></div>
        ${choiceGroup("Palette", "palette", paletteOptions, s.palette, d.palette.value, (n) => n)}
        ${choiceGroup("Typography", "type", d.type.options, s.type, d.type.value)}
        ${choiceGroup("Hero layout", "hero", d.hero.options, s.hero, d.hero.value)}
        ${choiceGroup("Main call to action", "cta", d.cta.options, s.cta, d.cta.value, (n) => CTAS[n])}
        ${scaleGroup("Roundness", "roundness", ROUNDNESS, s.roundness, d.roundness)}
        ${scaleGroup("Density", "density", DENSITY, s.density, d.density)}
        <div class="group"><h4>Urgency banner <span class="fine">Jev says ${pct(d.urgency)} likely</span></h4>
            <button class="opt ${s.urgent ? "on" : ""}" data-act="override" data-k="urgent" data-v="${!s.urgent}">${bar(d.urgency)}<span>${s.urgent ? "Showing an urgency banner" : "No urgency banner"}</span><b>${pct(d.urgency)}</b></button></div>
        <div class="group"><h4>Sections <span class="fine">on when Jev is at least 75% sure (2 to 5)</span></h4><div class="opts">${SECTION_ORDER.map(
            (name) =>
                `<button class="opt ${s.sections.includes(name) ? "on" : ""}" data-act="section" data-v="${name}">${bar(d.sectionP[name])}<span>${label(name)}${s.sections.includes(name) !== d.sections.includes(name) ? " · you" : ""}</span><b>${pct(d.sectionP[name])}</b></button>`,
        ).join("")}</div></div>
        <button class="link" data-act="reset">Reset every decision to Jev's</button>`;
}

const screens = { landing, studio };

// --- rendering -------------------------------------------------------------------

function render() {
    $app.innerHTML = `${header()}${state.error ? `<div class="error" role="alert">${esc(state.error)}</div>` : ""}${(screens[state.screen] ?? landing)()}`;
    if (state.decision && state.screen === "studio") {
        renderInspector();
        updatePreview();
    }
}

function renderInspector() {
    const el = document.getElementById("inspector");
    if (el) el.innerHTML = inspector();
}

function updatePreview() {
    const frame = document.getElementById("preview");
    if (frame)
        frame.srcdoc = assemble(settings(), state.copy, {
            heroImage: state.heroImage,
        });
    const status = document.getElementById("status");
    if (status) {
        status.textContent =
            state.status === "writing"
                ? `Jev decided in ${(state.ms / 1000).toFixed(1)} s · writing the copy…`
                : `Jev decided in ${(state.ms / 1000).toFixed(1)} s · ready`;
    }
}

// --- flow ------------------------------------------------------------------------

async function assembleClick() {
    const brief = document.getElementById("brief").value.trim();
    if (brief.length < 8) {
        state.error = "Describe the page in a sentence or two first.";
        return render();
    }
    const mine = ++run;
    Object.assign(state, {
        brief,
        error: "",
        status: "deciding",
        decision: null,
        raw: null,
        overrides: {},
        copy: null,
        heroImage: null,
        view: "preview",
    });
    render();
    // The hero image only needs the brief, so it starts alongside Jev.
    const picture = state.wantImage
        ? image(
              `Wide editorial illustration for a website about: ${brief}. No text, no logos.`,
              { width: 1024, height: 768 },
          )
              .then(blobToDataUrl)
              .catch(() => null)
        : Promise.resolve(null);
    try {
        const { decision, raw, ms } = await decide(brief, decisions);
        if (mine !== run) return;
        Object.assign(state, { decision, raw, ms, status: "writing" });
        render();
        picture.then((url) => {
            if (mine === run && url) {
                state.heroImage = url;
                updatePreview();
            }
        });
        const written = await chatJson(
            [
                {
                    role: "system",
                    content:
                        "You write concise, concrete website copy. Reply with JSON only.",
                },
                { role: "user", content: copyPrompt(brief, settings()) },
            ],
            { temperature: 0.9 },
        );
        if (mine !== run) return;
        state.copy = cleanCopy(written);
        state.status = "done";
        updatePreview();
        refreshPollen();
    } catch (e) {
        if (mine === run) fail(e);
    }
}

function override(k, v) {
    const numeric = k === "roundness" || k === "density";
    const value = k === "urgent" ? v === "true" : numeric ? Number(v) : v;
    state.overrides[k] = value;
    renderInspector();
    updatePreview();
}

function toggleSection(name) {
    const on = settings().sections.includes(name);
    state.overrides.sections = { ...state.overrides.sections, [name]: !on };
    renderInspector();
    updatePreview();
}

async function download() {
    const html = assemble(settings(), state.copy, {
        heroImage: state.heroImage,
    });
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const a = Object.assign(document.createElement("a"), {
        href: url,
        download: "page.html",
    });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const actions = {
    signin: () => signIn().catch(fail),
    signout() {
        signOut();
        run++;
        Object.assign(state, {
            screen: "landing",
            pollen: null,
            decision: null,
            status: "idle",
        });
        render();
    },
    example({ i }) {
        const box = document.getElementById("brief");
        box.value = EXAMPLES[Number(i)];
        state.brief = box.value;
    },
    assemble: assembleClick,
    view({ v }) {
        state.view = v;
        document.querySelector(".panes")?.setAttribute("class", `panes ${v}`);
        for (const b of document.querySelectorAll(".tabs button"))
            b.classList.toggle("on", b.dataset.v === v);
    },
    override: ({ k, v }) => override(k, v),
    section: ({ v }) => toggleSection(v),
    reset() {
        state.overrides = {};
        renderInspector();
        updatePreview();
    },
    download,
};

$app.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (el && !el.disabled) actions[el.dataset.act]?.(el.dataset);
});
$app.addEventListener("input", (e) => {
    if (e.target.id === "brief") state.brief = e.target.value;
});
$app.addEventListener("change", (e) => {
    if (e.target.id === "wantImage") state.wantImage = e.target.checked;
});

(async () => {
    try {
        await completeSignIn();
    } catch (e) {
        state.error = e.message;
    }
    if (getSession()) {
        state.screen = "studio";
        refreshPollen();
    }
    render();
})();
