import assert from "node:assert/strict";
import test from "node:test";
import { assemble, esc } from "./assemble.js";
import { cleanCopy, copyPrompt } from "./copy.js";
import {
    decide,
    interpret,
    MAX_SECTIONS,
    MIN_SECTIONS,
    PALETTES,
    QUESTIONS,
    resolve,
    SECTIONS,
} from "./decisions.js";

// A Jev answer shaped like the real API response.
const answers = (over = {}) => ({
    kind: {
        type: "choice",
        choice: "restaurant_cafe",
        probabilities: { restaurant_cafe: 0.9, shop: 0.1 },
        confidence: 0.9,
    },
    palette: {
        type: "choice",
        choice: "sunrise",
        probabilities: { sunrise: 0.7, ocean: 0.3 },
        confidence: 0.7,
    },
    type: {
        type: "choice",
        choice: "rounded",
        probabilities: { rounded: 1 },
        confidence: 1,
    },
    hero: {
        type: "choice",
        choice: "split",
        probabilities: { split: 1 },
        confidence: 1,
    },
    cta: {
        type: "choice",
        choice: "book",
        probabilities: { book: 1 },
        confidence: 1,
    },
    roundness: {
        type: "score",
        score: 1.6,
        legend: {},
        probabilities: {},
        confidence: 1,
    },
    density: {
        type: "score",
        score: 0.4,
        legend: {},
        probabilities: {},
        confidence: 1,
    },
    urgency: { type: "noul", noul: 0.9 },
    section_features: { type: "noul", noul: 0.9 },
    section_gallery: { type: "noul", noul: 0.8 },
    section_testimonials: { type: "noul", noul: 0.3 },
    section_pricing: { type: "noul", noul: 0.2 },
    section_faq: { type: "noul", noul: 0.76 },
    section_team: { type: "noul", noul: 0.1 },
    section_contact_form: { type: "noul", noul: 0.1 },
    section_newsletter: { type: "noul", noul: 0.1 },
    ...over,
});

test("every question is typed and every section has one", () => {
    for (const [key, q] of Object.entries(QUESTIONS)) {
        assert.ok(["choice", "score", "noul"].includes(q.type), key);
        assert.ok(q.instructions.length > 10, key);
        if (q.type === "choice")
            assert.ok(Object.keys(q.criteria).length >= 3, key);
        if (q.type === "score")
            assert.ok(Array.isArray(q.criteria) && q.criteria.length >= 2, key);
    }
    for (const s of Object.keys(SECTIONS))
        assert.ok(QUESTIONS[`section_${s}`], s);
});

test("interpret turns answers into settings the page can use", () => {
    const d = interpret(answers());
    assert.equal(d.palette.value, "sunrise");
    assert.equal(d.palette.options.sunrise, 0.7);
    assert.equal(d.roundness.index, 2);
    assert.equal(d.roundness.value, "rounded");
    assert.equal(d.density.index, 0);
    assert.ok(d.urgency >= 0.5);
    assert.deepEqual([...d.sections].sort(), ["faq", "features", "gallery"]);
});

test("sections: strong ones only, at least 2, never more than 5", () => {
    const weak = Object.fromEntries(
        Object.keys(SECTIONS).map((s) => [`section_${s}`, { noul: 0.2 }]),
    );
    assert.equal(
        interpret(
            answers({
                ...weak,
                section_faq: { noul: 0.6 },
                section_team: { noul: 0.55 },
            }),
        ).sections.length,
        MIN_SECTIONS,
    );
    const strong = Object.fromEntries(
        Object.keys(SECTIONS).map((s) => [`section_${s}`, { noul: 0.95 }]),
    );
    assert.equal(interpret(answers(strong)).sections.length, MAX_SECTIONS);
});

test("interpret survives a missing or odd answer", () => {
    const d = interpret({
        palette: { choice: "nope", probabilities: { ocean: 0.6, forest: 0.4 } },
    });
    assert.equal(
        d.palette.value,
        "ocean",
        "an unknown choice falls back to the most likely option",
    );
    assert.ok(d.kind.value && d.type.value && d.hero.value && d.cta.value);
    assert.equal(d.roundness.index, 2, "a missing score sits in the middle");
    assert.ok(d.sections.length >= MIN_SECTIONS);
});

test("overrides win over Jev and sections keep page order", () => {
    const d = interpret(answers());
    const s = resolve(d, {
        palette: "ocean",
        roundness: 3,
        sections: { pricing: true, gallery: false },
        urgent: false,
    });
    assert.equal(s.palette, "ocean");
    assert.equal(s.roundness, 3);
    assert.equal(s.urgent, false);
    assert.deepEqual(s.sections, ["features", "pricing", "faq"]);
    assert.equal(resolve(d).palette, "sunrise");
});

test("decide asks once, with every question, and reports Jev's numbers", async () => {
    const calls = [];
    const { decision, raw } = await decide(
        "a bakery",
        async (state, questions) => {
            calls.push({ state, questions });
            return {
                answers: answers(),
                usage: { input_tokens: 1100, output_tokens: 80 },
            };
        },
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].state, "a bakery");
    assert.equal(calls[0].questions, QUESTIONS);
    assert.equal(decision.cta.value, "book");
    assert.equal(raw.usage.input_tokens, 1100);
});

const settings = (over = {}) => ({ ...resolve(interpret(answers())), ...over });

test("assemble builds only the sections Jev chose, in order", () => {
    const html = assemble(settings(), null);
    const ids = [...html.matchAll(/<section class="block" id="(\w+)"/g)].map(
        (m) => m[1],
    );
    assert.deepEqual(ids, ["features", "gallery", "faq"]);
    assert.ok(!html.includes('id="pricing"') && !html.includes('id="team"'));
});

test("assemble applies palette, roundness and density", () => {
    const html = assemble(
        settings({ palette: "midnight", roundness: 3, density: 3 }),
        null,
    );
    assert.ok(html.includes(`--bg:${PALETTES.midnight.bg}`));
    assert.ok(html.includes("--btn:999px"));
    assert.ok(html.includes("--pad:30px"));
});

test("assemble shows the urgency bar only when urgent", () => {
    assert.match(
        assemble(settings({ urgent: true }), { banner: "Sells out by noon" }),
        /class="bar"><span >Sells out by noon<\/span>/,
    );
    assert.ok(
        !assemble(settings({ urgent: false }), null).includes('class="bar"'),
    );
});

test("assemble renders placeholders while copy is missing, then real copy", () => {
    const skeleton = assemble(settings(), null);
    assert.ok(skeleton.includes('class="ph"'));
    assert.ok(!skeleton.includes("undefined") && !skeleton.includes("null"));
    const copy = cleanCopy({
        name: "Pastel",
        hero_title: "Warm custard tarts",
        features: [{ title: "Fresh", text: "Baked at dawn." }],
    });
    const html = assemble(settings(), copy);
    assert.match(html, /<h1 >Warm custard tarts<\/h1>/);
    assert.match(html, /<h3 >Fresh<\/h3>/);
});

test("assemble escapes model text", () => {
    const html = assemble(
        settings(),
        cleanCopy({
            name: "<script>alert(1)</script>",
            hero_title: '"><img src=x onerror=alert(1)>',
        }),
    );
    assert.ok(!html.includes("<script>alert(1)"));
    assert.ok(!html.includes("<img src=x"));
    assert.equal(esc(`<&>"'`), "&lt;&amp;&gt;&quot;&#39;");
});

test("assemble uses the hero image only in the split layout", () => {
    assert.match(
        assemble(settings({ hero: "split" }), null, {
            heroImage: "data:image/jpeg;base64,AAAA",
        }),
        /background-image:url\('data:image\/jpeg;base64,AAAA'\)/,
    );
    assert.ok(
        !assemble(settings({ hero: "centered" }), null, {
            heroImage: "data:image/jpeg;base64,AAAA",
        }).includes("AAAA"),
    );
});

test("copy prompt covers every section, so overrides never need a new request", () => {
    const p = copyPrompt("a bakery", settings());
    for (const key of [
        "features",
        "gallery",
        "pricing",
        "testimonials",
        "team",
        "faq",
        "banner",
        "hero_title",
        "cta_line",
    ]) {
        assert.ok(p.includes(`"${key}"`), key);
    }
    assert.ok(p.includes("a bakery"));
});

test("cleanCopy keeps the expected shape from messy model output", () => {
    const c = cleanCopy({
        name: 5,
        features: "nope",
        pricing: [{ name: "Pro", perks: ["a", 3] }],
        faq: [null],
    });
    assert.equal(c.name, "");
    assert.deepEqual(c.features, []);
    assert.deepEqual(c.pricing[0].perks, ["a", ""]);
    assert.deepEqual(c.faq, [{ q: "", a: "" }]);
    assert.deepEqual(cleanCopy(null).gallery, []);
});
