/**
 * A SQLite value as it crosses process boundaries. INTEGER is a bigint (exact for all 64-bit values),
 * REAL a number, BLOB a Uint8Array.
 */
export type SqlValue = null | bigint | number | string | Uint8Array

/** A cell value as JSON can carry it (64-bit integers beyond 2^53 become text, BLOBs a note). */
export type JsonCell = string | number | boolean | null
