export type ExperimentCategory =
  | "Quantum Mechanics"
  | "Wave Optics"
  | "Modern Physics"
  | "Quantum Optics"
  | "Quantum Information"
  | "Mathematical Physics";

export type ExperimentStatus = "active" | "in-development" | "planned";

export type ExperimentDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface PhysicsFormula {
  label: string;
  math: string;
  description: string;
}

export interface ExperimentMetadata {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: ExperimentCategory;
  status: ExperimentStatus;
  difficulty: ExperimentDifficulty;
  route: string;
  icon: string;
  accentColor: string;
  accentGlow: string;
  summary: string;
  historicalContext: {
    year: string;
    discoverers: string;
    significance: string;
  };
  keyFormulas: PhysicsFormula[];
  learningOutcomes: string[];
  tags: string[];
  features: string[];
  roadmapMilestone?: string;
}

export const EXPERIMENTS: ExperimentMetadata[] = [
  {
    id: "double-slit",
    slug: "double-slit",
    title: "The Double-Slit Experiment",
    subtitle: "Wave-Particle Duality & The Quantum Observer Effect",
    category: "Quantum Mechanics",
    status: "active",
    difficulty: "Beginner",
    route: "/experiments/double-slit",
    icon: "🌊",
    accentColor: "#38e1ff",
    accentGlow: "rgba(56, 225, 255, 0.25)",
    summary:
      "Witness photons travel as wave superpositions through dual apertures to produce interference fringes, and watch the wave collapse into classical particle bands when an observer detector is engaged.",
    historicalContext: {
      year: "1801 / 1927 / 1989",
      discoverers: "Thomas Young (light), Davisson & Germer (electrons), Tonomura (single electrons)",
      significance:
        "Feynman called it 'a phenomenon which is impossible to explain in any classical way, and which has in it the heart of quantum mechanics.'",
    },
    keyFormulas: [
      {
        label: "Fringe Spacing",
        math: "y_m = (m · λ · L) / d",
        description: "Distance between interference maxima on the detector screen",
      },
      {
        label: "Total Intensity",
        math: "I(θ) = I₀ · cos²(π·d·sinθ / λ) · sinc²(π·a·sinθ / λ)",
        description: "Combined dual-slit interference and single-slit diffraction envelope",
      },
      {
        label: "de Broglie Wavelength",
        math: "λ = h / p",
        description: "Matter-wave relation connecting momentum to wavelength",
      },
      {
        label: "Heisenberg Uncertainty",
        math: "Δx · Δp ≥ ℏ / 2",
        description: "Fundamental limit on knowing which slit a photon traverses",
      },
    ],
    learningOutcomes: [
      "Observe constructive and destructive wave interference from dual slit apertures.",
      "Understand how single-photon accumulation forms interference over time.",
      "Experience the quantum observer effect and measurement-induced decoherence.",
      "Analyze the impact of wavelength (color) on fringe spatial frequency.",
    ],
    tags: ["Wave-Particle Duality", "Interference", "Observer Effect", "Decoherence", "Photons"],
    features: [
      "Real-time Three.js 3D apparatus with dual slits, laser, and phosphor screen",
      "Interactive Observer Toggle: Wave Superposition vs Classical Collapse",
      "Dynamic Wavelength Tuning (390nm - 700nm) with true spectral physics colors",
      "Monte Carlo single-photon stochastic sampling algorithm",
      "Analytical live probability distribution plot with histogram overlay",
      "Web Audio particle-detection synthesizer chimes",
      "5 camera presets (Perspective, Beam Axis, Detector, Slits, Overhead)",
      "Speed controls (0.1x ultra slow-mo to 4x high speed)",
      "Integrated YouTube video guide with key timestamp chapter jumps",
    ],
  },
  {
    id: "quantum-eraser",
    slug: "quantum-eraser",
    title: "The Quantum Eraser",
    subtitle: "Which-Path Tagging, Polarization & State Erasure",
    category: "Quantum Mechanics",
    status: "active",
    difficulty: "Intermediate",
    route: "/experiments/quantum-eraser",
    icon: "🪞",
    accentColor: "#a855f7",
    accentGlow: "rgba(168, 85, 247, 0.25)",
    summary:
      "Tag slit paths with orthogonal linear polarizations to destroy interference, then sort photons through an analyzer at angle θ to reveal complementary fringe patterns in sorted subsets.",
    historicalContext: {
      year: "1982 / 2000 / 2002",
      discoverers: "Scully & Drühl (1982 proposal); Kim et al. (2000); Walborn et al. (2002)",
      significance:
        "Demonstrates that which-path information recorded in physical degrees of freedom prevents interference, while an analyzer measuring in an uninformative basis reveals complementary interference subsets.",
    },
    keyFormulas: [
      {
        label: "Diffraction Envelope",
        math: "g(x) = sinc²(π·a·x / (λ·L))",
        description: "Normalized single-slit diffraction probability density",
      },
      {
        label: "Channel A Probability",
        math: "p_A(x) = 0.5 · g(x) · [1 + sin(2θ) · cos(2φ)]",
        description: "Transmitted channel density showing fringes with visibility |sin(2θ)|",
      },
      {
        label: "Channel B Probability",
        math: "p_B(x) = 0.5 · g(x) · [1 - sin(2θ) · cos(2φ)]",
        description: "Reflected channel density forming the complementary anti-fringe",
      },
      {
        label: "Fringe Visibility",
        math: "V = |sin(2θ)|",
        description: "Theoretical visibility as a function of analyzer rotation angle θ",
      },
    ],
    learningOutcomes: [
      "Observe standard double-slit interference in untagged mode.",
      "Understand why orthogonal H and V polarizations extinguish interference without requiring measurement.",
      "Analyze how polarizing beam splitters sort photons into complementary fringe subsets.",
      "Verify that the all-hits distribution is strictly flat and identical to the tagged envelope.",
    ],
    tags: ["Quantum Eraser", "Polarization", "Which-Path Information", "Fringe Visibility", "Complementarity"],
    features: [
      "Interactive 3D optical bench with dual-polarizer slit stage and rotatable analyzer",
      "Continuous analyzer rotation angle θ from 0° to 90° with live |sin(2θ)| visibility readout",
      "4 detector screen views: All Hits, Channel A, Channel B, and A & B Overlaid",
      "Colorblind-safe visualization distinguishing detection channels by color and shape",
      "Analytical Fraunhofer wave intensity curves with live Monte Carlo histogram overlay",
      "3-step guided discovery walkthrough and mathematical theory modals",
    ],
  },
  {
    id: "inscribed-square",
    slug: "inscribed-square",
    title: "The Inscribed Square Problem",
    subtitle: "Toeplitz Conjecture, Jordan Loops & Symplectic Topology",
    category: "Mathematical Physics",
    status: "active",
    difficulty: "Intermediate",
    route: "/experiments/inscribed-square",
    icon: "⏹️",
    accentColor: "#f59e0b",
    accentGlow: "rgba(245, 158, 11, 0.25)",
    summary:
      "Draw any closed loop or explore topological presets. Watch the real-time geometric solver identify four points on your loop that form a perfect inscribed square, and explore the 3D Möbius configuration space proving the theorem for smooth curves.",
    historicalContext: {
      year: "1911 / 1929 / 2020",
      discoverers: "Otto Toeplitz (1911), Lev Šnirel'man (1929), Joshua Greene & Andrew Lobb (2020)",
      significance:
        "One of the most celebrated problems in geometry: does every simple closed curve in the plane contain four vertices forming a square? Proven for smooth curves via symplectic topology; open for general continuous fractal loops.",
    },
    keyFormulas: [
      {
        label: "Orthogonal Diagonals",
        math: "\\vec{AC} \\perp \\vec{BD}, \\quad |\\vec{AC}| = |\\vec{BD}|",
        description: "Four vertices form a square if and only if their diagonals are equal in length, perpendicular, and bisect each other",
      },
      {
        label: "Square Center & Midpoint",
        math: "M = \\frac{A + C}{2} = \\frac{B + D}{2}",
        description: "Midpoint condition ensuring both pairs of opposite vertices share an identical centroid in the Euclidean plane",
      },
      {
        label: "Möbius Configuration Space",
        math: "(S^1 \\times S^1) / \\mathbb{Z}_2 \\cong \\text{Möbius Strip}",
        description: "Unordered pairs of points on a loop map to a non-orientable topological surface whose intersections guarantee geometric rectangles",
      },
      {
        label: "Greene-Lobb Symplectic Theorem",
        math: "\\forall r > 0, \\quad \\exists \\text{ Inscribed Rectangle of Aspect Ratio } r",
        description: "Breakthrough 2020 theorem proving every smooth Jordan curve contains inscribed rectangles of every aspect ratio",
      },
    ],
    learningOutcomes: [
      "Draw custom freehand loops and observe real-time detection of inscribed squares.",
      "Understand the algebraic and geometric conditions that uniquely characterize a square.",
      "Explore how topological invariants (Möbius strip embedding) prove the existence of inscribed geometries.",
      "Learn why the problem is solved for smooth curves but remains one of math's great open questions for rough fractals.",
    ],
    tags: ["Inscribed Square", "Toeplitz Conjecture", "Topology", "Jordan Curve", "Möbius Strip", "Greene-Lobb"],
    features: [
      "Interactive freehand curve drawing canvas with touch and mouse drawing",
      "Geometric preset catalog (Ellipse, Clover, Teardrop Limacon, Astroid Star, Perturbed Wobble)",
      "Real-time diagonal scanning optimizer identifying valid inscribed squares",
      "Live geometry verification telemetry (side lengths, 90° corner angles, diagonal equality)",
      "3D Topological Möbius Configuration Space visualizer (3Blue1Brown projection)",
      "Multi-square detection highlighting alternate inscribed square orientations",
    ],
  },
];

export function getAllExperiments(): ExperimentMetadata[] {
  return EXPERIMENTS;
}

export function getActiveExperiments(): ExperimentMetadata[] {
  return EXPERIMENTS.filter((exp) => exp.status === "active");
}

export function getPlannedExperiments(): ExperimentMetadata[] {
  return EXPERIMENTS.filter((exp) => exp.status !== "active");
}

export function getExperimentBySlug(slug: string): ExperimentMetadata | undefined {
  return EXPERIMENTS.find((exp) => exp.slug === slug);
}
