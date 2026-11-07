/**
 * The Inscribed Square Problem (Toeplitz Conjecture / Square Peg Problem)
 * High-precision mathematical solver, curve parameterization, Green's theorem,
 * Greene-Lobb rectangle solver, and symplectic geometry utilities.
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
  error: number; // max deviation of any vertex from curve in pixels
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
  error: number;
}

export interface CurveTelemetry {
  perimeter: number;
  area: number;
  isoperimetricQuotient: number; // Q = 4*pi*Area / P^2  (<= 1, =1 for circle)
  centroid: Point2D;
  isSelfIntersecting: boolean;
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
export function resampleClosedCurve(rawPoints: Point2D[], targetCount = 180): Point2D[] {
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
 * Compute loop telemetry using Green's theorem for area and centroid
 */
export function computeCurveTelemetry(curve: Point2D[]): CurveTelemetry {
  const n = curve.length;
  if (n < 3) {
    return {
      perimeter: 0,
      area: 0,
      isoperimetricQuotient: 0,
      centroid: { x: 0, y: 0 },
      isSelfIntersecting: false,
    };
  }

  let perimeter = 0;
  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < n; i++) {
    const a = curve[i];
    const b = curve[(i + 1) % n];

    perimeter += distance(a, b);

    const cross = a.x * b.y - b.x * a.y;
    signedArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }

  const area = Math.abs(signedArea / 2);
  const sixA = 6 * (signedArea / 2);
  const centroid =
    Math.abs(sixA) > 1e-5
      ? { x: cx / sixA, y: cy / sixA }
      : { x: curve[0].x, y: curve[0].y };

  const isoperimetricQuotient =
    perimeter > 0 ? Math.min(1.0, (4 * Math.PI * area) / (perimeter * perimeter)) : 0;

  return {
    perimeter,
    area,
    isoperimetricQuotient,
    centroid,
    isSelfIntersecting: false,
  };
}

/**
 * Generate preset geometric and topological curves with deformation support
 */
export function getPresetCurve(
  presetId: string,
  centerX = 360,
  centerY = 240,
  scale = 160,
  deformation = 1.0
): Point2D[] {
  const points: Point2D[] = [];
  const N = 200;

  switch (presetId) {
    case "ellipse": {
      const a = scale * (1.1 + 0.3 * (deformation - 1));
      const b = scale * (0.8 - 0.25 * (deformation - 1));
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
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const r = scale * (0.8 + 0.35 * deformation * Math.cos(3 * theta));
        points.push({
          x: centerX + r * Math.cos(theta),
          y: centerY + r * Math.sin(theta),
        });
      }
      break;
    }
    case "limacon": {
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const r = scale * (0.85 + 0.35 * deformation * Math.sin(theta) + 0.15 * Math.cos(2 * theta));
        points.push({
          x: centerX + r * Math.cos(theta),
          y: centerY + r * Math.sin(theta),
        });
      }
      break;
    }
    case "astroid": {
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const cosT = Math.cos(theta);
        const sinT = Math.sin(theta);
        const x = scale * (cosT ** 3);
        const y = scale * (sinT ** 3);
        points.push({
          x: centerX + x * deformation,
          y: centerY + y * deformation,
        });
      }
      break;
    }
    case "wobble": {
      for (let i = 0; i < N; i++) {
        const theta = (2 * Math.PI * i) / N;
        const r =
          scale *
          (0.85 +
            0.18 * deformation * Math.cos(2 * theta + 0.5) +
            0.14 * deformation * Math.sin(3 * theta - 0.3) +
            0.08 * deformation * Math.cos(5 * theta + 1.2));
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

  return resampleClosedCurve(points, 200);
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

  const minSeparation = Math.floor(n / 12);
  const maxSeparation = Math.floor(n / 2);

  for (let i = 0; i < n; i++) {
    for (let sep = minSeparation; sep <= maxSeparation; sep++) {
      const j = (i + sep) % n;
      const p1 = curve[i];
      const p2 = curve[j];

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const halfDx = (p2.x - p1.x) / 2;
      const halfDy = (p2.y - p1.y) / 2;

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

  const uniqueSquares: InscribedSquare[] = [];
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
 * Searches for inscribed rectangles of a specified aspect ratio r = width / height
 * implementing the Greene-Lobb Symplectic Theorem (2020).
 */
export function findInscribedRectangles(
  curve: Point2D[],
  targetAspectRatio = 1.618,
  maxError = 5.0,
  limit = 2
): InscribedRectangle[] {
  const n = curve.length;
  if (n < 8) return [];

  const candidates: InscribedRectangle[] = [];
  const minSeparation = Math.floor(n / 12);
  const maxSeparation = Math.floor(n / 2);

  // In a rectangle with aspect ratio r = W / H:
  // Angle between diagonals alpha: tan(alpha / 2) = H / W = 1 / r
  // So half-angle between diagonals is theta = atan(1 / r)
  const theta = Math.atan(1 / targetAspectRatio);

  for (let i = 0; i < n; i++) {
    for (let sep = minSeparation; sep <= maxSeparation; sep++) {
      const j = (i + sep) % n;
      const p1 = curve[i];
      const p2 = curve[j];

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const halfDiag = distance(p1, p2) / 2;
      if (halfDiag < 15) continue;

      const diagAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

      // Other diagonal BD has the same length, rotated by 2*theta
      const otherDiagAngle = diagAngle + 2 * theta;
      const candB: Point2D = {
        x: midX - halfDiag * Math.cos(otherDiagAngle),
        y: midY - halfDiag * Math.sin(otherDiagAngle),
      };
      const candD: Point2D = {
        x: midX + halfDiag * Math.cos(otherDiagAngle),
        y: midY + halfDiag * Math.sin(otherDiagAngle),
      };

      const distB = distToCurve(candB, curve);
      const distD = distToCurve(candD, curve);
      const err = Math.max(distB.dist, distD.dist);

      if (err <= maxError) {
        const w = distance(p1, candB);
        const h = distance(candB, p2);
        const rotDeg = ((diagAngle * 180) / Math.PI + 360) % 360;

        candidates.push({
          a: p1,
          b: distB.closest,
          c: p2,
          d: distD.closest,
          center: { x: midX, y: midY },
          width: Math.max(w, h),
          height: Math.min(w, h),
          aspectRatio: Math.max(w, h) / Math.max(1, Math.min(w, h)),
          rotationDeg: rotDeg,
          error: err,
        });
      }
    }
  }

  candidates.sort((r1, r2) => r1.error - r2.error);
  const uniqueRects: InscribedRectangle[] = [];

  for (const cand of candidates) {
    const isDup = uniqueRects.some(
      (ex) => distance(cand.center, ex.center) < 14 && Math.abs(cand.width - ex.width) < 10
    );
    if (!isDup) {
      uniqueRects.push(cand);
      if (uniqueRects.length >= limit) break;
    }
  }

  return uniqueRects;
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
