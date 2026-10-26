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

## Bannaa platform rules
- AI site generation streams from the `/api/generate` server route (bearer-verified, daily limit via `consume_message` RPC); keeps the model call and key server-side.
- Generated sites are static file maps (`projects.files` jsonb) rendered in a sandboxed iframe via `buildDoc` in `src/lib/preview.ts`; avoids needing per-user servers.
- AI output uses `<file path="...">` blocks parsed by `parseAI`; the prompt in `src/lib/ai/gateway.server.ts` and the parser must stay in sync.
- All UI strings live in `src/lib/i18n.tsx` (ar + en); RTL/LTR is set from locale on `<html>`.
