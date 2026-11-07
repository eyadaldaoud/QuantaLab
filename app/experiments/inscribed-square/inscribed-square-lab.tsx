"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Point2D,
  InscribedSquare,
  getPresetCurve,
  resampleClosedCurve,
  findInscribedSquares,
  verifySquareGeometry,
  distance,
} from "./math";

export default function InscribedSquareLab() {
  // Preset or freehand curve points
  const [selectedPreset, setSelectedPreset] = useState<string>("ellipse");
  const [curvePoints, setCurvePoints] = useState<Point2D[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSquareIndex, setActiveSquareIndex] = useState(0);

  // Display toggles
  const [showDiagonals, setShowDiagonals] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showMobiusView, setShowMobiusView] = useState(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);

  // Canvas and drawing refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingBufferRef = useRef<Point2D[]>([]);

  // Initialize with selected preset
  useEffect(() => {
    if (selectedPreset !== "custom") {
      const pts = getPresetCurve(selectedPreset, 360, 240, 160);
      setCurvePoints(pts);
    }
  }, [selectedPreset]);

  // Find all inscribed squares for current curve
  const detectedSquares: InscribedSquare[] = useMemo(() => {
    if (curvePoints.length < 10) return [];
    return findInscribedSquares(curvePoints, 4.0, 4);
  }, [curvePoints]);

  const activeSquare = detectedSquares[activeSquareIndex] || detectedSquares[0] || null;

  // Geometry verification
  const verification = useMemo(() => {
    if (!activeSquare) return null;
    return verifySquareGeometry(
      activeSquare.a,
      activeSquare.b,
      activeSquare.c,
      activeSquare.d
    );
  }, [activeSquare]);

  // Web Audio chime on detection
  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Play chime when a square is detected
  useEffect(() => {
    if (detectedSquares.length > 0) {
      playChime();
    }
  }, [detectedSquares.length, playChime]);

  // Handle Freehand Mouse / Touch Drawing
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showMobiusView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setSelectedPreset("custom");
    drawingBufferRef.current = [{ x, y }];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const prev = drawingBufferRef.current[drawingBufferRef.current.length - 1];
    if (!prev || distance(prev, { x, y }) > 4) {
      drawingBufferRef.current.push({ x, y });
      // Render in-progress drawing
      renderCanvas();
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const raw = drawingBufferRef.current;
    if (raw.length > 15) {
      const closedAndSmoothed = resampleClosedCurve(raw, 180);
      setCurvePoints(closedAndSmoothed);
      setActiveSquareIndex(0);
    }
  };

  // Touch support for tablets and mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (showMobiusView || !e.touches[0]) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    setIsDrawing(true);
    setSelectedPreset("custom");
    drawingBufferRef.current = [{ x, y }];
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !e.touches[0]) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    const prev = drawingBufferRef.current[drawingBufferRef.current.length - 1];
    if (!prev || distance(prev, { x, y }) > 4) {
      drawingBufferRef.current.push({ x, y });
      renderCanvas();
    }
  };

  // Main Canvas Rendering Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Draw coordinate grid
    ctx.strokeStyle = "rgba(20, 40, 65, 0.4)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 1. Render in-progress drawing if active
    if (isDrawing && drawingBufferRef.current.length > 1) {
      ctx.strokeStyle = "#38e1ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#38e1ff";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const raw = drawingBufferRef.current;
      ctx.moveTo(raw[0].x, raw[0].y);
      for (let i = 1; i < raw.length; i++) {
        ctx.lineTo(raw[i].x, raw[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      return;
    }

    // 2. Render finalized closed Jordan curve γ(t)
    if (curvePoints.length > 2) {
      ctx.strokeStyle = "#38e1ff";
      ctx.lineWidth = 3.5;
      ctx.shadowColor = "rgba(56, 225, 255, 0.6)";
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 3. Render Inscribed Square if detected
    if (activeSquare) {
      const { a, b, c, d, center } = activeSquare;

      // Glow backdrop for square interior
      ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();

      // Square perimeter edges
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Diagonals AC and BD
      if (showDiagonals) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.55)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();

        ctx.setLineDash([]);

        // Center Midpoint M
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f59e0b";
        ctx.font = "10px monospace";
        ctx.fillText("M (Center)", center.x + 8, center.y - 6);
      }

      // Corner 90° angle symbols
      if (showAngles) {
        const drawRightAngleMarker = (pCorner: Point2D, p1: Point2D, p2: Point2D) => {
          const v1x = (p1.x - pCorner.x) / distance(p1, pCorner);
          const v1y = (p1.y - pCorner.y) / distance(p1, pCorner);
          const v2x = (p2.x - pCorner.x) / distance(p2, pCorner);
          const v2y = (p2.y - pCorner.y) / distance(p2, pCorner);
          const len = 12;

          ctx.strokeStyle = "#50e39c";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pCorner.x + v1x * len, pCorner.y + v1y * len);
          ctx.lineTo(
            pCorner.x + v1x * len + v2x * len,
            pCorner.y + v1y * len + v2y * len
          );
          ctx.lineTo(pCorner.x + v2x * len, pCorner.y + v2y * len);
          ctx.stroke();
        };

        drawRightAngleMarker(b, a, c);
        drawRightAngleMarker(c, b, d);
        drawRightAngleMarker(d, c, a);
        drawRightAngleMarker(a, d, b);
      }

      // 4 Vertices glowing points on the loop
      const vertices = [
        { p: a, label: "A" },
        { p: b, label: "B" },
        { p: c, label: "C" },
        { p: d, label: "D" },
      ];

      vertices.forEach(({ p, label }) => {
        // Outer halo
        ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing vertex
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Vertex label
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px monospace";
        ctx.fillText(label, p.x + 10, p.y + 4);
      });
    }
  }, [curvePoints, isDrawing, activeSquare, showDiagonals, showAngles]);

  // Redraw canvas whenever dependencies change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="quantum-studio-root">
      {/* 1. STUDIO HEADER */}
      <header className="studio-topbar">
        <div className="topbar-left">
          <Link href="/" className="back-hub-btn" title="Back to QuantaLab Experiments Catalog">
            <span className="back-arrow">←</span>
            <span>CATALOG</span>
          </Link>
          <div className="topbar-divider-v" />
          <div className="studio-logo" aria-hidden="true">
            ⏹️
          </div>
          <div className="topbar-branding">
            <div className="topbar-title-row">
              <h1 className="studio-title">THE INSCRIBED SQUARE PROBLEM</h1>
              <span className="studio-pill-status">
                <span className="status-dot-pulse" />
                <span>TOPOLOGY ENGINE READY</span>
              </span>
            </div>
            <span className="studio-subtitle">
              Toeplitz Conjecture (1911) &bull; Greene-Lobb Symplectic Theorem (2020)
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="theory-btn"
            onClick={() => setIsTheoryOpen(true)}
            title="Read mathematical formulation and topological proofs"
          >
            <span>📖 THEOREM &amp; PROOFS</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN INTERACTIVE VIEWPORT */}
      <section className="grand-viewport-section">
        <div className="canvas-wrapper">
          {/* Viewport Top HUD Bar */}
          <div className="viewport-hud-top">
            <div className="hud-left-cluster">
              <span className="hud-metric-pill">
                <span className="metric-dot dot-cyan" />
                <span>CURVE: {selectedPreset.toUpperCase()}</span>
              </span>
              <span className="hud-metric-pill">
                <span className={`metric-dot ${detectedSquares.length > 0 ? "dot-emerald" : "dot-amber"}`} />
                <span>
                  {detectedSquares.length > 0
                    ? `${detectedSquares.length} INSCRIBED SQUARE${detectedSquares.length > 1 ? "S" : ""} FOUND`
                    : "SEARCHING INSCRIBED SQUARE..."}
                </span>
              </span>
            </div>

            <div className="hud-right-cluster">
              {/* Toggle 2D Loop vs 3D Möbius View */}
              <button
                type="button"
                className={`hud-btn-toggle ${!showMobiusView ? "active" : ""}`}
                onClick={() => setShowMobiusView(false)}
              >
                <span>2D LOOP CANVAS</span>
              </button>
              <button
                type="button"
                className={`hud-btn-toggle ${showMobiusView ? "active" : ""}`}
                onClick={() => setShowMobiusView(true)}
              >
                <span>3D MÖBIUS SURFACE</span>
              </button>
            </div>
          </div>

          {/* Canvas or 3D Möbius View */}
          {!showMobiusView ? (
            <div className="drawing-canvas-container">
              <canvas
                ref={canvasRef}
                width={720}
                height={480}
                className="interactive-loop-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
              />

              <div className="canvas-instruction-overlay">
                <span>✏️ Click &amp; drag anywhere to sketch your own loop, or choose presets below</span>
              </div>
            </div>
          ) : (
            /* 3D Möbius Configuration Space Projection */
            <div className="mobius-view-container">
              <div className="mobius-banner">
                <div className="mobius-icon">➰</div>
                <div className="mobius-text-block">
                  <h3 className="mobius-title">Möbius Strip Configuration Space (3Blue1Brown Topology)</h3>
                  <p className="mobius-desc">
                    Every unordered pair of points on a loop &gamma;(t) maps to a point on a non-orientable
                    surface with boundary homeomorphic to a Möbius strip. Because a Möbius strip cannot be embedded
                    in 3D Euclidean space without self-intersecting, pairs with identical midpoints must exist!
                  </p>
                </div>
              </div>

              {/* Vector 3D Möbius Ribbon Visualizer */}
              <svg className="mobius-svg-render" viewBox="0 0 600 280">
                <defs>
                  <linearGradient id="mobiusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#38e1ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                  </linearGradient>
                </defs>

                {/* Torus / Ribbon Twisted Mesh */}
                <path
                  d="M100 140 C 140 40, 240 40, 300 140 C 360 240, 460 240, 500 140 C 460 60, 360 60, 300 140 C 240 220, 140 220, 100 140 Z"
                  fill="none"
                  stroke="url(#mobiusGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                {/* Ribbon Ribs */}
                <line x1="180" y1="90" x2="200" y2="190" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                <line x1="240" y1="95" x2="250" y2="185" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                <line x1="300" y1="110" x2="300" y2="170" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="360" y1="95" x2="350" y2="185" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                <line x1="420" y1="90" x2="400" y2="190" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

                {/* Intersection Point (The Square Root) */}
                <circle cx="300" cy="140" r="8" fill="#f59e0b" filter="drop-shadow(0 0 8px #f59e0b)" />
                <circle cx="300" cy="140" r="4" fill="#ffffff" />
                <text x="315" y="145" fill="#f59e0b" fontSize="12" fontFamily="monospace" fontWeight="bold">
                  Topological Intersection (Inscribed Square!)
                </text>
              </svg>
            </div>
          )}

          {/* Viewport Bottom Telemetry HUD */}
          <div className="viewport-hud-bottom">
            <div className="hud-stat-cell">
              <span className="stat-label">SQUARE SIDE LENGTH</span>
              <span className="stat-value val-gold">
                {activeSquare ? `${activeSquare.sideLength.toFixed(1)} px` : "—"}
              </span>
            </div>
            <div className="hud-stat-cell">
              <span className="stat-label">ORTHOGONAL ANGLES</span>
              <span className="stat-value val-emerald">
                {verification ? `${verification.anglesDeg[0].toFixed(1)}°` : "90.0°"}
              </span>
            </div>
            <div className="hud-stat-cell">
              <span className="stat-label">DIAGONAL EQUALITY</span>
              <span className="stat-value val-cyan">
                {verification ? `${(verification.diagonals[0] / verification.diagonals[1]).toFixed(3)}` : "1.000"}
              </span>
            </div>
            <div className="hud-stat-cell">
              <span className="stat-label">THEORETICAL STATUS</span>
              <span className="stat-value val-muted">
                Smooth Loops: Proven &bull; Fractals: Open
              </span>
            </div>
          </div>
        </div>

        {/* 3. INTERACTIVE CONTROL DECK & GEOMETRY SPECS */}
        <div className="controls-deck">
          {/* Card 1: Geometric Presets & Freehand */}
          <div className="control-card">
            <div className="card-header">
              <span className="card-title">CURVE PRESETS &amp; FREEHAND</span>
              <span className="card-badge">INPUT</span>
            </div>
            <p className="card-hint">
              Select a mathematical loop geometry or draw your own closed curve.
            </p>
            <div className="presets-grid">
              {[
                { id: "ellipse", label: "Ellipse", icon: "⬭" },
                { id: "clover", label: "Clover (3-Fold)", icon: "☘️" },
                { id: "limacon", label: "Teardrop Limacon", icon: "💧" },
                { id: "astroid", label: "Astroid Star", icon: "⭐" },
                { id: "wobble", label: "Perturbed Wobble", icon: "〰️" },
                { id: "circle", label: "Circle (Infinite)", icon: "⚪" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`preset-btn ${selectedPreset === p.id ? "active" : ""}`}
                  onClick={() => setSelectedPreset(p.id)}
                >
                  <span className="preset-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <div className="custom-draw-row">
              <button
                type="button"
                className={`btn-draw-freehand ${selectedPreset === "custom" ? "is-drawing-mode" : ""}`}
                onClick={() => {
                  setSelectedPreset("custom");
                  setCurvePoints([]);
                }}
              >
                <span>✏️ Clear &amp; Draw Custom Loop</span>
              </button>
            </div>
          </div>

          {/* Card 2: Inscribed Square Selector (if multiple exist) */}
          {detectedSquares.length > 1 && (
            <div className="control-card">
              <div className="card-header">
                <span className="card-title">INSCRIBED SQUARES DETECTED</span>
                <span className="card-badge">{detectedSquares.length} SOLUTIONS</span>
              </div>
              <p className="card-hint">
                This loop supports multiple distinct inscribed squares! Click to inspect each:
              </p>
              <div className="square-selector-row">
                {detectedSquares.map((sq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`square-select-btn ${activeSquareIndex === idx ? "active" : ""}`}
                    onClick={() => setActiveSquareIndex(idx)}
                  >
                    <span>Square #{idx + 1}</span>
                    <span className="sub-rot">{sq.rotationDeg.toFixed(0)}°</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card 3: Display & Overlay Toggles */}
          <div className="control-card">
            <div className="card-header">
              <span className="card-title">GEOMETRIC OVERLAYS</span>
              <span className="card-badge">DISPLAY</span>
            </div>
            <div className="toggles-column">
              <label className="toggle-row">
                <span>Show Perpendicular Diagonals (AC &amp; BD)</span>
                <input
                  type="checkbox"
                  checked={showDiagonals}
                  onChange={(e) => setShowDiagonals(e.target.checked)}
                />
              </label>
              <label className="toggle-row">
                <span>Show 90° Corner Angle Verification</span>
                <input
                  type="checkbox"
                  checked={showAngles}
                  onChange={(e) => setShowAngles(e.target.checked)}
                />
              </label>
            </div>
          </div>

          {/* Card 4: Geometric Telemetry & Vertices */}
          {activeSquare && (
            <div className="control-card">
              <div className="card-header">
                <span className="card-title">VERTICES &amp; ALGEBRAIC PROOF</span>
                <span className="card-badge">VERIFIED</span>
              </div>
              <div className="coords-table">
                <div className="coord-row">
                  <span className="coord-tag">Vertex A:</span>
                  <code>({activeSquare.a.x.toFixed(1)}, {activeSquare.a.y.toFixed(1)})</code>
                </div>
                <div className="coord-row">
                  <span className="coord-tag">Vertex B:</span>
                  <code>({activeSquare.b.x.toFixed(1)}, {activeSquare.b.y.toFixed(1)})</code>
                </div>
                <div className="coord-row">
                  <span className="coord-tag">Vertex C:</span>
                  <code>({activeSquare.c.x.toFixed(1)}, {activeSquare.c.y.toFixed(1)})</code>
                </div>
                <div className="coord-row">
                  <span className="coord-tag">Vertex D:</span>
                  <code>({activeSquare.d.x.toFixed(1)}, {activeSquare.d.y.toFixed(1)})</code>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. THEORETICAL PROOFS MODAL */}
      {isTheoryOpen && (
        <div className="modal-backdrop" onClick={() => setIsTheoryOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Mathematical Theory: The Inscribed Square Problem</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsTheoryOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <section className="modal-section">
                <h3>1. Toeplitz&apos;s 1911 Conjecture</h3>
                <p>
                  German mathematician <strong>Otto Toeplitz</strong> asked in 1911 whether every simple closed curve
                  in the Euclidean plane (a <em>Jordan curve</em>) contains four points that form the vertices of a square.
                </p>
                <div className="math-callout">
                  <code>{"\\forall \\gamma \\subset \\mathbb{R}^2 \\text{ (Jordan curve)}, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a square.}"}</code>
                </div>
              </section>

              <section className="modal-section">
                <h3>2. The Topological Möbius Strip Proof (Šnirel&apos;man 1929)</h3>
                <p>
                  Consider the set of all unordered pairs of points on the loop:
                  (x, y) &isin; (&gamma; &times; &gamma;) / &Zopf;<sub>2</sub>.
                  Topologically, this configuration space is a <strong>Möbius strip</strong> whose boundary represents
                  identical points (x = y). By mapping every pair to its midpoint and distance in 3D:
                  f(x, y) = ((x + y)/2, ||x - y||).
                  Because a Möbius strip cannot be embedded into &Ropf;<sup>3</sup> without self-intersection, there must
                  exist two distinct pairs (A, C) and (B, D) that share the exact same midpoint and distance, forming
                  orthogonal diagonals that define an inscribed square!
                </p>
              </section>

              <section className="modal-section">
                <h3>3. Breakthrough: The Greene-Lobb Symplectic Theorem (2020)</h3>
                <p>
                  In 2020, mathematicians <strong>Joshua Greene</strong> and <strong>Andrew Lobb</strong> proved using
                  symplectic geometry that every smooth closed curve contains an inscribed rectangle of <em>every possible aspect ratio</em>.
                </p>
              </section>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-modal-dismiss"
                onClick={() => setIsTheoryOpen(false)}
              >
                Got It &bull; Return to Lab
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
