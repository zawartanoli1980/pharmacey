import React, { useEffect, useId, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Images,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  X,
  ZoomIn,
} from "lucide-react";
import { api } from "../api";
import {
  SafeImage,
  useImagePreferences,
  type Medicine,
} from "./MedicineImages";
import "./FloatingMedicineGallery.css";
export type GalleryMode = "expanded" | "minimized" | "closed";
type CatalogMedicine = Medicine & {
  generic: string;
  form: string;
  stock: number;
  price: number | null;
  rx: number;
};
export const galleryPreferenceKey = (pharmacy: number, user: number) =>
  `smartmed:gallery:v1:${pharmacy}:${user}`;
export function initialGalleryMode(
  pharmacy: number,
  user: number,
): GalleryMode {
  try {
    const saved = localStorage.getItem(galleryPreferenceKey(pharmacy, user));
    if (saved === "expanded" || saved === "minimized" || saved === "closed")
      return saved;
  } catch {
    /* Storage is optional. */
  }
  return window.matchMedia("(min-width:1280px)").matches
    ? "expanded"
    : "minimized";
}
export function useWorkspaceViewport() {
  const [height, setHeight] = useState(
    window.visualViewport?.height || window.innerHeight,
  );
  useEffect(() => {
    const update = () =>
      setHeight(window.visualViewport?.height || window.innerHeight);
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  return height;
}
function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}
const money = (paisa: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(paisa / 100);
export function FloatingMedicineGallery({
  mode,
  onModeChange,
  revision = 0,
  focusRequest = 0,
  canManageImages = false,
  onManageImages,
  autoplayInterval = 6500,
  suspended = false,
  rtl = false,
}: {
  mode: GalleryMode;
  onModeChange: (mode: GalleryMode) => void;
  revision?: number;
  focusRequest?: number;
  canManageImages?: boolean;
  onManageImages: () => void;
  autoplayInterval?: number;
  suspended?: boolean;
  rtl?: boolean;
}) {
  const [medicines, setMedicines] = useState<CatalogMedicine[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(document.hidden);
  const { preview, previewOpen } = useImagePreferences();
  const reduced = useReducedMotion();
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const minimized = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  const index = Math.max(
    0,
    medicines.findIndex((m) => m.id === activeId),
  );
  const active = medicines[index];
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api(
      "/products",
      undefined,
      undefined,
      AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
    )
      .then((data: CatalogMedicine[]) => {
        if (controller.signal.aborted) return;
        const sorted = [...data].sort(
          (a, b) => Number(!!b.image_version) - Number(!!a.image_version),
        );
        setMedicines(sorted);
        setActiveId((current) =>
          sorted.some((m) => m.id === current)
            ? current
            : (sorted[0]?.id ?? null),
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setMedicines([]);
          setError(
            e.status === 401
              ? "Your session has expired. Sign in again to view medicines."
              : "The medicine catalog could not be loaded. Please retry.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision, retry]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setRetry((v) => v + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const sync = () => {
      setDocumentHidden(document.hidden);
      setBlocked(!!document.querySelector('[role="dialog"]'));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  useEffect(() => {
    const edit = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (
        window.matchMedia("(max-width:1279px)").matches &&
        target.closest(".workspace-content > main") &&
        target.matches('input,textarea,select,[contenteditable="true"]') &&
        mode === "expanded"
      )
        onModeChange("minimized");
    };
    document.addEventListener("focusin", edit);
    return () => document.removeEventListener("focusin", edit);
  }, [mode, onModeChange]);
  useEffect(() => {
    if (focusRequest && mode === "expanded")
      title.current?.focus({ preventScroll: true });
  }, [focusRequest, mode]);
  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);
  const autoplayActive =
    playing &&
    !hovered &&
    !focused &&
    !blocked &&
    !suspended &&
    !previewOpen &&
    !documentHidden &&
    !reduced &&
    !loading &&
    mode === "expanded" &&
    medicines.length > 1;
  useEffect(() => {
    if (!autoplayActive) return;
    const timer = setInterval(
      () =>
        setActiveId((current) => {
          const i = medicines.findIndex((m) => m.id === current);
          return medicines[(i + 1) % medicines.length]?.id ?? null;
        }),
      Math.max(5000, autoplayInterval),
    );
    return () => clearInterval(timer);
  }, [autoplayActive, autoplayInterval, medicines]);
  const move = (step: number) => {
    if (medicines.length)
      setActiveId(
        medicines[(index + step + medicines.length) % medicines.length].id,
      );
  };
  const minimize = () => {
    onModeChange("minimized");
    requestAnimationFrame(() =>
      minimized.current?.focus({ preventScroll: true }),
    );
  };
  if (mode === "closed") return null;
  const isRtl = rtl;
  return (
    <aside
      ref={root}
      className={`floating-medicine-gallery gallery-${mode} ${blocked || suspended ? "gallery-obscured" : ""}`}
      aria-label="Medicine gallery"
      aria-hidden={blocked || suspended || undefined}
      inert={blocked || suspended || undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setFocused(false);
      }}
    >
      {mode === "minimized" ? (
        <div className="gallery-mini">
          <button
            ref={minimized}
            onClick={() => onModeChange("expanded")}
            aria-label="Expand medicine gallery"
            title="Expand medicine gallery"
          >
            <Images size={21} aria-hidden="true" />
            <span>Medicine pictures</span>
            <ChevronUp size={15} aria-hidden="true" />
          </button>
          <button
            className="gallery-icon"
            onClick={() => onModeChange("closed")}
            aria-label="Close medicine gallery"
            title="Close medicine gallery"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <header className="gallery-header">
            <span className="gallery-symbol">
              <Images size={20} aria-hidden="true" />
            </span>
            <div>
              <span className="gallery-eyebrow">YOUR MEDICINE SHELF</span>
              <h2 ref={title} tabIndex={-1}>
                Medicine gallery
              </h2>
            </div>
            <div className="gallery-window-controls">
              <button
                className="gallery-icon"
                aria-label="Minimize medicine gallery"
                title="Minimize medicine gallery"
                onClick={minimize}
              >
                <Minimize2 size={16} aria-hidden="true" />
              </button>
              <button
                className="gallery-icon"
                aria-label="Close medicine gallery"
                title="Close medicine gallery"
                onClick={() => onModeChange("closed")}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </header>
          <section
            id={id}
            className="gallery-content"
            aria-label="Medicine slides"
            aria-roledescription="carousel"
            tabIndex={0}
            onKeyDown={(e) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End", "Escape"].includes(
                  e.key,
                )
              ) {
                e.preventDefault();
                if (e.key === "Escape") minimize();
                else if (e.key === "Home")
                  setActiveId(medicines[0]?.id ?? null);
                else if (e.key === "End")
                  setActiveId(medicines.at(-1)?.id ?? null);
                else
                  move(
                    e.key === "ArrowRight" ? (isRtl ? -1 : 1) : isRtl ? 1 : -1,
                  );
              }
            }}
          >
            {error ? (
              <div className="gallery-state" role="alert">
                <Images size={30} aria-hidden="true" />
                <h3>Catalog unavailable</h3>
                <p>{error}</p>
                <button
                  className="secondary"
                  onClick={() => setRetry((v) => v + 1)}
                >
                  <RefreshCw size={15} />
                  Retry medicine catalog
                </button>
              </div>
            ) : loading && !active ? (
              <div className="gallery-state gallery-loading" role="status">
                <div className="gallery-skeleton" />
                <p>Loading medicines…</p>
              </div>
            ) : !active ? (
              <div className="gallery-state">
                <Images size={32} aria-hidden="true" />
                <h3>Your medicine shelf is waiting</h3>
                <p>
                  No medicines are available in this pharmacy’s catalog yet.
                </p>
              </div>
            ) : (
              <article
                className="gallery-medicine-card"
                aria-label={`${active.name} ${active.strength || ""}`}
              >
                <div
                  className="gallery-photo-stage"
                  onTouchStart={(e) => {
                    if (e.touches.length !== 1) {
                      swipe.current = null;
                      return;
                    }
                    const touch = e.touches[0];
                    swipe.current = { x: touch.clientX, y: touch.clientY };
                  }}
                  onTouchCancel={() => {
                    swipe.current = null;
                  }}
                  onTouchEnd={(e) => {
                    const start = swipe.current;
                    swipe.current = null;
                    if (!start) return;
                    if (!e.changedTouches[0]) return;
                    const touch = e.changedTouches[0],
                      dx = touch.clientX - start.x,
                      dy = touch.clientY - start.y;
                    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4)
                      move(dx < 0 ? (isRtl ? -1 : 1) : isRtl ? 1 : -1);
                  }}
                >
                  <span
                    className={`gallery-verification ${active.image_version ? "verified" : ""}`}
                  >
                    <ShieldCheck size={12} aria-hidden="true" />
                    {active.image_version
                      ? "Staff-verified photo"
                      : "Photo not added"}
                  </span>
                  {active.image_version ? (
                    <button
                      className="gallery-photo-button"
                      aria-label={`Enlarge picture of ${active.name} ${active.strength || ""}`}
                      title="Enlarge medicine picture"
                      onClick={() => preview(active)}
                    >
                      <span className="gallery-artwork">
                        <SafeImage medicine={active} />
                      </span>
                      <span className="gallery-enlarge">
                        <ZoomIn size={15} aria-hidden="true" />
                        Enlarge
                      </span>
                    </button>
                  ) : (
                    <div className="gallery-photo-placeholder">
                      <SafeImage medicine={active} />
                      {canManageImages && (
                        <button
                          className="text-button"
                          onClick={onManageImages}
                        >
                          Add verified pictures
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="gallery-product-details" key={active.id}>
                  <div className="gallery-product-title">
                    <h3>
                      <bdi>{active.name}</bdi>
                    </h3>
                    <span className={active.rx ? "rx-badge" : "badge"}>
                      {active.rx ? "Rx" : "OTC"}
                    </span>
                  </div>
                  <p className="gallery-generic">
                    <bdi>{active.generic}</bdi>
                  </p>
                  <p className="gallery-strength">
                    <bdi dir="ltr">{active.strength}</bdi>
                    <span aria-hidden="true"> · </span>
                    <bdi>{active.form}</bdi>
                  </p>
                  <div className="gallery-stock-price">
                    <span
                      className={`gallery-availability ${active.stock ? "" : "unavailable"}`}
                    >
                      <i aria-hidden="true" />
                      <bdi dir="ltr">
                        {active.stock
                          ? `${new Intl.NumberFormat("en-PK").format(active.stock)} units available`
                          : "Out of stock"}
                      </bdi>
                    </span>
                    {typeof active.price === "number" && (
                      <strong className="gallery-price">
                        <small>From</small>
                        <bdi dir="ltr">{money(active.price)}</bdi>
                        <small>per individual unit</small>
                      </strong>
                    )}
                  </div>
                </div>
              </article>
            )}
          </section>
          <footer className="gallery-footer">
            <div className="gallery-carousel-controls">
              <button
                className="gallery-arrow"
                aria-label="Previous medicine"
                title="Previous medicine"
                disabled={!active || medicines.length < 2}
                onClick={() => move(-1)}
              >
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <span
                className="gallery-position"
                role="status"
                aria-live={autoplayActive ? "off" : "polite"}
                aria-atomic="true"
              >
                {active ? `${index + 1} / ${medicines.length}` : "0 / 0"}
              </span>
              <button
                className="gallery-arrow"
                aria-label="Next medicine"
                title="Next medicine"
                disabled={!active || medicines.length < 2}
                onClick={() => move(1)}
              >
                <ChevronRight size={19} aria-hidden="true" />
              </button>
              <button
                className="gallery-play"
                aria-label={
                  playing
                    ? "Pause medicine slideshow"
                    : "Play medicine slideshow"
                }
                title={
                  reduced
                    ? "Autoplay disabled by reduced-motion preference"
                    : playing
                      ? "Pause slideshow"
                      : "Play slideshow"
                }
                disabled={reduced || medicines.length < 2 || !!error}
                aria-pressed={playing}
                onClick={() => setPlaying((v) => !v)}
              >
                {playing ? (
                  <Pause size={15} aria-hidden="true" />
                ) : (
                  <Play size={15} aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="gallery-play-status">
              {reduced
                ? "Reduced motion · manual browsing"
                : playing
                  ? autoplayActive
                    ? `Autoplay on · changes every ${Math.max(5000, autoplayInterval) / 1000} seconds`
                    : "Autoplay paused while you interact"
                  : "Browse at your own pace"}
            </p>
            <p className="gallery-catalog-note">
              {loading && active
                ? "Refreshing inventory…"
                : "Catalog availability and batch prices. Confirm at checkout."}
            </p>
          </footer>
        </>
      )}
    </aside>
  );
}
