import React, { useEffect, useId, useState } from "react";
import {
  Activity,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  X,
  Zap,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
export function StartupSplash({
  error,
  retry,
}: {
  error?: string;
  retry: () => void;
}) {
  return (
    <div className="startup-screen">
      <div className="startup-brand">
        <span className="startup-logo">
          <Activity size={39} />
        </span>
        <strong>
          SmartMed<span> POS</span>
        </strong>
        <small>PHARMACY, IN SYNC.</small>
      </div>
      {error ? (
        <div className="startup-error" role="alert">
          <h1>We couldn’t connect to your workspace</h1>
          <p>{error}</p>
          <button className="primary" onClick={retry}>
            <RefreshCw size={16} />
            Retry connection
          </button>
        </div>
      ) : (
        <div role="status" className="startup-status">
          <span className="startup-progress" aria-hidden="true" />
          <p>Connecting to your pharmacy workspace…</p>
          <small>Checking the server and your session securely.</small>
        </div>
      )}
      <div className="startup-footnote">
        <ShieldCheck size={15} />
        Your session permissions stay protected.
      </div>
    </div>
  );
}
export type QuickAction = {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  run: () => void;
};
export function FloatingActions({
  actions,
  dismissed,
  onDismiss,
  reopenKey = 0,
}: {
  actions: QuickAction[];
  dismissed: boolean;
  onDismiss: () => void;
  reopenKey?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [obscured, setObscured] = useState(false);
  const id = useId();
  useEffect(() => {
    setExpanded(false);
  }, [reopenKey]);
  useEffect(() => {
    const scroll = () =>
      setScrolled(
        window.scrollY > 500 ||
          (document.querySelector(
            ".workspace-content>main, .public-main-content",
          )?.scrollTop || 0) > 500,
      );
    scroll();
    document.addEventListener("scroll", scroll, {
      passive: true,
      capture: true,
    });
    return () => document.removeEventListener("scroll", scroll, true);
  }, []);
  useEffect(() => {
    const update = () => {
      const active = document.activeElement;
      const editing =
        active?.matches('input,textarea,select,[contenteditable="true"]') ||
        false;
      const keyboard = window.visualViewport
        ? window.innerHeight - window.visualViewport.height > 150
        : false;
      setObscured(
        editing || keyboard || !!document.querySelector('[role="dialog"]'),
      );
    };
    const observer = new MutationObserver(update);
    observer.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);
  if (dismissed) return null;
  return (
    <div
      className={`floating-region no-print ${obscured ? "floating-obscured" : ""}`}
      aria-hidden={obscured || undefined}
      inert={obscured || undefined}
    >
      <div className={`floating-actions ${expanded ? "expanded" : ""}`}>
        <button
          className="dock-toggle"
          aria-label={
            expanded ? "Collapse quick actions" : "Expand quick actions"
          }
          title={expanded ? "Collapse quick actions" : "Expand quick actions"}
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="dock-symbol">
            <Zap size={16} />
          </span>
          <span>Quick actions</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {expanded && (
          <nav id={id} className="dock-links" aria-label="Quick actions">
            {actions.map(({ label, icon: Icon, run }) => (
              <button
                key={label}
                onClick={() => {
                  setExpanded(false);
                  run();
                }}
                title={label}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
            {scrolled && (
              <button
                title="Back to top"
                onClick={() => {
                  document
                    .querySelector(
                      ".workspace-content>main, .public-main-content",
                    )
                    ?.scrollTo({
                      top: 0,
                      behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)",
                      ).matches
                        ? "instant"
                        : "smooth",
                    });
                  window.scrollTo({
                    top: 0,
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  });
                  setExpanded(false);
                }}
              >
                <ArrowUp size={16} />
                <span>Back to top</span>
              </button>
            )}
          </nav>
        )}
        <button
          className="dock-close icon-button"
          aria-label="Hide quick actions"
          title="Hide quick actions; reopen from the header"
          onClick={onDismiss}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
