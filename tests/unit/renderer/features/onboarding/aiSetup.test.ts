import { describe, expect, it } from 'vitest'
import {
  initialAiDraft,
  validateAiDraft,
  withKind,
} from '../../../../../src/renderer/src/features/onboarding/aiSetup'

describe('validateAiDraft', () => {
  it('saves nothing when the assistant stays off', () => {
    expect(validateAiDraft(initialAiDraft)).toEqual({ ok: true, request: null })
  })

  it('requires an API key for Claude', () => {
    const result = validateAiDraft({ ...initialAiDraft, enabled: true })
    expect(result).toEqual({ ok: false, errors: { apiKey: expect.stringContaining('API key') } })
  })

  it('builds a Claude provider with the default model', () => {
    const result = validateAiDraft({ ...initialAiDraft, enabled: true, apiKey: '  sk-ant-x  ' })
    expect(result).toEqual({
      ok: true,
      request: {
        kind: 'anthropic',
        name: 'Claude',
        baseUrl: null,
        apiKey: 'sk-ant-x',
        defaultModel: 'claude-sonnet-5-5',
      },
    })
  })

  it('requires a valid server address and a model for OpenAI-compatible servers', () => {
    const draft = withKind({ ...initialAiDraft, enabled: true }, 'openai_compatible')
    expect(validateAiDraft(draft)).toEqual({
      ok: false,
      errors: { baseUrl: expect.any(String), model: expect.any(String) },
    })
    expect(validateAiDraft({ ...draft, baseUrl: 'localhost:11434', model: 'llama3.1' })).toEqual({
      ok: false,
      errors: { baseUrl: expect.stringContaining('http://') },
    })
  })

  it('accepts a local server without an API key and names it after the host', () => {
    const draft = withKind({ ...initialAiDraft, enabled: true }, 'openai_compatible')
    const result = validateAiDraft({ ...draft, baseUrl: 'http://localhost:11434/v1', model: 'llama3.1' })
    expect(result).toEqual({
      ok: true,
      request: {
        kind: 'openai_compatible',
        name: 'localhost:11434',
        baseUrl: 'http://localhost:11434/v1',
        apiKey: null,
        defaultModel: 'llama3.1',
      },
    })
  })

  it('resets the model when switching provider', () => {
    expect(withKind({ ...initialAiDraft, model: 'custom' }, 'openai_compatible').model).toBe('')
    expect(withKind(initialAiDraft, 'anthropic').model).toBe('claude-sonnet-5-5')
  })
})
