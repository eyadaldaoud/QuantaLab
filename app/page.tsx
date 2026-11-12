"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ExperimentCard from "./components/ExperimentCard";
import ExperimentModal from "./components/ExperimentModal";
import ApparatusPreview from "./components/ApparatusPreview";
import {
  EXPERIMENTS,
  ExperimentMetadata,
} from "@/lib/experiments";

/** Elevation drawing of the double-slit bench. Numbers are the real parameters. */
function BenchElevation() {
  return (
    <svg
      className="bench-elevation-svg"
      viewBox="0 0 720 560"
      role="img"
      aria-label="Elevation drawing of the double-slit optical bench: laser, slit plate, screen, and the interference intensity curve"
    >
      {/* Upper left: intensity curve inset */}
      <g>
        <rect x="56" y="48" width="248" height="152" fill="none" stroke="#b8bec2" strokeWidth="1" />
        {/* axes */}
        <line x1="82" y1="172" x2="282" y2="172" stroke="#b8bec2" strokeWidth="1" />
        <line x1="82" y1="64" x2="82" y2="172" stroke="#b8bec2" strokeWidth="1" />
        {/* sinc² · cos² path (lobes) */}
        <path
          d="M82 164
             C 112 164, 128 72, 180 72
             C 232 72, 246 164, 282 166
             M112 162 C 128 162, 136 108, 156 108 M156 108 C 176 108, 184 163, 200 163
             M180 166 C 194 166, 204 120, 220 120 M220 120 C 234 120, 244 164, 256 163"
          fill="none"
          stroke="#101214"
          strokeWidth="1.75"
        />
        <text x="88" y="60" fill="#6c737a" fontSize="9" fontFamily="var(--qb-mono)">I(θ)</text>
        <text x="272" y="184" fill="#6c737a" fontSize="9" fontFamily="var(--qb-mono)">θ</text>
        <text x="88" y="192" fill="#6c737a" fontSize="8.5" fontFamily="var(--qb-mono)">
          I(θ) = I₀ · s²(β) · cos²(α)
        </text>
      </g>

      {/* Dimension line: L */}
      <line x1="330" y1="512" x2="560" y2="512" stroke="#6c737a" strokeWidth="1" />
      <line x1="330" y1="506" x2="330" y2="518" stroke="#6c737a" strokeWidth="1" />
      <line x1="560" y1="506" x2="560" y2="518" stroke="#6c737a" strokeWidth="1" />
      <text x="428" y="530" fill="#6c737a" fontSize="9.5" fontFamily="var(--qb-mono)">L = 1.00 m</text>

      {/* 1. Laser */}
      <g>
        <rect x="66" y="380" width="74" height="52" fill="none" stroke="#101214" strokeWidth="2" />
        <line x1="80" y1="388" x2="80" y2="424" stroke="#101214" strokeWidth="2" />
        <line x1="92" y1="388" x2="92" y2="424" stroke="#101214" strokeWidth="2" />
        <line x1="104" y1="388" x2="104" y2="424" stroke="#101214" strokeWidth="2" />
        <rect x="138" y="398" width="10" height="16" fill="#cf3b2e" />
        <text x="66" y="450" fill="#101214" fontSize="10" fontFamily="var(--qb-mono)">1 · He-Ne laser · 632.8 nm</text>
      </g>

      {/* Beam, attenuated to the single-photon regime */}
      <line x1="148" y1="406" x2="330" y2="406" stroke="#cf3b2e" strokeWidth="2.5" />

      {/* 2. Slit plate */}
      <g>
        <rect x="330" y="256" width="10" height="214" fill="#101214" />
        <rect x="330" y="384" width="10" height="14" fill="#f8f7f4" />
        <rect x="330" y="416" width="10" height="14" fill="#f8f7f4" />
        <text x="238" y="250" fill="#101214" fontSize="10" fontFamily="var(--qb-mono)">2 · slit plate · a, d</text>
        <text x="348" y="394" fill="#6c737a" fontSize="9.5" fontFamily="var(--qb-mono)">s₁</text>
        <text x="348" y="426" fill="#6c737a" fontSize="9.5" fontFamily="var(--qb-mono)">s₂</text>
      </g>

      {/* Huygens wavelets from the two slits */}
      <g stroke="#cf3b2e" fill="none" strokeWidth="1.2">
        <path d="M340 388 A 30 30 0 0 1 362 370" strokeOpacity="0.75" />
        <path d="M340 388 A 62 62 0 0 1 386 348" strokeOpacity="0.6" />
        <path d="M340 388 A 100 100 0 0 1 420 330" strokeOpacity="0.45" />
        <path d="M340 388 A 144 144 0 0 1 462 316" strokeOpacity="0.3" />
        <path d="M340 424 A 30 30 0 0 0 362 442" strokeOpacity="0.75" />
        <path d="M340 424 A 62 62 0 0 0 386 464" strokeOpacity="0.6" />
        <path d="M340 424 A 100 100 0 0 0 420 482" strokeOpacity="0.45" />
        <path d="M340 424 A 144 144 0 0 0 462 496" strokeOpacity="0.3" />
      </g>

      {/* 3. Screen with fringes */}
      <g>
        <rect x="560" y="236" width="16" height="234" fill="#101214" />
        <g fill="#cf3b2e">
          <rect x="576" y="300" width="6" height="60" opacity="0.95" />
          <rect x="576" y="270" width="4" height="20" opacity="0.5" />
          <rect x="576" y="370" width="4" height="20" opacity="0.5" />
        </g>
        <text x="590" y="228" fill="#101214" fontSize="10" fontFamily="var(--qb-mono)">3 · screen</text>
      </g>

      {/* Optical rail */}
      <line x1="40" y1="486" x2="680" y2="486" stroke="#101214" strokeWidth="3" />
      <line x1="40" y1="492" x2="680" y2="492" stroke="#b8bec2" strokeWidth="1" />
      <g stroke="#b8bec2" strokeWidth="1">
        <line x1="40" y1="492" x2="40" y2="499" />
        <line x1="190" y1="492" x2="190" y2="499" />
        <line x1="330" y1="492" x2="330" y2="499" />
        <line x1="445" y1="492" x2="445" y2="499" />
        <line x1="560" y1="492" x2="560" y2="499" />
        <line x1="680" y1="492" x2="680" y2="499" />
      </g>
      <text x="612" y="530" fill="#6c737a" fontSize="9.5" fontFamily="var(--qb-mono)">z, bench axis</text>
    </svg>
  );
}

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSpotlightSlug, setSelectedSpotlightSlug] = useState<string>("double-slit");
  const [activeModalExp, setActiveModalExp] = useState<ExperimentMetadata | null>(null);

  const featuredExperiment = useMemo(
    () => EXPERIMENTS.find((e) => e.slug === selectedSpotlightSlug) || EXPERIMENTS[0],
    [selectedSpotlightSlug]
  );

  const activeExperiments = useMemo(
    () => EXPERIMENTS.filter((e) => e.status === "active"),
    []
  );

  const filteredExperiments = useMemo(() => {
    return EXPERIMENTS.filter((exp) => {
      const matchCategory =
        selectedCategory === "All" || exp.category === selectedCategory;
      return matchCategory;
    });
  }, [selectedCategory]);

  const categories: string[] = [
    "All",
    "Quantum Mechanics",
    "Wave Optics",
    "Mathematical Physics",
  ];

  return (
    <div className="platform-page-root">
      <Navbar />

      <main className="platform-main-content">
        {/* =====================================================================
            1. HERO — the bench elevation
           ===================================================================== */}
        <section className="bench-hero">
          <div className="bench-hero-inner">
            <div className="bench-hero-figure">
              <div className="plate-cap" style={{ marginBottom: 18 }}>
                <span><b>Plate I</b> — the double-slit bench</span>
                <span>fig. 1 — drawn to scale</span>
              </div>
              <BenchElevation />
            </div>

            <div className="bench-hero-info">
              <div className="hero-plate-key">
                <span>EXPERIMENT 01</span>
                <span>3D · LIVE</span>
              </div>

              <h1>
                Run the double-slit photon by photon.{" "}
                <span className="hero-wavelength">λ = 632.8 nm</span>
              </h1>

              <p className="hero-lede">
                QuantaLab turns the browser into a quantum optics bench. Fire single
                photons and count them onto the screen, or let the wave through and
                watch fringes build. Switch on the which-path detector and the
                interference pattern stops being one.
              </p>

              <div className="experiment-register" style={{ marginTop: 30 }}>
                {EXPERIMENTS.map((exp, i) => (
                  <Link
                    key={exp.id}
                    href={exp.status === "active" ? exp.route : "#experiments"}
                    className={`register-item ${exp.slug === "double-slit" ? "is-current" : ""}`}
                    style={{ "--lam": exp.accentColor } as React.CSSProperties}
                    aria-label={`Open ${exp.title}`}
                  >
                    <span className="register-no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="register-name">{exp.title}</span>
                    <span className="register-lam" />
                  </Link>
                ))}
              </div>

              <div className="hero-cta-row">
                <Link
                  href="/experiments/double-slit"
                  className="btn-launch"
                  title="Launch the 3D double-slit bench"
                >
                  <span className="launch-tick" />
                  <span>Launch the bench</span>
                </Link>
                <a href="#about" className="btn-secondary-link">
                  How the physics works
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Provenance line */}
        <div className="provenance-line" aria-hidden="false">
          <div className="provenance-inner">
            <span className="prov-datum">Intensities — <b>analytical s²·cos²</b></span>
            <span className="prov-datum">Photons — <b>Monte Carlo, Born |ψ|²</b></span>
            <span className="prov-datum">{activeExperiments.length} benches live</span>
            <span className="prov-datum">MIT licensed · source on GitHub</span>
          </div>
        </div>

        {/* =====================================================================
            2. FEATURED BENCH IN OPERATION
           ===================================================================== */}
        {featuredExperiment && (
          <section className="spotlight-section">
            <div className="section-container">
              <div className="spotlight-heading">
                <h2>Featured bench in operation</h2>
                <div className="spotlight-tabs-bar" role="tablist" aria-label="Select featured apparatus">
                  {activeExperiments.map((exp) => {
                    const isSelected = selectedSpotlightSlug === exp.slug;
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        className={`spotlight-tab-btn ${isSelected ? "is-selected" : ""}`}
                        onClick={() => setSelectedSpotlightSlug(exp.slug)}
                        style={{ "--lam": exp.accentColor } as React.CSSProperties}
                      >
                        <span className="spotlight-tab-lam" />
                        <span>{exp.title.replace(/^The /, "")}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="spotlight-card">
                <div className="spotlight-info">
                  <div className="spotlight-badge-row">
                    <span className="spotlight-badge-live">
                      <span className="live-dot" /> LIVE 3D BENCH
                    </span>
                    <span>
                      {featuredExperiment.category.toUpperCase()} ·{" "}
                      {featuredExperiment.difficulty.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="spotlight-title">{featuredExperiment.title}</h3>
                  <p className="spotlight-subtitle">{featuredExperiment.subtitle}</p>
                  <p className="spotlight-desc">{featuredExperiment.summary}</p>

                  <div className="spotlight-highlights-list">
                    {featuredExperiment.features.slice(0, 3).map((feat, i) => (
                      <div key={i} className="spotlight-hl-item">
                        <span className="hl-key">{String(i + 1).padStart(2, "0")}</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="spotlight-cta-row">
                    <Link href={featuredExperiment.route} className="btn-launch">
                      <span className="launch-tick" />
                      <span>Launch {featuredExperiment.title.replace(/^The /, "")}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setActiveModalExp(featuredExperiment)}
                      className="btn-secondary-link"
                    >
                      Equations &amp; math
                    </button>
                  </div>
                </div>

                <div className="spotlight-preview-panel">
                  <ApparatusPreview
                    experiment={featuredExperiment}
                    onOpenSpecs={() => setActiveModalExp(featuredExperiment)}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================================
            3. EXPERIMENTS CATALOG
           ===================================================================== */}
        <section id="experiments" className="catalog-section">
          <div className="section-container">
            <div className="catalog-header-row">
              <h2>Experiments catalog</h2>
              <span className="section-note">
                PLATES 01–{String(EXPERIMENTS.length).padStart(2, "0")} · EXTENSIBLE REGISTRY
              </span>
            </div>

            <div className="catalog-filters-bar">
              <span className="filter-label">Category</span>
              <div className="filter-pills" role="radiogroup" aria-label="Filter by physics category">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`filter-pill ${selectedCategory === cat ? "active" : ""}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="experiments-grid">
              {filteredExperiments.map((exp, i) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  plateNo={String(i + 1).padStart(2, "0")}
                  onSelect={(e) => setActiveModalExp(e)}
                />
              ))}

              {/* Future experiments register */}
              <article className="exp-card card-upcoming">
                <div className="card-top-row">
                  <span className="card-plate-no">
                    PLATE {String(EXPERIMENTS.length + 1).padStart(2, "0")}
                  </span>
                  <div className="card-status-cluster">
                    <span className="status-pill pill-upcoming">ROADMAP</span>
                  </div>
                </div>

                <h3 className="card-title">More benches planned</h3>
                <p className="card-subtitle">OPEN REGISTRY ARCHITECTURE</p>

                <p className="card-summary">
                  QuantaLab is built as a registry of independent benches. New
                  experiments register their metadata and physics, and appear here
                  with a route of their own.
                </p>

                <div className="card-formula-preview">
                  <span className="formula-tag">Registry</span>
                  <code className="formula-inline">lib/experiments.ts → app/experiments/[slug]</code>
                </div>

                <div className="card-actions-row">
                  <a href="#docs" className="btn-card-launch" style={{ "--lam": "transparent" } as React.CSSProperties}>
                    <span>Add an experiment</span>
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =====================================================================
            4. THE LEDGER — scientific method of the platform
           ===================================================================== */}
        <section id="about" className="pillars-section">
          <div className="section-container">
            <div className="ledger-header">
              <h2>How the simulations work</h2>
              <span className="ledger-count">AS READ ON THE BENCH</span>
            </div>

            <div className="pillars-ledger">
              <div className="pillar-row">
                <span className="pillar-ref">§ 1</span>
                <h3 className="pillar-title">Analytical physics engine</h3>
                <p className="pillar-desc">
                  Intensities are computed in closed form — diffraction envelopes
                  (sinc²) and interference factors (cos²) evaluated directly from the
                  calibrated wavelength, aperture dimensions, and propagation distance.
                  No approximations enter through rendering.
                </p>
              </div>

              <div className="pillar-row">
                <span className="pillar-ref">§ 2</span>
                <h3 className="pillar-title">Monte Carlo stochastic sampling</h3>
                <p className="pillar-desc">
                  Individual photons are sampled by rejection against the Born
                  probability density |ψ(x)|², so detections land where the physics
                  says they must, one event at a time.
                </p>
              </div>

              <div className="pillar-row">
                <span className="pillar-ref">§ 3</span>
                <h3 className="pillar-title">Hardware-accelerated 3D</h3>
                <p className="pillar-desc">
                  Benches render in real time on Three.js and WebGL — orbit cameras,
                  instanced phosphor-screen meshes, optical carriers and thumbscrews
                  modeled as actual hardware.
                </p>
              </div>

              <div className="pillar-row">
                <span className="pillar-ref">§ 4</span>
                <h3 className="pillar-title">Sonic detection</h3>
                <p className="pillar-desc">
                  Detections are audible: a Web Audio synthesizer marks each photon
                  arrival, pitched by photon energy E = hν, so the histogram grows a
                  soundtrack.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            5. EXTENSIBILITY
           ===================================================================== */}
        <section id="docs" className="extensibility-section">
          <div className="section-container">
            <div className="extensibility-header">
              <h2>Built for new benches</h2>
              <p>
                The platform is deliberately modular: a new experiment is metadata, a
                route, and a physics solver. The catalog above is the registry read out.
              </p>
            </div>

            <div className="steps-row">
              <div className="step-card">
                <div className="step-number">01 — REGISTER</div>
                <h4 className="step-title">Register metadata</h4>
                <p className="step-desc">
                  Title, category, key formulas, difficulty, and route — declared in{" "}
                  <code className="inline-code">lib/experiments.ts</code>.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">02 — BUILD</div>
                <h4 className="step-title">Build the apparatus route</h4>
                <p className="step-desc">
                  Create the 3D or 2D bench component under{" "}
                  <code className="inline-code">app/experiments/[slug]</code> with Three.js.
                </p>
              </div>

              <div className="step-card">
                <div className="step-number">03 — SOLVE</div>
                <h4 className="step-title">Connect the physics model</h4>
                <p className="step-desc">
                  Implement the solver for state evolution or probability density and
                  wire up the live telemetry.
                </p>
              </div>
            </div>

            <div className="extensibility-cta-box">
              <div className="cta-text">
                <strong>Ready to add an experiment?</strong>
                <span>The step-by-step developer guide lives in the repository.</span>
              </div>
              <a
                href="https://github.com/eyadaldaoud/QuantaLab/blob/master/docs/ADDING_AN_EXPERIMENT.md"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-launch-exp"
                title="View developer guide on GitHub"
              >
                <span>Developer guide</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <ExperimentModal
        experiment={activeModalExp}
        onClose={() => setActiveModalExp(null)}
      />
    </div>
  );
}
