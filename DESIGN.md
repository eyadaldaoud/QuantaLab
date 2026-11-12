# DESIGN.md — QuantaLab visual world

**Bench Elevation** — the product drawn as a technical paper about the experiments it runs.
Navigation and controls are quiet paper-and-ink; the experiments themselves are the color.

## Tokens (globals.css, `--qb-*`)

| Token | Light | Role |
| --- | --- | --- |
| `--qb-paper` | `#f5f4f0` | page surface |
| `--qb-paper-2` | `#edebe4` | recessed surface, track, chips |
| `--qb-ink` | `#101214` | headings, body, primary buttons |
| `--qb-ink-2 / -3` | `#454c52 / #6c737a` | secondary / micro labels (≥4.5:1 on paper) |
| `--qb-rule` | `#b8bec2` | hairlines, frames |
| `--qb-rule-soft` | `#dbddd8` | etched inner rules |
| `--qb-red-ink` | `#cf3b2e` | He-Ne 632.8 nm beam — primary accent, live states |
| `--qb-red` | `#b3301f` | He-Ne fills that meet 4.5:1 as text |
| `--qb-violet` | `#5f3dc4` | 405 nm pump — quantum/superposition data |
| `--qb-green` | `#2e7d46` | 546.1 nm Hg — measurement / verified |

Type: **Archivo** for headings and body (no separate display face), **JetBrains Mono**
for data, labels, plaques, and anything that is a measurement. Micro-caps plaques:
10–11px, letter-spacing 0.06em, uppercase.

## Lab world (labs.css, `--lab-*` over the same tokens)

The labs are the same paper bench, not a separate theme:

- Console chrome (topbar, control cards, analytics cards, modals) is paper:
  `#fbfaf7`/white panels, hairlines, ink text — identical language to the landing.
- The 3D viewport is the one dark plate: `.grand-viewport-section` re-scopes the
  token set to stage values (`--stage-*`), so the WebGL scene, HUD decks, orbit
  hints, and speed pills stay a dark instrument while the page stays paper.
- Per-bench accent: double-slit speaks He-Ne red, the eraser bench violet
  (`.eraser-studio` re-maps `--quantum-cyan → --lab-violet`), the inscribed-square
  lab uses brass `#8a6a2f` for the drawn loop and `--qb-green` for its verdicts.
- Physics colors stay physics-true: wavelength presets (405/488/532/633), lasers,
  phosphor fringes, channel A/B dots. These are data, not decoration.
- No glows, no gradient fills, radius 4px max, hairline borders, one shadow depth
  (`0 2px 8px rgba(16,18,20,0.06)` for cards; the stage carries one deeper drop).

## Signature

The landing hero's inscribed-square-and-circle bench mark, and the dark ink viewport
plate sitting on the paper bench — the "instrument in a paper" idea carried into the
consoles. Data everywhere else stays quiet.

## Bans in force

No gradient text or decorative blurs, no colored border-left accents, no emoji/unicode
icons (preset glyphs are inline 1.5px-stroke SVG geometry), no neon dropout over
content, `prefers-reduced-motion` respected globally (blanket rule in globals.css).
