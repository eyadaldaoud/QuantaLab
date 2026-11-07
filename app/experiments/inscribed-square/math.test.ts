import { describe, it, expect } from "vitest";
import {
  distance,
  resampleClosedCurve,
  getPresetCurve,
  findInscribedSquares,
  verifySquareGeometry,
} from "./math";

describe("Inscribed Square Problem (Toeplitz Conjecture) Math Engine", () => {
  it("verifies Euclidean distance calculations correctly", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 5);
    expect(distance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });

  it("resamples a closed curve into equal arc-length segments", () => {
    const raw = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ];
    const resampled = resampleClosedCurve(raw, 40);
    expect(resampled.length).toBe(40);
  });

  it("finds inscribed squares in a circle preset", () => {
    const circle = getPresetCurve("circle", 200, 200, 100);
    const squares = findInscribedSquares(circle, 3.0, 5);

    expect(squares.length).toBeGreaterThanOrEqual(1);

    const sq = squares[0];
    const verification = verifySquareGeometry(sq.a, sq.b, sq.c, sq.d);

    // In a circle of radius R=100, square side should be R * sqrt(2) ≈ 141.42
    expect(sq.sideLength).toBeCloseTo(141.42, 0);
    expect(verification.isSquare).toBe(true);
    expect(verification.sideVariance).toBeLessThan(0.05);
  });

  it("finds inscribed squares in an ellipse preset", () => {
    const ellipse = getPresetCurve("ellipse", 200, 200, 100);
    const squares = findInscribedSquares(ellipse, 4.0, 5);

    expect(squares.length).toBeGreaterThanOrEqual(1);
    const sq = squares[0];
    const verification = verifySquareGeometry(sq.a, sq.b, sq.c, sq.d);
    expect(verification.isSquare).toBe(true);
  });

  it("finds inscribed squares in a clover (multi-lobed) preset", () => {
    const clover = getPresetCurve("clover", 200, 200, 100);
    const squares = findInscribedSquares(clover, 5.0, 5);

    expect(squares.length).toBeGreaterThanOrEqual(1);
    const sq = squares[0];
    const verification = verifySquareGeometry(sq.a, sq.b, sq.c, sq.d);
    expect(verification.isSquare).toBe(true);
  });

  it("correctly flags non-squares in verification", () => {
    // A distorted quadrilateral
    const nonSquare = verifySquareGeometry(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 150, y: 60 },
      { x: 0, y: 80 }
    );
    expect(nonSquare.isSquare).toBe(false);
  });
});
