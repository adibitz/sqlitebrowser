# SQliteView (Electron)

Electron + React + TypeScript port of [SQliteView](https://github.com/adibitz/SQLiteView) (itself a port of
DB Browser for SQLite), with an optional AI assistant that works with the open database through MCP.
See `PLAN.md` for the architecture and phases, `CLAUDE.md` for the project rules and `DESIGN.md` for the
design system. The Python original lives outside this repo in `../reference/`.

## Development

Needs Node.js 22.12+ (24 recommended). No C++ toolchain: `better-sqlite3` ships prebuilt Node-API binaries
that load in Electron as they are.

```bash
npm install
npm run dev         # app with hot reload
npm run typecheck
npm run lint
npm test            # unit tests (Vitest, run inside Electron's Node)
npm run test:e2e    # builds, then runs Playwright against the built app
npm run dist        # installers for the current OS, in dist/
npx changeset       # describe a user-facing change for the changelog
npm run ui:add -- <component>   # add a shadcn/ui component (then restyle it to the tokens)
```

The app keeps its preferences in `app.db` in Electron's `userData` folder. Set `SQLITEVIEW_USER_DATA` to use
another folder (the e2e tests do this so they never touch your real profile).

## AI assistant

Off until you turn it on (at first start, or in Preferences → AI assistant). It talks to Claude (Anthropic)
or any OpenAI-compatible server (OpenAI, OpenRouter, LM Studio, Ollama at `http://localhost:11434/v1`).

- The panel (Ctrl+J) shows which model answers and lets you pick another or type any model id.
- The model works on the open database through MCP tools: `list_tables`, `describe_table`, `sample_rows`,
  `run_query` (only statements SQLite reports as read-only, at most 200 rows) and `run_sql`.
- `run_sql` waits until you approve the exact SQL. Approved changes stay pending like any other edit:
  Write changes keeps them, Revert undoes them. Read-only databases refuse them.
- Each message includes a short description of the tab you are looking at (table, filters, SQL text).
- Conversations are kept per database file in `app.db`; Clear forgets them. API keys are encrypted with the
  OS keychain (safeStorage) and never sent back to the window; without a keychain they last for the session.

## Differences from the Python app

- Settings live in a SQLite file (`app.db`) instead of QSettings; keys keep the Python `group/name` names.
  The recent-files list and window geometry moved to their own storage.
- No authentication, and no demo database in the app (the demo database is only a test fixture).
- The engine runs on better-sqlite3 in a worker thread. Compared with Python's `sqlite3` module:
  - No custom collations: the Python app registered `UTF16`/`UTF16CI` and added unknown collations on
    demand. Queries that need one fail with "This database uses the collation X, which SQliteView can't
    provide."
  - No interrupt for a running query; the worker keeps the window responsive while it runs.
  - TEXT that isn't valid UTF-8 is shown with replacement characters instead of as raw bytes.
  - Scripts are split with a port of SQLite's `sqlite3_complete()` state machine, because better-sqlite3
    doesn't expose it.
  - Integers are `bigint` end to end, so 64-bit values stay exact.
  - `REGEXP` uses JavaScript regular expressions (Python used `re`); the common syntax is the same.
- Opening a database shows the Database Info tab, like the Python app; the schema overview is one click
  away in the explorer.
- Setting pragmas writes every pending change first (the Python app only released the innermost
  savepoint, so pragmas such as `foreign_keys` were silently ignored while an undo point was open).
- CSV import doesn't ask before adding rows to an existing table: the preview says "Adds rows to the
  existing table …", and the import can be reverted like any other change. It has no cancel button;
  the import runs in the worker, so the window stays responsive.
- Data export offers every row format (CSV, TSV, JSON, SQL, Markdown) and can export a table as filtered
  and sorted in its tab.
- Conditional formats are evaluated by SQLite on the column's value, exactly like the filter row; the
  Python app compared on a private connection and treated numeric text as numbers.
- Project files don't store the window layout (it was Qt-specific), and display formats, conditional
  formats and hidden columns aren't written to them (the Python app didn't either).
- Preferences only shows settings this app acts on. Interface and grid fonts, the prefetch size, the row
  limit, image previews in cells and error underline toggles aren't implemented yet.
- Extension libraries can only be added through the file dialog in Preferences.

## Licence

GPL-3.0-or-later OR MPL-2.0, like DB Browser for SQLite and the Python SQliteView. DM Sans is under the SIL
Open Font License (`resources/fonts/OFL.txt`).
