import { describe, expect, it } from 'vitest'
import { browseToSettings, settingsToBrowse } from '@/features/project/browseSettings'
import type { BrowseState } from '@/store/tabs'

const columns = ['id', 'name', 'email', 'country']

function browseState(patch: Partial<BrowseState>): BrowseState {
  return {
    filters: {},
    globalFilter: '',
    sort: [],
    pageSize: 100,
    page: 3,
    hiddenColumns: [],
    columnWidths: {},
    pseudoPk: [],
    rowSelection: false,
    displayFormats: {},
    condFormats: {},
    ...patch,
  }
}

describe('project browse settings', () => {
  it('stores columns by position, as upstream does', () => {
    const browse = browseState({
      filters: { country: '=IN', gone: 'x' },
      sort: [{ column: 'name', direction: 'desc' }],
      globalFilter: 'a /b c/',
      columnWidths: { email: 222, country: 90 },
      hiddenColumns: ['country'],
    })
    expect(browseToSettings(browse, columns)).toEqual({
      sort: [[1, 1]],
      filters: { 3: '=IN' },
      globalFilters: ['a', '/b c/'],
      columnWidths: { 3: 222 },
      unlockViewPk: '_rowid_',
    })
  })

  it('restores names from positions and ignores columns the table no longer has', () => {
    const settings = {
      sort: [
        [1, 1],
        [9, 0],
      ] as [number, number][],
      filters: { 3: '=IN', 7: 'x' },
      globalFilters: ['a'],
      columnWidths: { 3: 222, 0: 50 },
      unlockViewPk: 'id',
    }
    expect(settingsToBrowse(settings, columns)).toEqual({
      sort: [{ column: 'name', direction: 'desc' }],
      filters: { country: '=IN' },
      globalFilter: 'a',
      columnWidths: { email: 222 },
      pseudoPk: ['id'],
      page: 0,
    })
    expect(settingsToBrowse({ ...settings, unlockViewPk: 'nope' }, columns).pseudoPk).toEqual([])
  })
})
