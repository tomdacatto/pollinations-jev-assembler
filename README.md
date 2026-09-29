# Jev Assembler

Describe a page in a sentence. Jev makes 16 small decisions about it in **one** `POST /alpha/decisions` call, and plain code assembles a real, styled web page from the answers in about two seconds. A text model only writes the words.

**Try it:** https://tomdacatto.github.io/pollinations-jev-assembler/

Runs on [Pollinations](https://pollinations.ai) and is paid with the visitor's own Pollen through [Bring Your Own Pollen](https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md). No backend: the page talks to `gen.pollinations.ai` directly and the key lives in `sessionStorage` for that tab. A page costs about 0.01 Pollen; the Jev call itself is about 0.00005.

## What Jev decides, and what the code does with it

One request carries 16 typed questions ([`decisions.js`](decisions.js)) about the brief:

| Question | Type | What the code does with the answer |
| --- | --- | --- |
| Which palette? (6 named palettes) | choice | sets the colour tokens |
| Which typography? | choice | picks the font stack and weight |
| Which hero layout? | choice | centered, split with image, or full-width banner |
| Main call to action? | choice | button label and wording |
| What kind of page is this? | choice | shown in the inspector |
| How rounded should it feel? | score (4 rungs) | button and card corner radius |
| How much content per screen? | score (4 rungs) | section spacing |
| Must the visitor act soon? | yes/no probability | shows an urgency banner at 50% or more |
| Does it need features, a gallery, testimonials, pricing, an FAQ, a team, a contact form, a newsletter? | 8 yes/no probabilities | a section is included when Jev is at least 75% sure, between 2 and 5 sections, in a fixed page order |

The answers come back as probabilities, so the code can set its own thresholds. [`assemble.js`](assemble.js) turns the resulting settings into a complete HTML document with inline CSS (no framework, no AI), so it is instant and deterministic.

The page is complete the moment Jev has decided: copy that has not arrived yet shows as a shimmering placeholder, then the text model's copy fades in (one call, all sections written up front).

## Overrule Jev

The inspector shows every decision with its probabilities. Click any alternative and the page re-assembles in a few milliseconds with **no request at all**, because the code, not an AI, acts on the answers. Sections toggle the same way. "Download HTML" saves the page you ended up with.

## AI calls

| Job | Endpoint / model |
| --- | --- |
| Decisions (16 questions, one call) | `POST /alpha/decisions`, `typesafe/jev-1.13` (Jev bills input tokens only) |
| Copy (JSON) | `POST /v1/chat/completions`, `openai/gpt-5.4-nano` |
| Optional hero image | `GET /image/{prompt}`, `black-forest-labs/flux.1-schnell` |

## Run it

Serve the folder with any static server. Sign-in needs the deployed URL (the App Key's redirect URI is `https://tomdacatto.github.io/pollinations-jev-assembler/`); to run your own copy, create an App Key at [enter.pollinations.ai/keys](https://enter.pollinations.ai/keys), register your URL as its redirect URI and put the key in `config.js`.

```bash
node --test assembler.test.js
```

## Files

- `decisions.js`: the 16 questions, `interpret` (answers to settings) and `resolve` (settings plus user overrides)
- `assemble.js`: settings and copy to a finished HTML page
- `copy.js`: the copy prompt and a cleaner for messy model output
- `assembler.test.js`: tests for all of the above
- `pollen.js`: Bring Your Own Pollen sign-in (OAuth code + PKCE) and the Pollinations client
- `app.js`, `index.html`, `style.css`: the UI

MIT licensed.
