<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep budgeting math framework-free and persistence behind BudgetRepository so an Expo implementation can reuse the domain layer.
- Use local-only persistence for this app; hydrate the external store on the client to keep SSR output consistent.
- Content routes use a shared navigation shell and focused screen components; each leaf defines its own metadata.
