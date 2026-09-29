// The words for the page. Jev decides the structure; a small text model only
// writes the copy. It writes every section up front, so when the user flips a
// decision the page re-assembles instantly without another request.
import { CTAS } from "./decisions.js";

const FIELDS = {
    features:
        '"features": array of 3 {"title": 2-4 words, "text": one sentence}',
    gallery: '"gallery": array of 6 short captions (2-4 words each)',
    pricing:
        '"pricing": array of 3 {"name", "price" (like "$9/mo" or "Free"), "note": a few words, "perks": array of 3 short perks}',
    testimonials:
        '"testimonials": array of 3 {"quote": one sentence, "who": first name and role}',
    team: '"team": array of 3 {"name": first and last name, "role"}',
    faq: '"faq": array of 3 {"q", "a": one sentence}',
};

export function copyPrompt(brief, settings) {
    const keys = [
        '"name": the brand name (1-3 words)',
        '"hero_title": a punchy headline, at most 8 words',
        '"hero_text": one or two sentences, at most 30 words',
        `"cta_label": the main button, 1-3 words, in the spirit of "${CTAS[settings.cta]}"`,
        '"cta_line": one closing sentence inviting the visitor to act',
        '"banner": a short announcement line about acting soon',
        ...Object.values(FIELDS),
    ];
    return `Write website copy for this brief: ${brief}\nReturn JSON with exactly these keys:\n- ${keys.join("\n- ")}\nBe concrete and specific to the brief. Do not invent real people, awards or statistics.`;
}

const list = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (typeof value === "string" ? value.trim() : "");

// Drops anything that is not the shape the page expects; the page shows a
// placeholder for whatever is missing.
export function cleanCopy(raw) {
    const c = raw && typeof raw === "object" ? raw : {};
    return {
        name: text(c.name),
        hero_title: text(c.hero_title),
        hero_text: text(c.hero_text),
        cta_label: text(c.cta_label),
        cta_line: text(c.cta_line),
        banner: text(c.banner),
        features: list(c.features).map((f) => ({
            title: text(f?.title),
            text: text(f?.text),
        })),
        gallery: list(c.gallery).map(text),
        pricing: list(c.pricing).map((t) => ({
            name: text(t?.name),
            price: text(t?.price),
            note: text(t?.note),
            perks: list(t?.perks).map(text),
        })),
        testimonials: list(c.testimonials).map((t) => ({
            quote: text(t?.quote),
            who: text(t?.who),
        })),
        team: list(c.team).map((m) => ({
            name: text(m?.name),
            role: text(m?.role),
        })),
        faq: list(c.faq).map((f) => ({ q: text(f?.q), a: text(f?.a) })),
    };
}
