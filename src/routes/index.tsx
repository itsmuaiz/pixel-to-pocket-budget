import { createFileRoute } from "@tanstack/react-router";
import { BudgetScreen } from "@/components/app/BudgetScreen";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Budget · Budgetly" },
    { name: "description", content: "Give every euro a job. Manage monthly categories, savings targets, and available money with Budgetly." },
    { property: "og:title", content: "Budget · Budgetly" },
    { property: "og:description", content: "Your monthly zero-based budget, category balances, and savings targets." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BudgetScreen,
});
