"use client";

import React, { useState } from "react";
import { ExperimentMetadata } from "@/lib/experiments";

interface ApparatusPreviewProps {
  experiment: ExperimentMetadata;
  onOpenSpecs: () => void;
}

const INK = "#101214";
const RULE = "#b8bec2";
const CAP = "#6c737a";
const PAPER = "#f8f7f4";

export default function ApparatusPreview({
  experiment,
}: ApparatusPreviewProps) {
  const [doubleSlitObserver, setDoubleSlitObserver] = useState(false);
  const [eraserAngle, setEraserAngle] = useState<number>(45);
  const [squarePreset, setSquarePreset] = useState<"ellipse" | "clover" | "astroid">("ellipse");

  const isDoubleSlit = experiment.slug === "double-slit";
  const isInscribedSquare = experiment.slug === "inscribed-square";

  const visibility = Math.abs(Math.sin((2 * eraserAngle * Math.PI) / 180));
  const isErased = eraserAngle === 45;

  return (
    <div className="preview-apparatus-frame" style={{ "--lam": experiment.accentColor } as React.CSSProperties}>
      {/* Bench identification HUD */}
      <div className="preview-hud-top">
        <div className="preview-hud-title-group">
          <span className="hud-label">INTERACTIVE BENCH SCHEMATIC</span>
          <span className="hud-sublabel">
            {isDoubleSlit
              ? "DUAL-SLIT WAVE INTERFEROMETER"
              : isInscribedSquare
              ? "TOPOLOGICAL CLOSED JORDAN LOOP"
              : "WHICH-PATH QUANTUM ERASER"}
          </span>
        </div>

        {isDoubleSlit ? (
          <div className="preview-inline-toggle" role="group" aria-label="Double-slit mode">
            <button
              type="button"
              className={`bench-toggle-pill ${!doubleSlitObserver ? "active" : ""}`}
              onClick={() => setDoubleSlitObserver(false)}
            >
              <span className="pill-dot" />
              <span>Wave superposition</span>
            </button>
            <button
              type="button"
              className={`bench-toggle-pill ${doubleSlitObserver ? "active observer-active" : ""}`}
              onClick={() => setDoubleSlitObserver(true)}
            >
              <span className="pill-dot dot-observer" />
              <span>Observer collapse</span>
            </button>
          </div>
        ) : isInscribedSquare ? (
          <div className="preview-inline-toggle" role="group" aria-label="Loop preset">
            {(["ellipse", "clover", "astroid"] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                className={`bench-toggle-pill ${squarePreset === preset ? "active eraser-active" : ""}`}
                onClick={() => setSquarePreset(preset)}
              >
                <span>{preset === "ellipse" ? "Ellipse" : preset === "clover" ? "Clover" : "Astroid"}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="preview-inline-toggle" role="group" aria-label="Analyzer angle">
            <span className="bench-toggle-pill angle-label">θ =</span>
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

      {/* The bench, drawn to paper-figure discipline */}
      <div className="preview-svg-canvas-container">
        {isDoubleSlit ? (
          <svg
            className="apparatus-vector-svg"
            viewBox="0 0 640 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Double-slit bench in elevation; toggles switch between wave superposition and observer collapse"
          >
            {/* Optical rail */}
            <line x1="20" y1="192" x2="620" y2="192" stroke={INK} strokeWidth="2.5" />
            <line x1="20" y1="197" x2="620" y2="197" stroke={RULE} strokeWidth="1" />
            <text x="22" y="212" fill={CAP} fontSize="9" fontFamily="var(--qb-mono)">OPTICAL AXIS // Z-BENCH</text>

            {/* 1. Laser */}
            <g transform="translate(30, 80)">
              <rect x="0" y="0" width="70" height="40" fill="none" stroke={INK} strokeWidth="2" />
              <line x1="14" y1="8" x2="14" y2="32" stroke={INK} strokeWidth="2" />
              <line x1="24" y1="8" x2="24" y2="32" stroke={INK} strokeWidth="2" />
              <line x1="34" y1="8" x2="34" y2="32" stroke={INK} strokeWidth="2" />
              <rect x="68" y="12" width="8" height="16" fill="#cf3b2e" />
              <text x="6" y="24" fill={INK} fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">DPSS</text>
              <text x="2" y="54" fill={CAP} fontSize="8" fontFamily="var(--qb-mono)">532 nm LASER</text>
            </g>

            {/* Beam */}
            <line x1="106" y1="100" x2="210" y2="100" stroke="#cf3b2e" strokeWidth="2.5" />

            {/* 2. Slit plate */}
            <g transform="translate(210, 30)">
              <rect x="0" y="0" width="12" height="140" fill={INK} />
              <rect x="0" y="52" width="12" height="8" fill={PAPER} />
              <rect x="0" y="80" width="12" height="8" fill={PAPER} />
              <text x="-8" y="-8" fill={INK} fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">DUAL SLITS (d = 0.12 mm)</text>
              <text x="20" y="60" fill={CAP} fontSize="8" fontFamily="var(--qb-mono)">s₁</text>
              <text x="20" y="88" fill={CAP} fontSize="8" fontFamily="var(--qb-mono)">s₂</text>

              {doubleSlitObserver ? (
                <g transform="translate(-12, 42)">
                  <circle cx="6" cy="14" r="6" fill="none" stroke={INK} strokeWidth="2" />
                  <circle cx="6" cy="42" r="6" fill="none" stroke={INK} strokeWidth="2" />
                  <line x1="0.6" y1="14" x2="11.4" y2="14" stroke={INK} strokeWidth="1.5" />
                  <line x1="0.6" y1="42" x2="11.4" y2="42" stroke={INK} strokeWidth="1.5" />
                  <text x="-14" y="0" fill={INK} fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">DET A</text>
                  <text x="-14" y="56" fill={INK} fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">DET B</text>
                </g>
              ) : null}
            </g>

            {!doubleSlitObserver ? (
              <g>
                {/* Huygens wavefront arcs from both slits */}
                <g stroke="#cf3b2e" fill="none" strokeWidth="1.1">
                  <path d="M222 86 A 40 40 0 0 1 252 60" strokeOpacity="0.75" />
                  <path d="M222 86 A 70 70 0 0 1 277 40" strokeOpacity="0.55" />
                  <path d="M222 86 A 110 110 0 0 1 317 20" strokeOpacity="0.4" />
                  <path d="M222 86 A 160 160 0 0 1 370 2" strokeOpacity="0.28" />
                  <path d="M222 114 A 40 40 0 0 0 252 140" strokeOpacity="0.75" />
                  <path d="M222 114 A 70 70 0 0 0 277 160" strokeOpacity="0.55" />
                  <path d="M222 114 A 110 110 0 0 0 317 180" strokeOpacity="0.4" />
                  <path d="M222 114 A 160 160 0 0 0 370 198" strokeOpacity="0.28" />
                </g>
              </g>
            ) : (
              <g>
                {/* Collapsed: two classical bands behind each slit */}
                <line x1="222" y1="86" x2="490" y2="76" stroke="#b3301f" strokeWidth="3" strokeDasharray="8 6" />
                <line x1="222" y1="114" x2="490" y2="124" stroke="#b3301f" strokeWidth="3" strokeDasharray="8 6" />
                <text x="270" y="66" fill={INK} fontSize="8" fontFamily="var(--qb-mono)">CLASSICAL PATH 1</text>
                <text x="270" y="142" fill={INK} fontSize="8" fontFamily="var(--qb-mono)">CLASSICAL PATH 2</text>
              </g>
            )}

            {/* 3. Detector screen */}
            <g transform="translate(490, 20)">
              <rect x="0" y="0" width="22" height="160" fill={INK} />
              <text x="-8" y="-8" fill={INK} fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">SCREEN</text>

              {!doubleSlitObserver ? (
                <g transform="translate(2, 6)" fill="#cf3b2e">
                  <rect x="0" y="12" width="18" height="6" opacity="0.3" />
                  <rect x="0" y="28" width="18" height="10" opacity="0.75" />
                  <rect x="0" y="46" width="18" height="6" opacity="0.35" />
                  <rect x="0" y="60" width="18" height="24" opacity="1" />
                  <rect x="0" y="92" width="18" height="6" opacity="0.35" />
                  <rect x="0" y="108" width="18" height="10" opacity="0.75" />
                  <rect x="0" y="128" width="18" height="6" opacity="0.3" />
                </g>
              ) : (
                <g transform="translate(2, 10)" fill="#b3301f">
                  <rect x="0" y="42" width="18" height="20" />
                  <rect x="0" y="80" width="18" height="20" />
                </g>
              )}
            </g>

            {/* 4. Intensity distribution curve */}
            <g transform="translate(530, 20)">
              <rect x="0" y="0" width="85" height="160" fill="none" stroke={RULE} strokeWidth="1" />
              <text x="7" y="16" fill={CAP} fontSize="8" fontFamily="var(--qb-mono)">I(y)</text>

              {!doubleSlitObserver ? (
                <path
                  d="M12 82 Q22 18 40 18 Q58 18 68 82 M22 80 Q30 44 40 44 Q50 44 56 81 M30 82 Q36 62 40 62 Q44 62 49 82"
                  fill="none"
                  stroke={INK}
                  strokeWidth="1.75"
                />
              ) : (
                <path
                  d="M14 22 Q32 22 37 58 Q42 22 60 22 M14 112 Q32 112 37 92 Q42 112 60 112"
                  fill="none"
                  stroke={INK}
                  strokeWidth="1.75"
                />
              )}
            </g>
          </svg>
        ) : isInscribedSquare ? (
          <svg
            className="apparatus-vector-svg"
            viewBox="0 0 640 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="A closed Jordan curve with an inscribed square; presets switch the loop"
          >
            <line x1="20" y1="195" x2="620" y2="195" stroke={RULE} strokeWidth="1" />
            <text x="25" y="212" fill={CAP} fontSize="9" fontFamily="var(--qb-mono)">
              JORDAN CURVE CONTINUUM // TOEPLITZ CONJECTURE (1911)
            </text>

            <g transform="translate(190, 15)">
              {squarePreset === "ellipse" ? (
                <ellipse cx="130" cy="95" rx="145" ry="82" stroke="#2e7d46" strokeWidth="2.5" fill="none" />
              ) : squarePreset === "clover" ? (
                <path
                  d="M130 95 m -90 0 a 45 45 0 1 1 90 0 a 45 45 0 1 1 0 90 a 45 45 0 1 1 -90 -90 Z"
                  stroke="#2e7d46"
                  strokeWidth="2.5"
                  fill="none"
                  transform="scale(1.2) translate(-25, -20)"
                />
              ) : (
                <path
                  d="M130 15 C130 65, 175 95, 230 95 C175 95, 130 135, 130 175 C130 135, 85 95, 30 95 C85 95, 130 65, 130 15 Z"
                  stroke="#2e7d46"
                  strokeWidth="2.5"
                  fill="none"
                />
              )}

              {/* Inscribed square + diagonals */}
              <polygon
                points="130,22 225,95 130,168 35,95"
                fill="rgba(46, 125, 70, 0.08)"
                stroke="#2e7d46"
                strokeWidth="2"
              />
              <line x1="130" y1="22" x2="130" y2="168" stroke="#2e7d46" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
              <line x1="35" y1="95" x2="225" y2="95" stroke="#2e7d46" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />

              <circle cx="130" cy="95" r="3.5" fill={INK} />
              <text x="138" y="90" fill={INK} fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">M</text>

              {[
                { x: 130, y: 22, t: "A", lx: 138, ly: 24 },
                { x: 225, y: 95, t: "B", lx: 233, ly: 100 },
                { x: 130, y: 168, t: "C", lx: 138, ly: 176 },
                { x: 35, y: 95, t: "D", lx: 18, ly: 100 },
              ].map((v) => (
                <g key={v.t}>
                  <circle cx={v.x} cy={v.y} r="4.5" fill={PAPER} stroke="#2e7d46" strokeWidth="2" />
                  <text x={v.lx} y={v.ly} fill={INK} fontSize="10" fontFamily="var(--qb-mono)" fontWeight="600">{v.t}</text>
                </g>
              ))}
            </g>

            <g transform="translate(480, 40)">
              <rect x="0" y="0" width="135" height="120" fill="none" stroke={RULE} strokeWidth="1" />
              <text x="10" y="20" fill="#2e7d46" fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">PROVEN THEOREM</text>
              <text x="10" y="42" fill={INK} fontSize="8" fontFamily="var(--qb-mono)">Šnirel&apos;man (1929)</text>
              <text x="10" y="56" fill={CAP} fontSize="7.5" fontFamily="var(--qb-mono)">Smooth curves: yes</text>
              <text x="10" y="76" fill={INK} fontSize="8" fontFamily="var(--qb-mono)">Greene–Lobb (2020)</text>
              <text x="10" y="90" fill={CAP} fontSize="7.5" fontFamily="var(--qb-mono)">All aspect ratios: yes</text>
              <text x="10" y="112" fill="#2e7d46" fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">Fractals: open</text>
            </g>
          </svg>
        ) : (
          <svg
            className="apparatus-vector-svg"
            viewBox="0 0 640 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Quantum eraser bench: pump laser, tagger slits, rotatable analyzer, beam splitter, two screens"
          >
            <line x1="20" y1="195" x2="620" y2="195" stroke={INK} strokeWidth="2.5" />
            <line x1="20" y1="200" x2="620" y2="200" stroke={RULE} strokeWidth="1" />
            <text x="25" y="216" fill={CAP} fontSize="9" fontFamily="var(--qb-mono)">POLARIZATION BENCH // STAGE-3</text>

            {/* 1. Pump laser */}
            <g transform="translate(25, 78)">
              <rect x="0" y="0" width="65" height="44" fill="none" stroke={INK} strokeWidth="2" />
              <rect x="63" y="14" width="8" height="16" fill="#5f3dc4" />
              <text x="6" y="24" fill={INK} fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">UV PUMP</text>
              <text x="6" y="36" fill="#5f3dc4" fontSize="7" fontFamily="var(--qb-mono)">351 nm</text>
              <text x="2" y="58" fill={CAP} fontSize="8" fontFamily="var(--qb-mono)">SPDC SOURCE</text>
            </g>

            <line x1="96" y1="100" x2="160" y2="100" stroke="#5f3dc4" strokeWidth="2.5" />

            {/* 2. Tagged slits */}
            <g transform="translate(160, 35)">
              <rect x="0" y="0" width="14" height="130" fill={INK} />
              <rect x="0" y="32" width="14" height="18" fill={PAPER} />
              <rect x="0" y="80" width="14" height="18" fill={PAPER} />
              <text x="-6" y="-8" fill={INK} fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">H/V TAGGER</text>
              <text x="20" y="44" fill={INK} fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">|H⟩ (0°)</text>
              <text x="20" y="94" fill={INK} fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">|V⟩ (90°)</text>
            </g>

            {/* Tagged paths */}
            <line x1="174" y1="44" x2="310" y2="92" stroke={INK} strokeWidth="1.6" />
            <line x1="174" y1="92" x2="310" y2="108" stroke={INK} strokeWidth="1.6" strokeDasharray="5 3" />

            {/* 3. Analyzer */}
            <g transform="translate(310, 45)">
              <circle cx="20" cy="55" r="32" fill="none" stroke="#5f3dc4" strokeWidth="1.8" strokeDasharray="4 2" />
              <line
                x1={20 - 26 * Math.cos((eraserAngle * Math.PI) / 180)}
                y1={55 - 26 * Math.sin((eraserAngle * Math.PI) / 180)}
                x2={20 + 26 * Math.cos((eraserAngle * Math.PI) / 180)}
                y2={55 + 26 * Math.sin((eraserAngle * Math.PI) / 180)}
                stroke={INK}
                strokeWidth="3"
              />
              <text x="-10" y="-6" fill={INK} fontSize="9" fontFamily="var(--qb-mono)" fontWeight="600">
                ANALYZER θ = {eraserAngle}°
              </text>
              {isErased && (
                <text x="4" y="106" fill="#5f3dc4" fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">
                  ERASURE MODE
                </text>
              )}
            </g>

            <line x1="350" y1="100" x2="430" y2="100" stroke="#5f3dc4" strokeWidth="2" />

            {/* 4. PBS */}
            <g transform="translate(430, 75)">
              <rect x="0" y="0" width="45" height="45" fill="none" stroke={INK} strokeWidth="1.6" />
              <line x1="0" y1="45" x2="45" y2="0" stroke={INK} strokeWidth="1.6" strokeDasharray="3 3" />
              <text x="14" y="-6" fill={CAP} fontSize="8" fontFamily="var(--qb-mono)">PBS</text>
            </g>

            {/* Channels */}
            <line x1="475" y1="100" x2="552" y2="100" stroke="#2e7d46" strokeWidth="2" />
            <line x1="452" y1="75" x2="452" y2="22" stroke="#b3301f" strokeWidth="2" />

            {/* Screen A */}
            <g transform="translate(552, 45)">
              <rect x="0" y="0" width="18" height="110" fill={INK} />
              <text x="-6" y="-8" fill="#2e7d46" fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">SCREEN A</text>

              {isErased ? (
                <g transform="translate(2, 6)" fill="#2e7d46">
                  <rect x="0" y="8" width="14" height="6" opacity="0.3" />
                  <rect x="0" y="24" width="14" height="12" opacity="1" />
                  <rect x="0" y="48" width="14" height="16" />
                  <rect x="0" y="72" width="14" height="12" opacity="1" />
                  <rect x="0" y="90" width="14" height="6" opacity="0.3" />
                </g>
              ) : (
                <rect x="2" y="25" width="14" height="60" fill="#2e7d46" opacity="0.45" />
              )}
            </g>

            {/* Screen B */}
            <g transform="translate(392, 8)">
              <rect x="0" y="0" width="120" height="12" fill={INK} />
              <text x="126" y="10" fill="#b3301f" fontSize="8" fontFamily="var(--qb-mono)" fontWeight="600">SCREEN B</text>

              {isErased ? (
                <g transform="translate(6, 2)" fill="#b3301f">
                  <rect x="8" y="0" width="12" height="8" />
                  <rect x="36" y="0" width="18" height="8" />
                  <rect x="68" y="0" width="18" height="8" />
                  <rect x="96" y="0" width="12" height="8" />
                </g>
              ) : (
                <rect x="20" y="2" width="80" height="8" fill="#b3301f" opacity="0.4" />
              )}
            </g>
          </svg>
        )}
      </div>

      {/* Telemetry */}
      <div className="preview-hud-bottom">
        {isDoubleSlit ? (
          <>
            <div className="preview-stat">
              <span className="stat-label">OBSERVER STATE</span>
              <span className="stat-val">
                {!doubleSlitObserver ? "Wave superposition" : "Detector collapse"}
              </span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">INTERFERENCE VISIBILITY</span>
              <span className={`stat-val ${!doubleSlitObserver ? "val-emerald" : "val-muted"}`}>
                {!doubleSlitObserver ? "V = 1.00 (fringes)" : "V = 0.00 (bands)"}
              </span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">DETECTOR FEEDBACK</span>
              <span className="stat-val">Screen + Web Audio</span>
            </div>
          </>
        ) : isInscribedSquare ? (
          <>
            <div className="preview-stat">
              <span className="stat-label">LOOP PRESET</span>
              <span className="stat-val">{squarePreset}</span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">CORNER ANGLES</span>
              <span className="stat-val val-emerald">4 × 90.0°</span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">TOEPLITZ STATUS</span>
              <span className="stat-val val-cyan">4 points identified</span>
            </div>
          </>
        ) : (
          <>
            <div className="preview-stat">
              <span className="stat-label">ANALYZER ROTATION</span>
              <span className="stat-val">{eraserAngle}° linear basis</span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">VISIBILITY |sin(2θ)|</span>
              <span className={`stat-val ${isErased ? "val-emerald" : "val-amber"}`}>
                V = {visibility.toFixed(2)} {isErased ? "(fringes)" : "(which-path)"}
              </span>
            </div>
            <div className="preview-stat">
              <span className="stat-label">SORTED CHANNELS</span>
              <span className="stat-val">A + B complementary</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
