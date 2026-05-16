# Intel Pro — Design Document

**Date:** 2026-05-15
**Status:** Approved

## Overview

Intel Pro is a web-based intelligence platform for California commercial pest control prospecting. It aggregates ~170K+ named sites from public data sources (ABC licenses, CalHHS healthcare, RCFE/assisted living, CDE schools, SNAP retailers, LIHTC housing, HUD multifamily, PHAs) into a classified, searchable, exportable dashboard.

## Users

1. **Sales reps** — search by territory (ZIP/county), filter by vertical, view on map, export prospect lists
2. **Branch managers / leadership** — view TAM analytics, chain analysis, coverage gaps, territory comparisons

## Architecture

### Phase 1 (Current)

- **Framework:** Next.js 15 (App Router)
- **Database:** Turso (hosted SQLite)
- **ORM:** Drizzle ORM
- **UI:** Tailwind CSS + shadcn/ui
- **Maps:** Leaflet + OpenStreetMap
- **Charts:** Recharts
- **Export:** xlsx (SheetJS)
- **Auth:** NextAuth.js (email/password)
- **Deploy:** Vercel
- **Data refresh:** Manual CSV upload via admin UI

### Phase 2 (When automating)

- Turso → Supabase (Postgres + PostGIS)
- NextAuth → Supabase Auth
- Supabase Edge Functions for scheduled data pulls
- PostGIS for radius/proximity queries
- Auto-refresh matching source cadence (ABC weekly, CalHHS monthly, CDE annually)

## Data Model

### `sites` — master table (~170K+ rows)

| Column | Type | Purpose |
|--------|------|---------|
| id | text (ULID) | Primary key |
| name | text | Site name |
| address | text | Street address |
| city | text | City |
| county | text | County name |
| state | text | Always "CA" |
| zip | text | 5-digit ZIP |
| lat | real | Latitude (when available) |
| lng | real | Longitude (when available) |
| vertical | text | Primary classification (restaurant, healthcare, school, apartment, etc.) |
| sub_vertical | text | Granular type (bar, brewpub, assisted_living, cold_storage, etc.) |
| confidence | text | "high" / "medium" / "low" |
| status | text | "active" / "inactive" / "needs_review" |
| site_count | integer | Unit/bed/room count when applicable |
| chain_id | text (nullable) | FK to chains. Null for independents. |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last update |

### `chains` — parent company / brand grouping

| Column | Type | Purpose |
|--------|------|---------|
| id | text | Primary key |
| name | text | Parent company (e.g., "Darden Restaurants") |
| brand | text | Brand name if different (e.g., "Olive Garden") |
| total_sites | integer | Count of linked sites |
| headquarters | text | HQ location if known |

### `contacts` — buyer/decision-maker info

| Column | Type | Purpose |
|--------|------|---------|
| id | text | Primary key |
| site_id | text (nullable) | FK to sites (site-level contact) |
| chain_id | text (nullable) | FK to chains (chain-level contact) |
| name | text | Contact name |
| title | text | Job title |
| phone | text | Phone |
| email | text | Email |
| is_decision_maker | boolean | True = this is the buyer |
| source | text | Where contact info came from |

### `source_records` — provenance and audit trail

| Column | Type | Purpose |
|--------|------|---------|
| id | text | Primary key |
| site_id | text | FK to sites |
| source_name | text | "ABC", "CalHHS", "CDE", "SNAP", etc. |
| source_url | text | Direct URL to source dataset |
| source_date | text | When source data was published |
| source_record_id | text | Original ID from source (license number, FACID, etc.) |
| raw_data | text (JSON) | Original record before classification |

### `imports` — upload batch tracking

| Column | Type | Purpose |
|--------|------|---------|
| id | text | Primary key |
| source_name | text | Which source |
| file_name | text | Original filename |
| record_count | integer | Records in batch |
| imported_at | timestamp | Upload time |
| imported_by | text | Who uploaded |

## Dashboard UI

### Rep View — Prospecting

- **Territory selector:** single ZIP, bulk ZIP paste (comma/newline), county selector (auto-populates ZIPs)
- **Bulk ZIP pull:** paste a branch's full ZIP list, filter entire database, export everything
- **Map view:** interactive Leaflet map, pins color-coded by vertical, click for details
- **Table view:** toggle map/table or split-screen. Sortable, filterable, paginated.
- **Site detail drawer:** slide-out panel with full details, source records, contacts, chain info
- **Export:** current filtered results to Excel (.xlsx) with all columns. Select specific rows or export all.
- **Vertical tabs:** Restaurants | Healthcare | Schools | Apartments | Hotels | Retail | All

### Manager View — Analytics

- **TAM overview cards:** total sites by vertical, statewide and by territory
- **Chain analysis:** chains ranked by CA site count, click to see all locations + coverage map
- **Vertical analysis:** drill into vertical → sub-vertical breakdown, county distribution, confidence levels
- **Territory comparison:** compare two ZIP sets or counties side-by-side
- **Coverage heatmap:** which ZIPs/counties have the most sites vs. underserved areas
- **Pipeline gaps:** verticals/regions with count data but no named sites
- **Export:** all analytics views exportable to Excel

### Admin — Data Import

- **Upload page:** upload CSV → preview rows → run classification → review confidence → confirm → store
- **Classification engine:** automated rules from source methodology document
- **Manual review queue:** low-confidence records surface for human review
- **Import history:** audit trail of all uploads with record counts and timestamps

## Classification Engine

### ABC License Classification (page 6 rules)

1. Map license type to vertical: 47/48 → restaurant/bar, 41 → restaurant (beer/wine), 75 → brewpub, 20/21 → retail/liquor, 67/70 → hotel
2. Name keyword matching: scan premises name for category indicators
3. Cross-check: license type + name agreement = high confidence; disagreement = needs_review

### Confidence Scoring

- **High:** license type + keyword match + name agreement (or single authoritative source like CalHHS FACID)
- **Medium:** license type alone, or single indicator
- **Low:** ambiguous, conflicting signals, or sparse data → routes to manual review queue

### QC Framework (page 12 rules)

Every row retains: Source URL + Source Date + Confidence. Stored in `source_records` table, not inline.

## Verticals and Sources

| Vertical | Primary Source | Est. Statewide Count |
|----------|---------------|---------------------|
| Restaurants/Bars | ABC licenses (Types 47, 48, 41, 75) | ~60,000+ |
| Healthcare facilities | CalHHS Licensed & Certified | ~10,000 |
| Assisted living (RCFE) | CCL filter to RCFE | ~7,000+ |
| Public schools | CDE public schools | ~10,500 |
| Private schools | CDE PSA data | ~3,500 |
| Grocery/Markets | ABC (Types 20, 21) + SNAP | ~30,000+ |
| Hotels | ABC (Types 67, 70) + name cross-match | ~5,000+ |
| Affordable housing (LIHTC) | TCAC mapping | ~5,000 |
| HUD assisted multifamily | HUD GIS | ~2,500 |
| Public housing authorities | HUD CA contact report | ~100 |
| Apartments | County assessor parcel data (Phase 3) | TBD by county |
| Warehouses | Census CBP/ZBP counts only (named sites require paid data) | ~25,000 est. |

## Non-Goals (Phase 1)

- Automated API data pulls (manual upload only)
- Geospatial radius/proximity queries (ZIP/county filtering is sufficient)
- Multi-tenant access control (single org for now)
- Apartment universe from parcel data (deferred — 58 counties, varying schemas)
- Warehouse named sites (requires ZoomInfo/D&B)
