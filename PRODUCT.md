# PRODUCT.md — QuantaLab

## Product
QuantaLab is an open-source, interactive 3D laboratory platform for quantum and modern
physics. Real-time WebGL optical benches let students, educators, and researchers
manipulate single-photon experiments in the browser: the double-slit experiment,
quantum eraser, and (mathematics side) inscribed-square loop theorem.

## Audience and scene
Students and educators exploring quantum mechanics beyond textbook diagrams, plus
curious physics enthusiasts and researchers checking an extensible simulation
architecture. They arrive from GitHub, Reddit/HN physics threads, and course links.
Typical scene: a laptop, evening, a student who wants to *see* wave-particle duality
happen and understand the math under it.

## What must be true on the first surface (landing)
- A first-time visitor understands within seconds: real 3D quantum experiments, live
  in the browser, personally manipulable — not marketing fluff.
- The live experiments (Double-Slit, Quantum Eraser, Inscribed Square) are the hero
  content; launching one is the primary action.
- Open-source (MIT), GitHub-hosted, physically validated math — provenance matters
  to this audience.

## Product truth / constraints
- Brand: QuantaLab ("The Quantum Bench" deployment nickname). No legacy brand
  commitments beyond the name and subject matter.
- Modes: Persuade (landing page) and Operate (experiment lab consoles).
- Tech: Next.js 16 + React 19 + Three.js, custom CSS (single globals.css,
  ~6.5k lines) plus Tailwind v4 import. Page routes: /, /experiments,
  /experiments/{double-slit,quantum-eraser,inscribed-square}.
- User decisions confirmed: full visual replacement of landing + chrome first,
  lab consoles follow; accents drawn from physics (spectral lines, interference
  fringes, laser light); user asked the design to surprise them, not follow a
  template.
