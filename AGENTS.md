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

## Cloud Agent

Development uses Bun (`bun.lock`) and `bun run dev`. The Lovable Vite config listens on port **8080** at http://127.0.0.1:8080/login.

- Install dependencies with `bun install --frozen-lockfile`.
- Run unit tests with `bun test`.
- Open `/login` and choose **Continue with product demo**. The session is stored in the browser; seed data does not need API keys.
- `VITE_STAGE1_API_URL` is optional. Set it only when a local Stage-1 API should replace seed fixtures on the control-tower page.
- `bun test` passes on a clean install. `bun run lint` and `tsc --noEmit` report existing formatting and strict TypeScript issues in the app.
