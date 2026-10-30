import { createFileRoute } from "@tanstack/react-router";
import { AccountsScreen } from "@/components/app/AccountsScreen";
export const Route = createFileRoute("/accounts/")({
  head: () => ({ meta: [{ title: "Accounts · Budgetly" }, { name: "description", content: "Your cash, savings, credit and tracking account balances in Budgetly." }, { property: "og:title", content: "Accounts · Budgetly" }, { property: "og:description", content: "Manage your accounts and manual transactions." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AccountsScreen,
});