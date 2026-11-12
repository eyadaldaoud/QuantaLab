"use client";

import React from "react";
import Link from "next/link";
import { ExperimentMetadata } from "@/lib/experiments";

interface ExperimentCardProps {
  experiment: ExperimentMetadata;
  plateNo: string;
  onSelect: (experiment: ExperimentMetadata) => void;
}

export default function ExperimentCard({
  experiment,
  plateNo,
  onSelect,
}: ExperimentCardProps) {
  const isLive = experiment.status === "active";

  return (
    <article
      id={`exp-${experiment.slug}`}
      className={`exp-card ${isLive ? "card-live" : "card-upcoming"}`}
      style={{ "--lam": experiment.accentColor } as React.CSSProperties}
    >
      <div className="card-top-row">
        <span className="card-plate-no">PLATE {plateNo}</span>

        <div className="card-status-cluster">
          <span className="card-category-label">{experiment.category}</span>
          <span className={`status-pill ${isLive ? "pill-live" : "pill-upcoming"}`}>
            {isLive ? "LIVE 3D" : "ROADMAP"}
          </span>
        </div>
      </div>

      <h3 className="card-title">{experiment.title}</h3>
      <p className="card-subtitle">{experiment.subtitle}</p>

      <p className="card-summary">{experiment.summary}</p>

      {experiment.keyFormulas.length > 0 && (
        <div className="card-formula-preview">
          <span className="formula-tag">{experiment.keyFormulas[0].label}</span>
          <code className="formula-inline">{experiment.keyFormulas[0].math}</code>
        </div>
      )}

      <div className="card-tags-row">
        {experiment.tags.slice(0, 3).map((tag, idx) => (
          <span key={idx} className="card-tag-pill">
            {tag}
          </span>
        ))}
      </div>

      <div className="card-actions-row">
        {isLive ? (
          <>
            <Link href={experiment.route} className="btn-card-launch">
              <span className="card-lam-tick" />
              <span>Launch bench</span>
            </Link>
            <button
              type="button"
              onClick={() => onSelect(experiment)}
              className="btn-card-details"
              title="View physics equations and background"
            >
              Theory &amp; specs
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onSelect(experiment)}
              className="btn-card-launch"
              style={{ "--lam": "transparent" } as React.CSSProperties}
            >
              <span>Explore the physics</span>
            </button>
            <span className="upcoming-tag-note">Phase roadmap</span>
          </>
        )}
      </div>
    </article>
  );
}
