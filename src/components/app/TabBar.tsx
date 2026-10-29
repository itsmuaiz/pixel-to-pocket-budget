import { Link, useRouterState } from "@tanstack/react-router";
import { ChartPie, Landmark, Settings, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Budget", icon: Wallet, match: (p: string) => p === "/" },
  { to: "/accounts", label: "Accounts", icon: Landmark, match: (p: string) => p.startsWith("/accounts") },
  { to: "/reports", label: "Reports", icon: ChartPie, match: (p: string) => p.startsWith("/reports") },
  { to: "/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/settings") },
] as const;

export function TabBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="material fixed inset-x-0 bottom-0 z-40 shadow-[0_-0.5px_0_var(--separator)] pb-safe" aria-label="Main">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map(({ to, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn("press flex flex-1 flex-col items-center gap-0.5 pt-2 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}
            >
              <Icon className="size-6" strokeWidth={active ? 2.3 : 1.8} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
