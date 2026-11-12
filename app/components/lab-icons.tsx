import React from "react";

/**
 * Inline SVG geometry for the lab consoles — 1.5px strokes, currentColor.
 * DESIGN.md bans emoji/unicode icons; these are the only permitted glyphs.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function svgProps({ size = 16, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };
}

export function IconBack(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>
  );
}

export function IconWave(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M2 12c2.5-6 5-6 7.5 0s5 6 7.5 0 3-4.5 5-2" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconPolarizer(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M7 17L17 7" />
    </svg>
  );
}

export function IconSlitPlate(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 4v6M4 14v6" />
      <path d="M8 4v3M8 10v4M8 17v3" strokeWidth="1.5" opacity="0.55" />
      <path d="M12 4v16" strokeWidth="1.5" />
      <path d="M16 10l4 2-4 2" />
    </svg>
  );
}

export function IconSquarePlate(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="4.5" y="4.5" width="15" height="15" />
      <circle cx="12" cy="12" r="8.5" opacity="0.55" />
    </svg>
  );
}

export function IconRect(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3.5" y="7" width="17" height="10" />
    </svg>
  );
}

export function IconLoop(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 4a8 8 0 1 1-7.4 5" />
      <path d="M4.6 4.5v5h5" />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M7 5l12 7-12 7V5z" />
    </svg>
  );
}

export function IconPause(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9 5v14" strokeWidth="2.5" />
      <path d="M15 5v14" strokeWidth="2.5" />
    </svg>
  );
}

export function IconReset(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 10a8 8 0 1 1 1.7 8.5" />
      <path d="M4 4v6h6" />
    </svg>
  );
}

export function IconExpand(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M9 4H4v5" />
      <path d="M15 4h5v5" />
      <path d="M9 20H4v-5" />
      <path d="M15 20h5v-5" />
    </svg>
  );
}

export function IconCollapse(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M4 9h5V4" />
      <path d="M20 9h-5V4" />
      <path d="M4 15h5v5" />
      <path d="M20 15h-5v5" />
    </svg>
  );
}

export function IconPhoton(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3 12h11" />
      <path d="M11 8l4 4-4 4" />
      <circle cx="20" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconVideo(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="3" y="6" width="13" height="12" rx="1.5" />
      <path d="M16 10l5-3v10l-5-3" />
    </svg>
  );
}
