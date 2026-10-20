import type { SchemaInfo, TableInfo } from '@shared/types/schema'

export function table(
  name: string,
  kind: TableInfo['kind'] = 'table',
  columns: string[] = ['id'],
): TableInfo {
  return {
    schema: 'main',
    name,
    kind,
    columns: columns.map((c, i) => ({
      name: c,
      type: 'INTEGER',
      notNull: false,
      primaryKey: i === 0,
      unique: false,
      defaultValue: '',
      check: '',
      collation: '',
      foreignKey: null,
      generated: null,
    })),
    sql: `CREATE TABLE ${name} (${columns.join(', ')})`,
    withoutRowid: false,
    rowidColumns: ['_rowid_'],
    autoIncrement: false,
  }
}

export const SCHEMA: SchemaInfo[] = [
  {
    name: 'main',
    tables: [
      table('orders', 'table', ['id', 'customer_id']),
      table('Customers', 'table', ['id', 'email']),
      { ...table('summary', 'view'), sql: 'CREATE VIEW summary AS SELECT 1' },
      { ...table('sqlite_master', 'system'), sql: '' },
    ],
    indices: [
      { schema: 'main', name: 'idx_auto', table: 'orders', unique: true, columns: [], where: '', sql: '' },
      {
        schema: 'main',
        name: 'idx_cust',
        table: 'orders',
        unique: false,
        columns: ['customer_id'],
        where: '',
        sql: 'CREATE INDEX idx_cust ON orders(customer_id)',
      },
    ],
    triggers: [
      {
        schema: 'main',
        name: 'trg',
        table: 'Customers',
        sql: 'CREATE TRIGGER trg AFTER INSERT ON Customers BEGIN SELECT 1; END',
      },
    ],
  },
  {
    name: 'temp',
    tables: [{ ...table('sqlite_temp_master', 'system'), schema: 'temp', sql: '' }],
    indices: [],
    triggers: [],
  },
]
