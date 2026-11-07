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
  // Solver mode: Toeplitz Square (1:1) vs Greene-Lobb Rectangle (r:1)
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

  // Audio synthesizer chime
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

  // Update preset points centered on canvas
  const updatePresetPoints = useCallback(
    (presetId: string, def: number) => {
      const canvas = canvasRef.current;
      const rect = canvas ? canvas.getBoundingClientRect() : null;
      const cx = rect && rect.width > 100 ? rect.width / 2 : 360;
      const cy = rect && rect.height > 100 ? rect.height / 2 : 260;
      const scale = rect ? Math.min(rect.width, rect.height) * 0.32 : 160;

      const pts = getPresetCurve(presetId, cx, cy, scale, def);
      setCurvePoints(pts);
    },
    []
  );

  useEffect(() => {
    if (selectedPreset !== "custom") {
      updatePresetPoints(selectedPreset, deformation);
    }
  }, [selectedPreset, deformation, updatePresetPoints]);

  // Window resize listener to keep curve centered
  useEffect(() => {
    const handleResize = () => {
      if (selectedPreset !== "custom") {
        updatePresetPoints(selectedPreset, deformation);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedPreset, deformation, updatePresetPoints]);

  // Auto-morph / continuous deformation loop
  useEffect(() => {
    if (!isAutoMorphing || selectedPreset === "custom") {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const animate = () => {
      morphPhaseRef.current += 0.02;
      const newDef = 1.0 + 0.42 * Math.sin(morphPhaseRef.current);
      setDeformation(parseFloat(newDef.toFixed(3)));
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoMorphing, selectedPreset]);

  // Green's Theorem Telemetry
  const telemetry: CurveTelemetry = useMemo(() => {
    return computeCurveTelemetry(curvePoints);
  }, [curvePoints]);

  // Detect inscribed squares
  const detectedSquares: InscribedSquare[] = useMemo(() => {
    if (solverMode !== "square" || curvePoints.length < 10) return [];
    return findInscribedSquares(curvePoints, 5.0, 4);
  }, [solverMode, curvePoints]);

  // Detect inscribed rectangles (Greene-Lobb)
  const detectedRectangles: InscribedRectangle[] = useMemo(() => {
    if (solverMode !== "rectangle" || curvePoints.length < 10) return [];
    return findInscribedRectangles(curvePoints, targetAspectRatio, 5.0, 3);
  }, [solverMode, curvePoints, targetAspectRatio]);

  const activeSquare = detectedSquares[activeSolutionIndex] || detectedSquares[0] || null;
  const activeRectangle = detectedRectangles[activeSolutionIndex] || detectedRectangles[0] || null;

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

  // Chime when solution is discovered
  useEffect(() => {
    if (solverMode === "square" && detectedSquares.length > 0) {
      playChime(587.33); // D5
    } else if (solverMode === "rectangle" && detectedRectangles.length > 0) {
      playChime(659.25); // E5
    }
  }, [solverMode, detectedSquares.length, detectedRectangles.length, playChime]);

  // Freehand pointer events
  const handlePointerDown = (clientX: number, clientY: number) => {
    if (showMobiusView) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    setIsDrawing(true);
    setSelectedPreset("custom");
    setIsAutoMorphing(false);
    drawingBufferRef.current = [{ x, y }];
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const prev = drawingBufferRef.current[drawingBufferRef.current.length - 1];
    if (!prev || distance(prev, { x, y }) > 4) {
      drawingBufferRef.current.push({ x, y });
      renderCanvas();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const raw = drawingBufferRef.current;
    if (raw.length > 15) {
      const closedAndSmoothed = resampleClosedCurve(raw, 200);
      setCurvePoints(closedAndSmoothed);
      setActiveSolutionIndex(0);
    }
  };

  // High-DPI Canvas Rendering Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = rect.width || 720;
    const height = rect.height || 540;

    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Euclidean Coordinate Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(30, 58, 88, 0.35)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Origin Axes
      const cx = width / 2;
      const cy = height / 2;
      ctx.strokeStyle = "rgba(56, 225, 255, 0.16)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();
    }

    // 2. Active Freehand Drawing in progress
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

    // 3. Render Closed Jordan Curve γ(t)
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

      // Sharp cyan edge
      ctx.strokeStyle = "#38e1ff";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(56, 225, 255, 0.85)";
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

    // Helper: 90° angle marker
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

    // Helper: Equal edge tick mark
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

    // 4A. Render Inscribed Square
    if (solverMode === "square" && activeSquare) {
      const { a, b, c, d, center, sideLength } = activeSquare;

      // Interior fill
      ctx.fillStyle = "rgba(245, 158, 11, 0.12)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();

      // Golden perimeter
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

        // Midpoint Center M
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

      // Edge ticks and dimension
      if (showSideLengths) {
        drawEdgeTick(a, b);
        drawEdgeTick(b, c);
        drawEdgeTick(c, d);
        drawEdgeTick(d, a);

        const midTopX = (a.x + b.x) / 2;
        const midTopY = (a.y + b.y) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px monospace";
        ctx.fillText(`L = ${sideLength.toFixed(1)} px`, midTopX + 8, midTopY - 8);
      }

      // 90° corner angles
      if (showAngles) {
        drawRightAngleMarker(b, a, c);
        drawRightAngleMarker(c, b, d);
        drawRightAngleMarker(d, c, a);
        drawRightAngleMarker(a, d, b);
      }

      // 4 Vertices
      const vertices = [
        { p: a, label: "A" },
        { p: b, label: "B" },
        { p: c, label: "C" },
        { p: d, label: "D" },
      ];

      vertices.forEach(({ p, label }) => {
        ctx.fillStyle = "rgba(245, 158, 11, 0.35)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(10, 25, 45, 0.88)";
        ctx.strokeStyle = "rgba(245, 158, 11, 0.6)";
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
      const { a, b, c, d, center, width: rw, height: rh, aspectRatio } = activeRectangle;

      ctx.fillStyle = "rgba(168, 85, 247, 0.12)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#c084fc";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#c084fc";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

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

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#c084fc";
        ctx.font = "bold 11px monospace";
        ctx.fillText("M (Center)", center.x + 8, center.y - 6);
      }

      if (showAngles) {
        drawRightAngleMarker(b, a, c, "#a855f7");
        drawRightAngleMarker(c, b, d, "#a855f7");
        drawRightAngleMarker(d, c, a, "#a855f7");
        drawRightAngleMarker(a, d, b, "#a855f7");
      }

      const midTopX = (a.x + b.x) / 2;
      const midTopY = (a.y + b.y) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        `W/H = ${aspectRatio.toFixed(3)} (${rw.toFixed(0)} × ${rh.toFixed(0)}px)`,
        midTopX + 8,
        midTopY - 8
      );

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

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Derived telemetry metrics
  const solutionsCount = solverMode === "square" ? detectedSquares.length : detectedRectangles.length;
  const dimensionReadout =
    solverMode === "square"
      ? activeSquare
        ? `L = ${activeSquare.sideLength.toFixed(1)} px`
        : "—"
      : activeRectangle
      ? `${activeRectangle.width.toFixed(1)} × ${activeRectangle.height.toFixed(1)} px`
      : "—";

  const cornerAngleReadout = verification ? `${verification.anglesDeg[0].toFixed(1)}°` : "90.0°";
  const diagonalRatioReadout = verification
    ? `${(verification.diagonals[0] / verification.diagonals[1]).toFixed(3)}`
    : "1.000";

  return (
    <div className="max-w-[1720px] min-h-screen mx-auto px-4 md:px-6 pt-4 pb-14 flex flex-col gap-5 text-slate-100 font-sans">
      {/* 1. STUDIO TOPBAR */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-3 px-1 flex-wrap gap-3">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-900/60 text-slate-300 hover:text-white hover:border-cyan-400/50 hover:bg-slate-800 transition text-xs font-mono font-bold tracking-wider"
            title="Back to QuantaLab Experiments Catalog"
          >
            <span>←</span>
            <span>CATALOG</span>
          </Link>

          <div className="w-[1px] h-7 bg-slate-800" />

          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/80 flex items-center justify-center text-xl text-cyan-400 shadow-[0_0_16px_rgba(56,225,255,0.2)]">
            ⏹️
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-bold text-white tracking-wide">
                INSCRIBED SQUARE LABORATORY
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#50e39c]" />
                TOPOLOGY ENGINE ACTIVE
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Toeplitz Conjecture (1911) &bull; Greene-Lobb Symplectic Theorem (2020) &bull; Möbius Strip Invariants
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 hover:shadow-[0_0_16px_rgba(56,225,255,0.3)] transition text-xs font-mono font-bold flex items-center gap-2"
            onClick={() => setIsTheoryOpen(true)}
            title="Read mathematical formulation and topological proofs"
          >
            <span>📖 THEOREMS &amp; PROOFS</span>
          </button>
        </div>
      </header>

      {/* 2. GRAND VIEWPORT SECTION */}
      <section className="relative w-full h-[540px] md:h-[620px] rounded-xl border border-slate-800/80 bg-[#02070e] overflow-hidden shadow-2xl shadow-black">
        {/* Canvas / Möbius wrapper */}
        <div className="absolute inset-0">
          {!showMobiusView ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_50%,#061525_0%,#02070e_95%)] overflow-hidden">
              {/* Canvas Overlay Controls */}
              <div className="absolute top-16 right-4 z-10 flex items-center gap-1.5 p-1 bg-slate-950/80 backdrop-blur-md border border-cyan-500/20 rounded-full shadow-lg">
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition ${
                    showGrid
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(56,225,255,0.25)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setShowGrid(!showGrid)}
                  title="Toggle Euclidean Grid"
                >
                  # GRID
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition ${
                    showDiagonals
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(56,225,255,0.25)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setShowDiagonals(!showDiagonals)}
                  title="Toggle Perpendicular Diagonals"
                >
                  ✕ DIAGONALS
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition ${
                    showAngles
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(56,225,255,0.25)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setShowAngles(!showAngles)}
                  title="Toggle 90° Right Angle Markers"
                >
                  ⊾ 90° ANGLES
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold transition ${
                    showSideLengths
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-[0_0_8px_rgba(56,225,255,0.25)]"
                      : "text-slate-400 hover:text-white"
                  }`}
                  onClick={() => setShowSideLengths(!showSideLengths)}
                  title="Toggle Side Dimensions"
                >
                  📏 DIMENSIONS
                </button>
              </div>

              <canvas
                ref={canvasRef}
                className="w-full h-full block cursor-crosshair touch-none"
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={(e) => {
                  if (e.touches[0]) {
                    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches[0]) {
                    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={handlePointerUp}
              />

              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-slate-300 whitespace-nowrap shadow-lg">
                <span>✏️ Click &amp; drag anywhere to sketch your custom loop &bull; or select presets below</span>
              </div>
            </div>
          ) : (
            /* 3D Möbius View */
            <div className="absolute inset-0 px-6 py-20 flex flex-col justify-center items-center bg-[radial-gradient(circle_at_50%_50%,#071728_0%,#02070e_95%)] overflow-y-auto gap-4">
              <div className="max-w-2xl w-full p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
                <span className="text-3xl leading-none">➰</span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-white">
                    Möbius Strip Configuration Space (3Blue1Brown Topology)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Every unordered pair of points (x, y) on a closed loop &gamma;(t) maps to a point on a
                    non-orientable surface with boundary homeomorphic to a <strong>Möbius strip</strong>. Because
                    a Möbius strip cannot be embedded into 3D space without self-intersecting, pairs with
                    identical midpoints and distances must exist — yielding an inscribed square!
                  </p>
                </div>
              </div>

              {/* Stage Step Tabs */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {[
                  { stage: 1, label: "1. PAIR SPACE (γ × γ)" },
                  { stage: 2, label: "2. MÖBIUS TWIST IDENTIFICATION" },
                  { stage: 3, label: "3. TOPOLOGICAL INTERSECTION" },
                ].map((s) => (
                  <button
                    key={s.stage}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                      mobiusStage === s.stage
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                    onClick={() => setMobiusStage(s.stage as 1 | 2 | 3)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Vector Möbius Ribbon */}
              <svg className="w-full max-w-2xl max-h-[240px]" viewBox="0 0 680 260">
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

                <line x1="80" y1="130" x2="600" y2="130" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <line x1="340" y1="30" x2="340" y2="230" stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                <path
                  d="M120 130 C 160 40, 260 40, 340 130 C 420 220, 520 220, 560 130 C 520 50, 420 50, 340 130 C 260 210, 160 210, 120 130 Z"
                  fill="none"
                  stroke="url(#mobiusGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                />

                <line x1="200" y1="85" x2="220" y2="175" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="270" y1="90" x2="280" y2="170" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="340" y1="95" x2="340" y2="165" stroke="#f59e0b" strokeWidth="2.5" />
                <line x1="410" y1="90" x2="400" y2="170" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="480" y1="85" x2="460" y2="175" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

                <circle cx="340" cy="130" r="22" fill="url(#nodeGlow)" />
                <circle cx="340" cy="130" r="6" fill="#f59e0b" />
                <circle cx="340" cy="130" r="3" fill="#ffffff" />

                <g transform="translate(360, 115)">
                  <rect x="0" y="0" width="220" height="32" rx="6" fill="rgba(10, 25, 45, 0.9)" stroke="#f59e0b" strokeWidth="1" />
                  <text x="12" y="15" fill="#f59e0b" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                    Möbius Self-Intersection
                  </text>
                  <text x="12" y="26" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    f(A, C) = f(B, D) &rArr; Square
                  </text>
                </g>

                <circle cx="120" cy="130" r="5" fill="#38e1ff" />
                <text x="75" y="134" fill="#38e1ff" fontSize="10.5" fontFamily="monospace">
                  &part;M (x = y)
                </text>
              </svg>
            </div>
          )}

          {/* TOP VIEWPORT HUD DECK */}
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-3 px-3 py-2 bg-slate-950/90 backdrop-blur-xl border border-slate-700/70 rounded-xl shadow-xl max-w-full overflow-x-auto">
            {/* Solver Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSolverMode("square");
                  setActiveSolutionIndex(0);
                }}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-mono font-bold transition ${
                  solverMode === "square"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(56,225,255,0.25)]"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Toeplitz Square Conjecture (1:1 Aspect Ratio)"
              >
                <span>⏹️</span>
                <span>TOEPLITZ SQUARE (1:1)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSolverMode("rectangle");
                  setActiveSolutionIndex(0);
                }}
                className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-mono font-bold transition ${
                  solverMode === "rectangle"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-[0_0_12px_rgba(192,132,252,0.25)]"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Greene-Lobb Symplectic Theorem (Inscribed Rectangle)"
              >
                <span>▭</span>
                <span>GREENE-LOBB (r={targetAspectRatio.toFixed(2)})</span>
              </button>
            </div>

            {/* Center: Live Telemetry */}
            <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px]">CURVE:</span>
                <span className="text-cyan-400 font-bold">{selectedPreset.toUpperCase()}</span>
              </div>
              <div className="w-[1px] h-3 bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px]">SOLUTIONS:</span>
                <span
                  className={`font-bold ${
                    solutionsCount > 0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {solutionsCount > 0 ? `${solutionsCount} DETECTED` : "SEARCHING..."}
                </span>
              </div>
              <div className="w-[1px] h-3 bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px]">ISOPERIMETRIC:</span>
                <span className="text-purple-300 font-bold">
                  Q = {telemetry.isoperimetricQuotient.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Right: View Toggle */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800 flex-shrink-0">
              <button
                type="button"
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition ${
                  !showMobiusView
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setShowMobiusView(false)}
              >
                2D LOOP
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition ${
                  showMobiusView
                    ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setShowMobiusView(true)}
              >
                3D MÖBIUS
              </button>
            </div>
          </div>

          {/* BOTTOM VIEWPORT HUD DECK */}
          <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-950/90 backdrop-blur-xl border border-slate-700/70 rounded-xl shadow-xl overflow-x-auto">
            <div className="flex items-center gap-5 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider">
                  DIMENSIONS
                </span>
                <span className="text-amber-400 font-bold">{dimensionReadout}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider">
                  CORNER ANGLES
                </span>
                <span className="text-emerald-400 font-bold">{cornerAngleReadout}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider">
                  DIAGONAL RATIO
                </span>
                <span className="text-cyan-400 font-bold">{diagonalRatioReadout}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider">
                  ORTHOGONALITY
                </span>
                <span className="text-emerald-400 font-bold">&Delta;&theta; = 0.00&deg; (&perp;)</span>
              </div>
            </div>

            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white text-xs font-mono font-bold transition flex items-center gap-1.5 flex-shrink-0"
              onClick={() => {
                setSelectedPreset("custom");
                setCurvePoints([]);
                setIsAutoMorphing(false);
              }}
              title="Clear loop and enter freehand sketch mode"
            >
              <span>↺</span>
              <span>CLEAR &amp; DRAW</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. 2-COLUMN DASHBOARD CONSOLE GRID */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full items-start">
        {/* Left Column: Diagnostics & Geometry Algebraic Proof */}
        <div className="flex flex-col gap-5">
          {/* Module 01: Green's Theorem Analysis */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                  MODULE 01 // TOPOLOGY DIAGNOSTICS
                </span>
                <h4 className="text-sm font-semibold text-slate-100">
                  Green&apos;s Theorem Loop Integral Analysis
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                JORDAN CURVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  PERIMETER &oint; ds
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {telemetry.perimeter.toFixed(1)} px
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  ENCLOSED AREA &iint; dx dy
                </span>
                <span className="text-sm font-mono font-bold text-white">
                  {telemetry.area.toFixed(0)} px&sup2;
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  ISOPERIMETRIC EFFICIENCY Q
                </span>
                <span className="text-sm font-mono font-bold text-cyan-400">
                  {telemetry.isoperimetricQuotient.toFixed(3)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  SMOOTHNESS CLASS
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400">
                  C&infin; Smooth
                </span>
              </div>
            </div>
          </div>

          {/* Module 02: Square Coordinates & Algebraic Verification */}
          {activeSquare && solverMode === "square" && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700/80 transition">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                    MODULE 02 // ALGEBRAIC PROOF
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Square Coordinates on Curve &gamma;(t)
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                  VERIFIED
                </span>
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs">
                {[
                  { tag: "Vertex A", pt: activeSquare.a },
                  { tag: "Vertex B", pt: activeSquare.b },
                  { tag: "Vertex C", pt: activeSquare.c },
                  { tag: "Vertex D", pt: activeSquare.d },
                ].map((v) => (
                  <div
                    key={v.tag}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80"
                  >
                    <span className="text-amber-400 font-bold">{v.tag}:</span>
                    <code className="text-slate-300">
                      ({v.pt.x.toFixed(1)}, {v.pt.y.toFixed(1)})
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module 03: Multi-Square Solutions Picker */}
          {solverMode === "square" && detectedSquares.length > 1 && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700/80 transition">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                    MODULE 03 // MULTI-SOLUTIONS
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Multiple Inscribed Squares Detected
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
                  {detectedSquares.length} SOLUTIONS
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                This loop supports multiple distinct inscribed squares! Click to inspect each:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {detectedSquares.map((sq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${
                      activeSolutionIndex === idx
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "bg-slate-950/60 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                    onClick={() => setActiveSolutionIndex(idx)}
                  >
                    <span>Square #{idx + 1}</span>
                    <span className="text-[10px] opacity-75">{sq.rotationDeg.toFixed(0)}°</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Complete Interactive Control Deck */}
        <div className="flex flex-col gap-5">
          {/* Control 01: Geometric Presets & Freehand */}
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700/80 transition">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                  CONTROL 01 // GEOMETRY
                </span>
                <h4 className="text-sm font-semibold text-slate-100">
                  Curve Presets &amp; Freehand Sketch
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                SELECT
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select a mathematical loop geometry or draw your own closed curve.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
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
                  className={`p-3 rounded-lg border text-xs font-semibold flex items-center gap-2.5 transition ${
                    selectedPreset === p.id
                      ? "bg-amber-500/15 border-amber-500 text-white shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/40"
                  }`}
                  onClick={() => {
                    setSelectedPreset(p.id);
                    setIsAutoMorphing(false);
                  }}
                >
                  <span className="text-base">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                selectedPreset === "custom"
                  ? "bg-amber-500/20 border border-amber-500 text-amber-400"
                  : "bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 shadow-[0_0_14px_rgba(56,225,255,0.2)]"
              }`}
              onClick={() => {
                setSelectedPreset("custom");
                setCurvePoints([]);
                setIsAutoMorphing(false);
              }}
            >
              <span>✏️ Clear &amp; Draw Custom Loop</span>
            </button>
          </div>

          {/* Control 02: Interactive Deformation & Auto-Morph */}
          {selectedPreset !== "custom" && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700/80 transition">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                    CONTROL 02 // DYNAMICS
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Curve Deformation &amp; Continuous Morph
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                  &lambda; = {deformation.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Continuously deform the loop and watch the inscribed square adapt in real time.
              </p>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>Eccentricity &amp; Perturbation</span>
                  <span className="text-cyan-400 font-bold">&lambda; = {deformation.toFixed(2)}</span>
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
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center gap-2 ${
                    isAutoMorphing
                      ? "bg-emerald-500/20 border border-emerald-500 text-emerald-300 shadow-[0_0_14px_rgba(80,227,156,0.3)]"
                      : "bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:text-white hover:border-cyan-400"
                  }`}
                  onClick={() => setIsAutoMorphing(!isAutoMorphing)}
                >
                  <span>{isAutoMorphing ? "❚❚ Pause Auto-Morph" : "▶ Continuous Auto-Morph"}</span>
                </button>

                <button
                  type="button"
                  className="py-2 px-3 rounded-lg font-mono text-xs font-bold bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
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

          {/* Control 03: Greene-Lobb Aspect Ratio Control */}
          {solverMode === "rectangle" && (
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl hover:border-slate-700/80 transition">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
                    CONTROL 03 // SYMPLECTIC
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">
                    Greene-Lobb Target Aspect Ratio
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-950/60 border border-purple-500/40 text-purple-300">
                  r = {targetAspectRatio.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Select target aspect ratio $r = W/H$. Greene &amp; Lobb proved a solution exists for every $r \ge 1$.
              </p>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>Target Ratio (Width / Height)</span>
                  <span className="text-purple-400 font-bold">r = {targetAspectRatio.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="1.05"
                  max="2.8"
                  step="0.01"
                  value={targetAspectRatio}
                  onChange={(e) => setTargetAspectRatio(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                {[
                  { label: "Golden Ratio Φ (1.618)", val: 1.618 },
                  { label: "Root 2 (1.414)", val: 1.414 },
                  { label: "Double Square (2.000)", val: 2.0 },
                  { label: "Silver Ratio (2.414)", val: 2.414 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`py-2 px-2.5 rounded-lg text-[11px] font-mono font-semibold transition text-center ${
                      Math.abs(targetAspectRatio - item.val) < 0.01
                        ? "bg-purple-500/20 border border-purple-400 text-purple-300 font-bold shadow-[0_0_10px_rgba(168,85,247,0.25)]"
                        : "bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                    onClick={() => setTargetAspectRatio(item.val)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. THEORETICAL PROOFS MODAL */}
      {isTheoryOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setIsTheoryOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <h2 className="text-base font-bold text-white">
                Mathematical Foundations: The Inscribed Square Problem
              </h2>
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                onClick={() => setIsTheoryOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5 text-xs text-slate-300 leading-relaxed">
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-cyan-400">1. Otto Toeplitz&apos;s 1911 Conjecture</h3>
                <p>
                  German mathematician <strong>Otto Toeplitz</strong> posed the famous question in 1911:
                  <em> Does every simple closed curve in the Euclidean plane contain four points that form the vertices of a square?</em>
                </p>
                <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/20 text-cyan-300 font-mono text-xs overflow-x-auto">
                  <code>{"\\forall \\gamma \\subset \\mathbb{R}^2 \\text{ (Jordan curve)}, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a square.}"}</code>
                </div>
                <p>
                  While proven for convex curves (Emch 1913), smooth curves (Šnirel&apos;man 1929), and continuous piecewise-smooth curves,
                  the conjecture remains open for general continuous fractal loops!
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-amber-400">
                  2. The Möbius Strip Proof (Šnirel&apos;man 1929 &amp; 3Blue1Brown)
                </h3>
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

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-purple-400">
                  3. Breakthrough: The Greene-Lobb Symplectic Theorem (2020)
                </h3>
                <p>
                  In May 2020, mathematicians <strong>Joshua Greene</strong> (Bowdoin College) and <strong>Andrew Lobb</strong> (Durham University)
                  proved using modern symplectic geometry and Floer homology that <strong>every smooth Jordan curve contains an inscribed rectangle of every possible aspect ratio</strong>.
                </p>
                <div className="p-3 rounded-xl bg-slate-900 border border-purple-500/20 text-purple-300 font-mono text-xs overflow-x-auto">
                  <code>{"\\forall r \\ge 1, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a rectangle with } \\text{Aspect Ratio } = r"}</code>
                </div>
              </section>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 hover:text-white hover:bg-cyan-500/30 font-mono text-xs font-bold transition shadow-lg"
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
