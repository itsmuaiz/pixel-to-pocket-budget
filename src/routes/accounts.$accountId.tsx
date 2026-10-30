import { createFileRoute } from "@tanstack/react-router";
import { AccountScreen } from "@/components/app/AccountScreen";
export const Route = createFileRoute("/accounts/$accountId")({
  head: () => ({ meta: [{ title: "Account transactions · Budgetly" }, { name: "description", content: "Review, search and manage your account transactions in Budgetly." }, { property: "og:title", content: "Account transactions · Budgetly" }, { property: "og:description", content: "Manual transactions, transfers and recurring payments." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AccountPage,
});
function AccountPage() { const { accountId } = Route.useParams(); return <AccountScreen accountId={accountId} />; }