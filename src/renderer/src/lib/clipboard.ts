import { toast } from 'sonner'
import { errorMessage } from './errors'

/** Copies text and confirms with a toast naming what was copied. */
export async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${what}`)
  } catch (err) {
    toast.error(`Couldn't copy to the clipboard: ${errorMessage(err)}`)
  }
}
