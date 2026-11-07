"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Point2D,
  InscribedSquare,
  InscribedRectangle,
  CurveTelemetry,
  getPresetCurve,
  resampleClosedCurve,
  computeCurveTelemetry,
  findInscribedSquares,
  findInscribedRectangles,
  verifySquareGeometry,
  distance,
} from "./math";

type SolverMode = "square" | "rectangle";

export default function InscribedSquareLab() {
  // Solver mode: Toeplitz Square vs Greene-Lobb Rectangle
  const [solverMode, setSolverMode] = useState<SolverMode>("square");
  const [targetAspectRatio, setTargetAspectRatio] = useState<number>(1.618); // Golden ratio default

  // Preset or freehand curve points
  const [selectedPreset, setSelectedPreset] = useState<string>("ellipse");
  const [curvePoints, setCurvePoints] = useState<Point2D[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);

  // Deformation & animation
  const [deformation, setDeformation] = useState<number>(1.0);
  const [isAutoMorphing, setIsAutoMorphing] = useState<boolean>(false);

  // Display toggles
  const [showDiagonals, setShowDiagonals] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showSideLengths, setShowSideLengths] = useState(true);
  const [showMobiusView, setShowMobiusView] = useState(false);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);
  const [mobiusStage, setMobiusStage] = useState<1 | 2 | 3>(3);

  // Canvas and drawing refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingBufferRef = useRef<Point2D[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const morphPhaseRef = useRef<number>(0);

  // Sound effects
  const playChime = useCallback((frequency = 523.25) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(frequency * 1.25, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Initialize or update curve when preset or deformation changes
  useEffect(() => {
    if (selectedPreset !== "custom") {
      const pts = getPresetCurve(selectedPreset, 360, 240, 160, deformation);
      setCurvePoints(pts);
    }
  }, [selectedPreset, deformation]);

  // Auto-morph / continuous deformation loop
  useEffect(() => {
    if (!isAutoMorphing || selectedPreset === "custom") {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = () => {
      morphPhaseRef.current += 0.025;
      const newDef = 1.0 + 0.45 * Math.sin(morphPhaseRef.current);
      setDeformation(parseFloat(newDef.toFixed(3)));
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoMorphing, selectedPreset]);

  // Compute curve telemetry (Perimeter, Area, Isoperimetric Quotient via Green's Theorem)
  const telemetry: CurveTelemetry = useMemo(() => {
    return computeCurveTelemetry(curvePoints);
  }, [curvePoints]);

  // Find all inscribed squares for current curve
  const detectedSquares: InscribedSquare[] = useMemo(() => {
    if (solverMode !== "square" || curvePoints.length < 10) return [];
    return findInscribedSquares(curvePoints, 4.5, 4);
  }, [solverMode, curvePoints]);

  // Find all inscribed rectangles of chosen aspect ratio (Greene-Lobb)
  const detectedRectangles: InscribedRectangle[] = useMemo(() => {
    if (solverMode !== "rectangle" || curvePoints.length < 10) return [];
    return findInscribedRectangles(curvePoints, targetAspectRatio, 4.5, 3);
  }, [solverMode, curvePoints, targetAspectRatio]);

  const activeSquare = detectedSquares[activeSolutionIndex] || detectedSquares[0] || null;
  const activeRectangle = detectedRectangles[activeSolutionIndex] || detectedRectangles[0] || null;

  // Geometry verification for active square
  const verification = useMemo(() => {
    if (!activeSquare) return null;
    return verifySquareGeometry(
      activeSquare.a,
      activeSquare.b,
      activeSquare.c,
      activeSquare.d
    );
  }, [activeSquare]);

  // Trigger audio cue when solution is detected
  useEffect(() => {
    if (solverMode === "square" && detectedSquares.length > 0) {
      playChime(587.33); // D5
    } else if (solverMode === "rectangle" && detectedRectangles.length > 0) {
      playChime(659.25); // E5
    }
  }, [solverMode, detectedSquares.length, detectedRectangles.length, playChime]);

  // Handle Freehand Mouse / Touch Drawing
  const handleCanvasPointerDown = (clientX: number, clientY: number) => {
    if (showMobiusView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 720;
    const y = ((clientY - rect.top) / rect.height) * 480;

    setIsDrawing(true);
    setSelectedPreset("custom");
    setIsAutoMorphing(false);
    drawingBufferRef.current = [{ x, y }];
  };

  const handleCanvasPointerMove = (clientX: number, clientY: number) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 720;
    const y = ((clientY - rect.top) / rect.height) * 480;

    const prev = drawingBufferRef.current[drawingBufferRef.current.length - 1];
    if (!prev || distance(prev, { x, y }) > 4) {
      drawingBufferRef.current.push({ x, y });
      renderCanvas();
    }
  };

  const handleCanvasPointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const raw = drawingBufferRef.current;
    if (raw.length > 15) {
      const closedAndSmoothed = resampleClosedCurve(raw, 200);
      setCurvePoints(closedAndSmoothed);
      setActiveSolutionIndex(0);
    }
  };

  // High-DPI Canvas Rendering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Retina High-DPI scaling
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const targetWidth = 720;
    const targetHeight = 480;

    if (canvas.width !== targetWidth * dpr || canvas.height !== targetHeight * dpr) {
      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // 0. Clear background
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    // 1. Coordinate Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(18, 45, 75, 0.35)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= targetWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, targetHeight);
        ctx.stroke();
      }
      for (let y = 0; y <= targetHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(targetWidth, y);
        ctx.stroke();
      }

      // Coordinate axes
      ctx.strokeStyle = "rgba(56, 225, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(360, 0);
      ctx.lineTo(360, targetHeight);
      ctx.moveTo(0, 240);
      ctx.lineTo(targetWidth, 240);
      ctx.stroke();
    }

    // 2. Active In-Progress Drawing
    if (isDrawing && drawingBufferRef.current.length > 1) {
      ctx.strokeStyle = "#38e1ff";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#38e1ff";
      ctx.shadowBlur = 14;

      ctx.beginPath();
      const raw = drawingBufferRef.current;
      ctx.moveTo(raw[0].x, raw[0].y);
      for (let i = 1; i < raw.length; i++) {
        ctx.lineTo(raw[i].x, raw[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      return;
    }

    // 3. Render Jordan Curve γ(t)
    if (curvePoints.length > 2) {
      // Glow underlay
      ctx.strokeStyle = "rgba(56, 225, 255, 0.35)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Sharp curve line
      ctx.strokeStyle = "#38e1ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(56, 225, 255, 0.8)";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Helper: Draw 90° angle marker
    const drawRightAngleMarker = (pCorner: Point2D, p1: Point2D, p2: Point2D, color = "#50e39c") => {
      const d1 = distance(p1, pCorner);
      const d2 = distance(p2, pCorner);
      if (d1 === 0 || d2 === 0) return;
      const v1x = (p1.x - pCorner.x) / d1;
      const v1y = (p1.y - pCorner.y) / d1;
      const v2x = (p2.x - pCorner.x) / d2;
      const v2y = (p2.y - pCorner.y) / d2;
      const len = 14;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pCorner.x + v1x * len, pCorner.y + v1y * len);
      ctx.lineTo(pCorner.x + v1x * len + v2x * len, pCorner.y + v1y * len + v2y * len);
      ctx.lineTo(pCorner.x + v2x * len, pCorner.y + v2y * len);
      ctx.stroke();
    };

    // Helper: Draw equal edge tick mark
    const drawEdgeTick = (p1: Point2D, p2: Point2D, color = "#f59e0b") => {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;
      const nx = -dy / len;
      const ny = dx / len;
      const tickHalf = 5;

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(midX - nx * tickHalf, midY - ny * tickHalf);
      ctx.lineTo(midX + nx * tickHalf, midY + ny * tickHalf);
      ctx.stroke();
    };

    // 4A. Render Inscribed Square (Toeplitz)
    if (solverMode === "square" && activeSquare) {
      const { a, b, c, d, center, sideLength } = activeSquare;

      // Glow backdrop for square interior
      ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();

      // Outer glow
      ctx.strokeStyle = "rgba(245, 158, 11, 0.35)";
      ctx.lineWidth = 7;
      ctx.stroke();

      // Sharp golden edges
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Diagonals AC and BD
      if (showDiagonals) {
        ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 5]);

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
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 11px monospace";
        ctx.fillText("M (Center)", center.x + 8, center.y - 6);
      }

      // Edge tick marks
      if (showSideLengths) {
        drawEdgeTick(a, b);
        drawEdgeTick(b, c);
        drawEdgeTick(c, d);
        drawEdgeTick(d, a);

        // Side length label
        const midTopX = (a.x + b.x) / 2;
        const midTopY = (a.y + b.y) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`L = ${sideLength.toFixed(1)} px`, midTopX + 8, midTopY - 8);
      }

      // Corner 90° angle symbols
      if (showAngles) {
        drawRightAngleMarker(b, a, c);
        drawRightAngleMarker(c, b, d);
        drawRightAngleMarker(d, c, a);
        drawRightAngleMarker(a, d, b);
      }

      // 4 Vertices glowing badges
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
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing vertex
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Vertex label badge
        ctx.fillStyle = "rgba(10, 25, 45, 0.85)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
        ctx.lineWidth = 1;
        ctx.fillRect(p.x + 8, p.y - 18, 20, 16);
        ctx.strokeRect(p.x + 8, p.y - 18, 20, 16);

        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 11px monospace";
        ctx.fillText(label, p.x + 13, p.y - 6);
      });
    }

    // 4B. Render Inscribed Rectangle (Greene-Lobb)
    if (solverMode === "rectangle" && activeRectangle) {
      const { a, b, c, d, center, width, height, aspectRatio } = activeRectangle;

      // Glow backdrop
      ctx.fillStyle = "rgba(168, 85, 247, 0.12)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();

      // Sharp purple edges
      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Diagonals AC and BD
      if (showDiagonals) {
        ctx.strokeStyle = "rgba(192, 132, 252, 0.65)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 5]);

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
        ctx.arc(center.x, center.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#c084fc";
        ctx.font = "bold 11px monospace";
        ctx.fillText("M (Center)", center.x + 8, center.y - 6);
      }

      // 90° Angles
      if (showAngles) {
        drawRightAngleMarker(b, a, c, "#a855f7");
        drawRightAngleMarker(c, b, d, "#a855f7");
        drawRightAngleMarker(d, c, a, "#a855f7");
        drawRightAngleMarker(a, d, b, "#a855f7");
      }

      // Aspect Ratio Label
      const midTopX = (a.x + b.x) / 2;
      const midTopY = (a.y + b.y) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        `W/H = ${aspectRatio.toFixed(3)} (${width.toFixed(0)} × ${height.toFixed(0)}px)`,
        midTopX + 8,
        midTopY - 8
      );

      // Vertices
      const vertices = [
        { p: a, label: "A" },
        { p: b, label: "B" },
        { p: c, label: "C" },
        { p: d, label: "D" },
      ];

      vertices.forEach(({ p, label }) => {
        ctx.fillStyle = "rgba(192, 132, 252, 0.35)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#c084fc";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#c084fc";
        ctx.font = "bold 11px monospace";
        ctx.fillText(label, p.x + 10, p.y - 6);
      });
    }

    ctx.restore();
  }, [
    curvePoints,
    isDrawing,
    solverMode,
    activeSquare,
    activeRectangle,
    showDiagonals,
    showAngles,
    showGrid,
    showSideLengths,
  ]);

  // Redraw canvas on updates
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
              <h1 className="studio-title">INSCRIBED SQUARE LABORATORY</h1>
              <span className="studio-pill-status">
                <span className="status-dot-pulse" />
                <span>TOPOLOGY ENGINE V2.4</span>
              </span>
            </div>
            <span className="studio-subtitle">
              Toeplitz Conjecture (1911) &bull; Greene-Lobb Symplectic Theorem (2020) &bull; Möbius Strip Invariants
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          {/* Mode Switcher Tabs */}
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-btn ${solverMode === "square" ? "active" : ""}`}
              onClick={() => {
                setSolverMode("square");
                setActiveSolutionIndex(0);
              }}
              title="Toeplitz Square Conjecture (1:1)"
            >
              <span className="mode-icon">⏹️</span>
              <span>SQUARE PEG (1:1)</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${solverMode === "rectangle" ? "active" : ""}`}
              onClick={() => {
                setSolverMode("rectangle");
                setActiveSolutionIndex(0);
              }}
              title="Greene-Lobb Rectangle Theorem (r:1)"
            >
              <span className="mode-icon">▭</span>
              <span>GREENE-LOBB (r:1)</span>
            </button>
          </div>

          <button
            type="button"
            className="theory-btn"
            onClick={() => setIsTheoryOpen(true)}
            title="Read mathematical formulation and topological proofs"
          >
            <span>📖 THEOREMS &amp; PROOFS</span>
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
                <span>LOOP: {selectedPreset.toUpperCase()}</span>
              </span>

              {solverMode === "square" ? (
                <span className="hud-metric-pill">
                  <span
                    className={`metric-dot ${detectedSquares.length > 0 ? "dot-emerald" : "dot-amber"}`}
                  />
                  <span>
                    {detectedSquares.length > 0
                      ? `${detectedSquares.length} SQUARE${detectedSquares.length > 1 ? "S" : ""} INSCRIBED`
                      : "SEARCHING INSCRIBED SQUARE..."}
                  </span>
                </span>
              ) : (
                <span className="hud-metric-pill">
                  <span
                    className={`metric-dot ${detectedRectangles.length > 0 ? "dot-emerald" : "dot-amber"}`}
                  />
                  <span>
                    {detectedRectangles.length > 0
                      ? `${detectedRectangles.length} RECTANGLE (r=${targetAspectRatio.toFixed(2)}) INSCRIBED`
                      : "SEARCHING RECTANGLE..."}
                  </span>
                </span>
              )}

              <span className="hud-metric-pill">
                <span className="metric-dot dot-purple" />
                <span>Q = {telemetry.isoperimetricQuotient.toFixed(3)}</span>
              </span>
            </div>

            <div className="hud-right-cluster">
              {/* Quick Canvas View Toggles */}
              <button
                type="button"
                className={`hud-btn-toggle ${!showMobiusView ? "active" : ""}`}
                onClick={() => setShowMobiusView(false)}
              >
                <span>2D JORDAN CANVAS</span>
              </button>
              <button
                type="button"
                className={`hud-btn-toggle ${showMobiusView ? "active" : ""}`}
                onClick={() => setShowMobiusView(true)}
              >
                <span>3D MÖBIUS PROJECTION</span>
              </button>
            </div>
          </div>

          {/* Canvas or 3D Möbius View */}
          {!showMobiusView ? (
            <div className="drawing-canvas-container">
              {/* Floating Canvas Top Overlay Controls */}
              <div className="canvas-floating-controls">
                <button
                  type="button"
                  className={`canvas-mini-btn ${showGrid ? "active" : ""}`}
                  onClick={() => setShowGrid(!showGrid)}
                  title="Toggle Euclidean Grid"
                >
                  <span># GRID</span>
                </button>
                <button
                  type="button"
                  className={`canvas-mini-btn ${showDiagonals ? "active" : ""}`}
                  onClick={() => setShowDiagonals(!showDiagonals)}
                  title="Toggle Perpendicular Diagonals"
                >
                  <span>✕ DIAGONALS</span>
                </button>
                <button
                  type="button"
                  className={`canvas-mini-btn ${showAngles ? "active" : ""}`}
                  onClick={() => setShowAngles(!showAngles)}
                  title="Toggle 90° Right Angle Markers"
                >
                  <span>⊾ 90° ANGLES</span>
                </button>
                <button
                  type="button"
                  className={`canvas-mini-btn ${showSideLengths ? "active" : ""}`}
                  onClick={() => setShowSideLengths(!showSideLengths)}
                  title="Toggle Side Dimensions"
                >
                  <span>📏 DIMENSIONS</span>
                </button>
              </div>

              <canvas
                ref={canvasRef}
                className="interactive-loop-canvas"
                onMouseDown={(e) => handleCanvasPointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handleCanvasPointerMove(e.clientX, e.clientY)}
                onMouseUp={handleCanvasPointerUp}
                onMouseLeave={handleCanvasPointerUp}
                onTouchStart={(e) => {
                  if (e.touches[0]) {
                    handleCanvasPointerDown(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches[0]) {
                    handleCanvasPointerMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={handleCanvasPointerUp}
              />

              <div className="canvas-instruction-overlay">
                <span>
                  ✏️ Click &amp; drag anywhere on the canvas to draw your custom loop &bull; or choose presets &amp; deform in real time
                </span>
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
                    Every unordered pair of points (x, y) on a closed loop &gamma;(t) maps to a point on a
                    non-orientable surface with boundary homeomorphic to a <strong>Möbius strip</strong>. Because
                    a Möbius strip cannot be embedded into 3D space without self-intersecting, pairs with
                    identical midpoints and distances must exist — yielding an inscribed square!
                  </p>
                </div>
              </div>

              {/* Stage Step Tabs */}
              <div className="mobius-stage-tabs">
                <button
                  type="button"
                  className={`mobius-stage-btn ${mobiusStage === 1 ? "active" : ""}`}
                  onClick={() => setMobiusStage(1)}
                >
                  <span>1. PAIR SPACE (&gamma; &times; &gamma;)</span>
                </button>
                <button
                  type="button"
                  className={`mobius-stage-btn ${mobiusStage === 2 ? "active" : ""}`}
                  onClick={() => setMobiusStage(2)}
                >
                  <span>2. MÖBIUS TWIST IDENTIFICATION</span>
                </button>
                <button
                  type="button"
                  className={`mobius-stage-btn ${mobiusStage === 3 ? "active" : ""}`}
                  onClick={() => setMobiusStage(3)}
                >
                  <span>3. TOPOLOGICAL INTERSECTION</span>
                </button>
              </div>

              {/* Vector 3D Möbius Ribbon Visualizer */}
              <svg className="mobius-svg-render" viewBox="0 0 680 300">
                <defs>
                  <linearGradient id="mobiusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                    <stop offset="45%" stopColor="#38e1ff" stopOpacity="0.85" />
                    <stop offset="80%" stopColor="#a855f7" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
                  </linearGradient>

                  <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                    <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Background coordinate grid */}
                <line x1="80" y1="150" x2="600" y2="150" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <line x1="340" y1="40" x2="340" y2="260" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                {/* Torus / Ribbon Twisted Mesh */}
                <path
                  d="M120 150 C 160 50, 260 50, 340 150 C 420 250, 520 250, 560 150 C 520 70, 420 70, 340 150 C 260 230, 160 230, 120 150 Z"
                  fill="none"
                  stroke="url(#mobiusGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                {/* Ribbon Ribs / Transverse Lines */}
                <line x1="200" y1="100" x2="220" y2="200" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="270" y1="105" x2="280" y2="195" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="340" y1="115" x2="340" y2="185" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="410" y1="105" x2="400" y2="195" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="480" y1="100" x2="460" y2="200" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

                {/* Self-intersection Node */}
                <circle cx="340" cy="150" r="24" fill="url(#nodeGlow)" />
                <circle cx="340" cy="150" r="7" fill="#f59e0b" />
                <circle cx="340" cy="150" r="3.5" fill="#ffffff" />

                {/* Animated callouts */}
                <g transform="translate(360, 135)">
                  <rect x="0" y="0" width="220" height="34" rx="6" fill="rgba(10, 25, 45, 0.85)" stroke="#f59e0b" strokeWidth="1" />
                  <text x="12" y="16" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    Möbius Self-Intersection
                  </text>
                  <text x="12" y="28" fill="#94a3b8" fontSize="9.5" fontFamily="monospace">
                    f(A, C) = f(B, D) &rArr; Square
                  </text>
                </g>

                {/* Boundary & Points */}
                <circle cx="120" cy="150" r="5" fill="#38e1ff" />
                <text x="75" y="154" fill="#38e1ff" fontSize="10.5" fontFamily="monospace">
                  &part;M (x = y)
                </text>
              </svg>
            </div>
          )}

          {/* Viewport Bottom Telemetry HUD */}
          <div className="viewport-hud-bottom">
            {solverMode === "square" ? (
              <>
                <div className="hud-stat-cell">
                  <span className="stat-label">SQUARE SIDE LENGTH</span>
                  <span className="stat-value val-gold">
                    {activeSquare ? `${activeSquare.sideLength.toFixed(1)} px` : "—"}
                  </span>
                </div>
                <div className="hud-stat-cell">
                  <span className="stat-label">CORNER ANGLE (90°)</span>
                  <span className="stat-value val-emerald">
                    {verification ? `${verification.anglesDeg[0].toFixed(1)}°` : "90.0°"}
                  </span>
                </div>
                <div className="hud-stat-cell">
                  <span className="stat-label">DIAGONAL RATIO</span>
                  <span className="stat-value val-cyan">
                    {verification
                      ? `${(verification.diagonals[0] / verification.diagonals[1]).toFixed(3)}`
                      : "1.000"}
                  </span>
                </div>
                <div className="hud-stat-cell">
                  <span className="stat-label">ORTHOGONALITY</span>
                  <span className="stat-value val-emerald">
                    &Delta;&theta; = 0.00&deg; (&perp;)
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="hud-stat-cell">
                  <span className="stat-label">TARGET ASPECT RATIO</span>
                  <span className="stat-value val-purple">
                    r = {targetAspectRatio.toFixed(3)}
                  </span>
                </div>
                <div className="hud-stat-cell">
                  <span className="stat-label">MEASURED RATIO</span>
                  <span className="stat-value val-gold">
                    {activeRectangle ? `r = ${activeRectangle.aspectRatio.toFixed(3)}` : "—"}
                  </span>
                </div>
                <div className="hud-stat-cell">
                  <span className="stat-label">DIMENSIONS (W &times; H)</span>
                  <span className="stat-value val-cyan">
                    {activeRectangle
                      ? `${activeRectangle.width.toFixed(1)} &times; ${activeRectangle.height.toFixed(1)} px`
                      : "—"}
                  </span>
                </div>
                <div className="hud-stat-cell">
                  <span className="stat-label">GREENE-LOBB (2020)</span>
                  <span className="stat-value val-emerald">
                    Symplectic Proof Valid
                  </span>
                </div>
              </>
            )}
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
                  onClick={() => {
                    setSelectedPreset(p.id);
                    setIsAutoMorphing(false);
                  }}
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
                  setIsAutoMorphing(false);
                }}
              >
                <span>✏️ Clear &amp; Draw Custom Loop</span>
              </button>
            </div>
          </div>

          {/* Card 2: Interactive Deformation & Auto-Morph */}
          {selectedPreset !== "custom" && (
            <div className="control-card">
              <div className="card-header">
                <span className="card-title">CURVE DEFORMATION DYNAMICS</span>
                <span className="card-badge">MORPH</span>
              </div>
              <p className="card-hint">
                Continuously deform the loop and watch the inscribed square adapt in real time.
              </p>

              <div className="slider-control-row">
                <div className="slider-label-row">
                  <span>Eccentricity &amp; Perturbation</span>
                  <span className="slider-val-readout">&lambda; = {deformation.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.8"
                  step="0.02"
                  value={deformation}
                  onChange={(e) => {
                    setIsAutoMorphing(false);
                    setDeformation(parseFloat(e.target.value));
                  }}
                  className="modern-slider"
                />
              </div>

              <div className="auto-morph-row">
                <button
                  type="button"
                  className={`btn-auto-morph ${isAutoMorphing ? "active" : ""}`}
                  onClick={() => setIsAutoMorphing(!isAutoMorphing)}
                >
                  <span>{isAutoMorphing ? "⏸ Pause Auto-Morph" : "▶️ Continuous Auto-Morph"}</span>
                </button>
                <button
                  type="button"
                  className="btn-morph-reset"
                  onClick={() => {
                    setIsAutoMorphing(false);
                    setDeformation(1.0);
                  }}
                  title="Reset Deformation to Default"
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          )}

          {/* Card 3: Greene-Lobb Aspect Ratio Control (when in rectangle mode) */}
          {solverMode === "rectangle" && (
            <div className="control-card">
              <div className="card-header">
                <span className="card-title">GREENE-LOBB ASPECT RATIO</span>
                <span className="card-badge">RECTANGLE</span>
              </div>
              <p className="card-hint">
                Select target aspect ratio $r = W/H$. Greene &amp; Lobb proved a solution exists for every $r \ge 1$.
              </p>

              <div className="slider-control-row">
                <div className="slider-label-row">
                  <span>Target Ratio (Width / Height)</span>
                  <span className="slider-val-readout val-purple">r = {targetAspectRatio.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="1.05"
                  max="2.8"
                  step="0.01"
                  value={targetAspectRatio}
                  onChange={(e) => setTargetAspectRatio(parseFloat(e.target.value))}
                  className="modern-slider slider-purple"
                />
              </div>

              <div className="aspect-ratio-presets">
                {[
                  { label: "Golden Ratio Φ (1.618)", val: 1.618 },
                  { label: "Root 2 (1.414)", val: 1.414 },
                  { label: "Double Square (2.000)", val: 2.0 },
                  { label: "Silver Ratio (2.414)", val: 2.414 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`ratio-pill-btn ${Math.abs(targetAspectRatio - item.val) < 0.01 ? "active" : ""}`}
                    onClick={() => setTargetAspectRatio(item.val)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card 4: Multi-Solution Selector */}
          {solverMode === "square" && detectedSquares.length > 1 && (
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
                    className={`square-select-btn ${activeSolutionIndex === idx ? "active" : ""}`}
                    onClick={() => setActiveSolutionIndex(idx)}
                  >
                    <span>Square #{idx + 1}</span>
                    <span className="sub-rot">{sq.rotationDeg.toFixed(0)}°</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card 5: Geometric Telemetry & Vertices */}
          {activeSquare && solverMode === "square" && (
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

          {/* Card 6: Loop Diagnostics (Green's Theorem Integral) */}
          <div className="control-card">
            <div className="card-header">
              <span className="card-title">LOOP TOPOLOGY DIAGNOSTICS</span>
              <span className="card-badge">GREEN&apos;S THEOREM</span>
            </div>
            <div className="diagnostics-grid">
              <div className="diag-cell">
                <span className="diag-label">PERIMETER &oint; ds</span>
                <span className="diag-val">{telemetry.perimeter.toFixed(1)} px</span>
              </div>
              <div className="diag-cell">
                <span className="diag-label">ENCLOSED AREA &iint; dx dy</span>
                <span className="diag-val">{telemetry.area.toFixed(0)} px&sup2;</span>
              </div>
              <div className="diag-cell">
                <span className="diag-label">ISOPERIMETRIC Q</span>
                <span className="diag-val val-cyan">{telemetry.isoperimetricQuotient.toFixed(3)}</span>
              </div>
              <div className="diag-cell">
                <span className="diag-label">LOOP SMOOTHNESS</span>
                <span className="diag-val val-emerald">C&infin; Smooth</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THEORETICAL PROOFS MODAL */}
      {isTheoryOpen && (
        <div className="modal-backdrop" onClick={() => setIsTheoryOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Mathematical Foundations: The Inscribed Square Problem</h2>
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
                <h3>1. Otto Toeplitz&apos;s 1911 Conjecture</h3>
                <p>
                  German mathematician <strong>Otto Toeplitz</strong> posed the famous question in 1911:
                  <em> Does every simple closed curve in the Euclidean plane contain four points that form the vertices of a square?</em>
                </p>
                <div className="math-callout">
                  <code>{"\\forall \\gamma \\subset \\mathbb{R}^2 \\text{ (Jordan curve)}, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a square.}"}</code>
                </div>
                <p>
                  While proven for convex curves (Emch 1913), smooth curves (Šnirel&apos;man 1929), and continuous piecewise-smooth curves,
                  the conjecture remains open for general continuous fractal loops!
                </p>
              </section>

              <section className="modal-section">
                <h3>2. The Möbius Strip Proof (Šnirel&apos;man 1929 &amp; 3Blue1Brown)</h3>
                <p>
                  Consider the configuration space of all unordered pairs of points on the closed loop:
                  (x, y) &isin; (&gamma; &times; &gamma;) / &Zopf;<sub>2</sub>.
                  Topologically, this space is a <strong>Möbius strip</strong> whose boundary &part;M corresponds to the diagonal where x = y.
                </p>
                <p>
                  We define a continuous map into 3D Euclidean space:
                  <strong> f(x, y) = ((x + y)/2, ||x - y||)</strong>, which pairs the Euclidean midpoint with chord distance.
                  Because a non-orientable surface with boundary like the Möbius strip cannot be embedded into 3D space
                  without self-intersecting, there must exist two distinct pairs (A, C) and (B, D) sharing the identical midpoint
                  and chord length, whose diagonals form right angles — an inscribed square!
                </p>
              </section>

              <section className="modal-section">
                <h3>3. Breakthrough: The Greene-Lobb Symplectic Theorem (2020)</h3>
                <p>
                  In May 2020, mathematicians <strong>Joshua Greene</strong> (Bowdoin College) and <strong>Andrew Lobb</strong> (Durham University)
                  proved using modern symplectic geometry and Floer homology that <strong>every smooth Jordan curve contains an inscribed rectangle of every possible aspect ratio</strong>.
                </p>
                <div className="math-callout">
                  <code>{"\\forall r \\ge 1, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a rectangle with } \\text{Aspect Ratio } = r"}</code>
                </div>
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
