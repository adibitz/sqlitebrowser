import { useEffect } from 'react'
import { setIdentifierQuoting, type EscapeQuoting } from '@shared/sqlb/identifier'
import { useSetting } from '@/store/settings'

/** SQL built in the window (dialogs, display formats) quotes names like the worker does. */
export function useIdentifierQuoting(): void {
  const quoting = useSetting('editor/identifier_quotes')
  useEffect(() => {
    if (quoting !== undefined) setIdentifierQuoting(quoting as EscapeQuoting)
  }, [quoting])
}
