// Generic iOS-style bottom sheet: dimmed backdrop (tap to close), blurred panel that slides up.
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export default function Sheet({ open, onClose, title, children }: Props) {
  // Flip to open one frame after mount so a sheet that mounts already open still slides up.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(open));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden={!open} inert={!open}>
      <div
        className="sheet-backdrop absolute inset-0 bg-black/30"
        data-open={shown}
        onClick={onClose}
      />
      <div
        className="sheet-panel glass pointer-events-auto absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[16px] pb-[env(safe-area-inset-bottom)]"
        data-open={shown}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mx-auto mt-2 h-[5px] w-9 rounded-full bg-fill" />
        {title && (
          <div className="relative flex min-h-[44px] items-center justify-center px-4">
            <h2 className="text-[17px] font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-2 min-h-[44px] px-3 text-[17px] font-semibold text-accent"
            >
              Done
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
