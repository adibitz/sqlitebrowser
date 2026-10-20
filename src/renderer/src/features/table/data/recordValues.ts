// Port of AddRecordDialog._statement: which columns an inserted record sets, and its preview.
import { expandSql } from '@shared/sql/expandSql'
import { insertStatement } from '@shared/sql/insertStatement'
import { typedValue } from '@shared/sql/typedValue'
import { Field } from '@shared/sqlb/field'
import type { ColumnInfo, ObjectRef } from '@shared/types/schema'

/** Empty text leaves a column to its default; NULL (any case) is NULL; anything else is typed text. */
export function recordValues(
  columns: readonly string[],
  texts: readonly string[],
): Record<string, string | null> {
  const values: Record<string, string | null> = {}
  columns.forEach((name, i) => {
    const text = texts[i] ?? ''
    if (text === '') return
    values[name] = text.toUpperCase() === 'NULL' ? null : text
  })
  return values
}

/** The INSERT as it will be logged, with values typed like the worker types them. */
export function insertPreview(
  table: ObjectRef,
  columns: readonly ColumnInfo[],
  values: Record<string, string | null>,
): string {
  const names = Object.keys(values)
  const params = names.map((name) => {
    const info = columns.find((c) => c.name === name)
    return typedValue(
      info ? new Field(info.name, info.type) : null,
      info?.primaryKey ?? false,
      values[name] ?? null,
    )
  })
  return expandSql(insertStatement(table, names), params)
}
