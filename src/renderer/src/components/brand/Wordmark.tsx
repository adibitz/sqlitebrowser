import { cn } from '@/lib/cn'

/** The app name in the one 800-weight style DESIGN.md allows per view. */
export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('text-wordmark font-extrabold', className)}>SQliteView</span>
}
