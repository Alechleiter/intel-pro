'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const VERTICALS = [
  'All',
  'Restaurants',
  'Bars',
  'Healthcare',
  'Schools',
  'Housing',
  'Hotels',
  'Grocery',
  'Other',
] as const

export type Vertical = (typeof VERTICALS)[number]

interface VerticalTabsProps {
  selected: string
  onVerticalChange: (vertical: string) => void
  counts: Record<string, number>
}

export function VerticalTabs({
  selected,
  onVerticalChange,
  counts,
}: VerticalTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {VERTICALS.map((v) => {
        const isActive = selected === v
        const tabCount = v === 'All'
          ? Object.values(counts).reduce((a, b) => a + b, 0)
          : counts[v] ?? 0

        return (
          <button
            key={v}
            onClick={() => onVerticalChange(v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {v}
            <Badge
              variant={isActive ? 'secondary' : 'outline'}
              className="ml-0.5 h-4 min-w-[1.25rem] px-1 text-[10px]"
            >
              {tabCount}
            </Badge>
          </button>
        )
      })}
    </div>
  )
}
