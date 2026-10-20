# sqliteview

## 0.2.0

### Minor Changes

- d5ca617: Open, create and close databases, with an Explorer of tables, views, indices and triggers, table structure and schema tabs, a command palette (Ctrl+K), recent files, drag and drop, and Write/Revert for pending changes.
- d5ca617: Browse and edit table data: pagination or one scrolling list, a filter row with a filter builder and removable chips, multi-column sorting, search across columns, inline editing, new/duplicate/delete records, cell or row selection with copy and export as CSV, TSV, JSON, SQL or Markdown, row details, a cell inspector (text, JSON, hex, image) and full screen (F11).
- 794ea16: Control SQliteView from Claude Code: turn on the MCP server in Preferences → Claude Code (MCP) and copy the connect command. Claude Code can read the schema and data, open tables with filters, open and run SQL, and edit the database. Its edits stay uncommitted so Revert undoes them, and writing them to disk asks you first. The server listens on this computer only and needs a private token.
- d5ca617: First launch asks for a theme (System, Light or Dark) and whether Claude Code may control the app, then remembers the answers.
- d5ca617: Column display formats (presets such as dates from epochs, hex and upper case, or your own SQL) and conditional formats that colour cells by value, both from the column header menu. A plot panel (Ctrl+Shift+P) draws the current table or query result as lines, points or bars.
- d5ca617: Import and export: import CSV files (several at once, any common encoding) with a live preview of names and types, export tables, views or filtered rows as CSV, TSV, JSON, SQL or Markdown, export the database as an SQL script, and import SQL files, also by dropping files on the window.
- d5ca617: Save and open DB Browser for SQLite project files (.sqbpro) with the open tables, their filters and sort, and SQL editors. Command line flags open a database or project (-R read-only, -t table) and run an SQL file (-s, with -q to write and quit). A Preferences dialog (Ctrl+,) for the general, database, data browser, SQL editor and extension settings.
- d5ca617: Edit the database structure: create and modify tables (columns, keys, constraints, WITHOUT ROWID / STRICT) with a live SQL preview, create indices, delete tables, views, indices and triggers, insert a record with values, and a Database Info tab with file statistics and editable pragmas. Toasts no longer block buttons of an open dialog.
- d5ca617: Add the SQL editor: run all, the current statement or line, with error marks, paged results, INSERT … RETURNING rows, SQL files, and an SQL log.

### Patch Changes

- a6efa13: Claude Code now shows the rows you ask for in the SQliteView window (a filtered table, or a SQL editor with the results) instead of only listing them in the chat.
- d5ca617: Installers for Windows (NSIS and zip), macOS (dmg and zip) and Linux (AppImage and tar.gz). SQLite databases and .sqbpro projects open with the app, also when it is already running (and through Finder on macOS).
- d5ca617: Scrollbars are thin and only appear while the pointer is over a scrolling area, in the theme's colours.
