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
  badge?: string;
  badgeColor?: string;
  keywords?: string[];
}

const GITHUB_REPO_URL = "https://github.com/eyadaldaoud/QuantaLab";

const CATEGORY_KEY: Record<SearchEntry["category"], string> = {
  Simulation: "S",
  Formula: "ƒ",
  Feature: "F",
  Guide: "G",
};

export default function Navbar({ currentExperimentSlug }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"experiments" | "launch" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);

  const navRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchListRef = useRef<HTMLDivElement>(null);

  const detectedSlug = currentExperimentSlug || (
    pathname?.startsWith("/experiments/double-slit")
      ? "double-slit"
      : pathname?.startsWith("/experiments/quantum-eraser")
      ? "quantum-eraser"
      : pathname?.startsWith("/experiments/inscribed-square")
      ? "inscribed-square"
      : undefined
  );

  const activeExperiments = useMemo(
    () => EXPERIMENTS.filter((e) => e.status === "active"),
    []
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        setActiveDropdown(null);
        return;
      }

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

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      setSelectedSearchIndex(0);
    }
  }, [isSearchOpen]);

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

  // Search catalog generated from the real experiments registry.
  const searchEntries: SearchEntry[] = useMemo(() => {
    const entries: SearchEntry[] = [];

    activeExperiments.forEach((exp) => {
      entries.push({
        id: `exp-${exp.slug}`,
        title: exp.title,
        category: "Simulation",
        description: exp.subtitle,
        href: exp.route,
        badge: `${exp.difficulty.toUpperCase()} · LIVE`,
        badgeColor: exp.accentColor,
        keywords: [exp.slug, exp.title, exp.category, ...exp.tags],
      });

      exp.keyFormulas.forEach((formula, idx) => {
        entries.push({
          id: `formula-${exp.slug}-${idx}`,
          title: `${formula.label}: ${formula.math}`,
          category: "Formula",
          description: formula.description,
          href: exp.route,
          badge: exp.title.replace("The ", ""),
          badgeColor: exp.accentColor,
          keywords: [formula.label, formula.math, exp.slug, "formula", "equation"],
        });
      });

      exp.features.slice(0, 3).forEach((feat, idx) => {
        entries.push({
          id: `feat-${exp.slug}-${idx}`,
          title: feat,
          category: "Feature",
          description: `Interactive apparatus feature in ${exp.title}`,
          href: exp.route,
          badge: "BENCH",
          badgeColor: exp.accentColor,
          keywords: [feat, exp.slug, "feature"],
        });
      });
    });

    entries.push(
      {
        id: "guide-catalog",
        title: "Experiments catalog & filter",
        category: "Guide",
        description: "Browse and filter active and upcoming simulations by physics category",
        href: "/#experiments",
        badge: "CATALOG",
        keywords: ["catalog", "directory", "filter", "categories"],
      },
      {
        id: "guide-pillars",
        title: "How the simulations work",
        category: "Guide",
        description: "Analytical physics, Monte Carlo sampling, 3D rendering, and audio",
        href: "/#about",
        badge: "METHOD",
        keywords: ["architecture", "pillars", "principles", "threejs", "audio"],
      },
      {
        id: "guide-docs",
        title: "Developer guide: adding experiments",
        category: "Guide",
        description: "Modular registry architecture for implementing new benches",
        href: "/#docs",
        badge: "DEV GUIDE",
        keywords: ["docs", "contribute", "developer", "modular", "new experiment"],
      }
    );

    return entries;
  }, [activeExperiments]);

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
          {/* Wordmark */}
          <Link
            href="/"
            className="platform-brand"
            onClick={() => {
              setIsMobileMenuOpen(false);
              setActiveDropdown(null);
            }}
          >
            <span className="brand-title">
              Quanta<span className="brand-title-accent">Lab</span>
            </span>
            <span className="brand-tagline">Virtual optics bench</span>
          </Link>

          {/* Desktop nav */}
          <nav className="platform-nav-menu" aria-label="Main navigation">
            <Link
              href="/"
              className={`nav-link ${
                pathname === "/" && !detectedSlug ? "active" : ""
              }`}
              onClick={() => setActiveDropdown(null)}
            >
              <span>Catalog</span>
            </Link>

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
                  className={`nav-caret-svg ${activeDropdown === "experiments" ? "is-open" : ""}`}
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

              {activeDropdown === "experiments" && (
                <div
                  className="nav-mega-dropdown"
                  role="menu"
                  aria-label="Experiments directory"
                >
                  <div className="mega-col">
                    <div className="mega-section-header">
                      <span className="dot-live" />
                      <span>Live 3D benches</span>
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
                            style={{ "--lam": exp.accentColor } as React.CSSProperties}
                          >
                            <span className="mega-exp-title">{exp.title}</span>
                            <span className="mega-difficulty-pill">{exp.difficulty}</span>
                            <span className="mega-exp-lam">
                              {exp.wavelengthNm
                                ? `λ = ${exp.wavelengthNm} nm`
                                : exp.benchNote}
                            </span>
                            <p className="mega-exp-subtitle">{exp.subtitle}</p>
                          </Link>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mega-col mega-col-roadmap">
                    <div className="mega-section-header">
                      <span className="dot-roadmap" />
                      <span>Platform</span>
                    </div>

                    <div className="mega-roadmap-links">
                      <Link
                        href="/#about"
                        className="mega-link-item"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="mega-link-title">How the simulations work</span>
                        <span className="mega-link-desc">
                          Analytical math, real-time 3D, audio feedback
                        </span>
                      </Link>

                      <Link
                        href="/#docs"
                        className="mega-link-item"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <span className="mega-link-title">Equations &amp; derivations</span>
                        <span className="mega-link-desc">
                          Exact intensity formulas per bench
                        </span>
                      </Link>

                      <div className="mega-upcoming-box">
                        <span className="upcoming-label">NEXT IN PIPELINE</span>
                        <span className="upcoming-name">Stern–Gerlach apparatus</span>
                        <span className="upcoming-sub">
                          Space quantization &amp; spin-½
                        </span>
                        <span className="upcoming-tag">IN DEV</span>
                      </div>
                    </div>
                  </div>

                  <div className="mega-dropdown-footer">
                    <span className="footer-tip">
                      <kbd className="cmd-kbd">⌘K</kbd> / <kbd className="cmd-kbd">Ctrl+K</kbd> search
                      formulas &amp; benches
                    </span>
                    <Link
                      href="/#experiments"
                      className="footer-catalog-link"
                      onClick={() => setActiveDropdown(null)}
                    >
                      Full catalog →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link href="/#about" className="nav-link" onClick={() => setActiveDropdown(null)}>
              <span>Method</span>
            </Link>

            <Link href="/#docs" className="nav-link" onClick={() => setActiveDropdown(null)}>
              <span>Docs</span>
            </Link>
          </nav>

          {/* Right actions */}
          <div className="platform-nav-actions">
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
              <span className="search-placeholder-text">Search…</span>
              <kbd className="search-shortcut-pill">⌘K</kbd>
            </button>

            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-github-btn"
              title="View source on GitHub"
              aria-label="QuantaLab GitHub repository"
            >
              <svg
                className="github-icon-svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
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
                title="Launch a quantum laboratory simulation"
              >
                <span>Launch lab</span>
                <svg
                  className={`launch-caret-svg ${activeDropdown === "launch" ? "is-open" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  width="11"
                  height="11"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {activeDropdown === "launch" && (
                <div className="launch-dropdown-menu" role="menu">
                  <div className="launch-header-row">
                    <span>SELECT BENCH</span>
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
                      <span className="launch-item-title">{exp.title}</span>
                      <span className="launch-badge-pill">{exp.difficulty}</span>
                      <span className="launch-item-desc">{exp.subtitle}</span>
                      <span className="launch-item-launch-arrow">LAUNCH →</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

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

        {/* Mobile drawer */}
        {isMobileMenuOpen && (
          <div className="mobile-nav-backdrop" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
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
                  width="16"
                  height="16"
                >
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M17.5 17.5l-4.5-4.5" />
                </svg>
                <span>Search benches &amp; formulas…</span>
              </button>

              <div className="mobile-drawer-section">
                <div className="mobile-section-heading">
                  <span className="live-beacon-dot" />
                  <span>LIVE 3D BENCHES</span>
                </div>
                <div className="mobile-cards-grid">
                  {activeExperiments.map((exp) => (
                    <Link
                      key={exp.id}
                      href={exp.route}
                      className={`mobile-exp-tile ${detectedSlug === exp.slug ? "is-active" : ""}`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <div className="mobile-exp-tile-header">
                        <span className="mobile-exp-tag">ENTER BENCH →</span>
                      </div>
                      <div className="mobile-exp-tile-body">
                        <span className="mobile-exp-title">{exp.title}</span>
                        <span className="mobile-exp-sub">{exp.subtitle}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mobile-drawer-section">
                <div className="mobile-section-heading">EXPLORE</div>
                <div className="mobile-nav-links-list">
                  <Link href="/" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="link-icon">01</span>
                    <span>Experiments catalog</span>
                  </Link>
                  <Link href="/#about" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="link-icon">02</span>
                    <span>How the simulations work</span>
                  </Link>
                  <Link href="/#docs" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
                    <span className="link-icon">03</span>
                    <span>Documentation &amp; formulas</span>
                  </Link>
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mobile-nav-link"
                  >
                    <span className="link-icon">04</span>
                    <span>GitHub repository</span>
                  </a>
                </div>
              </div>

              <div className="mobile-drawer-footer">
                <span className="status-indicator-dot" />
                <span>WebGL 2.0 engine active</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Command palette (⌘K) */}
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
                placeholder="Search benches, formulas, or features…"
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

            <div ref={searchListRef} className="palette-results-list" role="listbox">
              {filteredSearchEntries.length > 0 ? (
                filteredSearchEntries.map((item, index) => {
                  const isSelected = index === selectedSearchIndex;
                  return (
                    <div
                      key={item.id}
                      className={`palette-result-item ${isSelected ? "is-selected" : ""}`}
                      onClick={() => selectSearchResult(item)}
                      onMouseEnter={() => setSelectedSearchIndex(index)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <span className="result-icon">{CATEGORY_KEY[item.category]}</span>
                      <div className="result-details">
                        <div className="result-title-line">
                          <span className="result-title">{item.title}</span>
                          {item.badge && (
                            <span
                              className="result-badge"
                              style={{ color: item.badgeColor || "var(--qb-ink-3)" }}
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
                  <p className="no-results-heading">Nothing matches this search</p>
                  <p className="no-results-sub">
                    Try &ldquo;double slit&rdquo;, &ldquo;eraser&rdquo;, &ldquo;fringe&rdquo;,
                    &ldquo;visibility&rdquo;, or &ldquo;diffraction&rdquo;.
                  </p>
                </div>
              )}
            </div>

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
              <span className="palette-footer-brand">QUANTALAB COMMAND</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
