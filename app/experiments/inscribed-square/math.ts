/**
 * The Inscribed Square Problem (Toeplitz Conjecture / Square Peg Problem)
 * Mathematical solver, curve parameterization, and geometric verification.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface InscribedSquare {
  a: Point2D;
  b: Point2D;
  c: Point2D;
  d: Point2D;
  center: Point2D;
  sideLength: number;
  area: number;
  perimeter: number;
  rotationDeg: number;
  error: number; // max deviation of any vertex from curve
}

export interface InscribedRectangle {
  a: Point2D;
  b: Point2D;
  c: Point2D;
  d: Point2D;
  center: Point2D;
  width: number;
  height: number;
  aspectRatio: number;
  rotationDeg: number;
}

/**
 * Distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Minimum distance from point P to line segment AB
 */
export function distToSegment(p: Point2D, a: Point2D, b: Point2D): { dist: number; closest: Point2D } {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return { dist: distance(p, a), closest: a };

  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const closest = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
  };

  return { dist: distance(p, closest), closest };
}

/**
 * Minimum distance from point P to a closed polygon curve
 */
export function distToCurve(p: Point2D, curve: Point2D[]): { dist: number; closest: Point2D } {
  let minDist = Infinity;
  let closestPoint: Point2D = curve[0] || { x: 0, y: 0 };
  const n = curve.length;

  for (let i = 0; i < n; i++) {
    const a = curve[i];
    const b = curve[(i + 1) % n];
    const { dist, closest } = distToSegment(p, a, b);
    if (dist < minDist) {
      minDist = dist;
      closestPoint = closest;
    }
  }

  return { dist: minDist, closest: closestPoint };
}

/**
 * Resample a sequence of raw points into N equally arc-length spaced points
 * with smooth closure.
 */
export function resampleClosedCurve(rawPoints: Point2D[], targetCount = 160): Point2D[] {
  if (rawPoints.length < 3) return rawPoints;

  // Ensure closed loop
  const pts = [...rawPoints];
  if (distance(pts[0], pts[pts.length - 1]) > 1e-4) {
    pts.push({ ...pts[0] });
  }

  // Calculate cumulative arc lengths
  const cumLengths: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    cumLengths.push(cumLengths[i - 1] + distance(pts[i - 1], pts[i]));
  }

  const totalLength = cumLengths[cumLengths.length - 1];
  if (totalLength <= 0) return rawPoints;

  const resampled: Point2D[] = [];
  const step = totalLength / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const targetL = i * step;

    // Binary search for segment containing targetL
    let low = 0;
    let high = cumLengths.length - 1;
    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (cumLengths[mid] <= targetL) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const segL = cumLengths[high] - cumLengths[low];
    const t = segL > 0 ? (targetL - cumLengths[low]) / segL : 0;

    resampled.push({
      x: pts[low].x + t * (pts[high].x - pts[low].x),
      y: pts[low].y + t * (pts[high].y - pts[low].y),
    });
  }

  return resampled;
}

/**
 * Generate preset geometric and topological curves
 */
export function getPresetCurve(presetId: string, centerX = 320, centerY = 200, scale = 140): Point2D[] {
  const points: Point2D[] = [];
  const N = 180;

  switch (presetId) {
    case "ellipse": {
      const a = scale * 1.25;
      const b = scale * 0.75;
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        points.push({
          x: centerX + a * Math.cos(theta),
          y: centerY + b * Math.sin(theta),
        });
      }
      break;
    }
    case "clover": {
      // 3-leaf or 4-leaf clover
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const r = scale * (0.8 + 0.35 * Math.cos(3 * theta));
        points.push({
          x: centerX + r * Math.cos(theta),
          y: centerY + r * Math.sin(theta),
        });
      }
      break;
    }
    case "limacon": {
      // Asymmetric teardrop / Limacon
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const r = scale * (0.85 + 0.35 * Math.sin(theta) + 0.15 * Math.cos(2 * theta));
        points.push({
          x: centerX + r * Math.cos(theta),
          y: centerY + r * Math.sin(theta),
        });
      }
      break;
    }
    case "astroid": {
      // Non-convex star curve (hypocycloid)
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const x = scale * (cosT ** 3);
        const y = scale * (sinT ** 3);
        points.push({
          x: centerX + x,
          y: centerY + y,
        });
      }
      break;
    }
    case "wobble": {
      // Perturbed Fourier loop with no obvious symmetries
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const r =
          scale *
          (0.85 +
            0.18 * Math.cos(2 * theta + 0.5) +
            0.12 * Math.sin(3 * theta - 0.3) +
            0.08 * Math.cos(5 * theta + 1.2));
        points.push({
          x: centerX + r * Math.cos(theta),
          y: centerY + r * Math.sin(theta),
        });
      }
      break;
    }
    case "circle":
    default: {
      const r = scale;
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        points.push({
          x: centerX + r * Math.cos(theta),
          y: centerY + r * Math.sin(theta),
        });
      }
      break;
    }
  }

  return resampleClosedCurve(points, 180);
}

/**
 * Searches the discretized closed curve for inscribed squares.
 * Uses diagonal scanning and perpendicular projection.
 */
export function findInscribedSquares(
  curve: Point2D[],
  maxError = 4.5,
  limit = 4
): InscribedSquare[] {
  const n = curve.length;
  if (n < 8) return [];

  const candidates: InscribedSquare[] = [];

  // Minimum index separation to avoid degenerate zero-size squares
  const minSeparation = Math.floor(n / 12);
  const maxSeparation = Math.floor(n / 2);

  for (let i = 0; i < n; i++) {
    for (let sep = minSeparation; sep <= maxSeparation; sep++) {
      const j = (i + sep) % n;
      const p1 = curve[i];
      const p2 = curve[j];

      // Treat p1 and p2 as diagonal AC of a candidate square
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const halfDx = (p2.x - p1.x) / 2;
      const halfDy = (p2.y - p1.y) / 2;

      // The perpendicular vector for a square is (-halfDy, halfDx)
      const candB: Point2D = {
        x: midX - halfDy,
        y: midY + halfDx,
      };
      const candD: Point2D = {
        x: midX + halfDy,
        y: midY - halfDx,
      };

      const distB = distToCurve(candB, curve);
      const distD = distToCurve(candD, curve);

      const err = Math.max(distB.dist, distD.dist);

      if (err <= maxError) {
        const sideLen = distance(p1, candB);
        // Only accept non-trivial squares
        if (sideLen > 15) {
          const rotationRad = Math.atan2(candB.y - p1.y, candB.x - p1.x);
          const rotationDeg = (rotationRad * 180) / Math.PI;

          candidates.push({
            a: p1,
            b: distB.closest,
            c: p2,
            d: distD.closest,
            center: { x: midX, y: midY },
            sideLength: sideLen,
            area: sideLen * sideLen,
            perimeter: 4 * sideLen,
            rotationDeg: (rotationDeg + 360) % 360,
            error: err,
          });
        }
      }
    }
  }

  // Deduplicate squares with similar centers and orientations
  const uniqueSquares: InscribedSquare[] = [];

  // Sort candidates by lowest error first
  candidates.sort((s1, s2) => s1.error - s2.error);

  for (const cand of candidates) {
    const isDuplicate = uniqueSquares.some((existing) => {
      const distCenter = distance(cand.center, existing.center);
      const diffSide = Math.abs(cand.sideLength - existing.sideLength);
      const diffRot = Math.abs((cand.rotationDeg - existing.rotationDeg + 360) % 90);
      return distCenter < 12 && diffSide < 10 && (diffRot < 8 || diffRot > 82);
    });

    if (!isDuplicate) {
      uniqueSquares.push(cand);
      if (uniqueSquares.length >= limit) break;
    }
  }

  return uniqueSquares;
}

/**
 * Verify if 4 points form a valid square within specified tolerances
 */
export function verifySquareGeometry(a: Point2D, b: Point2D, c: Point2D, d: Point2D): {
  isSquare: boolean;
  sides: [number, number, number, number];
  diagonals: [number, number];
  anglesDeg: [number, number, number, number];
  sideVariance: number;
} {
  const s1 = distance(a, b);
  const s2 = distance(b, c);
  const s3 = distance(c, d);
  const s4 = distance(d, a);

  const diag1 = distance(a, c);
  const diag2 = distance(b, d);

  // Helper angle between (P1 -> P2) and (P2 -> P3)
  const computeAngle = (p1: Point2D, p2: Point2D, p3: Point2D): number => {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);
    if (mag1 === 0 || mag2 === 0) return 0;
    const cosVal = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return (Math.acos(cosVal) * 180) / Math.PI;
  };

  const a1 = computeAngle(d, a, b);
  const a2 = computeAngle(a, b, c);
  const a3 = computeAngle(b, c, d);
  const a4 = computeAngle(c, d, a);

  const avgSide = (s1 + s2 + s3 + s4) / 4;
  const sideVariance =
    Math.max(Math.abs(s1 - avgSide), Math.abs(s2 - avgSide), Math.abs(s3 - avgSide), Math.abs(s4 - avgSide)) /
    avgSide;

  const diagDiff = Math.abs(diag1 - diag2) / ((diag1 + diag2) / 2);

  const isSquare = sideVariance < 0.08 && diagDiff < 0.08 && Math.abs(a1 - 90) < 6;

  return {
    isSquare,
    sides: [s1, s2, s3, s4],
    diagonals: [diag1, diag2],
    anglesDeg: [a1, a2, a3, a4],
    sideVariance,
  };
}
