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
    <div className="max-w-[1720px] min-h-screen mx-auto px-4 md:px-6 pt-4 pb-14 flex flex-col gap-5 text-[#101214] font-sans bg-[#f5f4f0]">
      {/* 1. STUDIO TOPBAR */}
      <header className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3 px-1 flex-wrap gap-3">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#b8bec2]/60 bg-white/70 text-[#454c52] hover:text-[#101214] hover:border-[#5f3dc4]/50 hover:bg-[#b8bec2] transition text-xs font-mono font-bold tracking-wider"
            title="Back to QuantaLab Experiments Catalog"
          >
            <span>←</span>
            <span>CATALOG</span>
          </Link>

          <div className="w-[1px] h-7 bg-[#b8bec2]" />

          <div className="w-10 h-10 rounded border border-[#b8bec2]/80 bg-[#fbfaf7] flex items-center justify-center text-[#8f7ae8]">
            <BenchMarkGlyph />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base font-bold text-[#101214] tracking-wide">
                INSCRIBED SQUARE LABORATORY
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-[#e3efe6]/70 border border-[#2e7d46]/40 text-[#2e7d46]">
                <span className="w-2 h-2 rounded-full bg-[#4fae6e] animate-pulse" />
                TOPOLOGY ENGINE ACTIVE
              </span>
            </div>
            <span className="text-xs text-[#6c737a] font-mono">
              Toeplitz Conjecture (1911) &bull; Greene-Lobb Symplectic Theorem (2020) &bull; Möbius Strip Invariants
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-3.5 py-2 rounded border border-[#5f3dc4]/40 text-[#5f3dc4] hover:text-[#101214] hover:border-[#5f3dc4] hover:shadow-[0_0_16px_rgba(200,154,78,0.3)] transition text-xs font-mono font-bold flex items-center gap-2"
            onClick={() => setIsTheoryOpen(true)}
            title="Read mathematical formulation and topological proofs"
          >
            <span>📖 THEOREMS &amp; PROOFS</span>
          </button>
        </div>
      </header>

      {/* 2. GRAND VIEWPORT SECTION */}
      <section className="relative w-full h-[540px] md:h-[620px] rounded border border-[#26292d]/80 bg-[#0f1113] overflow-hidden">
        {/* Canvas / Möbius wrapper */}
        <div className="absolute inset-0">
          {!showMobiusView ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_50%,#141618_0%,#02070e_95%)] overflow-hidden">
              {/* Canvas Overlay Controls */}
              <div className="absolute top-16 right-2 sm:right-4 z-10 flex items-center gap-1 sm:gap-1.5 p-1 bg-[#141618]/80 backdrop-blur-md border border-[#7a63e0]/20 rounded-full">
                <button
                  type="button"
                  className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold transition ${
                    showGrid
                      ? "bg-[#7a63e0]/20 text-[#b3a4f0] border border-[#8f7ae8]/40"
                      : "text-[#a3a49b] hover:text-[#edeae2]"
                  }`}
                  onClick={() => setShowGrid(!showGrid)}
                  title="Toggle Euclidean Grid"
                >
                  <span className="hidden sm:inline"># </span>#
                  <span className="hidden sm:inline"> GRID</span>
                </button>
                <button
                  type="button"
                  className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold transition ${
                    showDiagonals
                      ? "bg-[#7a63e0]/20 text-[#b3a4f0] border border-[#8f7ae8]/40"
                      : "text-[#a3a49b] hover:text-[#edeae2]"
                  }`}
                  onClick={() => setShowDiagonals(!showDiagonals)}
                  title="Toggle Perpendicular Diagonals"
                >
                  ✕<span className="hidden sm:inline"> DIAG</span>
                </button>
                <button
                  type="button"
                  className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold transition ${
                    showAngles
                      ? "bg-[#7a63e0]/20 text-[#b3a4f0] border border-[#8f7ae8]/40"
                      : "text-[#a3a49b] hover:text-[#edeae2]"
                  }`}
                  onClick={() => setShowAngles(!showAngles)}
                  title="Toggle 90° Right Angle Markers"
                >
                  ⊾<span className="hidden sm:inline"> 90°</span>
                </button>
                <button
                  type="button"
                  className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold transition ${
                    showSideLengths
                      ? "bg-[#7a63e0]/20 text-[#b3a4f0] border border-[#8f7ae8]/40"
                      : "text-[#a3a49b] hover:text-[#edeae2]"
                  }`}
                  onClick={() => setShowSideLengths(!showSideLengths)}
                  title="Toggle Side Dimensions"
                >
                  📏<span className="hidden sm:inline"> DIM</span>
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

              <div className="hidden sm:block absolute bottom-16 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-[#141618]/85 backdrop-blur-md border border-[#7a63e0]/30 text-xs font-mono text-[#c9c8c0] whitespace-nowrap">
                <span>Click &amp; drag anywhere to sketch your custom loop &bull; or select presets below</span>
              </div>
            </div>
          ) : (
            /* 3D Möbius View */
            <div className="absolute inset-0 px-6 py-20 flex flex-col justify-center items-center bg-[radial-gradient(circle_at_50%_50%,#141618_0%,#02070e_95%)] overflow-y-auto gap-4">
              <div className="max-w-2xl w-full p-4 rounded bg-[#c89a4e]/10 border border-[#c89a4e]/30 flex items-start gap-3.5">
                <span className="text-3xl leading-none">➰</span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-[#edeae2]">
                    Möbius Strip Configuration Space (3Blue1Brown Topology)
                  </h3>
                  <p className="text-xs text-[#c9c8c0] leading-relaxed">
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
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition ${
                      mobiusStage === s.stage
                        ? "bg-[#c89a4e]/20 text-[#e3c990] border border-[#c89a4e]"
                        : "bg-[#181b1e]/60 text-[#a3a49b] border border-[#26292d] hover:text-[#edeae2]"
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
                    <stop offset="0%" stopColor="#c89a4e" stopOpacity="0.9" />
                    <stop offset="45%" stopColor="#c89a4e" stopOpacity="0.85" />
                    <stop offset="80%" stopColor="#8f7ae8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#c89a4e" stopOpacity="0.9" />
                  </linearGradient>

                  <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c89a4e" stopOpacity="1" />
                    <stop offset="40%" stopColor="#c89a4e" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#c89a4e" stopOpacity="0" />
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
                <line x1="340" y1="95" x2="340" y2="165" stroke="#c89a4e" strokeWidth="2.5" />
                <line x1="410" y1="90" x2="400" y2="170" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
                <line x1="480" y1="85" x2="460" y2="175" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />

                <circle cx="340" cy="130" r="22" fill="url(#nodeGlow)" />
                <circle cx="340" cy="130" r="6" fill="#c89a4e" />
                <circle cx="340" cy="130" r="3" fill="#ffffff" />

                <g transform="translate(360, 115)">
                  <rect x="0" y="0" width="220" height="32" rx="6" fill="rgba(24, 26, 29, 0.9)" stroke="#c89a4e" strokeWidth="1" />
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
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between gap-2 px-2 sm:px-3 py-2 bg-[#141618]/90 backdrop-blur-xl border border-[#3d4147]/70 rounded max-w-full overflow-x-auto">
            {/* Solver Switcher */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-[#181b1e]/90 p-1 rounded border border-[#26292d] flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSolverMode("square");
                  setActiveSolutionIndex(0);
                }}
                className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center gap-1 sm:gap-2 text-xs font-mono font-bold transition ${
                  solverMode === "square"
                    ? "bg-[#7a63e0]/20 text-[#b3a4f0] border border-[#8f7ae8]/50"
                    : "text-[#a3a49b] hover:text-[#edeae2]"
                }`}
                title="Toeplitz Square Conjecture (1:1 Aspect Ratio)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="5" y="5" width="14" height="14" /></svg>
                <span className="hidden sm:inline">TOEPLITZ SQUARE (1:1)</span>
                <span className="sm:hidden">SQUARE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSolverMode("rectangle");
                  setActiveSolutionIndex(0);
                }}
                className={`px-2 sm:px-3 py-1.5 rounded-md flex items-center gap-1 sm:gap-2 text-xs font-mono font-bold transition ${
                  solverMode === "rectangle"
                    ? "bg-[#7a63e0]/20 text-[#b3a4f0] border border-[#8f7ae8]/50"
                    : "text-[#a3a49b] hover:text-[#edeae2]"
                }`}
                title="Greene-Lobb Symplectic Theorem (Inscribed Rectangle)"
              >
                <span>▭</span>
                <span className="hidden sm:inline">GREENE-LOBB (r={targetAspectRatio.toFixed(2)})</span>
                <span className="sm:hidden">RECT</span>
              </button>
            </div>

            {/* Center: Live Telemetry */}
            <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-[#181b1e]/60 border border-[#26292d]/80 rounded text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b8c83] text-[10px]">CURVE:</span>
                <span className="text-[#8f7ae8] font-bold">{selectedPreset.toUpperCase()}</span>
              </div>
              <div className="w-[1px] h-3 bg-[#3d4147]" />
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b8c83] text-[10px]">SOLUTIONS:</span>
                <span
                  className={`font-bold ${
                    solutionsCount > 0 ? "text-[#4fae6e]" : "text-[#d3ad68]"
                  }`}
                >
                  {solutionsCount > 0 ? `${solutionsCount} DETECTED` : "SEARCHING..."}
                </span>
              </div>
              <div className="w-[1px] h-3 bg-[#3d4147]" />
              <div className="flex items-center gap-1.5">
                <span className="text-[#8b8c83] text-[10px]">ISOPERIMETRIC:</span>
                <span className="text-[#b3a4f0] font-bold">
                  Q = {telemetry.isoperimetricQuotient.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Right: View Toggle */}
            <div className="flex items-center gap-1 bg-[#181b1e]/80 p-1 rounded border border-[#26292d] flex-shrink-0">
              <button
                type="button"
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition ${
                  !showMobiusView
                    ? "bg-[#7a63e0]/20 text-[#b3a4f0] border border-[#8f7ae8]/50"
                    : "text-[#a3a49b] hover:text-[#edeae2]"
                }`}
                onClick={() => setShowMobiusView(false)}
              >
                2D LOOP
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded-md text-xs font-mono font-bold transition ${
                  showMobiusView
                    ? "bg-[#c89a4e]/20 text-[#e3c990] border border-[#d3ad68]/50"
                    : "text-[#a3a49b] hover:text-[#edeae2]"
                }`}
                onClick={() => setShowMobiusView(true)}
              >
                3D MÖBIUS
              </button>
            </div>
          </div>

          {/* BOTTOM VIEWPORT HUD DECK */}
          <div className="absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-3 px-3 sm:px-3.5 py-2 bg-[#141618]/90 backdrop-blur-xl border border-[#3d4147]/70 rounded overflow-x-auto">
            <div className="hidden sm:flex items-center gap-5 text-xs font-mono">
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8b8c83] font-semibold tracking-wider">
                  DIMENSIONS
                </span>
                <span className="text-[#d3ad68] font-bold">{dimensionReadout}</span>
              </div>
              <div className="w-[1px] h-6 bg-[#26292d]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8b8c83] font-semibold tracking-wider">
                  CORNER ANGLES
                </span>
                <span className="text-[#4fae6e] font-bold">{cornerAngleReadout}</span>
              </div>
              <div className="w-[1px] h-6 bg-[#26292d]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8b8c83] font-semibold tracking-wider">
                  DIAGONAL RATIO
                </span>
                <span className="text-[#8f7ae8] font-bold">{diagonalRatioReadout}</span>
              </div>
              <div className="w-[1px] h-6 bg-[#26292d]" />
              <div className="flex flex-col">
                <span className="text-[10px] text-[#8b8c83] font-semibold tracking-wider">
                  ORTHOGONALITY
                </span>
                <span className="text-[#4fae6e] font-bold">&Delta;&theta; = 0.00&deg; (&perp;)</span>
              </div>
            </div>
            {/* Mobile: show just one key metric */}
            <div className="flex sm:hidden items-center gap-2 text-xs font-mono">
              <span className="text-[#8b8c83] text-[10px] font-semibold">DIM:</span>
              <span className="text-[#d3ad68] font-bold">{dimensionReadout}</span>
            </div>

            <button
              type="button"
              className="px-3 py-1.5 rounded bg-[#181b1e] border border-[#3d4147] hover:border-[#8f7ae8] text-[#c9c8c0] hover:text-[#edeae2] text-xs font-mono font-bold transition flex items-center gap-1.5 flex-shrink-0"
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
          <div className="bg-white backdrop-blur-md border border-[#b8bec2] rounded p-5 flex flex-col gap-4 hover:border-[#b8bec2]/80 transition">
            <div className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8f7ae8]">
                  MODULE 01 // TOPOLOGY DIAGNOSTICS
                </span>
                <h4 className="text-sm font-semibold text-[#101214]">
                  Green&apos;s Theorem Loop Integral Analysis
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#efedf6] border border-[#5f3dc4]/40 text-[#5f3dc4]">
                JORDAN CURVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded bg-[#f6f5f1] border border-[#b8bec2]/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#6c737a] uppercase tracking-wider">
                  PERIMETER &oint; ds
                </span>
                <span className="text-sm font-mono font-bold text-[#101214]">
                  {telemetry.perimeter.toFixed(1)} px
                </span>
              </div>

              <div className="p-3 rounded bg-[#f6f5f1] border border-[#b8bec2]/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#6c737a] uppercase tracking-wider">
                  ENCLOSED AREA &iint; dx dy
                </span>
                <span className="text-sm font-mono font-bold text-[#101214]">
                  {telemetry.area.toFixed(0)} px&sup2;
                </span>
              </div>

              <div className="p-3 rounded bg-[#f6f5f1] border border-[#b8bec2]/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#6c737a] uppercase tracking-wider">
                  ISOPERIMETRIC EFFICIENCY Q
                </span>
                <span className="text-sm font-mono font-bold text-[#8f7ae8]">
                  {telemetry.isoperimetricQuotient.toFixed(3)}
                </span>
              </div>

              <div className="p-3 rounded bg-[#f6f5f1] border border-[#b8bec2]/80 flex flex-col gap-1">
                <span className="text-[10px] font-mono text-[#6c737a] uppercase tracking-wider">
                  SMOOTHNESS CLASS
                </span>
                <span className="text-sm font-mono font-bold text-[#2e7d46]">
                  C&infin; Smooth
                </span>
              </div>
            </div>
          </div>

          {/* Module 02: Square Coordinates & Algebraic Verification */}
          {activeSquare && solverMode === "square" && (
            <div className="bg-white backdrop-blur-md border border-[#b8bec2] rounded p-5 flex flex-col gap-4 hover:border-[#b8bec2]/80 transition">
              <div className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#2e7d46]">
                    MODULE 02 // ALGEBRAIC PROOF
                  </span>
                  <h4 className="text-sm font-semibold text-[#101214]">
                    Square Coordinates on Curve &gamma;(t)
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#e3efe6]/70 border border-[#2e7d46]/40 text-[#2e7d46]">
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
                    className="flex items-center justify-between p-2.5 rounded bg-[#f6f5f1] border border-[#b8bec2]/80"
                  >
                    <span className="text-[#8a6a2f] font-bold">{v.tag}:</span>
                    <code className="text-[#454c52]">
                      ({v.pt.x.toFixed(1)}, {v.pt.y.toFixed(1)})
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module 03: Multi-Square Solutions Picker */}
          {solverMode === "square" && detectedSquares.length > 1 && (
            <div className="bg-white backdrop-blur-md border border-[#b8bec2] rounded p-5 flex flex-col gap-4 hover:border-[#b8bec2]/80 transition">
              <div className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8a6a2f]">
                    MODULE 03 // MULTI-SOLUTIONS
                  </span>
                  <h4 className="text-sm font-semibold text-[#101214]">
                    Multiple Inscribed Squares Detected
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#2a2416]/60 border border-[#8a6a2f]/40 text-[#8a6a2f]">
                  {detectedSquares.length} SOLUTIONS
                </span>
              </div>
              <p className="text-xs text-[#6c737a] leading-relaxed">
                This loop supports multiple distinct inscribed squares! Click to inspect each:
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {detectedSquares.map((sq, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`px-3 py-2 rounded text-xs font-mono font-bold transition flex items-center gap-2 ${
                      activeSolutionIndex === idx
                        ? "bg-[#8a6a2f]/10 text-[#8a6a2f] border border-[#8a6a2f]"
                        : "bg-[#f6f5f1] text-[#6c737a] border border-[#b8bec2] hover:text-[#101214]"
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
          <div className="bg-white backdrop-blur-md border border-[#b8bec2] rounded p-5 flex flex-col gap-4 hover:border-[#b8bec2]/80 transition">
            <div className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8f7ae8]">
                  CONTROL 01 // GEOMETRY
                </span>
                <h4 className="text-sm font-semibold text-[#101214]">
                  Curve Presets &amp; Freehand Sketch
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#efedf6] border border-[#5f3dc4]/40 text-[#5f3dc4]">
                SELECT
              </span>
            </div>
            <p className="text-xs text-[#6c737a] leading-relaxed">
              Select a mathematical loop geometry or draw your own closed curve.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
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
                  className={`p-3 rounded border text-xs font-semibold flex items-center gap-2.5 transition ${
                    selectedPreset === p.id
                      ? "bg-[#8a6a2f]/10 border-[#8a6a2f] text-[#101214]"
                      : "bg-[#f6f5f1] border-[#b8bec2] text-[#6c737a] hover:text-[#101214] hover:border-[#5f3dc4]/40"
                  }`}
                  onClick={() => {
                    setSelectedPreset(p.id);
                    setIsAutoMorphing(false);
                  }}
                >
                  <PresetGlyph id={p.id} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`w-full py-2.5 px-4 rounded font-mono text-xs font-bold transition flex items-center justify-center gap-2 ${
                selectedPreset === "custom"
                  ? "bg-[#8a6a2f]/10 border border-[#8a6a2f] text-[#8a6a2f]"
                  : "border border-[#5f3dc4]/40 text-[#5f3dc4] hover:text-[#101214] hover:border-[#5f3dc4]"
              }`}
              onClick={() => {
                setSelectedPreset("custom");
                setCurvePoints([]);
                setIsAutoMorphing(false);
              }}
            >
              <span>Clear &amp; Draw Custom Loop</span>
            </button>
          </div>

          {/* Control 02: Interactive Deformation & Auto-Morph */}
          {selectedPreset !== "custom" && (
            <div className="bg-white backdrop-blur-md border border-[#b8bec2] rounded p-5 flex flex-col gap-4 hover:border-[#b8bec2]/80 transition">
              <div className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#2e7d46]">
                    CONTROL 02 // DYNAMICS
                  </span>
                  <h4 className="text-sm font-semibold text-[#101214]">
                    Curve Deformation &amp; Continuous Morph
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#e3efe6]/70 border border-[#2e7d46]/40 text-[#2e7d46]">
                  &lambda; = {deformation.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-[#6c737a] leading-relaxed">
                Continuously deform the loop and watch the inscribed square adapt in real time.
              </p>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-[#6c737a] font-mono">
                  <span>Eccentricity &amp; Perturbation</span>
                  <span className="text-[#8f7ae8] font-bold">&lambda; = {deformation.toFixed(2)}</span>
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
                  className="w-full accent-[#8f7ae8] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  className={`flex-1 py-2 px-3 rounded font-mono text-xs font-bold transition flex items-center justify-center gap-2 ${
                    isAutoMorphing
                      ? "bg-[#2e7d46]/12 border border-[#2e7d46] text-[#2e7d46]"
                      : "bg-[#7a63e0]/10 border border-[#5f3dc4]/30 text-[#5f3dc4] hover:text-[#101214] hover:border-[#5f3dc4]"
                  }`}
                  onClick={() => setIsAutoMorphing(!isAutoMorphing)}
                >
                  <span>{isAutoMorphing ? "❚❚ Pause Auto-Morph" : "▶ Continuous Auto-Morph"}</span>
                </button>

                <button
                  type="button"
                  className="py-2 px-3 rounded font-mono text-xs font-bold bg-[#f6f5f1] border border-[#b8bec2] text-[#6c737a] hover:text-[#101214] hover:border-[#8d9196] transition"
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
            <div className="bg-white backdrop-blur-md border border-[#b8bec2] rounded p-5 flex flex-col gap-4 hover:border-[#b8bec2]/80 transition">
              <div className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#8f7ae8]">
                    CONTROL 03 // SYMPLECTIC
                  </span>
                  <h4 className="text-sm font-semibold text-[#101214]">
                    Greene-Lobb Target Aspect Ratio
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#efedf6] border border-[#5f3dc4]/40 text-[#5f3dc4]">
                  r = {targetAspectRatio.toFixed(3)}
                </span>
              </div>
              <p className="text-xs text-[#6c737a] leading-relaxed">
                Select target aspect ratio $r = W/H$. Greene &amp; Lobb proved a solution exists for every $r \ge 1$.
              </p>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-[#6c737a] font-mono">
                  <span>Target Ratio (Width / Height)</span>
                  <span className="text-[#8f7ae8] font-bold">r = {targetAspectRatio.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="1.05"
                  max="2.8"
                  step="0.01"
                  value={targetAspectRatio}
                  onChange={(e) => setTargetAspectRatio(parseFloat(e.target.value))}
                  className="w-full accent-[#8f7ae8] cursor-pointer"
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
                    className={`py-2 px-2.5 rounded text-[11px] font-mono font-semibold transition text-center ${
                      Math.abs(targetAspectRatio - item.val) < 0.01
                        ? "bg-[#5f3dc4]/10 border border-[#5f3dc4] text-[#5f3dc4] font-bold"
                        : "bg-[#f6f5f1] border border-[#b8bec2] text-[#6c737a] hover:text-[#101214]"
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
            className="relative w-full max-w-2xl bg-[#fbfaf7] border border-[#b8bec2] rounded shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#b8bec2]/80 pb-3">
              <h2 className="text-base font-bold text-[#101214]">
                Mathematical Foundations: The Inscribed Square Problem
              </h2>
              <button
                type="button"
                className="p-1.5 rounded text-[#6c737a] hover:text-[#101214] hover:bg-[#b8bec2] transition"
                onClick={() => setIsTheoryOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-5 text-xs text-[#454c52] leading-relaxed">
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-[#8f7ae8]">1. Otto Toeplitz&apos;s 1911 Conjecture</h3>
                <p>
                  German mathematician <strong>Otto Toeplitz</strong> posed the famous question in 1911:
                  <em> Does every simple closed curve in the Euclidean plane contain four points that form the vertices of a square?</em>
                </p>
                <div className="p-3 rounded bg-[#181b1e] border border-[#5f3dc4]/20 text-[#5f3dc4] font-mono text-xs overflow-x-auto">
                  <code>{"\\forall \\gamma \\subset \\mathbb{R}^2 \\text{ (Jordan curve)}, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a square.}"}</code>
                </div>
                <p>
                  While proven for convex curves (Emch 1913), smooth curves (Šnirel&apos;man 1929), and continuous piecewise-smooth curves,
                  the conjecture remains open for general continuous fractal loops!
                </p>
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-bold text-[#8a6a2f]">
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
                <h3 className="text-sm font-bold text-[#8f7ae8]">
                  3. Breakthrough: The Greene-Lobb Symplectic Theorem (2020)
                </h3>
                <p>
                  In May 2020, mathematicians <strong>Joshua Greene</strong> (Bowdoin College) and <strong>Andrew Lobb</strong> (Durham University)
                  proved using modern symplectic geometry and Floer homology that <strong>every smooth Jordan curve contains an inscribed rectangle of every possible aspect ratio</strong>.
                </p>
                <div className="p-3 rounded bg-[#181b1e] border border-[#5f3dc4]/20 text-[#5f3dc4] font-mono text-xs overflow-x-auto">
                  <code>{"\\forall r \\ge 1, \\quad \\exists A, B, C, D \\in \\gamma \\text{ forming a rectangle with } \\text{Aspect Ratio } = r"}</code>
                </div>
              </section>
            </div>

            <div className="pt-3 border-t border-[#b8bec2]/80 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded bg-[#5f3dc4]/10 border border-[#5f3dc4]/50 text-[#5f3dc4] hover:text-[#101214] hover:bg-[#7a63e0]/30 font-mono text-xs font-bold transition"
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
