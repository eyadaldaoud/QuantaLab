"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExperimentMetadata } from "@/lib/experiments";

interface ApparatusPreviewProps {
  experiment: ExperimentMetadata;
  onOpenSpecs: () => void;
}

export default function ApparatusPreview({
  experiment,
  onOpenSpecs,
}: ApparatusPreviewProps) {
  // State for Double-Slit Interactive Simulation Preview
  const [doubleSlitObserver, setDoubleSlitObserver] = useState(false);

  // State for Quantum Eraser Interactive Simulation Preview
  const [eraserAngle, setEraserAngle] = useState<number>(45); // 0, 45, or 90

  const isDoubleSlit = experiment.slug === "double-slit";

  // Quantum Eraser calculated values
  const visibility = Math.abs(Math.sin((2 * eraserAngle * Math.PI) / 180));
  const isErased = eraserAngle === 45;

  return (
    <div className="preview-apparatus-frame">
      {/* Top HUD Control Bar */}
      <div className="preview-hud-top">
        <div className="preview-hud-title-group">
          <span className="hud-label">INTERACTIVE BENCH SCHEMATIC</span>
          <span className="hud-sublabel">
            {isDoubleSlit ? "DUAL-SLIT WAVE INTERFEROMETER" : "WHICH-PATH QUANTUM ERASER"}
          </span>
        </div>

        {/* Interactive Mode / Parameter Selector inside the preview HUD */}
        {isDoubleSlit ? (
          <div className="preview-inline-toggle" role="group" aria-label="Double-Slit Mode">
            <button
              type="button"
              className={`bench-toggle-pill ${!doubleSlitObserver ? "active" : ""}`}
              onClick={() => setDoubleSlitObserver(false)}
            >
              <span className="pill-dot dot-wave" />
              <span>Wave Superposition</span>
            </button>
            <button
              type="button"
              className={`bench-toggle-pill ${doubleSlitObserver ? "active observer-active" : ""}`}
              onClick={() => setDoubleSlitObserver(true)}
            >
              <span className="pill-dot dot-observer" />
              <span>Observer Collapse</span>
            </button>
          </div>
        ) : (
          <div className="preview-inline-toggle" role="group" aria-label="Quantum Eraser Angle">
            <span className="angle-label">θ =</span>
            {[0, 45, 90].map((deg) => (
              <button
                key={deg}
                type="button"
                className={`bench-toggle-pill ${eraserAngle === deg ? "active eraser-active" : ""}`}
                onClick={() => setEraserAngle(deg)}
              >
                <span>{deg}°</span>
                {deg === 45 && <span className="mini-erased-tag">ERASED</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main High-Fidelity SVG Vector Optical Apparatus Illustration */}
      <div className="preview-svg-canvas-container">
        {isDoubleSlit ? (
          /* =========================================================================
             DOUBLE-SLIT APPARATUS SVG (INTERACTIVE)
             ========================================================================= */
          <svg
            className="apparatus-vector-svg"
            viewBox="0 0 640 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Laser Beam Glow */}
              <linearGradient id="laserBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00ff87" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#00ff87" stopOpacity="1" />
              </linearGradient>

              {/* Wave Interferences Glow */}
              <radialGradient id="waveFrontGrad1" cx="0%" cy="50%" r="100%">
                <stop offset="0%" stopColor="#38e1ff" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#38e1ff" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#38e1ff" stopOpacity="0" />
              </radialGradient>

              {/* Detector Phosphor Screen Glow */}
              <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0a2133" />
                <stop offset="50%" stopColor="#123a59" />
                <stop offset="100%" stopColor="#0a2133" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Optical Rail Baseline */}
            <line x1="20" y1="195" x2="620" y2="195" stroke="#16293d" strokeWidth="3" strokeDasharray="6 4" />
            <text x="25" y="210" fill="#4d6c8b" fontSize="9" fontFamily="monospace">OPTICAL AXIS // Z-BENCH</text>

            {/* 1. LASER EMITTER APPARATUS */}
            <g transform="translate(30, 80)">
              {/* Laser Chassis */}
              <rect x="0" y="0" width="70" height="40" rx="6" fill="#0d1e2e" stroke="#1f4468" strokeWidth="2" />
              {/* Laser Heat Sink Ribs */}
              <line x1="15" y1="8" x2="15" y2="32" stroke="#1b3955" strokeWidth="2" />
              <line x1="25" y1="8" x2="25" y2="32" stroke="#1b3955" strokeWidth="2" />
              <line x1="35" y1="8" x2="35" y2="32" stroke="#1b3955" strokeWidth="2" />
              {/* Laser Aperture */}
              <rect x="68" y="12" width="8" height="16" rx="2" fill="#00ff87" filter="url(#neonGlow)" />
              <text x="6" y="24" fill="#a4c2db" fontSize="9" fontFamily="monospace" fontWeight="bold">DPSS</text>
              <text x="6" y="52" fill="#4d6c8b" fontSize="8" fontFamily="monospace">532nm LASER</text>
            </g>

            {/* Collimated Laser Beam */}
            <path
              d="M106 100 L210 100"
              stroke="#00ff87"
              strokeWidth="4"
              filter="url(#neonGlow)"
              className="beam-pulse-anim"
            />

            {/* 2. DUAL-SLIT APERTURE STAGE */}
            <g transform="translate(210, 30)">
              {/* Slit Barrier */}
              <rect x="0" y="0" width="12" height="140" rx="3" fill="#0e2338" stroke="#38e1ff" strokeWidth="1.5" />
              {/* Slit A */}
              <rect x="0" y="52" width="12" height="8" fill="#00ff87" filter="url(#neonGlow)" />
              {/* Slit B */}
              <rect x="0" y="80" width="12" height="8" fill="#00ff87" filter="url(#neonGlow)" />
              <text x="-6" y="-8" fill="#38e1ff" fontSize="9" fontFamily="monospace" fontWeight="bold">DUAL SLITS (d=0.12mm)</text>
              <text x="18" y="58" fill="#a4c2db" fontSize="8" fontFamily="monospace">s₁</text>
              <text x="18" y="86" fill="#a4c2db" fontSize="8" fontFamily="monospace">s₂</text>

              {/* Observer Detectors (Active or Idle) */}
              {doubleSlitObserver ? (
                <g transform="translate(-10, 44)">
                  <circle cx="6" cy="12" r="7" fill="#ff334b" filter="url(#neonGlow)" />
                  <circle cx="6" cy="40" r="7" fill="#ff334b" filter="url(#neonGlow)" />
                  <text x="-32" y="15" fill="#ff6b7d" fontSize="8" fontFamily="monospace" fontWeight="bold">DET A</text>
                  <text x="-32" y="43" fill="#ff6b7d" fontSize="8" fontFamily="monospace" fontWeight="bold">DET B</text>
                </g>
              ) : null}
            </g>

            {/* 3. PROPAGATION FIELD: WAVEFRONTS OR BALLISTIC PARTICLES */}
            {!doubleSlitObserver ? (
              /* Wave Superposition Mode: Huygens Expanding Wave Arcs */
              <g className="wave-superposition-group">
                {/* Slit 1 wavefronts */}
                <path d="M225 86 A 40 40 0 0 1 255 60" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.8" />
                <path d="M225 86 A 70 70 0 0 1 280 40" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.7" />
                <path d="M225 86 A 110 110 0 0 1 320 20" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.6" />
                <path d="M225 86 A 160 160 0 0 1 370 0" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.5" />

                {/* Slit 2 wavefronts */}
                <path d="M225 114 A 40 40 0 0 0 255 140" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.8" />
                <path d="M225 114 A 70 70 0 0 0 280 160" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.7" />
                <path d="M225 114 A 110 110 0 0 0 320 180" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.6" />
                <path d="M225 114 A 160 160 0 0 0 370 200" stroke="#38e1ff" strokeWidth="1.5" strokeOpacity="0.5" />

                {/* Interference overlap beam lines */}
                <line x1="225" y1="86" x2="490" y2="40" stroke="#38e1ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <line x1="225" y1="114" x2="490" y2="40" stroke="#38e1ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <line x1="225" y1="86" x2="490" y2="100" stroke="#00ff87" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
                <line x1="225" y1="114" x2="490" y2="100" stroke="#00ff87" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.8" />
                <line x1="225" y1="86" x2="490" y2="160" stroke="#38e1ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
                <line x1="225" y1="114" x2="490" y2="160" stroke="#38e1ff" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              </g>
            ) : (
              /* Observer Mode: Decoupled Ballistic Particle Bands */
              <g className="particle-collapse-group">
                {/* Slit 1 beam */}
                <line x1="225" y1="86" x2="490" y2="76" stroke="#ffaa3b" strokeWidth="4" strokeDasharray="8 6" filter="url(#neonGlow)" />
                {/* Slit 2 beam */}
                <line x1="225" y1="114" x2="490" y2="124" stroke="#ffaa3b" strokeWidth="4" strokeDasharray="8 6" filter="url(#neonGlow)" />
                <text x="270" y="70" fill="#ffaa3b" fontSize="8" fontFamily="monospace">CLASSICAL PATH 1</text>
                <text x="270" y="140" fill="#ffaa3b" fontSize="8" fontFamily="monospace">CLASSICAL PATH 2</text>
              </g>
            )}

            {/* 4. PHOSPHOR DETECTOR SCREEN */}
            <g transform="translate(490, 20)">
              {/* Screen Base & Frame */}
              <rect x="0" y="0" width="22" height="160" rx="4" fill="url(#screenGrad)" stroke="#1f4468" strokeWidth="1.5" />
              <text x="-4" y="-8" fill="#a4c2db" fontSize="9" fontFamily="monospace" fontWeight="bold">DETECTOR</text>

              {/* Fringes or Particle Bands on Screen */}
              {!doubleSlitObserver ? (
                /* Alternating Interference Fringes */
                <g transform="translate(2, 6)">
                  <rect x="0" y="12" width="18" height="6" fill="#00ff87" opacity="0.3" />
                  <rect x="0" y="28" width="18" height="10" fill="#00ff87" opacity="0.75" />
                  <rect x="0" y="46" width="18" height="6" fill="#00ff87" opacity="0.35" />
                  <rect x="0" y="60" width="18" height="24" fill="#00ff87" filter="url(#neonGlow)" />
                  <rect x="0" y="92" width="18" height="6" fill="#00ff87" opacity="0.35" />
                  <rect x="0" y="108" width="18" height="10" fill="#00ff87" opacity="0.75" />
                  <rect x="0" y="128" width="18" height="6" fill="#00ff87" opacity="0.3" />
                </g>
              ) : (
                /* Two Classical Particle Bands (No Interference) */
                <g transform="translate(2, 10)">
                  <rect x="0" y="42" width="18" height="20" fill="#ffaa3b" filter="url(#neonGlow)" />
                  <rect x="0" y="80" width="18" height="20" fill="#ffaa3b" filter="url(#neonGlow)" />
                </g>
              )}
            </g>

            {/* 5. INTENSITY DISTRIBUTION CURVE OVERLAY (GRAPH) */}
            <g transform="translate(530, 20)">
              <rect x="0" y="0" width="85" height="160" rx="4" fill="#05101c" stroke="#162e47" strokeWidth="1" />
              <text x="8" y="16" fill="#546e86" fontSize="8" fontFamily="monospace">I(y) DENSITY</text>

              {!doubleSlitObserver ? (
                /* Multi-fringe interference intensity curve */
                <path
                  d="M5 80 Q25 80 50 20 Q70 80 5 80 M5 80 Q18 80 35 48 Q55 80 5 80 M5 80 Q18 80 35 112 Q55 80 5 80"
                  fill="none"
                  stroke="#00ff87"
                  strokeWidth="2"
                  filter="url(#neonGlow)"
                  transform="translate(10, 0)"
                />
              ) : (
                /* Two gaussian peaks curve */
                <path
                  d="M5 20 Q35 20 40 54 Q45 20 5 20 M5 80 Q40 80 40 106 Q40 140 5 140"
                  fill="none"
                  stroke="#ffaa3b"
                  strokeWidth="2"
                  filter="url(#neonGlow)"
                  transform="translate(10, 0)"
                />
              )}
            </g>
          </svg>
        ) : (
          /* =========================================================================
             QUANTUM ERASER APPARATUS SVG (INTERACTIVE)
             ========================================================================= */
          <svg
            className="apparatus-vector-svg"
            viewBox="0 0 640 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <filter id="eraserGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Optical Rail Baseline */}
            <line x1="20" y1="195" x2="620" y2="195" stroke="#16293d" strokeWidth="3" strokeDasharray="6 4" />
            <text x="25" y="210" fill="#4d6c8b" fontSize="9" fontFamily="monospace">POLARIZATION BENCH // STAGE-3</text>

            {/* 1. LASER EMITTER */}
            <g transform="translate(25, 78)">
              <rect x="0" y="0" width="65" height="44" rx="6" fill="#0d1e2e" stroke="#1f4468" strokeWidth="2" />
              <rect x="63" y="14" width="8" height="16" rx="2" fill="#a855f7" filter="url(#eraserGlow)" />
              <text x="6" y="24" fill="#d8b4fe" fontSize="9" fontFamily="monospace" fontWeight="bold">He-Ne</text>
              <text x="6" y="36" fill="#7e22ce" fontSize="7" fontFamily="monospace">633nm</text>
              <text x="4" y="56" fill="#4d6c8b" fontSize="8" fontFamily="monospace">UNPOLARIZED</text>
            </g>

            {/* Laser Beam to Slits */}
            <line x1="96" y1="100" x2="160" y2="100" stroke="#a855f7" strokeWidth="4" filter="url(#eraserGlow)" />

            {/* 2. DUAL SLITS WITH ORTHOGONAL POLARIZERS (H & V) */}
            <g transform="translate(160, 35)">
              <rect x="0" y="0" width="14" height="130" rx="3" fill="#0e2338" stroke="#a855f7" strokeWidth="1.5" />
              {/* Upper Slit: Horizontal Pol |H> */}
              <rect x="0" y="32" width="14" height="18" fill="#38e1ff" filter="url(#eraserGlow)" />
              <text x="-4" y="-8" fill="#38e1ff" fontSize="9" fontFamily="monospace" fontWeight="bold">H/V TAGGER</text>
              <text x="18" y="44" fill="#38e1ff" fontSize="8" fontFamily="monospace" fontWeight="bold">|H⟩ (0°)</text>

              {/* Lower Slit: Vertical Pol |V> */}
              <rect x="0" y="80" width="14" height="18" fill="#ffaa3b" filter="url(#eraserGlow)" />
              <text x="18" y="94" fill="#ffaa3b" fontSize="8" fontFamily="monospace" fontWeight="bold">|V⟩ (90°)</text>
            </g>

            {/* Tagged Paths Converging onto Analyzer */}
            <line x1="174" y1="44" x2="310" y2="92" stroke="#38e1ff" strokeWidth="2.5" opacity="0.85" />
            <line x1="174" y1="92" x2="310" y2="108" stroke="#ffaa3b" strokeWidth="2.5" opacity="0.85" />

            {/* 3. ROTATABLE POLARIZATION ANALYZER CRYSTAL */}
            <g transform="translate(310, 45)">
              {/* Analyzer Mounting Ring */}
              <circle cx="20" cy="55" r="34" fill="#081422" stroke="#a855f7" strokeWidth="2" strokeDasharray="4 2" />
              {/* Crystal Axis Indicator based on selected angle */}
              <line
                x1={20 - 28 * Math.cos((eraserAngle * Math.PI) / 180)}
                y1={55 - 28 * Math.sin((eraserAngle * Math.PI) / 180)}
                x2={20 + 28 * Math.cos((eraserAngle * Math.PI) / 180)}
                y2={55 + 28 * Math.sin((eraserAngle * Math.PI) / 180)}
                stroke="#ffffff"
                strokeWidth="3.5"
                filter="url(#eraserGlow)"
              />
              <text x="-8" y="-6" fill="#a855f7" fontSize="9" fontFamily="monospace" fontWeight="bold">
                ANALYZER θ={eraserAngle}°
              </text>
              {isErased && (
                <rect x="6" y="94" width="60" height="14" rx="3" fill="#a855f7" opacity="0.25" />
              )}
              {isErased && (
                <text x="10" y="104" fill="#c084fc" fontSize="8" fontFamily="monospace" fontWeight="bold">
                  ERASURE MODE
                </text>
              )}
            </g>

            {/* Beam to Polarizing Beam Splitter */}
            <line x1="350" y1="100" x2="430" y2="100" stroke="#c084fc" strokeWidth="3" filter="url(#eraserGlow)" />

            {/* 4. POLARIZING BEAM SPLITTER (PBS CUBE) */}
            <g transform="translate(430, 75)">
              <rect x="0" y="0" width="45" height="45" rx="4" fill="#0f2942" stroke="#38e1ff" strokeWidth="1.5" />
              {/* Internal diagonal dielectric interface */}
              <line x1="0" y1="45" x2="45" y2="0" stroke="#38e1ff" strokeWidth="2" strokeDasharray="2 2" />
              <text x="12" y="-6" fill="#38e1ff" fontSize="8" fontFamily="monospace">PBS</text>
            </g>

            {/* Split Beams: Channel A (Transmitted) and Channel B (Reflected) */}
            {/* Channel A: Transmitted straight to Screen A */}
            <line x1="475" y1="100" x2="550" y2="100" stroke="#50e39c" strokeWidth="2.5" filter="url(#eraserGlow)" />
            {/* Channel B: Reflected vertically up to Screen B */}
            <line x1="452" y1="75" x2="452" y2="20" stroke="#ffaa3b" strokeWidth="2.5" filter="url(#eraserGlow)" />

            {/* 5. CHANNEL A DETECTOR SCREEN (TRANSMITTED) */}
            <g transform="translate(550, 45)">
              <rect x="0" y="0" width="18" height="110" rx="3" fill="#081827" stroke="#50e39c" strokeWidth="1.5" />
              <text x="-4" y="-8" fill="#50e39c" fontSize="8" fontFamily="monospace" fontWeight="bold">SCREEN A</text>

              {/* Fringes on Screen A depending on θ */}
              {isErased ? (
                /* High visibility interference fringes */
                <g transform="translate(2, 6)">
                  <rect x="0" y="8" width="14" height="6" fill="#50e39c" opacity="0.3" />
                  <rect x="0" y="24" width="14" height="12" fill="#50e39c" filter="url(#eraserGlow)" />
                  <rect x="0" y="48" width="14" height="16" fill="#50e39c" filter="url(#eraserGlow)" />
                  <rect x="0" y="72" width="14" height="12" fill="#50e39c" filter="url(#eraserGlow)" />
                  <rect x="0" y="90" width="14" height="6" fill="#50e39c" opacity="0.3" />
                </g>
              ) : (
                /* Flat envelope when which-path info preserved (V=0) */
                <rect x="2" y="25" width="14" height="60" fill="#50e39c" opacity="0.4" />
              )}
            </g>

            {/* 6. CHANNEL B DETECTOR SCREEN (REFLECTED COMPLEMENTARY) */}
            <g transform="translate(390, 8)">
              <rect x="0" y="0" width="120" height="16" rx="3" fill="#081827" stroke="#ffaa3b" strokeWidth="1.5" />
              <text x="125" y="12" fill="#ffaa3b" fontSize="8" fontFamily="monospace" fontWeight="bold">SCREEN B</text>

              {/* Anti-fringes on Screen B */}
              {isErased ? (
                <g transform="translate(6, 2)">
                  <rect x="10" y="0" width="12" height="12" fill="#ffaa3b" filter="url(#eraserGlow)" />
                  <rect x="36" y="0" width="18" height="12" fill="#ffaa3b" filter="url(#eraserGlow)" />
                  <rect x="68" y="0" width="18" height="12" fill="#ffaa3b" filter="url(#eraserGlow)" />
                  <rect x="96" y="0" width="12" height="12" fill="#ffaa3b" filter="url(#eraserGlow)" />
                </g>
              ) : (
                <rect x="20" y="2" width="80" height="12" fill="#ffaa3b" opacity="0.4" />
              )}
            </g>
          </svg>
        )}
      </div>

      {/* Real-time Apparatus Telemetry HUD Bottom */}
      <div className="preview-hud-bottom">
        {isDoubleSlit ? (
          <>
            <div className="preview-stat">
              <span className="stat-label">OBSERVER STATE</span>
              <span className={`stat-val ${!doubleSlitObserver ? "val-cyan" : "val-amber"}`}>
                {!doubleSlitObserver ? "Wave Superposition Active" : "Detector Collapse Engaged"}
              </span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">INTERFERENCE VISIBILITY</span>
              <span className={`stat-val ${!doubleSlitObserver ? "val-emerald" : "val-muted"}`}>
                {!doubleSlitObserver ? "V = 1.00 (Fringes Visible)" : "V = 0.00 (Classical Bands)"}
              </span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">DETECTOR FEEDBACK</span>
              <span className="stat-val">Phosphor Screen + Web Audio</span>
            </div>
          </>
        ) : (
          <>
            <div className="preview-stat">
              <span className="stat-label">ANALYZER ROTATION (θ)</span>
              <span className="stat-val val-cyan">{eraserAngle}° Linear Basis</span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">FRINGE VISIBILITY |sin(2θ)|</span>
              <span className={`stat-val ${isErased ? "val-emerald" : "val-amber"}`}>
                V = {visibility.toFixed(2)} {isErased ? "(Max Contrast Fringes)" : "(Which-Path Preserved)"}
              </span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">SORTED CHANNELS</span>
              <span className="stat-val">Channel A &amp; B Complementary</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

