import React, { useEffect, useId, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Images,
  Minimize2,
  Pause,
  Play,
  X,
  ZoomIn,
  Pill,
} from "lucide-react";
import Modal from "./Modal";
import { type GalleryMode } from "./FloatingMedicineGallery";
import {
  homeMedicinePictures,
  type HomeMedicinePicture,
} from "../data/homeMedicineGallery";
import "./HomeMedicineGallery.css";
export const homeGalleryPreferenceKey = "smartmed:home-gallery:v1";
export function initialHomeGalleryMode(): GalleryMode {
  try {
    const saved = localStorage.getItem(homeGalleryPreferenceKey);
    if (saved === "expanded" || saved === "minimized" || saved === "closed")
      return saved;
  } catch {
    /* Browser storage is optional. */
  }
  return "expanded";
}
function HomePhoto({
  picture,
  eager = false,
}: {
  picture: HomeMedicinePicture;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [picture.image]);
  return failed ? (
    <span className="image-fallback">
      <Pill size={36} aria-hidden="true" />
      <span>Picture unavailable</span>
    </span>
  ) : (
    <img
      src={picture.image}
      alt={picture.alt}
      width="1448"
      height="1086"
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
export function HomeMedicineGallery({
  mode,
  onModeChange,
  focusRequest = 0,
  onExplore,
}: {
  mode: GalleryMode;
  onModeChange: (value: GalleryMode) => void;
  focusRequest?: number;
  onExplore: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [preview, setPreview] = useState<HomeMedicinePicture | null>(null);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const title = useRef<HTMLHeadingElement>(null);
  const previewTrigger = useRef<HTMLButtonElement | null>(null);
  const minimized = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  const picture = homeMedicinePictures[index];
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(query.matches);
      if (query.matches) setPlaying(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const sync = () => {
      setHidden(document.hidden);
      setBlocked(!!document.querySelector('[role="dialog"]'));
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.getElementById("root")!, {
      subtree: true,
      childList: true,
    });
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
  useEffect(() => {
    if (focusRequest && mode === "expanded")
      title.current?.focus({ preventScroll: true });
  }, [focusRequest, mode]);
  const advancing =
    playing &&
    !hovered &&
    !focused &&
    !blocked &&
    !preview &&
    !hidden &&
    !reduced &&
    mode === "expanded";
  useEffect(() => {
    if (!advancing) return;
    const timer = setInterval(
      () => setIndex((v) => (v + 1) % homeMedicinePictures.length),
      6500,
    );
    return () => clearInterval(timer);
  }, [advancing]);
  const move = (step: number) =>
    setIndex(
      (v) =>
        (v + step + homeMedicinePictures.length) % homeMedicinePictures.length,
    );
  const minimize = () => {
    onModeChange("minimized");
    requestAnimationFrame(() =>
      minimized.current?.focus({ preventScroll: true }),
    );
  };
  if (mode === "closed") return null;
  return (
    <>
      <aside
        className={`floating-medicine-gallery home-medicine-gallery gallery-${mode} ${blocked ? "gallery-obscured" : ""}`}
        aria-label="Home medicine gallery"
        aria-hidden={blocked || undefined}
        inert={blocked || undefined}
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
              aria-label="Expand home medicine gallery"
              title="Expand medicine pictures"
              onClick={() => onModeChange("expanded")}
            >
              <Images size={21} aria-hidden="true" />
              <span>Medicine pictures</span>
              <ChevronUp size={16} aria-hidden="true" />
            </button>
            <button
              className="gallery-icon"
              aria-label="Close home medicine gallery"
              title="Close medicine pictures"
              onClick={() => onModeChange("closed")}
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
                <span className="gallery-eyebrow">
                  A LITTLE PHARMACY IN FOCUS
                </span>
                <h2 ref={title} tabIndex={-1}>
                  Medicine pictures
                </h2>
              </div>
              <div className="gallery-window-controls">
                <button
                  className="gallery-icon"
                  aria-label="Minimize home medicine gallery"
                  title="Minimize medicine pictures"
                  onClick={minimize}
                >
                  <Minimize2 size={16} aria-hidden="true" />
                </button>
                <button
                  className="gallery-icon"
                  aria-label="Close home medicine gallery"
                  title="Close medicine pictures"
                  onClick={() => onModeChange("closed")}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </header>
            <section
              id={id}
              className="gallery-content"
              role="region"
              aria-label="Public medicine pictures"
              aria-roledescription="carousel"
              tabIndex={0}
              onKeyDown={(e) => {
                if (
                  ![
                    "ArrowLeft",
                    "ArrowRight",
                    "Home",
                    "End",
                    "Escape",
                  ].includes(e.key)
                )
                  return;
                e.preventDefault();
                const rtl = document.documentElement.dir === "rtl";
                if (e.key === "Home") setIndex(0);
                else if (e.key === "End")
                  setIndex(homeMedicinePictures.length - 1);
                else if (e.key === "Escape") minimize();
                else
                  move(e.key === "ArrowRight" ? (rtl ? -1 : 1) : rtl ? 1 : -1);
              }}
            >
              <article className="gallery-medicine-card">
                <div
                  className="gallery-photo-stage"
                  onTouchStart={(e) => {
                    if (e.touches.length !== 1) {
                      touchStart.current = null;
                      return;
                    }
                    touchStart.current = {
                      x: e.touches[0].clientX,
                      y: e.touches[0].clientY,
                    };
                  }}
                  onTouchCancel={() => {
                    touchStart.current = null;
                  }}
                  onTouchEnd={(e) => {
                    const start = touchStart.current;
                    touchStart.current = null;
                    const end = e.changedTouches[0];
                    if (!start || !end) return;
                    const dx = end.clientX - start.x,
                      dy = end.clientY - start.y;
                    if (
                      Math.abs(dx) > 45 &&
                      Math.abs(dx) > Math.abs(dy) * 1.4
                    ) {
                      const rtl = document.documentElement.dir === "rtl";
                      move(dx < 0 ? (rtl ? -1 : 1) : rtl ? 1 : -1);
                    }
                  }}
                >
                  <span className="gallery-verification home-image-label">
                    AI-generated illustration
                  </span>
                  <button
                    className="gallery-photo-button"
                    aria-label={`Enlarge ${picture.name} picture`}
                    title="Enlarge medicine picture"
                    onClick={(event) => {
                      previewTrigger.current = event.currentTarget;
                      setPreview(picture);
                    }}
                  >
                    <span className="gallery-artwork">
                      <HomePhoto picture={picture} eager={index === 0} />
                    </span>
                    <span className="gallery-enlarge">
                      <ZoomIn size={15} aria-hidden="true" />
                      Enlarge
                    </span>
                  </button>
                </div>
                <div className="gallery-product-details" key={picture.id}>
                  <span className="home-gallery-category">
                    THE PHARMACY EVERYDAY
                  </span>
                  <h3>{picture.name}</h3>
                  <p>{picture.description}</p>
                </div>
              </article>
            </section>
            <footer className="gallery-footer">
              <div className="gallery-carousel-controls">
                <button
                  className="gallery-arrow"
                  aria-label="Previous public medicine picture"
                  title="Previous picture"
                  onClick={() => move(-1)}
                >
                  <ChevronLeft size={19} aria-hidden="true" />
                </button>
                <span
                  className="gallery-position"
                  role="status"
                  aria-label="Public picture position"
                  aria-live={advancing ? "off" : "polite"}
                >
                  {index + 1} / {homeMedicinePictures.length}
                </span>
                <button
                  className="gallery-arrow"
                  aria-label="Next public medicine picture"
                  title="Next picture"
                  onClick={() => move(1)}
                >
                  <ChevronRight size={19} aria-hidden="true" />
                </button>
                <button
                  className="gallery-play"
                  aria-label={
                    playing
                      ? "Pause public medicine slideshow"
                      : "Play public medicine slideshow"
                  }
                  title={
                    reduced
                      ? "Autoplay disabled by reduced-motion preference"
                      : playing
                        ? "Pause slideshow"
                        : "Play slideshow"
                  }
                  aria-pressed={playing}
                  disabled={reduced}
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
                    ? advancing
                      ? "Autoplay on · changes every 6.5 seconds"
                      : "Autoplay paused while you interact"
                    : "Browse at your own pace"}
              </p>
              <button className="home-gallery-demo" onClick={onExplore}>
                Explore SmartMed POS{" "}
                <ChevronRight size={15} aria-hidden="true" />
              </button>
              <p className="gallery-catalog-note">
                Illustrative imagery. No live stock or medicine prices.
              </p>
            </footer>
          </>
        )}
      </aside>
      {preview && (
        <Modal
          title={`${preview.name} · illustrative picture`}
          close={() => setPreview(null)}
          returnFocusTo={previewTrigger.current}
        >
          <div className="image-preview home-picture-preview">
            <HomePhoto picture={preview} eager />
          </div>
          <p>
            AI-generated, unbranded illustration for the SmartMed POS website.
            This is not a product listing or a medicine recommendation.
          </p>
        </Modal>
      )}
    </>
  );
}
