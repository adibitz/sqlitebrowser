// Port of the file-format tests of reference/tests/test_project.py.
import { describe, expect, it } from 'vitest'
import {
  emptyProject,
  projectFileName,
  projectFromXml,
  projectToXml,
  ProjectError,
  type Project,
} from '@shared/project/sqbpro'
import { parseXml, writeXml, XmlError } from '@shared/project/xmlLite'

const CUSTOMERS = { schema: 'main', name: 'customers' }

// What DB Browser for SQLite 3.13 writes (shortened): no whitespace between elements.
const UPSTREAM_PROJECT =
  '<?xml version="1.0" encoding="UTF-8"?><sqlb_project>' +
  '<db path="demo.db" readonly="1" foreign_keys="1" case_sensitive_like="0" temp_store="0" wal_autocheckpoint="1000" ' +
  'synchronous="2"/>' +
  '<attached><db schema="extra" path="C:/data/extra.db"/></attached>' +
  '<window><main_tabs open="structure browser pragmas query" current="1"/></window>' +
  '<tab_structure><column_width id="0" width="300"/><expanded_item id="0" parent="-1"/></tab_structure>' +
  '<tab_browse><table title="customers" custom_title="0" dock_id="1" table="4,9:maincustomers"/>' +
  '<table title="order_summary" custom_title="0" dock_id="2" table="4,13:mainorder_summary"/>' +
  '<dock_state state="000000ff"/><default_encoding codec=""/>' +
  '<browse_table_settings>' +
  '<table schema="main" name="customers" show_row_id="0" encoding="" plot_x_axis="" unlock_view_pk="_rowid_" ' +
  'freeze_columns="0"><sort><column index="1" mode="1"/></sort>' +
  '<column_widths><column index="2" value="180"/></column_widths>' +
  '<filter_values><column index="3" value="=IN"/></filter_values>' +
  '<conditional_formats/><row_id_formats/><display_formats/><hidden_columns/><plot_y_axes/>' +
  '<global_filter><filter value="Sharma"/></global_filter></table>' +
  '<table schema="main" name="order_summary" show_row_id="0" encoding="" plot_x_axis="" unlock_view_pk="customer" ' +
  'freeze_columns="0"><sort/><column_widths/><filter_values/><conditional_formats/><row_id_formats/>' +
  '<display_formats/><hidden_columns/><plot_y_axes/><global_filter/></table>' +
  '</browse_table_settings></tab_browse>' +
  '<tab_sql><sql name="Report">SELECT 1;\nSELECT 2;</sql>' +
  '<sql name="linked.sql" filename="C:/q/linked.sql">-- Reference to file "C:/q/linked.sql" (not supported by this ' +
  'version) --</sql><current_tab id="1"/></tab_sql>' +
  '</sqlb_project>'

describe('sqbpro project files', () => {
  it('reads what upstream writes', () => {
    const p = projectFromXml(UPSTREAM_PROJECT)
    expect(p.dbPath).toBe('demo.db')
    expect(p.readOnly).toBe(true)
    expect(p.pragmas).toEqual({
      foreign_keys: '1',
      case_sensitive_like: '0',
      temp_store: '0',
      wal_autocheckpoint: '1000',
      synchronous: '2',
    })
    expect(p.attached).toEqual([['extra', 'C:/data/extra.db']])
    expect(p.tables).toEqual([CUSTOMERS, { schema: 'main', name: 'order_summary' }])
    expect(p.tableSettings[0]).toEqual({
      table: CUSTOMERS,
      settings: {
        sort: [[1, 1]],
        filters: { 3: '=IN' },
        columnWidths: { 2: 180 },
        globalFilters: ['Sharma'],
        unlockViewPk: '_rowid_',
      },
    })
    expect(p.tableSettings[1]!.settings.unlockViewPk).toBe('customer')
    expect(p.sqlTabs).toEqual([
      { name: 'Report', text: 'SELECT 1;\nSELECT 2;', filename: '' },
      { name: 'linked.sql', text: '', filename: 'C:/q/linked.sql' },
    ])
    expect(p.currentSqlTab).toBe(1)
    expect(p.documents).toEqual([])
    expect(p.currentDocument).toBe(-1)
  })

  it('reads the old <current_table> element', () => {
    const p = projectFromXml(
      '<sqlb_project><db path="a.db"/><tab_browse><current_table name="main.t1"/></tab_browse></sqlb_project>',
    )
    expect(p.tables).toEqual([{ schema: 'main', name: 't1' }])
  })

  it('round-trips, writing XML upstream can read', () => {
    const view = { schema: 'aux', name: 'we"ird, view' }
    const p: Project = {
      ...emptyProject(),
      dbPath: 'demo.db',
      readOnly: true,
      pragmas: { foreign_keys: '1' },
      attached: [['extra', 'C:/x & y/extra.db']],
      tables: [CUSTOMERS, view],
      tableSettings: [
        {
          table: CUSTOMERS,
          settings: {
            sort: [
              [1, 1],
              [0, 0],
            ],
            filters: { 2: '<>NULL', 3: 'a<b' },
            globalFilters: ['x', '/a b/'],
            columnWidths: { 1: 50, 2: 120 },
            unlockViewPk: '_rowid_',
          },
        },
        {
          table: view,
          settings: { sort: [], filters: {}, globalFilters: [], columnWidths: {}, unlockViewPk: 'id' },
        },
      ],
      sqlTabs: [
        { name: 'Q <1>', text: "SELECT '&';\n  -- tab\tend\n", filename: '' },
        { name: 'f.sql', text: '', filename: 'C:/f.sql' },
      ],
      currentSqlTab: 1,
      documents: [
        { kind: 'sql', index: 1 },
        { kind: 'table', index: 0 },
        { kind: 'info', index: 0 },
        { kind: 'table', index: 1 },
        { kind: 'sql', index: 0 },
      ],
      currentDocument: 3,
    }
    const text = projectToXml(p)
    expect(
      text.startsWith('<?xml version="1.0" encoding="UTF-8"?><sqlb_project><db path="demo.db" readonly="1"'),
    ).toBe(true)
    expect(text).toContain('><window><main_tabs ')
    expect(text).not.toMatch(/>\s+</)
    expect(text).toContain('<main_tabs open="structure browser pragmas query" current="1"')
    expect(projectFromXml(text)).toEqual(p)
  })

  it('rejects files that are not projects', () => {
    for (const text of ['', '<not-closed', "<?xml version='1.0'?><something/>"]) {
      expect(() => projectFromXml(text)).toThrow(ProjectError)
    }
  })

  it('adds the extension unless it is there', () => {
    expect(projectFileName('a/b')).toBe('a/b.sqbpro')
    expect(projectFileName('a/b.SQBPRO')).toBe('a/b.SQBPRO')
  })
})

describe('xml', () => {
  it('reads entities, character references, CDATA and comments, and normalises line breaks', () => {
    const root = parseXml(
      '<?xml version="1.0"?><!-- c --><a x="1 &amp; &#65;&#x42;"><b>t&lt;\r\n<![CDATA[<raw>]]></b><c/></a>',
    )
    expect(root.attrs.x).toBe('1 & AB')
    expect(root.children[0]!.text).toBe('t<\n<raw>')
    expect(root.children.map((c) => c.tag)).toEqual(['b', 'c'])
  })

  it('keeps line breaks in attributes through a round trip', () => {
    const el = { tag: 'a', attrs: { v: 'x\ny\t"z"' }, children: [], text: '' }
    expect(parseXml(writeXml(el)).attrs.v).toBe('x\ny\t"z"')
  })

  it('reports broken documents', () => {
    for (const text of ['<a>', '<a></b>', '<a x=1/>', '<a/><b/>', '<a>&nope;</a>']) {
      expect(() => parseXml(text)).toThrow(XmlError)
    }
  })
})
