import React from "react";
import Link from "next/link";
import { EXPERIMENTS } from "@/lib/experiments";

export default function Footer() {
  return (
    <footer className="platform-footer">
      <div className="platform-footer-container">
        <div className="footer-top-grid">
          {/* Col 1: Platform Brand & Mission */}
          <div className="footer-col brand-col">
            <div className="footer-brand">
              <span className="footer-brand-icon">⚛</span>
              <span className="footer-brand-title">QUANTALAB</span>
            </div>
            <p className="footer-description">
              An open-source, interactive 3D laboratory platform designed for students, researchers,
              and quantum physics enthusiasts to visualize and manipulate quantum mechanical
              phenomena in the browser.
            </p>
            <div className="footer-tech-badges">
              <span className="tech-badge">Next.js 16</span>
              <span className="tech-badge">React 19</span>
              <span className="tech-badge">Three.js</span>
              <span className="tech-badge">TypeScript</span>
              <span className="tech-badge">Web Audio</span>
            </div>
          </div>

          {/* Col 2: Active & Planned Experiments */}
          <div className="footer-col">
            <h4 className="footer-heading">EXPERIMENTS</h4>
            <ul className="footer-links-list">
              {EXPERIMENTS.map((exp) => (
                <li key={exp.id}>
                  {exp.status === "active" ? (
                    <Link href={exp.route} className="footer-link active-link">
                      <span className="bullet-active">●</span> {exp.title}
                    </Link>
                  ) : (
                    <span className="footer-link planned-link">
                      <span className="bullet-planned">○</span> {exp.title}
                      <span className="footer-tag-soon">Soon</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Educational Concepts */}
          <div className="footer-col">
            <h4 className="footer-heading">CORE PRINCIPLES</h4>
            <ul className="footer-links-list">
              <li className="footer-text-item">Wave-Particle Duality (de Broglie)</li>
              <li className="footer-text-item">Quantum Superposition &amp; Wavefunctions</li>
              <li className="footer-text-item">Observer Effect &amp; State Collapse</li>
              <li className="footer-text-item">Heisenberg Uncertainty Principle</li>
              <li className="footer-text-item">Single-Photon Wavepacket Dynamics</li>
              <li className="footer-text-item">Diffraction &amp; Interference Envelopes</li>
            </ul>
          </div>

          {/* Col 4: Open Source & Community */}
          <div className="footer-col">
            <h4 className="footer-heading">OPEN SOURCE &amp; CODE</h4>
            <p className="footer-subtext">
              QuantaLab is fully open source. Inspect the physics equations, WebGL shaders,
              and contribute new quantum experiments.
            </p>
            <div className="footer-cta-box">
              <a
                href="https://github.com/eyadaldaoud/double-slit-experiment"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-github-cta"
              >
                <svg
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
                <span>Star on GitHub →</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="footer-bottom-bar">
          <div className="footer-copy">
            © 2026 QuantaLab — Open Source Quantum Physics Simulator. Released under the MIT License.
          </div>
          <div className="footer-disclaimer">
            Simulations calculate real-time analytical quantum mechanics and Monte Carlo stochastic probabilities.
          </div>
        </div>
      </div>
    </footer>
  );
}
