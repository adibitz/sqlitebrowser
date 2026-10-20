// Port of reference/sqliteview/core/filters.py (upstream CondFormat::filterToSqlCondition, GlobalFilter).
//
// Filter syntax (identical to DB4S):
//   text      -> LIKE '%text%'   (unless the text already contains %)
//   =val      -> = 'val'         (=NULL -> IS NULL)
//   <>val     -> <> 'val'        (<>NULL -> IS NOT NULL, <>'' -> <> '')
//   >val, <val, >=val, <=val
//   a~b       -> BETWEEN a AND b (numeric, a < b)
//   /regex/   -> REGEXP 'regex'
//
// Pure: the worker turns filters into SQL, the renderer uses the builder helpers.

function escapeString(literal: string): string {
  return "'" + literal.replaceAll("'", "''") + "'"
}

const FLOAT_RE = /^[+-]?(?:\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|inf(?:inity)?|nan)$/i

/** What Python's float() accepts (surrounding whitespace allowed). */
export function isNumber(s: string): boolean {
  return FLOAT_RE.test(s.trim())
}

export function filterToSqlCondition(value: string, escapeCharacter = '\\'): string {
  if (!value) return ''
  let op = 'LIKE'
  let val = ''
  let val2 = ''
  let escape = ''
  let numeric = false
  let ok = false

  const tilde = value.indexOf('~')
  if (tilde >= 0) {
    val = value.slice(0, tilde)
    val2 = value.slice(tilde + 1)
    if (isNumber(val) && isNumber(val2)) ok = Number(val) < Number(val2)
  }
  if (ok) {
    op = 'BETWEEN'
    numeric = true
  } else {
    val = ''
    val2 = ''
    const head2 = value.slice(0, 2)
    if (head2 === '>=' || head2 === '<=' || head2 === '<>') {
      if (head2 === '<>' && value.slice(2) === 'NULL') {
        op = 'IS NOT'
        numeric = true
        val = 'NULL'
      } else if (head2 === '<>' && value.slice(2) === "''") {
        op = '<>'
        numeric = true
        val = "''"
      } else {
        op = head2
        val = value.slice(2)
        numeric = isNumber(val)
      }
    } else if (value[0] === '<' || value[0] === '>') {
      op = value[0]
      val = value.slice(1)
      numeric = isNumber(val)
    } else if (value[0] === '=') {
      val = value.slice(1)
      if (val !== 'NULL') {
        op = '='
      } else {
        op = 'IS'
        numeric = true
      }
    } else if (value[0] === '/' && value.endsWith('/') && value.length > 2) {
      val = value.slice(1, -1)
      op = 'REGEXP'
    } else {
      let esc = escapeCharacter
      if (esc === "'") esc = "''"
      if (esc) escape = `ESCAPE '${esc}'`
      if (!value.includes('%')) val = '%' + value + '%'
    }
  }

  if (!val) val = value
  if (!val || val === '%' || val === '%%') return ''
  if (!numeric && val !== "''") val = escapeString(val)
  let clause = `${op} ${val}`
  if (val2) clause += ` AND ${val2}`
  if (escape) clause += ' ' + escape
  return clause
}

function legacyTokenize(value: string): string[] {
  return value
    .trim()
    .split(' ')
    .filter((v) => v)
}

/** Splits a global filter into terms; a /regex with spaces/ stays one term. */
export function tokenizeGlobalFilter(value: string): string[] {
  const filters: string[] = []
  let pos = 0
  const n = value.length
  while (pos < n) {
    while (pos < n && value[pos] === ' ') pos++
    if (pos === n) break
    const start = pos
    if (value[start] !== '/') {
      while (pos < n && value[pos] !== ' ') pos++
      filters.push(value.slice(start, pos))
      continue
    }
    let found = false
    pos = start + 1
    while (pos < n) {
      if (value[pos] !== '/') {
        pos++
        continue
      }
      let backslashes = 0
      let p = pos - 1
      while (p >= start && value[p] === '\\') {
        backslashes++
        p--
      }
      const unescaped = backslashes % 2 === 0
      const atEnd = pos + 1 === n || value[pos + 1] === ' '
      if (unescaped && !atEnd) return legacyTokenize(value)
      if (unescaped) {
        filters.push(value.slice(start, pos + 1))
        pos++
        found = true
        break
      }
      pos++
    }
    if (!found) return legacyTokenize(value)
  }
  return filters
}

// ---------------------------------------------------------------- filter builder

export const FILTER_OPERATORS = [
  { key: 'contains', label: 'contains', values: 1 },
  { key: 'equals', label: 'equals', values: 1 },
  { key: 'not_equals', label: 'does not equal', values: 1 },
  { key: 'starts', label: 'starts with', values: 1 },
  { key: 'ends', label: 'ends with', values: 1 },
  { key: 'gt', label: 'greater than', values: 1 },
  { key: 'ge', label: 'greater than or equal', values: 1 },
  { key: 'lt', label: 'less than', values: 1 },
  { key: 'le', label: 'less than or equal', values: 1 },
  { key: 'between', label: 'between (numbers)', values: 2 },
  { key: 'regex', label: 'matches regular expression', values: 1 },
  { key: 'empty', label: 'is empty text', values: 0 },
  { key: 'not_empty', label: 'is not empty text', values: 0 },
  { key: 'null', label: 'is NULL', values: 0 },
  { key: 'not_null', label: 'is not NULL', values: 0 },
] as const

export type FilterOperator = (typeof FILTER_OPERATORS)[number]['key']

const PREFIXES: Partial<Record<FilterOperator, string>> = {
  equals: '=',
  not_equals: '<>',
  gt: '>',
  ge: '>=',
  lt: '<',
  le: '<=',
}

const SPECIAL_TEXT: Partial<Record<FilterOperator, string>> = {
  empty: "=''",
  not_empty: "<>''",
  null: '=NULL',
  not_null: '<>NULL',
}

/** Filter-row text for an operator chosen in the filter builder ('' clears the filter). */
export function buildFilterText(op: FilterOperator, value = '', value2 = ''): string {
  if (op === 'contains') return value
  const prefix = PREFIXES[op]
  if (prefix !== undefined) return value ? prefix + value : ''
  if (op === 'starts') return value ? value + '%' : ''
  if (op === 'ends') return value ? '%' + value : ''
  if (op === 'between') return value && value2 ? `${value}~${value2}` : ''
  if (op === 'regex') return value ? `/${value}/` : ''
  return SPECIAL_TEXT[op] ?? ''
}

/** Best-effort inverse of buildFilterText (pre-fills the builder). */
export function parseFilterText(text: string): [FilterOperator, string, string] {
  if (!text) return ['contains', '', '']
  for (const [op, special] of Object.entries(SPECIAL_TEXT)) {
    if (text === special) return [op as FilterOperator, '', '']
  }
  const tilde = text.indexOf('~')
  if (tilde >= 0) {
    const a = text.slice(0, tilde)
    const b = text.slice(tilde + 1)
    if (isNumber(a) && isNumber(b)) return ['between', a, b]
  }
  if (text.length > 2 && text.startsWith('/') && text.endsWith('/')) return ['regex', text.slice(1, -1), '']
  const ordered: [string, FilterOperator][] = [
    ['>=', 'ge'],
    ['<=', 'le'],
    ['<>', 'not_equals'],
    ['>', 'gt'],
    ['<', 'lt'],
    ['=', 'equals'],
  ]
  for (const [prefix, op] of ordered) if (text.startsWith(prefix)) return [op, text.slice(prefix.length), '']
  const percents = text.split('%').length - 1
  if (text.endsWith('%') && percents === 1) return ['starts', text.slice(0, -1), '']
  if (text.startsWith('%') && percents === 1) return ['ends', text.slice(1), '']
  return ['contains', text, '']
}

/** Human-readable filter, e.g. '>5' -> '> 5', 'abc' -> 'contains “abc”'. */
export function describeFilter(text: string): string {
  const [op, v, v2] = parseFilterText(text)
  if (op === 'contains' && v.includes('%')) return `like “${v}”`
  const labels: Record<FilterOperator, string> = {
    contains: `contains “${v}”`,
    equals: `= ${v}`,
    not_equals: `≠ ${v}`,
    starts: `starts with “${v}”`,
    ends: `ends with “${v}”`,
    gt: `> ${v}`,
    ge: `≥ ${v}`,
    lt: `< ${v}`,
    le: `≤ ${v}`,
    between: `between ${v} and ${v2}`,
    regex: `matches /${v}/`,
    empty: 'is empty',
    not_empty: 'is not empty',
    null: 'is NULL',
    not_null: 'is not NULL',
  }
  return labels[op]
}
