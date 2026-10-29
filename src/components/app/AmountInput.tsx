import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatPlain, parseAmount } from "@/lib/budget/money";
import { cn } from "@/lib/utils";

/**
 * Inline money editor with a keyboard accessory bar (± and Done),
 * mirroring the iOS numeric keypad accessory.
 */
export function AmountInput({
  value,
  onCommit,
  onCancel,
  className,
  autoFocus = true,
  label,
}: {
  value: number;
  onCommit: (cents: number) => void;
  onCancel?: () => void;
  className?: string;
  autoFocus?: boolean;
  label: string;
}) {
  const [text, setText] = useState(value ? formatPlain(value) : "");
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [autoFocus]);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    const v = parseAmount(text);
    if (v === null && text.trim() !== "") onCancel?.();
    else onCommit(v ?? 0);
  };

  return (
    <>
      <input
        ref={ref}
        aria-label={label}
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") ref.current?.blur();
          if (e.key === "Escape") {
            done.current = true;
            onCancel?.();
          }
        }}
        className={cn("money w-full rounded-md bg-accent px-2 py-0.5 text-right outline-none ring-2 ring-primary", className)}
      />
      {typeof document !== "undefined" &&
        createPortal(
          <div className="material fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between px-4 py-2 pb-safe shadow-[0_-0.5px_0_var(--separator)]">
            <button
              className="press rounded-md px-3 py-1.5 text-[17px] font-semibold text-primary"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setText((t) => (t.startsWith("-") ? t.slice(1) : "-" + t))}
              aria-label="Toggle plus or minus"
            >
              +/−
            </button>
            <button
              className="press rounded-md px-3 py-1.5 text-[17px] font-semibold text-primary"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => ref.current?.blur()}
            >
              Done
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
