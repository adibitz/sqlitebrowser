# SQliteView for Electron: port plan

Port the Python/PySide6 app in `../reference/` (github.com/adibitz/SQLiteView) to an Electron + React + TypeScript
desktop app in this folder, then add an **MCP server** so Claude Code (or any MCP client) can work with the open
database and drive the window. All user preferences, recent files and the MCP token live in a local **SQLite** file.

Guiding rule: **port what exists, add only the MCP server, keep it simple.** No plugin systems, no routing
library (one window, document tabs), no extra state framework. Simple does not mean big files: code is split
into small, single-purpose files grouped by area (see § 3).

---

## 1. Stack (decided)

| Concern | Choice | Why |
|---|---|---|
| Shell / build | **Electron** + **electron-vite** (React TS template) | One config for main, preload and renderer, fast HMR |
| UI | **React 19 + TypeScript** (strict) | Asked for |
| Styling | **Tailwind CSS v4** via `@tailwindcss/vite`, CSS-first config (`@import "tailwindcss"`, `@theme inline`, `@custom-variant dark`). **No `tailwind.config.js`, no PostCSS config.** | Design spec is written for Tailwind v4 |
| Class merging | `cn` package (`createCn` from `cn/config`, custom size/radius/shadow tokens registered) in `lib/cn.ts` | What DESIGN.md and shadcn/ui use; replaces clsx + tailwind-merge |
| Components | **shadcn/ui** (copied into `components/ui/`, restyled to `DESIGN.md` tokens) | Accessible primitives we own and can restyle; the spec is written for shadcn |
| Animation | **Motion** (formerly Framer Motion, `motion/react`). Fast: 120–200ms, expo-out, `MotionConfig reducedMotion="user"`; durations/easings only from `lib/motion.ts` | Enter/exit for dialogs, panels, toasts, onboarding steps |
| Icons | **lucide-react** (stroke 1.75) | Matches the spec |
| Font | DM Sans, bundled locally (from `../reference/sqliteview/assets/fonts`) | Offline desktop app |
| State | **zustand** for all shared state (one store per area: workspace, settings, tabs) | Asked for; small, no boilerplate |
| Validation | **zod** (already a dependency of the MCP SDK) | One schema validates IPC arguments and MCP tool inputs |
| SQLite engine | **better-sqlite3** in a **worker thread** owned by main, `safeIntegers` on | Sync, fast, custom functions (`REGEXP`, `sqlb_make_single_value`), `stmt.readonly` for MCP read-only checks; worker keeps the window responsive; 64-bit integers stay exact |
| Data grid | Own `DataGrid` on **@tanstack/react-virtual** | Only visible rows render; paging stays in our control |
| SQL editor | **CodeMirror 6** + `@codemirror/lang-sql` | Schema autocomplete, much lighter than Monaco |
| Plot | **uPlot** | Small and fast; line/scatter/bars |
| CSV | Own small incremental parser (`shared/csv/csvParser.ts`) | Matches the Python app's `csv` module rules (strict=False, quoting off) and streams large files; type detection is our own port |
| MCP | **@modelcontextprotocol/sdk** | Official SDK: Streamable HTTP server for Claude Code |
| Unit tests | **Vitest**, run under Electron's Node (`ELECTRON_RUN_AS_NODE=1`) so the Electron build of `better-sqlite3` loads | Port the pytest suites 1:1 |
| E2E tests | **Playwright** (`_electron.launch`) against the built app, temp `userData`, demo DB, the SDK's HTTP client for MCP | Tests the real window, IPC and worker together |
| Lint / format | ESLint (flat config, typescript-eslint, react-hooks) + Prettier | Standard |
| Versioning | **Changesets** (`@changesets/cli`) | Every user-facing change adds a changeset; versions and `CHANGELOG.md` are generated |
| Packaging | **electron-builder** (Win NSIS + zip, macOS dmg, Linux AppImage + tar.gz) | Same outputs as the Python release |
| Package manager | **npm** | Fewest surprises with native modules on Windows |

Not used on purpose: Redux/Context-based state, react-router, CSS-in-JS, GSAP (the spec's scroll choreography is
for landing pages), Monaco, an ORM, `electron-store`.

**No authentication.** It is a local desktop app: no login, no accounts, no app lock.
**No demo database in the app.** The demo DB exists only as a test fixture.

---

## 2. Process architecture

```
┌──────────────── Renderer (React, sandboxed) ─────────────────┐
│ UI only. Calls window.api.<area>.<method>(). Listens to      │
│ window.api.<area>.on<Event>(). No Node, no SQLite.           │
└───────────────▲──────────────────────────────────────────────┘
                │ IPC: contract in src/shared/ipc/<area>.ts
┌───────────────┴──────────── Main process ────────────────────┐
│ ipc/<area>.ts: validate (zod) → forward                      │
│ window, menus, dialogs, CLI args, file associations          │
│ prefs/ (app.db, small sync queries)                          │
│ mcp/: MCP server on 127.0.0.1 for Claude Code                │
└───────────────▲──────────────────────────────────────────────┘
                │ typed RPC over postMessage (worker/rpc.ts)
┌───────────────┴──────────── DB worker (worker_threads) ──────┐
│ worker/handlers/<area>.ts → core/ (port of sqliteview/core)  │
│ Owns the user's database: savepoints, schema, paging,        │
│ import/export. Requests run one at a time, in order.         │
└──────────────────────────────────────────────────────────────┘
```

- **IPC areas** (one contract file each, same names in main handlers, preload and worker handlers):
  `app` (window, theme, menu commands), `files` (dialogs, recent files, drag & drop), `db` (open/create/close,
  attach, write/revert, state), `schema` (tree, create/alter/drop, indices, pragmas), `rows` (page, count,
  edit, add/delete, copy), `sql` (execute, log), `io` (CSV import, exports, dump), `project` (`.sqbpro`),
  `prefs` (settings), `mcp` (server status, connect command, token, window requests from MCP tools).
- Each contract file declares its **invoke methods** (request → response) and its **events**
  (main → renderer pushes such as `db:stateChanged`, `sql:progress`, `mcp:uiRequest`), plus the zod schemas.
  `shared/ipc/index.ts` only combines the areas into the `WindowApi` type.
- The renderer never builds file paths and never runs SQL directly.
- The MCP server calls the **same** worker handlers as the UI, so MCP edits land inside the same `SAVEPOINT`,
  show up as "Uncommitted changes", and **Write Changes / Revert** cover them.

---

## 3. Folder structure

```
sqliteview/
├── reference/                      cloned Python app, read-only, outside the repo
└── app/                            git root: the app, its docs and all config
    ├── .gitignore                  node_modules/, out/, dist/, test-results/, .env
    ├── .github/workflows/
    │   ├── ci.yml                  typecheck, lint, unit, e2e on Windows/macOS/Linux
    │   └── release.yml             changesets "Version packages" PR; on tag: build installers + GitHub Release
    ├── CLAUDE.md                   project rules
    ├── PLAN.md                     this file
    ├── DESIGN.md                   design system (source of truth for tokens)
    ├── .changeset/                 config.json + one .md per change
    ├── CHANGELOG.md                generated by changesets
    ├── README.md                   dev setup, "Differences from the Python app"
    ├── LICENSE
    ├── package.json
    ├── electron.vite.config.ts     includes @tailwindcss/vite for the renderer
    ├── electron-builder.yml
    ├── tsconfig.json  tsconfig.node.json  tsconfig.web.json
    ├── eslint.config.js  .prettierrc
    ├── vitest.config.ts
    ├── playwright.config.ts
    ├── resources/                  icons (.ico/.icns/.png), fonts/DMSans*.ttf, fonts/OFL.txt
    ├── src/
    │   ├── shared/                 no Node, DOM or Electron imports
    │   │   ├── ipc/
    │   │   │   ├── index.ts        WindowApi = all areas combined (types only)
    │   │   │   ├── app.ts  files.ts  db.ts  schema.ts  rows.ts
    │   │   │   ├── sql.ts  io.ts  project.ts  prefs.ts  mcp.ts
    │   │   ├── types/              schema.ts, rows.ts, filters.ts, mcp.ts, values.ts
    │   │   ├── settings/           keys.ts, defaults.ts (port of core/settings.py DEFAULTS)
    │   │   ├── sqlb/               identifier.ts  field.ts  constraints.ts  table.ts  indexDef.ts  trigger.ts
    │   │   ├── parser/             tokenizer.ts  createTable.ts  createIndex.ts  (both used by worker and dialogs)
    │   │   ├── sql/                sqlsplit.ts  statementType.ts  expandSql.ts  typedValue.ts  insertStatement.ts
    │   │   ├── schema/             pragmas.ts (the pragmas the Database Info tab edits)
    │   │   └── format/             displayFormat.ts, condFormat.ts, plotData.ts (pure, used by worker and UI)
    │   ├── main/
    │   │   ├── index.ts            app lifecycle only
    │   │   ├── window.ts           BrowserWindow + security options + CSP
    │   │   ├── cli.ts              -R, -t, -s, -q, .sqbpro
    │   │   ├── menu.ts             native menu → app:command events
    │   │   ├── ipc/
    │   │   │   ├── register.ts     registers every area
    │   │   │   ├── handle.ts       helper: ipcMain.handle + zod parse + error mapping
    │   │   │   └── app.ts  files.ts  db.ts  schema.ts  rows.ts  sql.ts  io.ts  project.ts  prefs.ts  mcp.ts
    │   │   ├── worker/
    │   │   │   ├── entry.ts        worker_threads entry, routes requests to handlers
    │   │   │   ├── rpc.ts          main-side client: call(area.method, args) → Promise
    │   │   │   └── handlers/       db.ts  schema.ts  rows.ts  sql.ts  io.ts  project.ts
    │   │   ├── core/               port of reference/sqliteview/core, no Electron imports
    │   │   │   ├── db/             connection.ts  functions.ts  savepoints.ts  execute.ts  records.ts
    │   │   │   │                   schemaLoad.ts  alterTable.ts  pragmas.ts  attach.ts  dump.ts  sqlLiteral.ts
    │   │   │   ├── query.ts  filters.ts  rows.ts  runsql.ts  sqlsplit.ts  data.ts
    │   │   │   └── rowexport.ts  csvImport.ts  project.ts
    │   │   ├── paths.ts            userData location (SQLITEVIEW_USER_DATA override for tests)
    │   │   ├── prefs/
    │   │   │   ├── database.ts     open app.db, foreign_keys on, run migrations
    │   │   │   ├── migrations.ts   numbered list, applied via PRAGMA user_version
    │   │   │   └── settings.ts  recentFiles.ts  secretValues.ts
    │   │   ├── secrets.ts          safeStorage encrypt/decrypt
    │   │   └── mcp/
    │   │       ├── service.ts      starts, moves and stops the server from the settings
    │   │       ├── httpServer.ts   Streamable HTTP on 127.0.0.1: Host/Origin/token checks, stateless
    │   │       ├── buildServer.ts  McpServer with every tool
    │   │       ├── uiBridge.ts     tool → window requests (mcp:uiRequest / mcp:reply)
    │   │       ├── token.ts  connectCommand.ts  confirmWrite.ts  workerDatabase.ts
    │   │       └── tools/          one per tool: getAppState, listTables, describeTable, sampleRows, runQuery,
    │   │                           runSql, revertChanges, writeChanges, openDatabase, openTable, openSqlEditor
    │   ├── preload/
    │   │   ├── index.ts            contextBridge.exposeInMainWorld('api', …)
    │   │   └── api/                app.ts  files.ts  db.ts  schema.ts  rows.ts  sql.ts  io.ts  project.ts  prefs.ts  mcp.ts
    │   └── renderer/
    │       ├── index.html
    │       └── src/
    │           ├── main.tsx
    │           ├── app/            AppShell.tsx  Toolbar.tsx  StatusBar.tsx  shortcuts.ts  ThemeSync.tsx
    │           ├── styles/
    │           │   ├── globals.css @import "tailwindcss"; imports below; base layer
    │           │   ├── tokens.css  :root (light) and .dark values from DESIGN.md
    │           │   ├── theme.css   @theme inline: tokens → Tailwind utilities; @custom-variant dark
    │           │   └── fonts.css   @font-face DM Sans
    │           ├── lib/            cn.ts  api.ts  motion.ts (durations/easings)  hooks/
    │           ├── store/          workspace.ts  settings.ts  tabs.ts  (zustand)
    │           ├── components/ui/  shadcn/ui components (button, input, select, switch, dialog, dropdown-menu,
    │           │                   tooltip, badge, sonner, skeleton, resizable, …), restyled to tokens
    │           └── features/       one folder per feature; components, hooks and helpers live inside it
    │               ├── onboarding/ OnboardingFlow, ThemeStep, McpStep
    │               ├── welcome/  explorer/  inspector/  schema/  dbinfo/  log/  plot/  palette/  preferences/
    │               ├── table/      DataGrid, GridHeader, FilterRow, FilterBuilder, FilterChips, Pagination, SelectionBar
    │               ├── sql/        SqlTab, SqlEditor, ResultsPane, FindBar
    │               ├── dialogs/    EditTable, EditIndex, ImportCsv, ExportData, ExportSql, AddRecord,
    │               │               DisplayFormat, CondFormat, RecordView
    │               └── mcp/        useMcpBridge, uiActions, uiSnapshot, describeTab (window side of the MCP tools)
    └── tests/
        ├── fixtures/               makeDemoDb.ts (port of scripts/make_demo_db.py), tempDir.ts
        ├── unit/                   core/, prefs/, shared/ (Vitest; ports of tests/test_*.py)
        └── e2e/                    Playwright
            ├── launch.ts           launches the built app with temp userData + demo DB
            └── smoke.spec.ts  browse.spec.ts  sql.spec.ts  schema.spec.ts  io.spec.ts  mcp.spec.ts
```

---

## 4. Feature map: Python → Electron

| Python (`../reference/sqliteview/…`) | Electron (`src/…`) |
|---|---|
| `core/db.py` (1240 lines: connection, savepoints, records, alter table, dump) | `main/core/db/*` (split by concern) |
| `core/sqlb.py` (schema object model) | `shared/sqlb/*` (pure; the structure dialogs build SQL with it too) |
| `core/parser.py` (CREATE TABLE/INDEX parser) | `shared/parser/*` (pure) |
| `core/query.py`, `core/filters.py` | `main/core/query.ts`, `main/core/filters.ts` |
| `core/table_model.py`, `core/rowloader.py` (lazy chunks) | `main/core/rows.ts` (paged `SELECT` + `COUNT(*)`) + renderer `features/table/useRows.ts` |
| `core/runsql.py`, `core/sqlsplit.py` | `main/core/runsql.ts`, `main/core/sqlsplit.ts` (own tokenizer, see § 8) |
| `core/data.py`, `rowexport.py` | `main/core/data.ts`, `main/core/rowexport.ts` |
| `core/condformat.py`, `display_format.py`, `plotdata.py` | `shared/format/condFormat.ts`, `displayFormat.ts`, `plotData.ts` |
| `core/project.py` (`.sqbpro` XML) | `main/core/project.ts` |
| `core/settings.py` (QSettings) | `shared/settings/*` (keys, defaults) + `main/prefs/settings.ts` (storage in `app.db`) |
| `ui/main_window.py` | `renderer/app/*` + `main/menu.ts` |
| `ui/explorer.py`, `table_tab.py`, `data_grid.py`, `sql_tab.py`, `sql_editor.py`, `inspector.py`, `schema_tab.py`, `db_info_tab.py`, `log_panel.py`, `plot_dock.py`, `welcome.py`, `command_palette.py` | one folder each under `renderer/features/` |
| `ui/dialogs/*` | `renderer/features/dialogs/*` |
| `ui/theme.py`, `widgets.py`, `icons.py` | `renderer/styles/*`, `renderer/components/ui/*`, lucide |
| `app.py` CLI | `main/cli.ts` |
| `tests/test_*.py` | `tests/unit/**` (engine) and `tests/e2e/**` (what `test_ui.py` covered) |

---

## 5. First launch: onboarding

Shown once, before anything else, when `General/onboarded` is not set. Only what is required, every step
skippable with sensible defaults, and changeable later in Preferences:

1. **Theme**: System / Light / Dark (live preview).
2. **Claude Code**: Off (default) / On. On starts the MCP server; the connect command is in Preferences.

Then the start page: Open database / New database / recent files. Nothing is opened or created automatically.

---

## 6. New feature: MCP server for Claude Code

The app has no chat and no AI provider code. Claude Code (or any MCP client) brings the model and connects to
an MCP server inside the app.

**What the user sees**
- Preferences → Claude Code (MCP): on/off (off by default), port (3940), the server status, **Copy Claude Code
  command** (`claude mcp add --transport http --scope user sqliteview http://127.0.0.1:<port>/mcp --header
  "Authorization: Bearer <token>"`) and **New token**.
- The window follows what Claude Code does: tables open with its filters, SQL editors open (and run), edits
  show as "Uncommitted changes" and the grids reload.
- Writing to disk (`write_changes`) asks with a native dialog. Edits and reverts don't ask: Revert undoes them.

**How it works**
- `mcp/httpServer.ts`: Streamable HTTP on `127.0.0.1`, stateless (a new `McpServer` per POST). Before the SDK
  sees a request it checks the path, the `Host` header (DNS rebinding), that there is no `Origin` header
  (browsers) and the bearer token (constant-time compare).
- `mcp/service.ts` starts, moves and stops the server when `MCP/enabled` or `MCP/port` change, and pushes its
  status (`mcp:statusChanged`).
- Data tools (`get_app_state`, `list_tables`, `describe_table`, `sample_rows`, `run_query`, `run_sql`,
  `revert_changes`, `write_changes`) call the same worker handlers as the UI, so edits land in the open savepoint.
- UI tools (`open_database`, `open_table`, `open_sql_editor`) go through `mcp/uiBridge.ts`: main pushes
  `mcp:uiRequest`, the renderer runs the same actions as the UI (`features/mcp/uiActions.ts`) and answers with
  `mcp:reply`. The renderer reports its tabs (`mcp:reportUi`) for `get_app_state`.
- After an edit or revert main sends `db:dataChanged`; the renderer reloads grids and drops tabs of tables that
  went away.

**Safety**
- The token is encrypted with `safeStorage` in the `secrets` table, never sent to the renderer (main copies the
  command to the clipboard itself) and never logged. Without `safeStorage` it lasts for the session only.
- Read-only databases (`-R`) reject edits. `run_query` only runs statements SQLite reports as read-only.

---

## 7. Preferences database (`app.db` in Electron `userData`)

```sql
-- migration 1 (PRAGMA user_version = 1); migration 2 drops the chat tables and adds `secrets`
CREATE TABLE settings      (key TEXT PRIMARY KEY, value TEXT NOT NULL);              -- JSON; keys as in core/settings.py ('General/theme')
CREATE TABLE recent_files  (path TEXT PRIMARY KEY, opened_at TEXT NOT NULL, read_only INTEGER NOT NULL DEFAULT 0);
CREATE TABLE ai_providers  (id INTEGER PRIMARY KEY,
                            kind TEXT NOT NULL CHECK (kind IN ('anthropic', 'openai_compatible')),
                            name TEXT NOT NULL, base_url TEXT, api_key BLOB,           -- NULL key for Ollama/LM Studio
                            default_model TEXT NOT NULL);
CREATE TABLE chat_sessions (id INTEGER PRIMARY KEY, db_path TEXT,                     -- NULL for in-memory databases
                            provider_id INTEGER REFERENCES ai_providers(id) ON DELETE SET NULL,
                            model TEXT NOT NULL, title TEXT,
                            created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE chat_messages (id INTEGER PRIMARY KEY,
                            session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                            role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
                            content TEXT NOT NULL,                                     -- JSON: text blocks + tool calls/results
                            created_at TEXT NOT NULL);
CREATE INDEX chat_sessions_db_path ON chat_sessions(db_path);
CREATE INDEX chat_messages_session ON chat_messages(session_id);
```

```sql
-- migration 2
DROP TABLE chat_messages; DROP TABLE chat_sessions; DROP TABLE ai_providers;
DELETE FROM settings WHERE key LIKE 'ai/%';
CREATE TABLE secrets (name TEXT PRIMARY KEY, value BLOB NOT NULL);                    -- safeStorage-encrypted
```

Window bounds, panel sizes, theme, density and the MCP settings (`MCP/enabled`, `MCP/port`) are rows in `settings`.
Migrations are append-only; the version lives in `PRAGMA user_version` (no extra table).
`SQLITEVIEW_USER_DATA` (env) overrides the `userData` folder, used by Playwright so tests never touch real prefs.

---

## 8. Phases

Every phase ends with `typecheck`, `lint`, unit and e2e tests green, the app runnable, and a changeset added.

| # | Phase | Done when |
|---|---|---|
| 0 | **Scaffold**: `git init` in `app/`, electron-vite React TS, Tailwind v4 CSS-first + tokens (light/dark) + DM Sans, shadcn/ui + Motion, onboarding (theme, Claude Code on/off), ESLint/Prettier, Vitest under Electron, Playwright with `launch.ts`, Changesets, better-sqlite3 rebuilt for Electron, worker + RPC, IPC folder with `app` and `prefs` areas, `app.db` + migrations, theme toggle (system/light/dark), CI workflow | First launch shows onboarding; answers persist and it doesn't show again (e2e); CI green |
| 1 | **Core engine port** (`db/*`, `sqlb/*`, `parser/*`, `query`, `filters`, `sqlsplit`, `data`) with `test_core.py` ported | Ported core tests pass |
| 2 | **Shell**: welcome page + recent files + drag & drop, Explorer, document tabs, status bar (uncommitted changes), command palette `Ctrl+K`, density | Open/create/close DB, Write/Revert (e2e) |
| 3 | **Browse**: virtual grid, pagination, filter row, filter builder + chips, multi-sort, cell edit, add/delete rows, Inspector (text/JSON/hex/image), multi-select + copy as CSV/TSV/JSON/SQL/Markdown, row details, full-screen grid | `test_browse_features.py` ported; `browse.spec.ts` |
| 4 | **Execute SQL**: CodeMirror editor, run all/current/selection, results grid, error underline, find bar, log panel | Scripts with triggers split and run correctly; `sql.spec.ts` |
| 5 | **Schema**: edit table (alter-table emulation), edit index, DB info + pragmas, attach DB | Alter-table tests pass; `schema.spec.ts` |
| 6 | **Import/export**: CSV import with live preview, export CSV/JSON/SQL/Markdown/TSV, SQL dump and import | Round-trip tests pass; `io.spec.ts` |
| 7 | **Formats, plot, projects, CLI**: display/conditional formats, plot panel, `.sqbpro` open/save, CLI flags | `test_formats_plot.py`, `test_project.py` ported |
| 8 | **MCP server for Claude Code**: Streamable HTTP on 127.0.0.1 with a token, data and UI tools, Preferences page, on/off | `mcp.spec.ts` with the SDK's HTTP client: opens tables, edits show as uncommitted, Revert undoes them, writing asks |
| 9 | **Packaging + release**: electron-builder for Win/macOS/Linux, `.db`/`.sqlite` file association, changesets release workflow | Installers build in CI from a version tag |

Phase 8 only depends on phases 0–2, so it can move earlier if you want Claude Code sooner.

**Release flow (Changesets):** each PR with a user-facing change runs `npx changeset` (patch/minor/major + one
line). On `main`, the release workflow opens a "Version packages" PR that bumps `package.json` and writes
`CHANGELOG.md`. Merging it tags `v<version>`, which builds the installers and publishes the GitHub Release.
`app` is a private package, so `.changeset/config.json` sets `privatePackages: { version: true, tag: true }`.

---

## 9. Risks and decisions

| Risk | Decision |
|---|---|
| Native module for SQLite | `better-sqlite3` 13 ships prebuilt Node-API binaries that load in Electron and Node as-is (verified with Electron 44); no rebuild step. Vitest still runs through Electron (`ELECTRON_RUN_AS_NODE=1`) so tests use the same runtime |
| No `sqlite3_complete` in better-sqlite3 for splitting scripts | Own tokenizer in `sqlsplit.ts` (strings, identifiers, comments, `BEGIN…END` in triggers), tested against the Python cases |
| No interrupt in better-sqlite3 for long queries | The worker keeps the UI responsive. "Stop" terminates and restarts the worker; if there are uncommitted changes, the user is warned first that they will be lost |
| Custom collations (`UTF16`, `UTF16CI`) | Check better-sqlite3 support in phase 1; if missing, list as a difference in `README.md` |
| 64-bit integers and BLOBs over IPC | `safeIntegers` → `bigint`, BLOBs as `Uint8Array`; both survive Electron's structured clone. UI formats `bigint` explicitly |
| Large results over IPC | Always paged (page size from settings, default 100; "All" streams in 5,000-row chunks) |
| One worker means requests queue behind a long query | Accepted, same as the Python app; the status bar shows "Running…" |
| `better-sqlite3` inside `asar` + worker thread in the packaged app | `asarUnpack` for its prebuilds; verify in phase 9 that the worker can load it from the packaged app |
| `safeStorage` unavailable on some Linux desktops | Session-only key in memory, with a visible notice; never plaintext on disk |
| `DESIGN.md` targets a marketing site | Rules in `CLAUDE.md` § Design say what to keep and what to skip for a dense desktop tool |

---

## 10. Licence

The reference is dual GPL-3.0 / MPL-2.0 (from DB Browser for SQLite). A port is a derivative work, so the app
keeps the same licence and ships `LICENSE` plus the DM Sans OFL text.
