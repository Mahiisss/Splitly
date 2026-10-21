"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * A modal built on the browser's own <dialog> element, which gives us focus
 * trapping, Esc-to-close and an accessible backdrop for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // let React state decide when it closes
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose(); // click on the backdrop
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 id={titleId} className="font-display text-xl font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-canvas hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
            >
              <X size={18} aria-hidden />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
