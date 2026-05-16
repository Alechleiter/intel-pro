'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { SiteRow } from './site-table'

// Vertical color mapping
const VERTICAL_COLORS: Record<string, string> = {
  restaurant: '#ef4444',
  restaurants: '#ef4444',
  bar: '#a855f7',
  bars: '#a855f7',
  hotel: '#3b82f6',
  hotels: '#3b82f6',
  grocery: '#22c55e',
  healthcare: '#14b8a6',
  school: '#f97316',
  schools: '#f97316',
  housing: '#a16207',
  assisted_living: '#ec4899',
  other: '#6b7280',
}

function getMarkerColor(vertical: string): string {
  const key = vertical.toLowerCase()
  return VERTICAL_COLORS[key] ?? VERTICAL_COLORS.other
}

// Legend entries (deduplicated display names)
const LEGEND_ENTRIES = [
  { label: 'Restaurants', color: '#ef4444' },
  { label: 'Bars', color: '#a855f7' },
  { label: 'Hotels', color: '#3b82f6' },
  { label: 'Grocery', color: '#22c55e' },
  { label: 'Healthcare', color: '#14b8a6' },
  { label: 'Schools', color: '#f97316' },
  { label: 'Housing', color: '#a16207' },
  { label: 'Assisted Living', color: '#ec4899' },
  { label: 'Other', color: '#6b7280' },
]

interface SiteMapInnerProps {
  sites: SiteRow[]
}

// The actual map component -- only rendered on the client
function SiteMapInner({ sites }: SiteMapInnerProps) {
  const [leafletModules, setLeafletModules] = useState<{
    MapContainer: typeof import('react-leaflet').MapContainer
    TileLayer: typeof import('react-leaflet').TileLayer
    CircleMarker: typeof import('react-leaflet').CircleMarker
    Popup: typeof import('react-leaflet').Popup
  } | null>(null)

  useEffect(() => {
    // Dynamically import react-leaflet and leaflet CSS on client only
    Promise.all([
      import('react-leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([rl]) => {
      setLeafletModules({
        MapContainer: rl.MapContainer,
        TileLayer: rl.TileLayer,
        CircleMarker: rl.CircleMarker,
        Popup: rl.Popup,
      })
    })
  }, [])

  if (!leafletModules) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/50 rounded-lg border">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    )
  }

  const { MapContainer, TileLayer, CircleMarker, Popup } = leafletModules

  const sitesWithCoords = sites.filter(
    (s): s is SiteRow & { lat: number; lng: number } =>
      s.lat != null && s.lng != null
  )

  return (
    <div className="relative h-full w-full rounded-lg border overflow-hidden">
      <MapContainer
        center={[36.7783, -119.4179]}
        zoom={6}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sitesWithCoords.map((site) => (
          <CircleMarker
            key={site.id}
            center={[site.lat, site.lng]}
            radius={6}
            pathOptions={{
              fillColor: getMarkerColor(site.vertical),
              fillOpacity: 0.8,
              color: '#fff',
              weight: 1.5,
            }}
          >
            <Popup>
              <div className="min-w-[180px]">
                <p className="font-semibold text-sm">{site.name}</p>
                {site.address && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {site.address}
                    {site.city ? `, ${site.city}` : ''}
                    {site.zip ? ` ${site.zip}` : ''}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: getMarkerColor(site.vertical) }}
                  />
                  <span className="text-xs">{site.vertical}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confidence: {site.confidence}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-4 right-4 z-[1000] rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-md">
        <p className="text-xs font-semibold mb-1.5">Verticals</p>
        <div className="grid gap-1">
          {LEGEND_ENTRIES.map((entry) => (
            <div key={entry.label} className="flex items-center gap-1.5">
              <span
                className="inline-block size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[11px] text-muted-foreground leading-none">
                {entry.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Export a dynamically-imported wrapper to prevent SSR
const SiteMap = dynamic(() => Promise.resolve(SiteMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted/50 rounded-lg border">
      <p className="text-sm text-muted-foreground">Loading map...</p>
    </div>
  ),
})

export { SiteMap }
export type { SiteMapInnerProps as SiteMapProps }
