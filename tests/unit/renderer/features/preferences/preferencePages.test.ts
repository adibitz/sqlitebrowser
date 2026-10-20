import { describe, expect, it } from 'vitest'
import { settingsSchema } from '@shared/settings/schema'
import { PREFERENCE_KEYS, PREFERENCE_PAGES } from '@/features/preferences/preferencePages'

describe('preference pages', () => {
  it('show each setting once, and only settings that exist', () => {
    expect(new Set(PREFERENCE_KEYS).size).toBe(PREFERENCE_KEYS.length)
    for (const key of PREFERENCE_KEYS) expect(settingsSchema.shape).toHaveProperty([key])
  })

  it('offer choices and ranges the settings accept, defaults included', () => {
    for (const page of PREFERENCE_PAGES) {
      for (const field of page.fields) {
        const schema = settingsSchema.shape[field.key]
        if (field.kind === 'choice') {
          for (const c of field.choices) expect(schema.safeParse(c.value).success).toBe(true)
        }
        if (field.kind === 'int') {
          expect(schema.safeParse(field.min).success).toBe(true)
          expect(schema.safeParse(field.max).success).toBe(true)
          const fallback = schema.parse(undefined) as number
          expect(fallback).toBeGreaterThanOrEqual(field.min)
          expect(fallback).toBeLessThanOrEqual(field.max)
        }
      }
    }
  })
})
