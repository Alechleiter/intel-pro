'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TableIcon, MapIcon, ColumnsIcon } from 'lucide-react'

export type ViewMode = 'table' | 'map' | 'split'

interface ViewToggleProps {
  view: ViewMode
  onViewChange: (view: ViewMode) => void
}

const views: { value: ViewMode; label: string; icon: typeof TableIcon }[] = [
  { value: 'table', label: 'Table', icon: TableIcon },
  { value: 'map', label: 'Map', icon: MapIcon },
  { value: 'split', label: 'Split', icon: ColumnsIcon },
]

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted p-0.5">
      {views.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant="ghost"
          size="sm"
          className={cn(
            'gap-1.5 rounded-md px-3',
            view === value &&
              'bg-background text-foreground shadow-sm hover:bg-background'
          )}
          onClick={() => onViewChange(value)}
        >
          <Icon className="size-3.5" />
          {label}
        </Button>
      ))}
    </div>
  )
}
