'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { CheckIcon, Loader2Icon } from 'lucide-react'

const VERTICALS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Verticals' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar', label: 'Bar' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'liquor', label: 'Liquor' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'assisted_living', label: 'Assisted Living' },
  { value: 'school', label: 'School' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'housing', label: 'Housing' },
  { value: 'other', label: 'Other' },
]

interface ReviewToolbarProps {
  total: number
  visibleCount: number
  verticalFilter: string
  onVerticalFilterChange: (vertical: string) => void
  onApproveAll: () => Promise<void>
  isApproving: boolean
}

export function ReviewToolbar({
  total,
  visibleCount,
  verticalFilter,
  onVerticalFilterChange,
  onApproveAll,
  isApproving,
}: ReviewToolbarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleConfirmApproveAll = async () => {
    await onApproveAll()
    setConfirmOpen(false)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium">
          <span className="text-lg font-semibold tabular-nums">{total}</span>{' '}
          <span className="text-muted-foreground">
            {total === 1 ? 'item needs' : 'items need'} review
          </span>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={verticalFilter} onValueChange={(value) => { if (value !== null) onVerticalFilterChange(value) }}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by vertical" />
          </SelectTrigger>
          <SelectContent>
            {VERTICALS.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="default"
                disabled={visibleCount === 0 || isApproving}
              />
            }
          >
            {isApproving ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <CheckIcon className="size-4" />
            )}
            Approve All Visible ({visibleCount})
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve all visible items?</DialogTitle>
              <DialogDescription>
                This will approve {visibleCount}{' '}
                {visibleCount === 1 ? 'item' : 'items'} currently shown in the
                table. Each will be set to &quot;active&quot; with their current
                classification. This action cannot be easily undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button
                onClick={handleConfirmApproveAll}
                disabled={isApproving}
              >
                {isApproving ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckIcon className="size-4" />
                )}
                Approve {visibleCount} {visibleCount === 1 ? 'item' : 'items'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
