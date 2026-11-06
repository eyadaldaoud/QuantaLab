"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EXPERIMENTS, ExperimentMetadata } from "@/lib/experiments";

interface NavbarProps {
  currentExperimentSlug?: string;
}

interface SearchEntry {
  id: string;
  title: string;
  category: "Simulation" | "Formula" | "Feature" | "Guide";
  description: string;
  href: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  keywords?: string[];
}

const GITHUB_REPO_URL = "https://github.com/eyadaldaoud/double-slit-experiment";

export default function Navbar({ currentExperimentSlug }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Navigation states
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"experiments" | "launch" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  // Refs for click outside & accessibility
  const navRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchListRef = useRef<HTMLDivElement>(null);

  // Active experiment detection
  const detectedSlug = currentExperimentSlug || (
    pathname?.startsWith("/experiments/double-slit")
      ? "double-slit"
      : pathname?.startsWith("/experiments/quantum-eraser")
      ? "quantum-eraser"
      : undefined
  );

  const activeExperiments = useMemo(
    () => EXPERIMENTS.filter((e) => e.status === "active"),
    []
  );

  // Scroll detection for navbar elevation
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Global click outside listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts (⌘K / Ctrl+K, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette (⌘K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        setActiveDropdown(null);
        return;
      }

      // Close open modals / dropdowns on Escape
      if (e.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
          setSearchQuery("");
        } else if (activeDropdown) {
          setActiveDropdown(null);
        } else if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, activeDropdown, isMobileMenuOpen]);

  // Focus input when search modal opens
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSelectedSearchIndex(0);
    }
  }, [isSearchOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // DYNAMIC SEARCH CATALOG GENERATION FROM REAL EXPERIMENTS REGISTRY
  // No static code or fake unimplemented experiments!
  const searchEntries: SearchEntry[] = useMemo(() => {
    const entries: SearchEntry[] = [];

    // 1. Dynamic active experiments from EXPERIMENTS registry
    activeExperiments.forEach((exp) => {
      entries.push({
        id: `exp-${exp.slug}`,
        title: exp.title,
        category: "Simulation",
        description: exp.subtitle,
        href: exp.route,
        icon: exp.icon,
        badge: `${exp.difficulty.toUpperCase()} • LIVE`,
        badgeColor: exp.accentColor,
        keywords: [exp.slug, exp.title, exp.category, ...exp.tags],
      });

      // 2. Dynamic formulas registered for this experiment
      exp.keyFormulas.forEach((formula, idx) => {
        entries.push({
          id: `formula-${exp.slug}-${idx}`,
          title: `${formula.label}: ${formula.math}`,
          category: "Formula",
          description: formula.description,
          href: exp.route,
          icon: "📐",
          badge: exp.title.replace("The ", ""),
          badgeColor: exp.accentColor,
          keywords: [formula.label, formula.math, exp.slug, "formula", "equation"],
        });
      });

      // 3. Dynamic features implemented in this experiment
      exp.features.slice(0, 3).forEach((feat, idx) => {
        entries.push({
          id: `feat-${exp.slug}-${idx}`,
          title: feat,
          category: "Feature",
          description: `Interactive apparatus feature in ${exp.title}`,
          href: exp.route,
          icon: "⚡",
          badge: "LAB BENCH",
          badgeColor: exp.accentColor,
          keywords: [feat, exp.slug, "feature"],
        });
      });
    });

    // 4. Platform navigation sections (actually implemented on the page)
    entries.push(
      {
        id: "guide-catalog",
        title: "Experiments Catalog & Filter",
        category: "Guide",
        description: "Browse and filter active and upcoming simulations by physics category",
        href: "/#experiments",
        icon: "📚",
        badge: "DIRECTORY",
        keywords: ["catalog", "directory", "filter", "categories"],
      },
      {
        id: "guide-pillars",
        title: "Platform Architecture: Three Pillars",
        category: "Guide",
        description: "Closed-form analytical physics, interactive 3D WebGL, and real-time audio synthesis",
        href: "/#about",
        icon: "🏛️",
        badge: "ARCHITECTURE",
        keywords: ["architecture", "pillars", "principles", "threejs", "audio"],
      },
      {
        id: "guide-docs",
        title: "Developer Guide: Adding Experiments",
        category: "Guide",
        description: "Modular registry architecture for implementing new quantum simulations",
        href: "/#docs",
        icon: "📖",
        badge: "DEV GUIDE",
        keywords: ["docs", "contribute", "developer", "modular", "new experiment"],
      }
    );

    return entries;
  }, [activeExperiments]);

  // Filtered search entries based on query
  const filteredSearchEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return searchEntries.slice(0, 8);
    }
    return searchEntries.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCat || matchKeywords;
    });
  }, [searchQuery, searchEntries]);

  // Handle keyboard navigation within search modal
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex((prev) =>
        prev < filteredSearchEntries.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSearchEntries.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = filteredSearchEntries[selectedSearchIndex];
      if (selected) {
        setIsSearchOpen(false);
        setSearchQuery("");
        router.push(selected.href);
      }
    }
  };

  const selectSearchResult = (item: SearchEntry) => {
    setIsSearchOpen(false);
    setSearchQuery("");
    router.push(item.href);
  };

  return (
    <>
      <header
        ref={navRef}
        className={`platform-nav-header ${isScrolled ? "is-scrolled" : ""}`}
      >
        <div className="platform-nav-container">
          {/* 1. BRAND LOGO */}
          <Link
            href="/"
            className="platform-brand"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setActiveDropdown(null);
            }}
          >
            <div className="brand-symbol" aria-hidden="true">
              {/* Dynamic Animated Quantum Atom SVG */}
              <svg
                className="quantum-atom-svg"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse
                  cx="50"
                  cy="50"
                  rx="44"
                  ry="16"
                  className="atom-orbit orbit-1"
                />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="44"
                  ry="16"
                  transform="rotate(60 50 50)"
                  className="atom-orbit orbit-2"
                />
                <ellipse
                  cx="50"
                  cy="50"
                  rx="44"
                  ry="16"
                  transform="rotate(120 50 50)"
                  className="atom-orbit orbit-3"
                />
                <circle cx="50" cy="50" r="9" className="atom-nucleus-glow" />
                <circle cx="50" cy="50" r="5" className="atom-nucleus-core" />
              </svg>
            </div>
            <div className="brand-text-block">
              <div className="brand-title-line">
                <span className="brand-title">
                  QUANTA<span className="brand-title-accent">LAB</span>
                </span>
                <span className="brand-live-badge">
                  <span className="live-beacon-dot" />
                  <span>2 LABS LIVE</span>
                </span>
              </div>
              <span className="brand-tagline">VIRTUAL QUANTUM &amp; OPTICS BENCH</span>
            </div>
          </Link>

          {/* 2. DESKTOP NAVIGATION MENU */}
          <nav className="platform-nav-menu" aria-label="Main Navigation">
            <Link
              href="/"
              className={`nav-link ${
                pathname === "/" && !detectedSlug ? "active" : ""
              }`}
              onClick={() => setActiveDropdown(null)}
            >
              <span>Catalog</span>
            </Link>

            {/* Experiments Mega Dropdown Trigger */}
            <div
              className="nav-dropdown-wrapper"
              onMouseEnter={() => setActiveDropdown("experiments")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className={`nav-link nav-dropdown-btn ${
                  detectedSlug || activeDropdown === "experiments" ? "active" : ""
                }`}
                onClick={() =>
                  setActiveDropdown((prev) =>
                    prev === "experiments" ? null : "experiments"
                  )
                }
                aria-expanded={activeDropdown === "experiments"}
                aria-haspopup="true"
              >
                <span>Experiments</span>
                <svg
                  className={`nav-caret-svg ${
                    activeDropdown === "experiments" ? "is-open" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Mega Dropdown Menu */}
              {activeDropdown === "experiments" && (
                <div
                  className="nav-mega-dropdown"
                  role="menu"
                  aria-label="Experiments directory"
                >
                  <div className="mega-dropdown-grid">
                    {/* Left Column: Active Simulations */}
                    <div className="mega-col mega-col-active">
                      <div className="mega-section-header">
                        <span className="header-dot dot-live" />
                        <span>ACTIVE 3D OPTICAL BENCHES</span>
                      </div>

                      <div className="mega-experiments-list">
                        {activeExperiments.map((exp) => {
                          const isCurrent = detectedSlug === exp.slug;
                          return (
                            <Link
                              key={exp.id}
                              href={exp.route}
                              className={`mega-exp-card ${isCurrent ? "is-current" : ""}`}
                              onClick={() => setActiveDropdown(null)}
                              role="menuitem"
                            >
                              <div
                                className="mega-exp-icon-wrap"
                                style={{
                                  borderColor: exp.accentColor,
                                  boxShadow: `0 0 12px ${exp.accentGlow}`,
                                }}
                              >
                                <span className="mega-exp-icon">{exp.icon}</span>
                              </div>
                              <div className="mega-exp-details">
                                <div className="mega-exp-title-row">
                                  <span className="mega-exp-title">{exp.title}</span>
                                  <span
                                    className="mega-difficulty-pill"
                                    style={{ color: exp.accentColor }}
                                  >
                                    {exp.difficulty}
                                  </span>
                                </div>
                                <p className="mega-exp-subtitle">{exp.subtitle}</p>
                                <div className="mega-exp-tags">
                                  {exp.tags.slice(0, 3).map((tag) => (
                                    <span key={tag} className="mega-mini-tag">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <span className="mega-exp-arrow" aria-hidden="true">
                                →
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: Platform & Roadmap */}
                    <div className="mega-col mega-col-roadmap">
                      <div className="mega-section-header">
                        <span className="header-dot dot-roadmap" />
                        <span>PLATFORM ARCHITECTURE &amp; ROADMAP</span>
                      </div>

                      <div className="mega-roadmap-links">
                        <Link
                          href="/#about"
                          className="mega-link-item"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="mega-link-icon">🏛️</span>
                          <div>
                            <span className="mega-link-title">Physics Pillars</span>
                            <span className="mega-link-desc">
                              Real-time 3D, analytical math, and audio feedback
                            </span>
                          </div>
                        </Link>

                        <Link
                          href="/#docs"
                          className="mega-link-item"
                          onClick={() => setActiveDropdown(null)}
                        >
                          <span className="mega-link-icon">📖</span>
                          <div>
                            <span className="mega-link-title">Mathematical Rigor &amp; Proofs</span>
                            <span className="mega-link-desc">
                              Exact equations, derivations &amp; formulas
                            </span>
                          </div>
                        </Link>

                        <div className="mega-upcoming-box">
                          <span className="upcoming-label">NEXT IN PIPELINE</span>
                          <div className="upcoming-item">
                            <span className="upcoming-icon">🧭</span>
                            <div className="upcoming-info">
                              <span className="upcoming-name">Stern-Gerlach Apparatus</span>
                              <span className="upcoming-sub">Space Quantization &amp; Spin-1/2</span>
                            </div>
                            <span className="upcoming-tag">IN DEV</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mega Menu Footer */}
                  <div className="mega-dropdown-footer">
                    <span className="footer-tip">
                      <kbd className="cmd-kbd">⌘K</kbd> / <kbd className="cmd-kbd">Ctrl+K</kbd> Quick search any formula or simulation
                    </span>
                    <Link
                      href="/#experiments"
                      className="footer-catalog-link"
                      onClick={() => setActiveDropdown(null)}
                    >
                      <span>View Full Catalog Directory</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/#about"
              className="nav-link"
              onClick={() => setActiveDropdown(null)}
            >
              <span>Principles</span>
            </Link>

            <Link
              href="/#docs"
              className="nav-link"
              onClick={() => setActiveDropdown(null)}
            >
              <span>Docs &amp; Math</span>
            </Link>
          </nav>

          {/* 3. RIGHT ACTION CLUSTER: SEARCH, GITHUB, AND LAUNCH */}
          <div className="platform-nav-actions">
            {/* Quick Search Trigger */}
            <button
              type="button"
              className="nav-search-trigger"
              onClick={() => setIsSearchOpen(true)}
              title="Search simulations, formulas, and docs (⌘K)"
              aria-label="Search simulations, formulas, and docs"
            >
              <svg
                className="search-icon-svg"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M17.5 17.5l-4.5-4.5" />
              </svg>
              <span className="search-placeholder-text">Search QuantaLab...</span>
              <kbd className="search-shortcut-pill">⌘K</kbd>
            </button>

            {/* Official GitHub Repository Link Button */}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-github-btn"
              title="View Source on GitHub (eyadaldaoud/double-slit-experiment)"
              aria-label="QuantaLab GitHub Repository"
            >
              <svg
                className="github-icon-svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span className="github-btn-label">GitHub</span>
            </a>

            {/* Smart Launch Lab Dropdown */}
            <div
              className="nav-launch-wrapper"
              onMouseEnter={() => setActiveDropdown("launch")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                type="button"
                className="btn-launch-header"
                onClick={() =>
                  setActiveDropdown((prev) => (prev === "launch" ? null : "launch"))
                }
                aria-expanded={activeDropdown === "launch"}
                aria-haspopup="true"
                title="Launch Quantum Laboratory Simulation"
              >
                <span className="btn-launch-glow" />
                <span className="btn-launch-icon">⚡</span>
                <span className="btn-launch-text">LAUNCH LAB</span>
                <svg
                  className={`launch-caret-svg ${
                    activeDropdown === "launch" ? "is-open" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="12"
                  height="12"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Quick Launch Popover */}
              {activeDropdown === "launch" && (
                <div className="launch-dropdown-menu" role="menu">
                  <div className="launch-header-row">
                    <span>SELECT SIMULATION APPARATUS</span>
                    <span className="launch-live-dot" />
                  </div>

                  {activeExperiments.map((exp) => (
                    <Link
                      key={exp.id}
                      href={exp.route}
                      className={`launch-exp-item ${
                        detectedSlug === exp.slug ? "active-current" : ""
                      }`}
                      onClick={() => setActiveDropdown(null)}
                      role="menuitem"
                    >
                      <span className="launch-item-icon">{exp.icon}</span>
                      <div className="launch-item-content">
                        <div className="launch-item-top">
                          <span className="launch-item-title">{exp.title}</span>
                          <span
                            className="launch-badge-pill"
                            style={{
                              borderColor: exp.accentColor,
                              color: exp.accentColor,
                            }}
                          >
                            {exp.difficulty}
                          </span>
                        </div>
                        <span className="launch-item-desc">{exp.subtitle}</span>
                      </div>
                      <span className="launch-item-launch-arrow">LAUNCH →</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              className={`mobile-menu-toggle ${isMobileMenuOpen ? "is-active" : ""}`}
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={isMobileMenuOpen}
            >
              <span className="hamburger-bar bar-1" />
              <span className="hamburger-bar bar-2" />
              <span className="hamburger-bar bar-3" />
            </button>
          </div>
        </div>

        {/* 4. REFINED MOBILE NAVIGATION DRAWER */}
        {isMobileMenuOpen && (
          <div className="mobile-nav-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
            <div
              className="mobile-nav-drawer"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Search Button */}
              <button
                type="button"
                className="mobile-search-btn"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSearchOpen(true);
                }}
              >
                <svg
                  className="search-icon-svg"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  width="18"
                  height="18"
                >
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M17.5 17.5l-4.5-4.5" />
                </svg>
                <span>Search experiments &amp; formulas...</span>
                <kbd className="mobile-kbd">⌘K</kbd>
              </button>

              {/* Mobile Live Simulations Section */}
              <div className="mobile-drawer-section">
                <div className="mobile-section-heading">
                  <span className="live-beacon-dot" />
                  <span>ACTIVE 3D EXPERIMENTS</span>
                </div>
                <div className="mobile-cards-grid">
                  {activeExperiments.map((exp) => (
                    <Link
                      key={exp.id}
                      href={exp.route}
                      className={`mobile-exp-tile ${
                        detectedSlug === exp.slug ? "is-active" : ""
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="mobile-exp-tile-header">
                        <span className="mobile-exp-icon">{exp.icon}</span>
                        <span className="mobile-exp-tag">ENTER LAB →</span>
                      </div>
                      <div className="mobile-exp-tile-body">
                        <span className="mobile-exp-title">{exp.title}</span>
                        <span className="mobile-exp-sub">{exp.subtitle}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Mobile Standard Nav Links */}
              <div className="mobile-drawer-section">
                <div className="mobile-section-heading">EXPLORE PLATFORM</div>
                <div className="mobile-nav-links-list">
                  <Link
                    href="/"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="link-icon">🏠</span>
                    <span>Experiments Catalog</span>
                  </Link>
                  <Link
                    href="/#about"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="link-icon">🏛️</span>
                    <span>Physics Principles &amp; Architecture</span>
                  </Link>
                  <Link
                    href="/#docs"
                    className="mobile-nav-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="link-icon">📖</span>
                    <span>Documentation &amp; Formulas</span>
                  </Link>
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-nav-link"
                  >
                    <span className="link-icon">⭐</span>
                    <span>View GitHub Repository</span>
                  </a>
                </div>
              </div>

              {/* Mobile Drawer Footer */}
              <div className="mobile-drawer-footer">
                <div className="mobile-engine-status">
                  <span className="status-indicator-dot" />
                  <span>QuantaLab WebGL 2.0 Engine Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 5. SPOTLIGHT COMMAND PALETTE SEARCH MODAL (⌘K) */}
      {isSearchOpen && (
        <div
          className="command-palette-backdrop"
          onClick={() => {
            setIsSearchOpen(false);
            setSearchQuery("");
          }}
        >
          <div
            className="command-palette-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleSearchKeyDown}
          >
            {/* Input Bar */}
            <div className="palette-input-wrapper">
              <svg
                className="palette-search-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="M17.5 17.5l-4.5-4.5" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="palette-search-input"
                placeholder="Search active simulations, key formulas, or features..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedSearchIndex(0);
                }}
                aria-label="Search QuantaLab"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="palette-clear-btn"
                  onClick={() => setSearchQuery("")}
                  title="Clear input"
                >
                  ✕
                </button>
              )}
              <kbd
                className="palette-esc-kbd"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery("");
                }}
                title="Press Esc to exit"
              >
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div
              ref={searchListRef}
              className="palette-results-list"
              role="listbox"
            >
              {filteredSearchEntries.length > 0 ? (
                filteredSearchEntries.map((item, index) => {
                  const isSelected = index === selectedSearchIndex;
                  return (
                    <div
                      key={item.id}
                      className={`palette-result-item ${
                        isSelected ? "is-selected" : ""
                      }`}
                      onClick={() => selectSearchResult(item)}
                      onMouseEnter={() => setSelectedSearchIndex(index)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="result-icon">{item.icon}</span>
                      <div className="result-details">
                        <div className="result-title-line">
                          <span className="result-title">{item.title}</span>
                          {item.badge && (
                            <span
                              className="result-badge"
                              style={{
                                color: item.badgeColor || "var(--quantum-cyan)",
                                borderColor: item.badgeColor || "rgba(56, 225, 255, 0.3)",
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="result-desc">{item.description}</span>
                      </div>
                      <span className="result-action-label" aria-hidden="true">
                        {isSelected ? "↵ OPEN" : ""}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="palette-no-results">
                  <span className="no-results-icon">🔭</span>
                  <p className="no-results-heading">
                    No matching active simulations or formulas
                  </p>
                  <p className="no-results-sub">
                    Try searching for &ldquo;double slit&rdquo;, &ldquo;eraser&rdquo;, &ldquo;fringe&rdquo;, &ldquo;visibility&rdquo;, or &ldquo;diffraction&rdquo;.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Keyboard Shortcuts Footer */}
            <div className="palette-footer">
              <div className="palette-keys-hint">
                <span className="key-item">
                  <kbd>↑</kbd> <kbd>↓</kbd> Navigate
                </span>
                <span className="key-item">
                  <kbd>↵</kbd> Select
                </span>
                <span className="key-item">
                  <kbd>ESC</kbd> Close
                </span>
              </div>
              <span className="palette-footer-brand">QUANTA·LAB COMMAND</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
