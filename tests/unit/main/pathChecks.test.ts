import { describe, expect, it } from 'vitest'
import { approveExtensionPath, requireApprovedExtensions } from '../../../src/main/pathChecks'

describe('extension list guard', () => {
  it('accepts libraries already listed or picked in the dialog, and refuses others', () => {
    const listed = ['C:/ext/known.dll']
    expect(() => requireApprovedExtensions([...listed], listed)).not.toThrow()
    expect(() => requireApprovedExtensions([], listed)).not.toThrow()
    expect(() => requireApprovedExtensions([...listed, 'C:/evil/payload.dll'], listed)).toThrow(
      /extension dialog/,
    )
    approveExtensionPath('C:/ext/picked.dll')
    expect(() => requireApprovedExtensions([...listed, 'C:/ext/picked.dll'], listed)).not.toThrow()
  })
})
