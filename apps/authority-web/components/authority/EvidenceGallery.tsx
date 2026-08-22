"use client";

import { useState } from "react";
import { AlertTriangle, X, ZoomIn } from "lucide-react";
import { authorityApi, AuthorityApiError } from "./api";
import { formatCompactDate } from "./shared";
import type { AuthorityMedia, AuthorityReport } from "./shared";

// ── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({
  image,
  label,
  onClose,
}: {
  image: AuthorityMedia;
  label: string;
  onClose: () => void;
}) {
  return (
    <div
      className="overlay"
      onClick={onClose}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.82)",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,.6)",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(0,0,0,.55)",
            border: "none",
            borderRadius: "50%",
            width: 34,
            height: 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "#fff",
            zIndex: 2,
          }}
        >
          <X size={18} />
        </button>
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.url}
            alt={label}
            style={{
              display: "block",
              maxWidth: "88vw",
              maxHeight: "86vh",
              objectFit: "contain",
              background: "#000",
            }}
          />
        ) : (
          <div
            style={{
              width: 400,
              height: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 14,
            }}
          >
            Image unavailable
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(transparent, rgba(0,0,0,.72))",
            padding: "24px 16px 12px",
            color: "#fff",
            fontSize: 12,
          }}
        >
          <b>{label}</b>
          <span style={{ marginLeft: 8, opacity: 0.7 }}>
            {formatCompactDate(image.createdAt)}
          </span>
          {image.isSuspectedAIGenerated && (
            <span
              style={{
                marginLeft: 10,
                background: "#F59E0B",
                color: "#000",
                padding: "1px 6px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              ⚠ AI-SUSPECTED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single Thumbnail ──────────────────────────────────────────────────────────
function Thumbnail({
  image,
  label,
  onOpen,
}: {
  image: AuthorityMedia;
  label: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      style={{
        position: "relative",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid var(--border, #DCE3D8)",
        background: "var(--surface-subtle, #F5F8F5)",
        cursor: "pointer",
        padding: 0,
        textAlign: "left",
        width: "100%",
        aspectRatio: "4/3",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.18s",
      }}
      title={`View ${label}`}
    >
      {image.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={label}
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          No image
        </div>
      )}

      {/* Hover overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background 0.18s",
        }}
        className="thumb-hover-overlay"
      >
        <ZoomIn
          size={28}
          style={{ color: "#fff", opacity: 0, transition: "opacity 0.18s" }}
          className="thumb-zoom-icon"
        />
      </div>

      {/* Label bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,.65))",
          padding: "18px 8px 6px",
          color: "#fff",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {label}
        {image.isSuspectedAIGenerated && (
          <span
            style={{
              marginLeft: 6,
              background: "#F59E0B",
              color: "#000",
              padding: "1px 5px",
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              verticalAlign: "middle",
            }}
          >
            ⚠ AI
          </span>
        )}
      </div>
    </button>
  );
}

// ── Section ────────────────────────────────────────────────────────────────────
function GallerySection({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: { image: AuthorityMedia; label: string }[];
  onOpen: (image: AuthorityMedia, label: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {title}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 8,
        }}
      >
        {items.map(({ image, label }) => (
          <Thumbnail
            key={image.id}
            image={image}
            label={label}
            onOpen={() => onOpen(image, label)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Flagged banner + actions ──────────────────────────────────────────────────
function FlaggedBanner({
  reportId,
  token,
}: {
  reportId: string;
  token: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  const resolve = async (isAuthentic: boolean) => {
    if (!token) return;
    setStatus("pending");
    try {
      await authorityApi.resolveImageAuthenticity(token, reportId, isAuthentic);
      setStatus("done");
      setMessage(isAuthentic ? "Confirmed real." : "Confirmed fake.");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof AuthorityApiError ? err.message : "Action failed.",
      );
    }
  };

  if (status === "done") {
    return (
      <div
        style={{
          background: "#E8F5E9",
          border: "1px solid #A5D6A7",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          color: "#2E7D32",
          marginBottom: 16,
        }}
      >
        ✓ {message}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#FFF8E1",
        border: "1px solid #FFE082",
        borderRadius: 8,
        padding: "10px 14px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
      }}
    >
      <AlertTriangle size={16} style={{ color: "#F59E0B", flexShrink: 0 }} />
      <span style={{ fontSize: 13, flex: 1 }}>
        <b>Flagged for manual review</b> — AI suspected image authenticity
        issues.
      </span>
      {status === "error" && (
        <span style={{ fontSize: 12, color: "#D64545" }}>{message}</span>
      )}
      <button
        className="button primary"
        style={{ padding: "4px 10px", fontSize: 12 }}
        disabled={status === "pending"}
        onClick={() => resolve(true)}
      >
        Confirm real
      </button>
      <button
        className="button ghost"
        style={{ padding: "4px 10px", fontSize: 12 }}
        disabled={status === "pending"}
        onClick={() => resolve(false)}
      >
        Confirm fake
      </button>
    </div>
  );
}

// ── Main EvidenceGallery ──────────────────────────────────────────────────────
export function EvidenceGallery({
  report,
  token,
}: {
  report: AuthorityReport;
  token: string | null;
}) {
  const [lightbox, setLightbox] = useState<{
    image: AuthorityMedia;
    label: string;
  } | null>(null);

  // Group images by type
  const reportImages = report.images.filter((img) => img.type === "REPORT");
  const disputeImages = report.images.filter(
    (img) => img.type === "DISPUTE_EVIDENCE",
  );
  const noWasteImages = report.images.filter(
    (img) => img.type === "NO_WASTE_PROOF",
  );

  // Build cleanup images
  const cleanupImages: { image: AuthorityMedia; label: string }[] = [];
  if (report.cleanup?.beforeImage) {
    cleanupImages.push({
      image: report.cleanup.beforeImage,
      label: "Before cleanup",
    });
  }
  if (report.cleanup?.afterImage) {
    cleanupImages.push({
      image: report.cleanup.afterImage,
      label: "After cleanup",
    });
  }
  if (report.cleanup?.noWasteImage) {
    cleanupImages.push({
      image: report.cleanup.noWasteImage,
      label: "No-waste proof",
    });
  }

  const hasAny =
    reportImages.length > 0 ||
    disputeImages.length > 0 ||
    noWasteImages.length > 0 ||
    cleanupImages.length > 0;

  return (
    <div>
      {report.flaggedForManualReview && (
        <FlaggedBanner reportId={report.id} token={token} />
      )}

      {hasAny ? (
        <>
          <GallerySection
            title="Citizen report photos"
            items={reportImages.map((img, i) => ({
              image: img,
              label: `Report photo ${i + 1}`,
            }))}
            onOpen={(img, lbl) => setLightbox({ image: img, label: lbl })}
          />
          <GallerySection
            title="Cleanup evidence"
            items={cleanupImages}
            onOpen={(img, lbl) => setLightbox({ image: img, label: lbl })}
          />
          <GallerySection
            title="Dispute evidence"
            items={disputeImages.map((img, i) => ({
              image: img,
              label: `Dispute photo ${i + 1}`,
            }))}
            onOpen={(img, lbl) => setLightbox({ image: img, label: lbl })}
          />
          <GallerySection
            title="No-waste proof"
            items={noWasteImages.map((img, i) => ({
              image: img,
              label: `No-waste proof ${i + 1}`,
            }))}
            onOpen={(img, lbl) => setLightbox({ image: img, label: lbl })}
          />
        </>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
          No evidence photos have been uploaded for this report.
        </p>
      )}

      {lightbox && (
        <Lightbox
          image={lightbox.image}
          label={lightbox.label}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
