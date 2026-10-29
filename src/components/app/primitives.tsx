import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { formatEUR, speakEUR } from "@/lib/budget/money";
import { haptic } from "@/lib/haptics";

/** Screen with a blurred nav bar whose small title fades in as the large title scrolls away. */
export function Screen({
  title,
  back,
  trailing,
  children,
}: {
  title: string;
  back?: { to: string; label: string };
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 36);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const router = useRouter();
  return (
    <div className="min-h-dvh pb-32">
      <header
        className={cn(
          "sticky top-0 z-30 pt-safe transition-colors duration-300",
          scrolled ? "material shadow-[0_0.5px_0_var(--separator)]" : "bg-transparent",
        )}
      >
        <div className="mx-auto grid h-11 max-w-2xl grid-cols-[1fr_auto_1fr] items-center px-2">
          <div>
            {back && (
              <button
                onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: back.to }))}
                className="press flex items-center gap-0.5 text-[17px] text-primary"
                aria-label={`Back to ${back.label}`}
              >
                <ChevronLeft className="size-6" strokeWidth={2.4} />
                {back.label}
              </button>
            )}
          </div>
          <div
            className={cn("truncate text-[17px] font-semibold transition-opacity duration-300", scrolled ? "opacity-100" : "opacity-0")}
            aria-hidden={!scrolled}
          >
            {title}
          </div>
          <div className="flex justify-end gap-1 pr-2">{trailing}</div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4">
        <h1 className="large-title pb-3 pt-1">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function Money({ cents, className, signed }: { cents: number; className?: string; signed?: boolean }) {
  const text = formatEUR(cents);
  return (
    <span className={cn("money whitespace-nowrap", className)} aria-label={speakEUR(cents)}>
      {signed && cents > 0 ? "+" : ""}
      {text}
    </span>
  );
}

/** Inset grouped list section, iOS style. */
export function Section({ header, footer, children, className }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mb-6", className)}>
      {header && <div className="px-4 pb-1.5 text-[13px] uppercase tracking-wide text-muted-foreground">{header}</div>}
      <div className="overflow-hidden rounded-xl bg-card [&>*+*]:shadow-[inset_0_0.5px_0_var(--separator)]">{children}</div>
      {footer && <div className="px-4 pt-1.5 text-[13px] text-muted-foreground">{footer}</div>}
    </section>
  );
}

export function Row({
  children,
  onClick,
  to,
  params,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  params?: Record<string, string>;
  className?: string;
  ariaLabel?: string;
}) {
  const cls = cn("flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-[17px] active:bg-muted transition-colors", className);
  if (to)
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <Link to={to as any} params={params as any} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}

export function Pill({ tone, children, onClick, label }: { tone: "success" | "warning" | "danger" | "neutral"; children: ReactNode; onClick?: () => void; label?: string }) {
  const tones = {
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-muted text-muted-foreground",
  };
  const Comp = onClick ? "button" : "span";
  return (
    <Comp onClick={onClick} aria-label={label} className={cn("press money inline-flex rounded-full px-2.5 py-0.5 text-[15px] font-semibold", tones[tone])}>
      {children}
    </Comp>
  );
}

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  trailing,
  leading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (o) haptic("light");
        onOpenChange(o);
      }}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-foreground/25" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-2xl flex-col rounded-t-[14px] bg-background outline-none"
        >
          <div className="material sticky top-0 z-10 rounded-t-[14px]">
            <div className="mx-auto mt-2 h-1.5 w-9 rounded-full bg-muted-foreground/40" />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-2.5">
              <div className="text-[17px] text-primary">{leading}</div>
              <Drawer.Title className="text-[17px] font-semibold">{title}</Drawer.Title>
              <div className="flex justify-end text-[17px] font-semibold text-primary">{trailing}</div>
            </div>
          </div>
          <div className="edge-fade-top flex-1 overflow-y-auto px-4 pb-safe pt-2">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <div className="text-xl font-semibold">{title}</div>
      {body && <p className="max-w-xs text-[15px] text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, className, type = "button" }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn("press min-h-12 rounded-xl bg-primary px-5 text-[17px] font-semibold text-primary-foreground disabled:opacity-40", className)}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className="press grid size-9 place-items-center rounded-full text-primary active:bg-muted">
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-h-11 items-center gap-3 px-4 py-2 text-[17px]">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </label>
  );
}

export const inputCls = "w-full bg-transparent text-[17px] outline-none placeholder:text-muted-foreground/60";

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex rounded-[9px] bg-muted p-0.5" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => {
            if (o.value !== value) haptic("selection");
            onChange(o.value);
          }}
          className={cn(
            "flex-1 rounded-[7px] px-2 py-1.5 text-[13px] font-medium transition-all duration-300",
            value === o.value ? "bg-card shadow-sm" : "text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
