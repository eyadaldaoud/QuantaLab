import type { Metadata } from "next";
import InscribedSquareLab from "./inscribed-square-lab";

export const metadata: Metadata = {
  title: "The Inscribed Square Problem — Interactive Topology & Geometry Lab | QuantaLab",
  description:
    "Interactive 2D/3D simulation of Otto Toeplitz's Inscribed Square Problem (Square Peg Problem). Draw any closed loop or choose topological presets to watch the real-time geometric solver identify four points forming a perfect inscribed square.",
};

export default function InscribedSquarePage() {
  return <InscribedSquareLab />;
}

