import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  label: string;
  tone: "primary" | "danger" | "warning" | "muted";
  onAction: () => void;
}

const toneCls = {
  primary: "bg-primary text-primary-foreground",
  danger: "bg-destructive text-destructive-foreground",
  warning: "bg-warning text-primary-foreground",
  muted: "bg-muted-foreground text-background",
};

/** Row that follows the finger 1:1 and reveals trailing actions; snaps with momentum. */
export function SwipeRow({ actions, children, onLongPress }: { actions: SwipeAction[]; children: ReactNode; onLongPress?: () => void }) {
  const W = actions.length * 80;
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; base: number; t: number; locked?: "h" | "v" } | null>(null);
  const last = useRef({ x: 0, t: 0 });
  const lp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);

  const clear = () => lp.current && clearTimeout(lp.current);

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: W }}>
        {actions.map((a) => (
          <button
            key={a.label}
            className={cn("flex-1 text-[15px] font-semibold", toneCls[a.tone])}
            onClick={() => {
              setX(0);
              a.onAction();
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div
        className="relative bg-card touch-pan-y"
        style={{
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : "transform 0.35s var(--spring)",
        }}
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY, base: x, t: e.timeStamp };
          last.current = { x: e.clientX, t: e.timeStamp };
          moved.current = false;
          if (onLongPress) lp.current = setTimeout(() => !moved.current && onLongPress(), 500);
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (!s.locked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
            s.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
            moved.current = true;
            clear();
          }
          if (s.locked !== "h") return;
          setDragging(true);
          let nx = s.base + dx;
          // rubber band beyond edges
          if (nx > 0) nx = nx * 0.2;
          if (nx < -W) nx = -W + (nx + W) * 0.2;
          setX(nx);
          last.current = { x: e.clientX, t: e.timeStamp };
        }}
        onPointerUp={(e) => {
          clear();
          const s = start.current;
          start.current = null;
          if (!s || s.locked !== "h") return;
          setDragging(false);
          const v = (e.clientX - last.current.x) / Math.max(1, e.timeStamp - last.current.t);
          const projected = x + v * 200;
          setX(projected < -W / 2 ? -W : 0);
        }}
        onPointerCancel={() => {
          clear();
          start.current = null;
          setDragging(false);
          setX((v) => (v < -W / 2 ? -W : 0));
        }}
        onClickCapture={(e) => {
          if (moved.current || x !== 0) {
            e.stopPropagation();
            e.preventDefault();
            if (!moved.current) setX(0);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
