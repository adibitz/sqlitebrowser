import { useState } from 'react'
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { NEW_RULE_BACKGROUND, neverMatches, ruleColors, type CondFormat } from '@shared/format/condFormat'
import { ColorField } from '@/components/ColorField'
import { TooltipIconButton } from '@/components/TooltipIconButton'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/cn'
import { useModalStore } from '@/store/modals'
import { useSetting } from '@/store/settings'
import { useTabsStore } from '@/store/tabs'
import { browseOf } from './browseOf'

interface CondFormatDialogProps {
  tabId: string
  column: string
}

function move<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (item !== undefined) next.splice(to, 0, item)
  return next
}

/** Colour cells by their value (port of dialogs/cond_format.py). The first matching rule wins. */
export function CondFormatDialog({ tabId, column }: CondFormatDialogProps) {
  const close = useModalStore((s) => s.close)
  const escape = useSetting('databrowser/filter_escape') ?? '\\'
  const [rules, setRules] = useState<CondFormat[]>(() => browseOf(tabId)?.condFormats[column] ?? [])
  const [selected, setSelected] = useState(-1)
  const bad = rules.find((r) => neverMatches(r.filter, escape))

  const update = (index: number, patch: Partial<CondFormat>): void =>
    setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  const shift = (delta: number): void => {
    setRules(move(rules, selected, selected + delta))
    setSelected(selected + delta)
  }

  const save = (): void => {
    const browse = browseOf(tabId)
    if (browse) {
      // Rules without any colour do nothing, like upstream.
      const kept = rules.map((r) => ({ ...r, filter: r.filter.trim() })).filter((r) => r.fg || r.bg)
      const condFormats = { ...browse.condFormats }
      if (kept.length) condFormats[column] = kept
      else delete condFormats[column]
      useTabsStore.getState().updateBrowse(tabId, { condFormats })
    }
    close()
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conditional formats of {column}</DialogTitle>
          <DialogDescription>
            Conditions use the filter syntax: text, =value, &lt;&gt;value, &gt;n, &lt;n, a~b, /regex/. An
            empty condition matches every value. The first matching rule wins.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setRules([...rules, { filter: '', fg: '', bg: NEW_RULE_BACKGROUND }])
              setSelected(rules.length)
            }}
          >
            <PlusIcon /> Add rule
          </Button>
          <TooltipIconButton
            label="Remove rule"
            disabled={selected < 0}
            onClick={() => {
              setRules(rules.filter((_, i) => i !== selected))
              setSelected(-1)
            }}
          >
            <Trash2Icon />
          </TooltipIconButton>
          <TooltipIconButton label="Move rule up" disabled={selected <= 0} onClick={() => shift(-1)}>
            <ArrowUpIcon />
          </TooltipIconButton>
          <TooltipIconButton
            label="Move rule down"
            disabled={selected < 0 || selected >= rules.length - 1}
            onClick={() => shift(1)}
          >
            <ArrowDownIcon />
          </TooltipIconButton>
        </div>
        {rules.length > 0 && (
          <div aria-hidden className="-mb-2 flex gap-3 px-3 text-micro text-muted-foreground">
            <span className="flex-1">Condition</span>
            <span className="w-35">Text</span>
            <span className="w-35">Background</span>
          </div>
        )}
        <ol aria-label="Rules" className="min-h-24 overflow-y-auto rounded-card border">
          {rules.length === 0 && (
            <li className="px-3 py-6 text-center text-muted-foreground">
              No rules yet. Add one to colour cells.
            </li>
          )}
          {rules.map((rule, i) => (
            <li
              key={i}
              aria-selected={i === selected}
              className={cn(
                'flex items-center gap-3 border-b px-3 py-2 last:border-b-0',
                i === selected && 'bg-surface-2',
              )}
              onFocus={() => setSelected(i)}
              onPointerDown={() => setSelected(i)}
            >
              <Input
                aria-label={`Condition of rule ${i + 1}`}
                className="h-8 flex-1 font-mono"
                placeholder="every value"
                style={ruleColors(rule)}
                value={rule.filter}
                onChange={(e) => update(i, { filter: e.target.value })}
              />
              <ColorField
                label={`Text colour of rule ${i + 1}`}
                value={rule.fg}
                onChange={(fg) => update(i, { fg })}
              />
              <ColorField
                label={`Background of rule ${i + 1}`}
                value={rule.bg}
                onChange={(bg) => update(i, { bg })}
              />
            </li>
          ))}
        </ol>
        <DialogFooter className="items-center">
          <p role="alert" className="mr-auto text-label text-destructive">
            {bad ? `Condition “${bad.filter}” never matches anything.` : ''}
          </p>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={save}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
