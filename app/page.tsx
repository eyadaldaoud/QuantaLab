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

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSpotlightSlug, setSelectedSpotlightSlug] = useState<string>("double-slit");
  const [activeModalExp, setActiveModalExp] = useState<ExperimentMetadata | null>(null);

  // Active experiment for dynamic spotlight
  const featuredExperiment = useMemo(
    () => EXPERIMENTS.find((e) => e.slug === selectedSpotlightSlug) || EXPERIMENTS[0],
    [selectedSpotlightSlug]
  );

  const activeExperiments = useMemo(
    () => EXPERIMENTS.filter((e) => e.status === "active"),
    []
  );

  // Filtered experiments for catalog
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
  ];

  return (
    <div className="platform-page-root">
      {/* Top Global Navigation Bar */}
      <Navbar />

      <main className="platform-main-content">
        {/* =========================================================================
            1. HERO SECTION
           ========================================================================= */}
        <section className="platform-hero-section">
          <div className="hero-glow-orb hero-glow-1" aria-hidden="true" />
          <div className="hero-glow-orb hero-glow-2" aria-hidden="true" />

          <div className="hero-container">
            <div className="hero-badge">
              <span className="badge-pulse-dot" />
              <span>VIRTUAL QUANTUM PHYSICS LABORATORY</span>
            </div>

            <h1 className="hero-headline">
              Explore the Quantum Realm <br />
              <span className="hero-gradient-text">Through Interactive 3D Simulations</span>
            </h1>

            <p className="hero-subtitle">
              A public, open-source educational laboratory platform. Manipulate single-photon
              wavepackets in real time, probe wave-particle duality, trigger observer decoherence,
              and investigate fundamental quantum mechanics directly in your browser.
            </p>

            {/* Dynamic Multi-Lab Hero Actions Group */}
            <div className="hero-actions-group">
              <Link
                href="/experiments/double-slit"
                className="btn-hero-primary"
                title="Launch the 3D Double-Slit Experiment apparatus"
              >
                <span className="btn-icon">⚡</span>
                <span>LAUNCH DOUBLE-SLIT BENCH</span>
                <span className="btn-arrow">→</span>
              </Link>

              <Link
                href="/experiments/quantum-eraser"
                className="btn-hero-secondary btn-hero-eraser"
                title="Launch the 3D Quantum Eraser apparatus"
              >
                <span className="btn-icon">🪞</span>
                <span>LAUNCH QUANTUM ERASER</span>
                <span className="btn-arrow">→</span>
              </Link>

              <a
                href="https://github.com/eyadaldaoud/double-slit-experiment"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero-github"
                title="View Source Code & Physics on GitHub"
              >
                <svg
                  className="hero-github-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="18"
                  height="18"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>GitHub Repo</span>
              </a>
            </div>

            {/* Platform Metrics Strip */}
            <div className="hero-metrics-strip">
              <div className="metric-pill">
                <span className="metric-num">3D</span>
                <span className="metric-label">Interactive Optical Benches</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-pill">
                <span className="metric-num">100%</span>
                <span className="metric-label">Analytical Quantum Physics</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-pill">
                <span className="metric-num">Real-Time</span>
                <span className="metric-label">Monte Carlo Sampler</span>
              </div>
              <div className="metric-divider" />
              <div className="metric-pill">
                <span className="metric-num">MIT</span>
                <span className="metric-label">Open Source Foundation</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. DYNAMIC FEATURED EXPERIMENT SPOTLIGHT
           ========================================================================= */}
        {featuredExperiment && (
          <section className="featured-spotlight-section">
            <div className="section-container">
              {/* Dynamic Experiment Switcher Tabs */}
              <div className="spotlight-tabs-bar" role="tablist" aria-label="Select Featured Apparatus">
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
                    >
                      <span className="spotlight-tab-icon">{exp.icon}</span>
                      <span className="spotlight-tab-title">{exp.title}</span>
                      <span
                        className="spotlight-tab-badge"
                        style={{
                          borderColor: exp.accentColor,
                          color: exp.accentColor,
                        }}
                      >
                        LIVE 3D
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="spotlight-card">
                <div className="spotlight-badge-row">
                  <span className="spotlight-badge-live">
                    <span className="live-dot" /> LIVE 3D APPARATUS
                  </span>
                  <span className="spotlight-category-tag">
                    {featuredExperiment.category.toUpperCase()} • {featuredExperiment.difficulty.toUpperCase()}
                  </span>
                </div>

                <div className="spotlight-grid">
                  <div className="spotlight-info">
                    <h2 className="spotlight-title">{featuredExperiment.title}</h2>
                    <p className="spotlight-subtitle">{featuredExperiment.subtitle}</p>
                    <p className="spotlight-desc">{featuredExperiment.summary}</p>

                    {/* Dynamic Highlights List tailored to the selected experiment */}
                    <div className="spotlight-highlights-list">
                      {featuredExperiment.slug === "double-slit" ? (
                        <>
                          <div className="spotlight-hl-item">
                            <span className="hl-icon">🌊</span>
                            <div>
                              <strong>Wave Superposition Mode:</strong> Photons traverse both slits simultaneously as continuous probability wavelets, producing alternating interference fringes.
                            </div>
                          </div>
                          <div className="spotlight-hl-item">
                            <span className="hl-icon">👁️</span>
                            <div>
                              <strong>Physical Observer Collapse:</strong> Engaging slit detectors reveals &ldquo;which-path&rdquo; information, collapsing superposition into two classical particle bands.
                            </div>
                          </div>
                          <div className="spotlight-hl-item">
                            <span className="hl-icon">🎛️</span>
                            <div>
                              <strong>Analytical Distribution &amp; Audio:</strong> Real-time Poisson/Monte Carlo photon arrivals with live histogram and Web Audio synthesis chimes.
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="spotlight-hl-item">
                            <span className="hl-icon">🔀</span>
                            <div>
                              <strong>Which-Path Polarization Tagging:</strong> Orthogonal |H⟩ and |V⟩ polarizers tag slit paths into physical polarization states, destroying wave interference.
                            </div>
                          </div>
                          <div className="spotlight-hl-item">
                            <span className="hl-icon">🪞</span>
                            <div>
                              <strong>Continuous Analyzer Angle θ:</strong> Rotate the diagonal analyzer basis to dynamically vary fringe visibility from V = 0.00 (which-path preserved) to V = 1.00 (erasure).
                            </div>
                          </div>
                          <div className="spotlight-hl-item">
                            <span className="hl-icon">🔬</span>
                            <div>
                              <strong>Sorted Complementary Subsets:</strong> Polarizing beam splitter sorts photons into Channels A and B, producing complementary anti-fringes whose sum is strictly flat.
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="spotlight-cta-row">
                      <Link
                        href={featuredExperiment.route}
                        className="btn-spotlight-launch"
                      >
                        <span>Launch {featuredExperiment.title}</span>
                        <span>→</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => setActiveModalExp(featuredExperiment)}
                        className="btn-spotlight-specs"
                      >
                        View Physics Equations &amp; Math
                      </button>
                    </div>
                  </div>

                  {/* Refined Dynamic SVG Apparatus Optical Bench Drawing */}
                  <div className="spotlight-preview-panel">
                    <ApparatusPreview
                      experiment={featuredExperiment}
                      onOpenSpecs={() => setActiveModalExp(featuredExperiment)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            3. ALL EXPERIMENTS CATALOG SECTION
           ========================================================================= */}
        <section id="experiments" className="catalog-section">
          <div className="section-container">
            <div className="section-header-block">
              <span className="section-kicker">EXPERIMENTS DIRECTORY</span>
              <h2 className="section-heading">Quantum &amp; Modern Physics Catalog</h2>
              <p className="section-subtext">
                Browse our interactive simulations. Launch active 3D experiments
                or explore our extensible architecture for adding new physics modules.
              </p>
            </div>

            {/* Filter Controls Bar */}
            <div className="catalog-filters-bar">
              <div className="filter-group">
                <span className="filter-label">CATEGORY:</span>
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
            </div>

            {/* Experiments Cards Grid */}
            <div className="experiments-grid">
              {filteredExperiments.map((exp) => (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  onSelect={(e) => setActiveModalExp(e)}
                />
              ))}

              {/* Modular Placeholder for Future Experiments */}
              <article className="exp-card card-upcoming">
                <div className="card-top-row">
                  <div className="card-category-cluster">
                    <span className="card-icon">✨</span>
                    <span className="card-category-label">FUTURE ADDITION</span>
                  </div>
                  <div className="card-status-cluster">
                    <span className="status-pill pill-upcoming">
                      <span className="status-dot" />
                      MODULAR ARCHITECTURE
                    </span>
                  </div>
                </div>

                <div className="card-headline">
                  <h3 className="card-title">More Experiments Planned</h3>
                  <p className="card-subtitle">Ready for Future Modules</p>
                </div>

                <p className="card-summary">
                  QuantaLab is architected from the ground up to support multiple physics simulations.
                  When you are ready to build the next experiment, simply register its configuration
                  in the registry and create its 3D route.
                </p>

                <div className="card-formula-preview">
                  <span className="formula-tag">EXTENSIBLE PLATFORM</span>
                  <code className="formula-inline">lib/experiments.ts → app/experiments/[slug]</code>
                </div>

                <div className="card-actions-row">
                  <a href="#docs" className="btn-card-launch upcoming-btn">
                    <span>How to Add Experiments</span>
                    <span>📖</span>
                  </a>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. PLATFORM SCIENTIFIC ENGINE & PILLARS
           ========================================================================= */}
        <section id="about" className="platform-pillars-section">
          <div className="section-container">
            <div className="section-header-block">
              <span className="section-kicker">SCIENTIFIC ACCURACY</span>
              <h2 className="section-heading">How QuantaLab Simulations Work</h2>
              <p className="section-subtext">
                Every simulation is grounded in rigorous mathematical physics, combining
                first-principles wave mechanics with real-time browser rendering.
              </p>
            </div>

            <div className="pillars-grid">
              <div className="pillar-card">
                <div className="pillar-icon-box">📐</div>
                <h3 className="pillar-title">Analytical Physics Engine</h3>
                <p className="pillar-desc">
                  Simulations compute the closed-form physical wave intensity functions,
                  diffraction envelopes (sinc²), and interference fringes (cos²) directly from
                  calibrated wavelengths, aperture dimensions, and distances.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">🎲</div>
                <h3 className="pillar-title">Monte Carlo Stochastic Sampling</h3>
                <p className="pillar-desc">
                  Individual photons are sampled stochastically using inverse-CDF
                  Monte Carlo sampling based on the Born probability density |ψ(x)|², faithfully
                  capturing quantum indeterminacy.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">🎮</div>
                <h3 className="pillar-title">Hardware-Accelerated 3D</h3>
                <p className="pillar-desc">
                  Built on Three.js and WebGL shaders with orbit cameras, instanced mesh phosphor
                  screen rendering, dynamic optical bench mounts, and real-time slow-motion wavepacket
                  visualizers.
                </p>
              </div>

              <div className="pillar-card">
                <div className="pillar-icon-box">🔊</div>
                <h3 className="pillar-title">Web Audio Sonification</h3>
                <p className="pillar-desc">
                  Quantum events trigger dynamic synthesizer chimes via the browser Web Audio API,
                  modulating pitch by photon energy (E = hν) so you can hear quantum detections.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. ARCHITECTURE & EXTENSIBILITY SECTION
           ========================================================================= */}
        <section id="docs" className="platform-extensibility-section">
          <div className="section-container">
            <div className="extensibility-card">
              <div className="extensibility-header">
                <span className="card-kicker">EXTENSIBLE PLATFORM ARCHITECTURE</span>
                <h2 className="extensibility-title">Designed for Expansion &amp; Public Contribution</h2>
                <p className="extensibility-desc">
                  QuantaLab is intentionally designed with a modular architecture so new experiments
                  can be introduced cleanly whenever you are ready.
                </p>
              </div>

              <div className="steps-row">
                <div className="step-card">
                  <div className="step-number">01</div>
                  <h4 className="step-title">Register Metadata</h4>
                  <p className="step-desc">
                    Define the experiment title, category, key formulas, difficulty, and route in{" "}
                    <code className="inline-code">lib/experiments.ts</code>.
                  </p>
                </div>

                <div className="step-card">
                  <div className="step-number">02</div>
                  <h4 className="step-title">Build Simulation Route</h4>
                  <p className="step-desc">
                    Create your 3D or 2D simulation apparatus component inside{" "}
                    <code className="inline-code">app/experiments/[slug]/page.tsx</code> using Three.js.
                  </p>
                </div>

                <div className="step-card">
                  <div className="step-number">03</div>
                  <h4 className="step-title">Connect Physics Model</h4>
                  <p className="step-desc">
                    Implement the mathematical solver function for state evolution or
                    probability density, and hook up live telemetry.
                  </p>
                </div>
              </div>

              <div className="extensibility-cta-box">
                <div className="cta-text">
                  <strong>Ready to add an experiment or learn more?</strong>
                  <span>Check out our step-by-step guide in the project repository.</span>
                </div>
                <Link
                  href="/experiments/double-slit"
                  className="btn-launch-exp"
                >
                  <span>Launch Double-Slit Lab</span>
                  <span>⚡</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Global Platform Footer */}
      <Footer />

      {/* Experiment Details Modal */}
      <ExperimentModal
        experiment={activeModalExp}
        onClose={() => setActiveModalExp(null)}
      />
    </div>
  );
}
