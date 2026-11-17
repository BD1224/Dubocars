# Project Preferences (read before doing anything)

These rules come from the project owner. Every contributor (human or agent) follows them.

## Hard rules
1. **Stay inside this directory.** Do not read or write files outside `Dubocars/` except an isolated scratchpad for experiments.
2. **Install nothing.** No `npm install`, `brew`, `pip`, `npx <pkg>`, or downloads from the internet. If something is needed, add it to `INSTALL_AND_RUN.txt` for the owner to run.
3. **Supabase keys:** use the modern **publishable** key (`sb_publishable_...`) on the client and the **secret** key (`sb_secret_...`) only on the server, if ever. Do not use the legacy `anon` / `service_role` names.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server only, never prefixed `NEXT_PUBLIC_`)
4. **SPEC.md is the source of truth.** Its "Decisions" section overrides everything above it.

## Code style
- **Simple beats clever.** Keep the implementation as small as it can be. No abstractions without a second use.
- Easy to follow: someone new should understand what each file is for from its name and a one-line header comment.
- Conventional layout: all source code lives under `src/`.
- One responsibility per file. Pure logic (time math, layout) is kept separate from React components so it is easy to test.
- TypeScript strict mode. No `any` unless unavoidable.
- No extra dependencies beyond: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `tailwindcss`, `typescript`, and nothing for tests: unit tests use Node's built-in `node:test` (Node 24 runs .ts directly). Ask before adding anything else.

## Process
- Skeleton first: create files with stub (empty) functions and types, then fill them in one by one.
- The lead (orchestrator) owns the design; implementation agents follow it. Design-challenge agents may suggest changes, but the lead decides.
- Test what was built. Pure logic gets unit tests.

## UX priority
- The main job is making a booking accurately with the least friction possible: tap a slot → booking exists (saved to Supabase) → adjust if needed. No Save button, no extra screens.
