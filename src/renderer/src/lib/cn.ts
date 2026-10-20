import type { CnFunction } from 'cn'
import { createCn } from 'cn/config'

/**
 * Class joining + Tailwind conflict resolution, with our custom tokens from styles/theme.css registered.
 * Without them, `text-body-sm` would read as a colour and drop `text-foreground` (DESIGN.md "Class merging").
 */
export const cn: CnFunction = createCn({
  extend: {
    classGroups: {
      'font-size': [{ text: ['headline', 'title', 'body', 'body-sm', 'label', 'micro', 'wordmark'] }],
      rounded: [{ rounded: ['control', 'card', 'field', 'panel'] }],
      shadow: [{ shadow: ['subtle', 'float', 'modal', 'soft'] }],
    },
  },
})
