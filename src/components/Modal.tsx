import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function Modal({
  title,
  close,
  children,
  returnFocusTo,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
  returnFocusTo?: HTMLElement | null;
}) {
  const dialog = useRef<HTMLElement>(null);
  const onClose = useRef(close);
  onClose.current = close;
  useEffect(() => {
    const previous =
      returnFocusTo || (document.activeElement as HTMLElement | null);
    const root = dialog.current;
    const selectors =
      'button:not(:disabled),a[href],input:not([tabindex="-1"]),select,textarea,[tabindex="0"]';
    const nodes = () =>
      Array.from(root?.querySelectorAll<HTMLElement>(selectors) || []).filter(
        (el) => el.offsetParent !== null,
      );
    // Keep background controls, including quick actions, outside the keyboard tree.
    const inertSiblings: Array<[HTMLElement, boolean]> = [];
    let current: HTMLElement | null = root;
    while (
      current?.parentElement &&
      current.parentElement !== document.documentElement
    ) {
      for (const sibling of Array.from(current.parentElement.children)) {
        if (
          sibling !== current &&
          sibling instanceof HTMLElement &&
          !["SCRIPT", "STYLE"].includes(sibling.tagName)
        ) {
          inertSiblings.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      current = current.parentElement;
    }
    nodes()[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose.current();
      }
      if (e.key === "Tab") {
        const list = nodes(),
          first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      inertSiblings.forEach(([element, wasInert]) => {
        element.inert = wasInert;
      });
      // A floating panel can remain inert until its modal observer commits.
      // Restore focus after it becomes interactive instead of losing keyboard position.
      const restoreFocus = (attempt = 0) => {
        if (!previous?.isConnected) return;
        if (!previous.closest("[inert]"))
          previous.focus({ preventScroll: true });
        // The panel's dialog observer can still be removing visibility:hidden.
        if (document.activeElement !== previous && attempt < 3)
          requestAnimationFrame(() => restoreFocus(attempt + 1));
      };
      restoreFocus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={close}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
