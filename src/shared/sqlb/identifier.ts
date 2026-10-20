// Port of reference/sqliteview/core/sqlb.py (identifier quoting, escape_string, ObjectIdentifier).

export enum EscapeQuoting {
  DoubleQuotes = 0,
  GraveAccents = 1,
  SquareBrackets = 2,
}

let customQuoting = EscapeQuoting.DoubleQuotes

/** Sets the quote style used by every generated statement ('editor/identifier_quotes'). */
export function setIdentifierQuoting(quoting: EscapeQuoting): void {
  customQuoting = quoting
}

/** The only way names reach generated SQL. */
export function escapeIdentifier(identifier: string): string {
  if (customQuoting === EscapeQuoting.GraveAccents) return '`' + identifier.replaceAll('`', '``') + '`'
  // No escaping is possible inside square brackets (same as upstream).
  if (customQuoting === EscapeQuoting.SquareBrackets) return '[' + identifier + ']'
  return '"' + identifier.replaceAll('"', '""') + '"'
}

export function escapeIdentifiers(ids: readonly string[]): string[] {
  return ids.map(escapeIdentifier)
}

export function escapeString(literal: string): string {
  return "'" + literal.replaceAll("'", "''") + "'"
}

/** schema + name of a database object. */
export class ObjectIdentifier {
  constructor(
    readonly schema: string = 'main',
    readonly name: string = '',
  ) {}

  isEmpty(): boolean {
    return !this.name
  }

  toString(shortName = false): string {
    if (shortName && this.schema === 'main') return escapeIdentifier(this.name)
    return escapeIdentifier(this.schema) + '.' + escapeIdentifier(this.name)
  }

  toDisplayString(): string {
    return this.schema === 'main' ? this.name : `${this.schema}.${this.name}`
  }

  /** Format used in .sqbpro project files: "<len(schema)>,<len(name)>:<schema><name>". */
  toSerialised(): string {
    return `${this.schema.length},${this.name.length}:${this.schema}${this.name}`
  }

  static fromSerialised(serialised: string): ObjectIdentifier | null {
    const colon = serialised.indexOf(':')
    if (colon < 0) return null
    const sizes = serialised.slice(0, colon).split(',')
    const rest = serialised.slice(colon + 1)
    if (sizes.length !== 2 || !sizes.every((s) => /^\d+$/.test(s))) return null
    const schemaLen = Number(sizes[0])
    const nameLen = Number(sizes[1])
    if (schemaLen + nameLen !== rest.length) return null
    return new ObjectIdentifier(rest.slice(0, schemaLen), rest.slice(schemaLen))
  }

  equals(other: ObjectIdentifier): boolean {
    return this.schema === other.schema && this.name === other.name
  }
}
