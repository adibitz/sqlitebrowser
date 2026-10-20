/**
 * A SQLite value as it crosses process boundaries. INTEGER is a bigint (exact for all 64-bit values),
 * REAL a number, BLOB a Uint8Array.
 */
export type SqlValue = null | bigint | number | string | Uint8Array
