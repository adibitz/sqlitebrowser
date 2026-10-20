# SQliteView (Electron) — project rules

Electron + React + TypeScript port of the Python/PySide6 app in `../reference/`, plus an MCP server so Claude Code can
drive it.
Read `PLAN.md` for the architecture, folder structure and phases. `DESIGN.md` is the design source of truth.
These rules add to the global ones in `~/.claude/CLAUDE.md`.

## Layout

- This folder is the repository: the Electron app, its docs (`CLAUDE.md`, `PLAN.md`, `DESIGN.md`) and all
  config (`.github/`, `.changeset/`, build and test config).
- `../reference/` — the Python original, outside the repo. **Read-only.** Never edit, build, commit or ship it.
- `src/shared/` — IPC contract, types, setting keys, pure format logic. No Node, DOM or Electron imports.
- `src/main/` — Electron main process. `main/core/` is the engine port and must not import `electron`.
- `src/main/worker/` — the DB worker. Only the worker opens the user's database.
- `src/preload/` — `contextBridge` only. Exposes `window.api`, nothing else.
- `src/renderer/` — React UI. No Node, no `better-sqlite3`, no `ipcRenderer`.

## Small files, grouped by area

- One job per file. Split a file once it holds a second concern or passes ~250 lines; split into a folder named
  after the concern (`core/db/savepoints.ts`, not `core/dbSavepoints.ts` next to 20 others).
- One React component per file, named after the component. Feature-only hooks and helpers live in that feature's
  folder; move them to `lib/` or `components/ui/` only when a second feature needs them.
- No catch-all files (`utils.ts`, `helpers.ts`, `types.ts` with everything). Name files for what they hold.
- `index.ts` barrels only where a folder is a public boundary (`shared/ipc/index.ts`). Elsewhere import the file
  directly.
- Creating new files and folders is expected; don't grow an existing file to avoid making one.

## IPC

- The contract lives in `src/shared/ipc/`, **one file per area**: `app`, `files`, `db`, `schema`, `rows`, `sql`,
  `io`, `project`, `prefs`, `mcp`. Each file holds that area's channel names, request/response types, event
  payload types and zod schemas. `shared/ipc/index.ts` only combines them into `WindowApi`.
- The same area names repeat in `main/ipc/<area>.ts` (handlers), `preload/api/<area>.ts` (bridge) and
  `main/worker/handlers/<area>.ts`. A new area means a file in each place, never a section in an existing one.
- Channel names are `<area>:<action>` and are written only in `shared/ipc/<area>.ts`.
- Main handlers go through `main/ipc/handle.ts`: zod-validate the arguments, forward, map errors to a safe
  message. No business logic in handlers.
- File paths reach main only from native dialogs, drag & drop, CLI args, recent files or the MCP
  `open_database` tool (checked in main with `requireExistingFile`); the renderer never builds a path.
- Long work (queries, import, export, dump, alter table) runs in the DB worker, never on the main thread.

## Keep it simple

- Build only what the Python app has, plus the MCP server. No speculative options, plugin systems or abstraction
  layers for one caller.
- Dependencies are the ones in `PLAN.md` § Stack. Adding another needs a one-line reason in the commit and must
  not duplicate an existing one.
- No Redux, React Context for app state, react-router, CSS-in-JS, GSAP, Monaco, ORMs or `electron-store`.
- **State: zustand.** Local `useState` for state one component owns; a zustand store in `renderer/src/store/`
  for anything shared. Select narrow slices (`useSettings(s => s.theme)`), never the whole store.
- **No authentication** (local app). **No demo database** in the app; it exists only in `tests/fixtures/`.
- First launch shows onboarding (theme, Claude Code on/off). Ask only what is required; every answer can be
  changed later in Preferences. Don't add steps without asking.

## Porting

- Each file in `main/core/` and `shared/format/` starts with `// Port of reference/sqliteview/core/<file>.py`
  (the path is relative to `../`)
  (plus the function names when one Python file is split across several).
- Port behaviour, not Python idioms: same SQL generated, same filter syntax, same defaults, same savepoint
  rules. When in doubt, read the Python file and its tests.
- Port the matching pytest cases in the same change as the code.
- Any deliberate difference from the Python app goes in "Differences" in `README.md`.
- Setting keys and defaults mirror `../reference/sqliteview/core/settings.py` (`'group/name'`) in
  `shared/settings/`. Don't invent a parallel naming scheme.

## Security

- `BrowserWindow`: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strict CSP, navigation
  and `window.open` blocked; external links open via `shell.openExternal` after checking for `https:`.
- SQL from code is parameterized. Identifiers go through the one quoting helper in `shared/sqlb/identifier.ts`
  (port of `escapeIdentifier`); never concatenate a name or value into SQL anywhere else.
- SQL the user types in the editor runs as written (that is the feature). So does SQL from an MCP client's
  `run_sql`: it lands in the open savepoint and Revert undoes it. `run_query` must pass `stmt.readonly`.
- The MCP token: encrypted with `safeStorage` (`main/secrets.ts`) in the `secrets` table. Never sent to the
  renderer (main copies the connect command to the clipboard itself), never logged, never in error messages.
- The MCP server listens on 127.0.0.1 only and checks Host, Origin and the bearer token before the SDK sees a
  request (`main/mcp/httpServer.ts`).
- No `dangerouslySetInnerHTML`. Cell values and schema names render as text.

## Preferences database

- All user preferences, recent files and the MCP token live in `app.db` under Electron `userData`,
  accessed only through `main/prefs/*`.
- Schema changes are new entries in `main/prefs/migrations.ts` (version in `PRAGMA user_version`); never edit a
  shipped migration.
- No `localStorage`, JSON files or `electron-store` for preferences.

## MCP server (Claude Code)

- There is no built-in chat and no AI provider code: outside MCP clients (Claude Code) bring the model.
- Off by default (`MCP/enabled`, `MCP/port`); Preferences → Claude Code (MCP) starts, moves and stops it.
- One MCP tool per file in `main/mcp/tools/`. Data tools call the `mcp.*` worker handlers
  (`core/mcpTools.ts`), so edits land in the open savepoint like the UI's. UI tools go through
  `main/mcp/uiBridge.ts` to `features/mcp/uiActions.ts`, which reuse the same actions as the UI.
- Edits need no prompt (Revert undoes them); `write_changes` always asks the user with a native dialog.
  Read-only databases reject edits.
- After an MCP edit or revert main sends `db:dataChanged`, and the grids reload.

## Styling: Tailwind CSS v4

- Class merging: `cn` from `@/lib/cn` (the `cn` package's `createCn`, as in DESIGN.md). No clsx/tailwind-merge.
- Tailwind v4 through `@tailwindcss/vite`, configured in CSS only. **No `tailwind.config.js`, no PostCSS config,
  no v3 syntax** (`@tailwind base`, `theme()` in JS, `darkMode: 'class'`).
- `styles/tokens.css` holds the values from `DESIGN.md` (`:root` light, `.dark` dark). `styles/theme.css` maps
  them with `@theme inline` and declares `@custom-variant dark (&:where(.dark, .dark *));`.
- Components use token utilities (`bg-card`, `text-muted-foreground`, `rounded-field`, `shadow-float`). No hex
  values, arbitrary colour values or px font sizes in components.
- Never build class names by string interpolation; use a lookup of full class names.
- A new custom size, radius or shadow utility is registered in `lib/cn.ts` (`createCn`) in the same change.

## Components: shadcn/ui

- UI primitives come from shadcn/ui: add with `npx shadcn@latest add <name>` (from this folder), never accept an
  overwrite of an existing file, then restyle the new file to our tokens. Files live in
  `renderer/src/components/ui/` (kebab-case, as shadcn generates them).
- Don't hand-write a primitive shadcn already has. Feature components compose these, they don't fork them.

## Animation: Motion (`motion/react`)

- Fast and functional: 120ms (press, hover), 160ms (menus, tooltips, toasts), 200ms max (dialogs, panels,
  onboarding steps). Expo-out easing. Durations and easings only from `lib/motion.ts`.
- Animate `opacity` and `transform` only. No layout/height animations on grids or large lists.
- `<MotionConfig reducedMotion="user">` at the root; reduced motion = no movement.
- CSS transitions are fine for simple hover/press colour changes; use Motion for enter/exit and presence.

## Design (adapting DESIGN.md to a desktop data tool)

- Both themes are first-class: `system | light | dark`, `.dark` class on `<html>`. Check every screen in both.
- Keep from DESIGN.md: tokens, DM Sans 400/500 (800 only for the wordmark), pill buttons, small radii, surface
  lift over borders, signal blue only for focus/selection/links, field focus = signal border with no ring,
  CSS micro-interactions, reduced-motion support, lucide icons at stroke 1.75.
- Skip from DESIGN.md: landing-page composition, GSAP/scroll choreography, display type sizes, section spacing,
  gradient cards (at most one, on the welcome page).
- Desktop density: toolbars and grids use `button-xs`/`button-sm` and `body-sm`; grid rows 28px (comfortable) /
  24px (compact); numbers in grids use tabular figures.
- Exception to "DM Sans everywhere": the SQL editor, hex view and BLOB previews use the system monospace stack.
- Copy: sentence case, no em-dashes, errors say what happened and how to fix it.

## Testing

- **Unit (Vitest)** in `tests/unit/`, mirroring `src/` paths. Engine code is tested against real SQLite
  files built by `tests/fixtures/makeDemoDb.ts`, not mocks.
- **E2E (Playwright)** in `tests/e2e/`, one spec per feature area. Always launch through
  `tests/e2e/launch.ts` (temp `userData` via `SQLITEVIEW_USER_DATA`, fresh demo DB). Select elements by role and
  accessible name, not CSS classes. MCP specs connect the SDK's HTTP client to the app on a free port.
- A bug fix starts with a failing test. Every phase adds e2e coverage for what the user can now do.

## Versioning: Changesets

- Every change a user would notice adds a changeset (`npx changeset`): patch for fixes, minor for
  features. Internal-only changes (tests, refactors, CI) don't need one.
- Never edit `version` in `package.json` or `CHANGELOG.md` by hand; the release workflow does that.

## Commands (run from this folder)

```bash
npm run dev         # electron-vite dev with HMR
npm run typecheck   # tsc for main/preload and renderer
npm run lint        # eslint
npm test            # vitest under Electron's Node
npm run test:e2e    # build, then Playwright against the built app
npm run build       # production build
npm run dist        # electron-builder package for the current OS
npx changeset       # add a changeset
npm run ui:add -- <name>   # add a shadcn/ui component
```

Run `typecheck`, `lint`, `test` and `test:e2e` before calling any phase done.

Gotchas found while building:

- `better-sqlite3` ships prebuilt Node-API binaries; no rebuild for Electron and no C++ toolchain needed.
  Don't add `electron-builder install-app-deps` / `@electron/rebuild`.
- The preload is sandboxed and can only `require('electron')`, so its dependencies are bundled
  (`build.externalizeDeps: false` for preload in `electron.vite.config.ts`).
- Add shadcn components with `npm run ui:add -- <name>` (not `npx shadcn add`): the post-script points their
  `cn` import at `@/lib/cn`, which has our custom tokens registered. Answer "no" to every overwrite prompt.
- Theme tokens: shadcn aliases (`--background`, …) are declared on `:root, .light, .dark` so nested theme
  scopes work. Keep it that way when adding tokens.
- Playwright: launch with `colorScheme: null` (done in `tests/e2e/launch.ts`) or Playwright forces light mode.
