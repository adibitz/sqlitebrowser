import { Button } from '@/components/ui/button'

interface StartupErrorProps {
  message: string
  onRetry: () => void
}

/** Shown when the app can't read its own settings at startup. */
export function StartupError({ message, onRetry }: StartupErrorProps) {
  return (
    <main className="grid h-full place-items-center p-6">
      <div role="alert" className="flex max-w-sm flex-col items-start gap-3">
        <h1 className="text-title font-medium">Settings couldn't be loaded</h1>
        <p className="text-muted-foreground">{message}</p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </main>
  )
}
