'use client'

import { useState } from 'react'
import { ChainTable } from '@/components/chains/chain-table'
import { ChainDetail } from '@/components/chains/chain-detail'

export default function ChainsPage() {
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Chain Analysis</h2>
        <p className="mt-1 text-muted-foreground">
          Rank and analyze ownership chains by site count. Click a chain to view details.
        </p>
      </div>

      <ChainTable onSelectChain={(id) => setSelectedChainId(id)} />

      <ChainDetail
        chainId={selectedChainId}
        onClose={() => setSelectedChainId(null)}
      />
    </div>
  )
}
