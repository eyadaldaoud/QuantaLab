"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import "@/app/labs.css";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import {
  IconBack,
  IconLoop,
  IconPause,
  IconPlay,
  IconRect,
  IconReset,
  IconSquarePlate,
} from "@/app/components/lab-icons";
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

/* Preset curve glyphs — drawn geometry, one consistent 1.5px stroke. */
const PRESET_GLYPHS: Record<string, React.ReactNode> = {
  ellipse: <ellipse cx="12" cy="12" rx="8.5" ry="6" />,
  clover: (
    <g>
      <ellipse cx="12" cy="7.5" rx="3.4" ry="4.2" />
      <ellipse cx="8.2" cy="14.5" rx="3.4" ry="4.2" transform="rotate(60 8.2 14.5)" />
      <ellipse cx="15.8" cy="14.5" rx="3.4" ry="4.2" transform="rotate(-60 15.8 14.5)" />
    </g>
  ),
  limacon: (
    <path d="M12 4.5 C 16.5 4.5, 19.5 8.5, 19.5 12.5 C 19.5 16.5, 15.5 19.5, 12 19.5 C 8.5 19.5, 5 16.5, 5.5 12 C 6 8, 9 4.5, 12 4.5 C 13.5 9, 12.5 14.5, 12 17" fill="none" />
  ),
  astroid: (
    <path d="M12 3.5 Q 14.6 9.4 20.5 12 Q 14.6 14.6 12 20.5 Q 9.4 14.6 3.5 12 Q 9.4 9.4 12 3.5" fill="none" />
  ),
  wobble: (
    <path d="M12 3.8 C 14 6.4, 18.6 6.2, 19.4 9.2 C 20.2 12, 17 14.6, 18 17.6 C 16 20.4, 11.8 19.4, 9.4 19.4 C 6.4 19.4, 4.6 16, 6 13 C 7.4 10, 4.2 7.6, 5.6 5.6 C 7.4 3.4, 10.6 5.2, 12 3.8" fill="none" />
  ),
  circle: <circle cx="12" cy="12" r="8.5" />,
};

function PresetGlyph({ id }: { id: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="shrink-0"
      aria-hidden="true"
    >
      {PRESET_GLYPHS[id] ?? PRESET_GLYPHS.circle}
    </svg>
  );
}

/* The bench signature: a square inscribed in a circle. */
function BenchMarkGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M6.3 8.6 L17.7 8.6 L17.7 15.4 L6.3 15.4 Z" />
    </svg>
  );
}

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
      ctx.strokeStyle = "rgba(61, 65, 71, 0.35)";
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
      ctx.strokeStyle = "rgba(200, 154, 78, 0.16)";
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
      ctx.strokeStyle = "#c89a4e";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "#c89a4e";
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
      ctx.strokeStyle = "rgba(200, 154, 78, 0.35)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      for (let i = 1; i < curvePoints.length; i++) {
        ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Sharp cyan edge
      ctx.strokeStyle = "#c89a4e";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(200, 154, 78, 0.85)";
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
    const drawRightAngleMarker = (pCorner: Point2D, p1: Point2D, p2: Point2D, color = "#4fae6e") => {
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
    const drawEdgeTick = (p1: Point2D, p2: Point2D, color = "#c89a4e") => {
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
      ctx.fillStyle = "rgba(200, 154, 78, 0.12)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();

      // Golden perimeter
      ctx.strokeStyle = "#c89a4e";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#c89a4e";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Diagonals AC and BD
      if (showDiagonals) {
        ctx.strokeStyle = "rgba(200, 154, 78, 0.65)";
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
        ctx.shadowColor = "#c89a4e";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#c89a4e";
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
        ctx.fillStyle = "rgba(200, 154, 78, 0.35)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#c89a4e";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "rgba(24, 26, 29, 0.88)";
        ctx.strokeStyle = "rgba(200, 154, 78, 0.6)";
        ctx.lineWidth = 1;
        ctx.fillRect(p.x + 8, p.y - 18, 20, 16);
        ctx.strokeRect(p.x + 8, p.y - 18, 20, 16);

        ctx.fillStyle = "#c89a4e";
        ctx.font = "bold 11px monospace";
        ctx.fillText(label, p.x + 13, p.y - 6);
      });
    }

    // 4B. Render Inscribed Rectangle (Greene-Lobb)
    if (solverMode === "rectangle" && activeRectangle) {
      const { a, b, c, d, center, width: rw, height: rh, aspectRatio } = activeRectangle;

      ctx.fillStyle = "rgba(143, 122, 232, 0.12)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#8f7ae8";
      ctx.lineWidth = 3;
      ctx.shadowColor = "#8f7ae8";
      ctx.shadowBlur = 16;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (showDiagonals) {
        ctx.strokeStyle = "rgba(143, 122, 232, 0.65)";
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

        ctx.fillStyle = "#8f7ae8";
        ctx.font = "bold 11px monospace";
        ctx.fillText("M (Center)", center.x + 8, center.y - 6);
      }

      if (showAngles) {
        drawRightAngleMarker(b, a, c, "#8f7ae8");
        drawRightAngleMarker(c, b, d, "#8f7ae8");
        drawRightAngleMarker(d, c, a, "#8f7ae8");
        drawRightAngleMarker(a, d, b, "#8f7ae8");
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
        ctx.fillStyle = "rgba(143, 122, 232, 0.35)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#8f7ae8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#8f7ae8";
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
    <div className="quantum-studio-root square-studio">
      <Navbar />

      {/* Bench header — same paper-and-ink language as the landing chrome */}
      <header className="studio-topbar">
        <div className="topbar-left">
          <Link
            href="/"
            className="back-hub-btn"
            title="Back to QuantaLab Experiments Catalog"
          >
            <IconBack className="icon-svg" />
            <span>CATALOG</span>
          </Link>

          <div className="topbar-divider-v" />

          <span className="bench-glyph"><BenchMarkGlyph /></span>

          <div className="topbar-branding">
            <div className="topbar-title-row">
              <h1 className="studio-title">The Inscribed Square Problem</h1>
              <span className="studio-status-pill">
                <span className="status-dot-live" />
                TOPOLOGY ENGINE ACTIVE
              </span>
            </div>
            <span className="studio-subtitle">
              BENCH 03 · TOEPLITZ CONJECTURE (1911) · GREENE-LOBB SYMPLECTIC THEOREM (2020) · MÖBIUS INVARIANTS
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="topbar-btn"
            onClick={() => setIsTheoryOpen(true)}
            title="Read mathematical formulation and topological proofs"
          >
            <span>THEOREMS &amp; PROOFS</span>
          </button>
        </div>
      </header>

      {/* Grand viewport plate — the bench stays paper, the canvas is the dark instrument */}
      <section className="grand-viewport-section">
        <div className="scene-container">
          {!showMobiusView ? (
            <div className="absolute inset-0">
              {/* Canvas overlay toggles */}
              <div className="square-overlay-dock">
                <button
                  type="button"
                  className={`hud-tool-btn ${showGrid ? "tool-active" : ""}`}
                  onClick={() => setShowGrid(!showGrid)}
                  title="Toggle Euclidean Grid"
                >
                  <span>GRID</span>
                </button>
                <button
                  type="button"
                  className={`hud-tool-btn ${showDiagonals ? "tool-active" : ""}`}
                  onClick={() => setShowDiagonals(!showDiagonals)}
                  title="Toggle Perpendicular Diagonals"
                >
                  <span>DIAG</span>
                </button>
                <button
                  type="button"
                  className={`hud-tool-btn ${showAngles ? "tool-active" : ""}`}
                  onClick={() => setShowAngles(!showAngles)}
                  title="Toggle 90° Right Angle Markers"
                >
                  <span>90°</span>
                </button>
                <button
                  type="button"
                  className={`hud-tool-btn ${showSideLengths ? "tool-active" : ""}`}
                  onClick={() => setShowSideLengths(!showSideLengths)}
                  title="Toggle Side Dimensions"
                >
                  <span>DIM</span>
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

              <div className="viewport-orbit-hint" aria-hidden="true">
                <span>Click &amp; drag anywhere to sketch your custom loop • or select presets below</span>
              </div>
            </div>
          ) : (
            /* 3D Möbius View */
            <div className="stage-mobius-view">
              <div className="stage-note-card">
                <span className="note-glyph"><IconLoop size={20} /></span>
                <div>
                  <h3>
                    Möbius Strip Configuration Space (3Blue1Brown Topology)
                  </h3>
                  <p>
                    Every unordered pair of points (x, y) on a closed loop &gamma;(t) maps to a point on a
                    non-orientable surface with boundary homeomorphic to a <strong>Möbius strip</strong>. Because
                    a Möbius strip cannot be embedded into 3D space without self-intersecting, pairs with
                    identical midpoints and distances must exist — yielding an inscribed square!
                  </p>
                </div>
              </div>

              {/* Stage Step Tabs */}
              <div className="stage-tab-row">
                {[
                  { stage: 1, label: "1. PAIR SPACE (γ × γ)" },
                  { stage: 2, label: "2. MÖBIUS TWIST IDENTIFICATION" },
                  { stage: 3, label: "3. TOPOLOGICAL INTERSECTION" },
                ].map((s) => (
                  <button
                    key={s.stage}
                    type="button"
                    className={`stage-tab-btn ${mobiusStage === s.stage ? "active" : ""}`}
                    onClick={() => setMobiusStage(s.stage as 1 | 2 | 3)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Vector Möbius Ribbon — flat brass ink drawing */}
              <svg className="w-full max-w-2xl max-h-[240px]" viewBox="0 0 680 260">
                <line x1="80" y1="130" x2="600" y2="130" stroke="rgba(237, 234, 226, 0.1)" strokeDasharray="4 4" />
                <line x1="340" y1="30" x2="340" y2="230" stroke="rgba(237, 234, 226, 0.1)" strokeDasharray="4 4" />

                <path
                  d="M120 130 C 160 40, 260 40, 340 130 C 420 220, 520 220, 560 130 C 520 50, 420 50, 340 130 C 260 210, 160 210, 120 130 Z"
                  fill="none"
                  stroke="#c89a4e"
                  strokeWidth="8"
                  strokeLinecap="round"
                />

                <line x1="200" y1="85" x2="220" y2="175" stroke="rgba(237, 234, 226, 0.3)" strokeWidth="1.5" />
                <line x1="270" y1="90" x2="280" y2="170" stroke="rgba(237, 234, 226, 0.3)" strokeWidth="1.5" />
                <line x1="340" y1="95" x2="340" y2="165" stroke="#c89a4e" strokeWidth="2.5" />
                <line x1="410" y1="90" x2="400" y2="170" stroke="rgba(237, 234, 226, 0.3)" strokeWidth="1.5" />
                <line x1="480" y1="85" x2="460" y2="175" stroke="rgba(237, 234, 226, 0.3)" strokeWidth="1.5" />

                <circle cx="340" cy="130" r="6" fill="#c89a4e" />
                <circle cx="340" cy="130" r="3" fill="#edeae2" />

                <g transform="translate(360, 115)">
                  <rect x="0" y="0" width="220" height="32" fill="rgba(24, 26, 29, 0.92)" stroke="#c89a4e" strokeWidth="1" />
                  <text x="12" y="15" fill="#c89a4e" fontSize="10.5" fontFamily="monospace" fontWeight="bold">
                    Möbius Self-Intersection
                  </text>
                  <text x="12" y="26" fill="#a3a49b" fontSize="9" fontFamily="monospace">
                    f(A, C) = f(B, D) &rArr; Square
                  </text>
                </g>

                <circle cx="120" cy="130" r="5" fill="#c89a4e" />
                <text x="75" y="134" fill="#c89a4e" fontSize="10.5" fontFamily="monospace">
                  &part;M (x = y)
                </text>
              </svg>
            </div>
          )}

          {/* TOP VIEWPORT HUD DECK */}
          <div className="viewport-top-hud">
            {/* Solver Switcher */}
            <div className="hud-section">
              <div className="hud-mode-pill-group" role="group" aria-label="Solver Mode">
                <button
                  type="button"
                  onClick={() => {
                    setSolverMode("square");
                    setActiveSolutionIndex(0);
                  }}
                  className={`hud-mode-btn wave-mode ${solverMode === "square" ? "active" : ""}`}
                  title="Toeplitz Square Conjecture (1:1 Aspect Ratio)"
                >
                  <IconSquarePlate className="hud-mode-icon" />
                  <div className="hud-mode-content">
                    <span className="hud-mode-title">TOEPLITZ SQUARE</span>
                    <span className="hud-mode-status">1 : 1 ASPECT RATIO</span>
                  </div>
                  {solverMode === "square" && <span className="hud-pulse-dot dot-cyan" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSolverMode("rectangle");
                    setActiveSolutionIndex(0);
                  }}
                  className={`hud-mode-btn observer-mode ${solverMode === "rectangle" ? "active" : ""}`}
                  title="Greene-Lobb Symplectic Theorem (Inscribed Rectangle)"
                >
                  <IconRect className="hud-mode-icon" />
                  <div className="hud-mode-content">
                    <span className="hud-mode-title">GREENE-LOBB (r={targetAspectRatio.toFixed(2)})</span>
                    <span className="hud-mode-status">INSCRIBED RECTANGLE</span>
                  </div>
                  {solverMode === "rectangle" && <span className="hud-pulse-dot dot-amber" />}
                </button>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Center: Live Telemetry */}
            <div className="hud-section hud-center-section">
              <div className="square-deck-telemetry">
                <div className="hud-metric">
                  <span className="hud-metric-kicker">CURVE</span>
                  <span className="hud-metric-val" style={{ color: "#c89a4e" }}>{selectedPreset.toUpperCase()}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">SOLUTIONS</span>
                  <span className={`hud-metric-val ${solutionsCount > 0 ? "val-cyan" : "val-amber"}`}>
                    {solutionsCount > 0 ? `${solutionsCount} DETECTED` : "SEARCHING"}
                  </span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">ISOPERIMETRIC</span>
                  <span className="hud-metric-val">Q = {telemetry.isoperimetricQuotient.toFixed(3)}</span>
                </div>
              </div>

              {/* Mobile: one key metric */}
              <div className="square-mobile-metric">
                <span className="hud-metric-kicker">SOLUTIONS</span>
                <span className={`hud-metric-val ${solutionsCount > 0 ? "val-cyan" : "val-amber"}`}>
                  {solutionsCount > 0 ? `${solutionsCount}` : "…"}
                </span>
              </div>
            </div>

            <div className="hud-section-divider" />

            {/* Right: View Toggle */}
            <div className="hud-section hud-right-section">
              <div className="hud-mode-pill-group" role="group" aria-label="Stage View">
                <button
                  type="button"
                  className={`hud-mode-btn wave-mode ${!showMobiusView ? "active" : ""}`}
                  onClick={() => setShowMobiusView(false)}
                >
                  <span className="hud-mode-title">2D LOOP</span>
                  {!showMobiusView && <span className="hud-pulse-dot dot-cyan" />}
                </button>
                <button
                  type="button"
                  className={`hud-mode-btn observer-mode ${showMobiusView ? "active" : ""}`}
                  onClick={() => setShowMobiusView(true)}
                >
                  <span className="hud-mode-title">3D MÖBIUS</span>
                  {showMobiusView && <span className="hud-pulse-dot dot-amber" />}
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM VIEWPORT HUD DECK */}
          <div className="viewport-bottom-hud">
            <div className="hud-section">
              <div className="hud-telemetry-cluster">
                <div className="hud-metric">
                  <span className="hud-metric-kicker">DIMENSIONS</span>
                  <span className="hud-metric-val val-amber">{dimensionReadout}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">CORNER ANGLES</span>
                  <span className="hud-metric-val val-cyan">{cornerAngleReadout}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">DIAGONAL RATIO</span>
                  <span className="hud-metric-val">{diagonalRatioReadout}</span>
                </div>
                <div className="hud-metric-divider" />
                <div className="hud-metric">
                  <span className="hud-metric-kicker">ORTHOGONALITY</span>
                  <span className="hud-metric-val val-cyan">&Delta;&theta; = 0.00&deg; (&perp;)</span>
                </div>
              </div>

              {/* Mobile: single metric */}
              <div className="square-mobile-metric">
                <span className="hud-metric-kicker">DIMENSIONS</span>
                <span className="hud-metric-val val-amber">{dimensionReadout}</span>
              </div>
            </div>

            <div className="hud-section hud-right-section">
              <div className="hud-utility-dock">
                <button
                  type="button"
                  className="hud-tool-btn clear-btn"
                  onClick={() => {
                    setSelectedPreset("custom");
                    setCurvePoints([]);
                    setIsAutoMorphing(false);
                  }}
                  title="Clear loop and enter freehand sketch mode"
                >
                  <IconReset className="icon-svg" />
                  <span>CLEAR &amp; DRAW</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Analytical Dashboard Console Grid */}
      <section className="dashboard-console-grid">
        {/* Left Column: Diagnostics & Geometry Algebraic Proof */}
        <div className="controls-deck">
          {/* Fig 01: Green's Theorem Analysis */}
          <div className="analytics-card-wide">
            <div className="analytics-header">
              <div>
                <span className="section-kicker">FIG. 01 · TOPOLOGY DIAGNOSTICS</span>
                <h3 className="analytics-title">Green&apos;s Theorem Loop Integral Analysis</h3>
              </div>
              <span className="card-dim-spec">JORDAN CURVE</span>
            </div>

            <div className="plot-diagnostic-grid">
              <div className="diagnostic-tile">
                <span className="diag-kicker">PERIMETER &oint; ds</span>
                <span className="diag-value">{telemetry.perimeter.toFixed(1)} px</span>
              </div>

              <div className="diagnostic-tile">
                <span className="diag-kicker">ENCLOSED AREA &iint; dx dy</span>
                <span className="diag-value">{telemetry.area.toFixed(0)} px&sup2;</span>
              </div>

              <div className="diagnostic-tile">
                <span className="diag-kicker">ISOPERIMETRIC EFFICIENCY Q</span>
                <span className="diag-value" style={{ color: "var(--lab-brass)" }}>
                  {telemetry.isoperimetricQuotient.toFixed(3)}
                </span>
              </div>

              <div className="diagnostic-tile">
                <span className="diag-kicker">SMOOTHNESS CLASS</span>
                <span className="diag-value" style={{ color: "var(--lab-green)" }}>C&infin; Smooth</span>
              </div>
            </div>
          </div>

          {/* Fig 02: Square Coordinates & Algebraic Verification */}
          {activeSquare && solverMode === "square" && (
            <div className="analytics-card-wide">
              <div className="analytics-header">
                <div>
                  <span className="section-kicker">FIG. 02 · ALGEBRAIC PROOF</span>
                  <h3 className="analytics-title">Square Coordinates on Curve &gamma;(t)</h3>
                </div>
                <span className="card-dim-spec" style={{ color: "var(--lab-green)" }}>
                  VERIFIED
                </span>
              </div>

              <div className="plot-legend-row" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "0.45rem" }}>
                {[
                  { tag: "Vertex A", pt: activeSquare.a },
                  { tag: "Vertex B", pt: activeSquare.b },
                  { tag: "Vertex C", pt: activeSquare.c },
                  { tag: "Vertex D", pt: activeSquare.d },
                ].map((v) => (
                  <div key={v.tag} className="square-vertex-row">
                    <span className="vertex-tag">{v.tag}:</span>
                    <code>
                      ({v.pt.x.toFixed(1)}, {v.pt.y.toFixed(1)})
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fig 03: Multi-Square Solutions Picker */}
          {solverMode === "square" && detectedSquares.length > 1 && (
            <div className="analytics-card-wide">
              <div className="analytics-header">
                <div>
                  <span className="section-kicker">FIG. 03 · MULTI-SOLUTIONS</span>
                  <h3 className="analytics-title">Multiple Inscribed Squares Detected</h3>
                </div>
                <span className="card-dim-spec">{detectedSquares.length} SOLUTIONS</span>
              </div>
              <p className="card-info-note">
                This loop supports multiple distinct inscribed squares. Select one to inspect its coordinates.
              </p>
              <div className="square-solutions-row">
                {detectedSquares.map((sq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`rate-pill ${activeSolutionIndex === idx ? "selected" : ""}`}
                    onClick={() => setActiveSolutionIndex(idx)}
                  >
                    Square #{idx + 1} · {sq.rotationDeg.toFixed(0)}°
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Complete Interactive Control Deck */}
        <div className="controls-deck">
          {/* Control 01: Geometric Presets & Freehand */}
          <div className="control-card">
            <div className="card-header">
              <div>
                <span className="card-tag">FIG. 04 · GEOMETRY</span>
                <h4 className="card-subheading">Curve Presets &amp; Freehand Sketch</h4>
              </div>
              <span className="card-dim-spec">SELECT</span>
            </div>
            <p className="card-info-note">
              Select a mathematical loop geometry or draw your own closed curve on the stage.
            </p>
            <div className="tour-pill-grid">
              {[
                { id: "ellipse", label: "Ellipse" },
                { id: "clover", label: "Clover (3-Fold)" },
                { id: "limacon", label: "Teardrop Limacon" },
                { id: "astroid", label: "Astroid Star" },
                { id: "wobble", label: "Perturbed Wobble" },
                { id: "circle", label: "Circle (Infinite)" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`tour-card-btn ${selectedPreset === p.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedPreset(p.id);
                    setIsAutoMorphing(false);
                  }}
                >
                  <div className="tour-card-header">
                    <span className="tour-card-title">
                      <PresetGlyph id={p.id} /> {p.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`rate-pill ${selectedPreset === "custom" ? "selected" : ""}`}
              onClick={() => {
                setSelectedPreset("custom");
                setCurvePoints([]);
                setIsAutoMorphing(false);
              }}
            >
              Clear &amp; Draw Custom Loop
            </button>
          </div>

          {/* Control 02: Interactive Deformation & Auto-Morph */}
          {selectedPreset !== "custom" && (
            <div className="control-card">
              <div className="card-header">
                <div>
                  <span className="card-tag">FIG. 05 · DYNAMICS</span>
                  <h4 className="card-subheading">Curve Deformation &amp; Continuous Morph</h4>
                </div>
                <span className="card-dim-spec">&lambda; = {deformation.toFixed(2)}</span>
              </div>
              <p className="card-info-note">
                Continuously deform the loop and watch the inscribed square adapt in real time.
              </p>

              <div className="slider-row">
                <div
                  className="swatch-indicator"
                  style={{ backgroundColor: "var(--lab-brass)", boxShadow: "inset 0 0 0 1px rgba(16, 18, 20, 0.25)" }}
                />
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
                  className="quantum-slider"
                  aria-label="Curve deformation parameter lambda"
                  style={
                    {
                      "--slider-color": "var(--lab-brass)",
                      "--slider-percent": `${((deformation - 0.4) / (1.8 - 0.4)) * 100}%`,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div className="rate-row">
                <button
                  type="button"
                  onClick={() => setIsAutoMorphing(!isAutoMorphing)}
                  className={`rate-pill ${isAutoMorphing ? "selected" : ""}`}
                  title={"Morph the loop continuously in real time"}
                >
                  {isAutoMorphing ? (
                    <>
                      <IconPause className="icon-svg" /> Pause Auto-Morph
                    </>
                  ) : (
                    <>
                      <IconPlay className="icon-svg" /> Continuous Auto-Morph
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="rate-pill"
                  onClick={() => {
                    setIsAutoMorphing(false);
                    setDeformation(1.0);
                  }}
                  title="Reset Deformation to Default"
                >
                  <IconReset className="icon-svg" /> Reset
                </button>
              </div>
            </div>
          )}

          {/* Control 03: Greene-Lobb Aspect Ratio Control */}
          {solverMode === "rectangle" && (
            <div className="control-card">
              <div className="card-header">
                <div>
                  <span className="card-tag">FIG. 06 · SYMPLECTIC</span>
                  <h4 className="card-subheading">Greene-Lobb Target Aspect Ratio</h4>
                </div>
                <span className="card-dim-spec">r = {targetAspectRatio.toFixed(3)}</span>
              </div>
              <p className="card-info-note">
                Target aspect ratio r = W/H. Greene &amp; Lobb proved a solution exists for every r &ge; 1.
              </p>

              <div className="slider-row">
                <div
                  className="swatch-indicator"
                  style={{ backgroundColor: "var(--lab-brass)", boxShadow: "inset 0 0 0 1px rgba(16, 18, 20, 0.25)" }}
                />
                <input
                  type="range"
                  min="1.05"
                  max="2.8"
                  step="0.01"
                  value={targetAspectRatio}
                  onChange={(e) => setTargetAspectRatio(parseFloat(e.target.value))}
                  className="quantum-slider"
                  aria-label="Target aspect ratio"
                  style={
                    {
                      "--slider-color": "var(--lab-brass)",
                      "--slider-percent": `${((targetAspectRatio - 1.05) / (2.8 - 1.05)) * 100}%`,
                    } as React.CSSProperties
                  }
                />
              </div>

              <div className="spectral-shortcuts-row">
                <span className="spectral-label">RATIO PRESETS:</span>
                <div className="spectral-pills">
                  {[
                    { label: "Golden Φ (1.618)", val: 1.618 },
                    { label: "Root 2 (1.414)", val: 1.414 },
                    { label: "Double Square (2.000)", val: 2.0 },
                    { label: "Silver (2.414)", val: 2.414 },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className={`spectral-pill ${Math.abs(targetAspectRatio - item.val) < 0.01 ? "active" : ""}`}
                      onClick={() => setTargetAspectRatio(item.val)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Theoretical Proofs Modal */}
      {isTheoryOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsTheoryOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Mathematical Foundations: The Inscribed Square Problem</h3>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close theorems and proofs"
                onClick={() => setIsTheoryOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="exp-modal-section">
                <h4 className="exp-modal-section-title">1. Otto Toeplitz&apos;s 1911 Conjecture</h4>
                <p className="exp-modal-text">
                  German mathematician <strong>Otto Toeplitz</strong> posed the famous question in 1911:
                  <em> Does every simple closed curve in the Euclidean plane contain four points that form the vertices of a square?</em>
                </p>
                <div className="theory-formula-box">
                  <code>{"\\forall \\gamma \\subset \\mathbb{R}^2 \\text{ (Jordan curve)}, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a square.}"}</code>
                </div>
                <p className="exp-modal-text">
                  While proven for convex curves (Emch 1913), smooth curves (Šnirel&apos;man 1929), and continuous piecewise-smooth curves,
                  the conjecture remains open for general continuous fractal loops.
                </p>
              </div>

              <div className="exp-modal-section">
                <h4 className="exp-modal-section-title">2. The Möbius Strip Proof (Šnirel&apos;man 1929 &amp; 3Blue1Brown)</h4>
                <p className="exp-modal-text">
                  Consider the configuration space of all unordered pairs of points on the closed loop:
                  (x, y) &isin; (&gamma; &times; &gamma;) / &Zopf;<sub>2</sub>.
                  Topologically, this space is a <strong>Möbius strip</strong> whose boundary &part;M corresponds to the diagonal where x = y.
                </p>
                <p className="exp-modal-text">
                  We define a continuous map into 3D Euclidean space:
                  <strong> f(x, y) = ((x + y)/2, ||x - y||)</strong>, which pairs the Euclidean midpoint with chord distance.
                  Because a non-orientable surface with boundary like the Möbius strip cannot be embedded into 3D space
                  without self-intersecting, there must exist two distinct pairs (A, C) and (B, D) sharing the identical midpoint
                  and chord length, whose diagonals form right angles — an inscribed square.
                </p>
              </div>

              <div className="exp-modal-section">
                <h4 className="exp-modal-section-title">3. Breakthrough: The Greene-Lobb Symplectic Theorem (2020)</h4>
                <p className="exp-modal-text">
                  In May 2020, mathematicians <strong>Joshua Greene</strong> (Bowdoin College) and <strong>Andrew Lobb</strong> (Durham University)
                  proved using modern symplectic geometry and Floer homology that <strong>every smooth Jordan curve contains an inscribed rectangle of every possible aspect ratio</strong>.
                </p>
                <div className="theory-formula-box">
                  <code>{"\\forall r \\ge 1, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a rectangle with } \\text{Aspect Ratio } = r"}</code>
                </div>
              </div>
            </div>

            <div className="walkthrough-controls">
              <span className="walkthrough-step-counter">Toeplitz (1911) · Šnirel&apos;man (1929) · Greene-Lobb (2020)</span>
              <button
                type="button"
                className="btn-walkthrough-jump"
                onClick={() => setIsTheoryOpen(false)}
              >
                Return to Bench
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
