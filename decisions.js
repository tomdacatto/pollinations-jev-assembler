// What Jev is asked, and how its answers become page settings. One request
// carries every question; Jev returns a choice, a score or a yes/no
// probability for each. Code then acts on those answers (see assemble.js).

export const PALETTES = {
    sunrise: {
        desc: "warm oranges and cream, cheerful and appetizing",
        bg: "#fff8f0",
        surface: "#ffffff",
        ink: "#2a1a10",
        muted: "#7b6a5d",
        accent: "#ff7a3d",
        accent2: "#ffcf5c",
        onAccent: "#2a1a10",
    },
    ocean: {
        desc: "cool blues and aqua, clean and trustworthy",
        bg: "#f2f9ff",
        surface: "#ffffff",
        ink: "#0b2239",
        muted: "#56718c",
        accent: "#1e88e5",
        accent2: "#26c6da",
        onAccent: "#ffffff",
    },
    forest: {
        desc: "deep greens and moss, natural and grounded",
        bg: "#f3f8f1",
        surface: "#ffffff",
        ink: "#14261a",
        muted: "#5b7263",
        accent: "#2e7d4f",
        accent2: "#a5d66f",
        onAccent: "#ffffff",
    },
    midnight: {
        desc: "dark navy with neon accents, modern and technical",
        bg: "#0e1224",
        surface: "#181d38",
        ink: "#eef0ff",
        muted: "#9aa0cf",
        accent: "#8c7bff",
        accent2: "#35e0c1",
        onAccent: "#0e1224",
    },
    blush: {
        desc: "soft pinks and rose, gentle and friendly",
        bg: "#fff5f7",
        surface: "#ffffff",
        ink: "#351824",
        muted: "#8a6373",
        accent: "#e8567f",
        accent2: "#ffb3c7",
        onAccent: "#ffffff",
    },
    graphite: {
        desc: "black, white and grey, minimal and serious",
        bg: "#f4f4f5",
        surface: "#ffffff",
        ink: "#18181b",
        muted: "#71717a",
        accent: "#18181b",
        accent2: "#a1a1aa",
        onAccent: "#ffffff",
    },
};

export const TYPES = {
    serif: {
        desc: "classic serif headlines, editorial and refined",
        head: 'Georgia, "Times New Roman", serif',
        body: "system-ui, sans-serif",
        weight: 700,
    },
    sans: {
        desc: "clean modern sans-serif, neutral and clear",
        head: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        body: "system-ui, sans-serif",
        weight: 750,
    },
    mono: {
        desc: "monospaced headlines, technical and precise",
        head: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
        body: "system-ui, sans-serif",
        weight: 700,
    },
    rounded: {
        desc: "soft rounded type, playful and approachable",
        head: "'Trebuchet MS', ui-rounded, system-ui, sans-serif",
        body: "'Trebuchet MS', system-ui, sans-serif",
        weight: 800,
    },
};

export const HEROES = {
    centered: "centered headline and button over a plain background",
    split: "headline on one side and a large image on the other",
    banner: "a full-width colored banner with a bold headline",
};

export const KINDS = [
    "restaurant_cafe",
    "portfolio",
    "software_product",
    "event",
    "shop",
    "nonprofit",
    "blog",
];
export const CTAS = {
    book: "Book",
    buy: "Buy",
    signup: "Sign up",
    contact: "Get in touch",
    learn: "Learn more",
    donate: "Donate",
};

// Rungs, lowest to highest.
export const ROUNDNESS = ["sharp", "slightly rounded", "rounded", "pill"];
export const DENSITY = ["airy", "balanced", "dense", "compact"];

export const SECTIONS = {
    features: "Should the page have a features or benefits section?",
    gallery:
        "Should the page have an image gallery of the work, food, place or product?",
    testimonials: "Should the page show quotes from customers?",
    pricing: "Should the page list prices or plans?",
    faq: "Should the page answer common questions?",
    team: "Should the page introduce the people behind it?",
    contact_form: "Should the page have a contact form?",
    newsletter: "Should the page collect email addresses for updates?",
};

const describe = (table) =>
    Object.fromEntries(
        Object.entries(table).map(([k, v]) => [
            k,
            typeof v === "string" ? v : v.desc,
        ]),
    );

export const QUESTIONS = {
    kind: {
        type: "choice",
        instructions: "What kind of page is this?",
        criteria: Object.fromEntries(
            KINDS.map((k) => [k, k.replaceAll("_", " ")]),
        ),
    },
    palette: {
        type: "choice",
        instructions: "Which color palette fits this brief best?",
        criteria: describe(PALETTES),
    },
    type: {
        type: "choice",
        instructions: "Which typography fits this brief best?",
        criteria: describe(TYPES),
    },
    hero: {
        type: "choice",
        instructions: "Which hero layout suits this page?",
        criteria: HEROES,
    },
    cta: {
        type: "choice",
        instructions: "What is the main thing a visitor should do?",
        criteria: {
            book: "reserve, book or schedule",
            buy: "purchase something",
            signup: "create an account or join",
            contact: "reach out to the owner",
            learn: "read and find out more",
            donate: "give money or support",
        },
    },
    roundness: {
        type: "score",
        instructions:
            "How rounded should the buttons and cards feel for this brand?",
        criteria: ROUNDNESS,
    },
    density: {
        type: "score",
        instructions: "How much content per screen suits this audience?",
        criteria: DENSITY,
    },
    urgency: {
        type: "noul",
        instructions:
            "Does the visitor need to act soon, for example a booking window, a launch date or limited stock?",
    },
    ...Object.fromEntries(
        Object.entries(SECTIONS).map(([k, q]) => [
            `section_${k}`,
            { type: "noul", instructions: q },
        ]),
    ),
};

export const MIN_SECTIONS = 2;
export const MAX_SECTIONS = 5;
// Jev leans towards "yes" on most sections, so only the clearest ones make the cut.
export const SECTION_THRESHOLD = 0.75;

const top = (probabilities) =>
    Object.entries(probabilities ?? {}).sort((a, b) => b[1] - a[1]);

// Turns Jev's raw answers into settings plus the numbers to show in the inspector.
export function interpret(answers) {
    const choice = (key, table) => {
        const a = answers[key];
        const options = Object.keys(table);
        const p = Object.fromEntries(
            options.map((o) => [o, a?.probabilities?.[o] ?? 0]),
        );
        const picked = options.includes(a?.choice)
            ? a.choice
            : (top(p)[0]?.[0] ?? options[0]);
        return { value: picked, options: p };
    };
    const scale = (key, rungs) => {
        const a = answers[key];
        const score = Number.isFinite(a?.score)
            ? a.score
            : (rungs.length - 1) / 2;
        const index = Math.min(
            rungs.length - 1,
            Math.max(0, Math.round(score)),
        );
        return { value: rungs[index], index, score };
    };
    const sectionP = Object.fromEntries(
        Object.keys(SECTIONS).map((s) => [
            s,
            answers[`section_${s}`]?.noul ?? 0,
        ]),
    );
    const ranked = Object.entries(sectionP).sort((a, b) => b[1] - a[1]);
    const strong = ranked.filter(([, p]) => p >= SECTION_THRESHOLD).length;
    const sections = ranked
        .slice(0, Math.min(MAX_SECTIONS, Math.max(MIN_SECTIONS, strong)))
        .map(([name]) => name);
    return {
        kind: choice("kind", Object.fromEntries(KINDS.map((k) => [k, 1]))),
        palette: choice("palette", PALETTES),
        type: choice("type", TYPES),
        hero: choice("hero", HEROES),
        cta: choice("cta", CTAS),
        roundness: scale("roundness", ROUNDNESS),
        density: scale("density", DENSITY),
        urgency: answers.urgency?.noul ?? 0,
        sectionP,
        sections,
    };
}

// The order sections appear on the page, regardless of how Jev ranked them.
export const SECTION_ORDER = [
    "features",
    "gallery",
    "pricing",
    "testimonials",
    "team",
    "faq",
    "newsletter",
    "contact_form",
];

// User overrides win over Jev; everything downstream reads one settings object.
export function resolve(decision, overrides = {}) {
    const has = (s) =>
        overrides.sections?.[s] !== undefined
            ? overrides.sections[s]
            : decision.sections.includes(s);
    return {
        kind: overrides.kind ?? decision.kind.value,
        palette: overrides.palette ?? decision.palette.value,
        type: overrides.type ?? decision.type.value,
        hero: overrides.hero ?? decision.hero.value,
        cta: overrides.cta ?? decision.cta.value,
        roundness: overrides.roundness ?? decision.roundness.index,
        density: overrides.density ?? decision.density.index,
        urgent: overrides.urgent ?? decision.urgency >= 0.5,
        sections: SECTION_ORDER.filter(has),
    };
}

// `ask` is (state, questions) => Promise<{answers, usage, ...}>, e.g. pollen.js `decisions`.
export async function decide(brief, ask) {
    const started = performance.now();
    const raw = await ask(brief, QUESTIONS);
    return {
        decision: interpret(raw.answers ?? {}),
        raw,
        ms: Math.round(performance.now() - started),
    };
}
