# Intel Pro Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a web-based California intelligence platform that aggregates ~170K+ public-source sites into a searchable, map-enabled, exportable dashboard for pest control prospecting.

**Architecture:** Next.js 15 App Router with Turso (hosted SQLite) via Drizzle ORM. Server components for data-heavy pages, client components for interactivity (map, filters, table). Manual CSV import pipeline with automated classification engine. Deployed to Vercel.

**Tech Stack:** Next.js 15, Turso, Drizzle ORM, Tailwind CSS, shadcn/ui, Leaflet, Recharts, SheetJS (xlsx), NextAuth.js, Vitest, Vercel

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.gitignore`

**Step 1: Scaffold Next.js project**

Run:
```powershell
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: Project scaffolded in current directory with App Router, TypeScript, Tailwind.

**Step 2: Install core dependencies**

Run:
```powershell
npm install @libsql/client drizzle-orm ulid next-auth@beta xlsx recharts leaflet react-leaflet
npm install -D drizzle-kit @types/leaflet vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**Step 3: Install shadcn/ui**

Run:
```powershell
npx shadcn@latest init -d
```

Then add the components we'll need:
```powershell
npx shadcn@latest add button input table card tabs dialog sheet badge select separator dropdown-menu toast
```

**Step 4: Create environment file**

Create `.env.local`:
```env
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-token
NEXTAUTH_SECRET=generate-a-random-secret-here
NEXTAUTH_URL=http://localhost:3000
```

**Step 5: Create Vitest config**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest'
```

**Step 6: Add test script to package.json**

Add to `scripts`:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 7: Verify scaffolding works**

Run: `npm run dev`
Expected: Next.js dev server starts on http://localhost:3000

Run: `npm run test:run`
Expected: Vitest runs (0 tests, no errors)

**Step 8: Commit**

```powershell
git add -A
git commit -m "feat: scaffold Next.js 15 project with Turso, Drizzle, shadcn, Vitest"
```

---

## Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`
- Test: `src/db/__tests__/schema.test.ts`

**Step 1: Write schema test**

Create `src/db/__tests__/schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { sites, chains, contacts, sourceRecords, imports } from '../schema'

describe('database schema', () => {
  it('sites table has all required columns', () => {
    const columns = Object.keys(sites)
    expect(columns).toContain('id')
    expect(columns).toContain('name')
    expect(columns).toContain('address')
    expect(columns).toContain('city')
    expect(columns).toContain('county')
    expect(columns).toContain('zip')
    expect(columns).toContain('lat')
    expect(columns).toContain('lng')
    expect(columns).toContain('vertical')
    expect(columns).toContain('subVertical')
    expect(columns).toContain('confidence')
    expect(columns).toContain('status')
    expect(columns).toContain('siteCount')
    expect(columns).toContain('chainId')
  })

  it('contacts table supports both site-level and chain-level contacts', () => {
    const columns = Object.keys(contacts)
    expect(columns).toContain('siteId')
    expect(columns).toContain('chainId')
  })

  it('source_records table tracks provenance', () => {
    const columns = Object.keys(sourceRecords)
    expect(columns).toContain('sourceUrl')
    expect(columns).toContain('sourceDate')
    expect(columns).toContain('sourceName')
    expect(columns).toContain('rawData')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — cannot resolve `../schema`

**Step 3: Write the Drizzle schema**

Create `src/db/schema.ts`:
```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const chains = sqliteTable('chains', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brand: text('brand'),
  totalSites: integer('total_sites').default(0),
  headquarters: text('headquarters'),
})

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  city: text('city'),
  county: text('county'),
  state: text('state').default('CA'),
  zip: text('zip'),
  lat: real('lat'),
  lng: real('lng'),
  vertical: text('vertical').notNull(),
  subVertical: text('sub_vertical'),
  confidence: text('confidence').notNull().default('medium'),
  status: text('status').notNull().default('active'),
  siteCount: integer('site_count'),
  chainId: text('chain_id').references(() => chains.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
})

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id),
  chainId: text('chain_id').references(() => chains.id),
  name: text('name').notNull(),
  title: text('title'),
  phone: text('phone'),
  email: text('email'),
  isDecisionMaker: integer('is_decision_maker', { mode: 'boolean' }).default(false),
  source: text('source'),
})

export const sourceRecords = sqliteTable('source_records', {
  id: text('id').primaryKey(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  sourceName: text('source_name').notNull(),
  sourceUrl: text('source_url'),
  sourceDate: text('source_date'),
  sourceRecordId: text('source_record_id'),
  rawData: text('raw_data'),
})

export const imports = sqliteTable('imports', {
  id: text('id').primaryKey(),
  sourceName: text('source_name').notNull(),
  fileName: text('file_name').notNull(),
  recordCount: integer('record_count').default(0),
  importedAt: text('imported_at').default(sql`(datetime('now'))`),
  importedBy: text('imported_by'),
})
```

**Step 4: Write the database client**

Create `src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })
```

**Step 5: Write Drizzle config**

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
```

**Step 6: Run tests**

Run: `npm run test:run`
Expected: PASS — all schema tests green

**Step 7: Generate migration**

Run: `npx drizzle-kit generate`
Expected: Migration SQL files created in `drizzle/` directory

**Step 8: Commit**

```powershell
git add -A
git commit -m "feat: add Drizzle schema for sites, chains, contacts, source_records, imports"
```

---

## Task 3: Classification Engine

**Files:**
- Create: `src/lib/classifiers/abc.ts`, `src/lib/classifiers/types.ts`, `src/lib/classifiers/generic.ts`
- Test: `src/lib/classifiers/__tests__/abc.test.ts`

**Step 1: Write classification types**

Create `src/lib/classifiers/types.ts`:
```typescript
export type Vertical =
  | 'restaurant'
  | 'bar'
  | 'hotel'
  | 'grocery'
  | 'liquor'
  | 'healthcare'
  | 'assisted_living'
  | 'school'
  | 'apartment'
  | 'warehouse'
  | 'housing'
  | 'other'

export type Confidence = 'high' | 'medium' | 'low'

export interface ClassificationResult {
  vertical: Vertical
  subVertical: string
  confidence: Confidence
  needsReview: boolean
  reasons: string[]
}

export interface RawRecord {
  [key: string]: string | number | null
}
```

**Step 2: Write ABC classifier tests**

Create `src/lib/classifiers/__tests__/abc.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { classifyAbc } from '../abc'

describe('ABC license classifier', () => {
  it('classifies type 47 as restaurant with high confidence when name matches', () => {
    const result = classifyAbc({
      'License Type': '47',
      'Premises Name': 'OLIVE GARDEN ITALIAN RESTAURANT',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('restaurant')
    expect(result.confidence).toBe('high')
    expect(result.needsReview).toBe(false)
  })

  it('classifies type 48 as bar', () => {
    const result = classifyAbc({
      'License Type': '48',
      'Premises Name': 'THE TIPSY PUB',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('bar')
  })

  it('classifies type 75 as brewpub', () => {
    const result = classifyAbc({
      'License Type': '75',
      'Premises Name': 'STONE BREWING',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('bar')
    expect(result.subVertical).toBe('brewpub')
  })

  it('classifies type 20 as grocery/market', () => {
    const result = classifyAbc({
      'License Type': '20',
      'Premises Name': 'TRADER JOES #123',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('grocery')
  })

  it('classifies type 21 as liquor store', () => {
    const result = classifyAbc({
      'License Type': '21',
      'Premises Name': 'BEVMO #45',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('liquor')
  })

  it('classifies type 67/70 as hotel', () => {
    const result = classifyAbc({
      'License Type': '67',
      'Premises Name': 'HILTON GARDEN INN',
      'Status': 'ACTIVE',
    })
    expect(result.vertical).toBe('hotel')
    expect(result.confidence).toBe('high')
  })

  it('marks ambiguous names as medium confidence with review flag', () => {
    const result = classifyAbc({
      'License Type': '47',
      'Premises Name': 'ABC LLC',
      'Status': 'ACTIVE',
    })
    expect(result.confidence).toBe('medium')
  })

  it('marks type 47 with hotel name as needs_review', () => {
    const result = classifyAbc({
      'License Type': '47',
      'Premises Name': 'MARRIOTT HOTEL RESTAURANT',
      'Status': 'ACTIVE',
    })
    expect(result.needsReview).toBe(true)
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — cannot resolve `../abc`

**Step 4: Implement ABC classifier**

Create `src/lib/classifiers/abc.ts`:
```typescript
import type { ClassificationResult, RawRecord, Vertical, Confidence } from './types'

const LICENSE_TYPE_MAP: Record<string, { vertical: Vertical; subVertical: string }> = {
  '41': { vertical: 'restaurant', subVertical: 'restaurant_beer_wine' },
  '47': { vertical: 'restaurant', subVertical: 'restaurant_full_bar' },
  '48': { vertical: 'bar', subVertical: 'public_premises' },
  '75': { vertical: 'bar', subVertical: 'brewpub' },
  '20': { vertical: 'grocery', subVertical: 'off_sale_beer_wine' },
  '21': { vertical: 'liquor', subVertical: 'off_sale_general' },
  '67': { vertical: 'hotel', subVertical: 'hotel_motel' },
  '70': { vertical: 'hotel', subVertical: 'hotel_motel' },
}

const RESTAURANT_KEYWORDS = [
  'restaurant', 'grill', 'kitchen', 'cafe', 'bistro', 'diner',
  'pizz', 'taco', 'sushi', 'burger', 'bbq', 'barbecue', 'noodle',
  'thai', 'chinese', 'mexican', 'italian', 'japanese', 'indian',
  'steakhouse', 'seafood', 'bakery', 'deli',
]

const BAR_KEYWORDS = [
  'bar', 'pub', 'tavern', 'lounge', 'saloon', 'taproom',
  'brewery', 'brewing', 'nightclub', 'cantina',
]

const HOTEL_KEYWORDS = [
  'hotel', 'motel', 'inn', 'resort', 'suites', 'lodge',
  'hilton', 'marriott', 'hyatt', 'sheraton', 'westin',
  'holiday inn', 'best western', 'radisson', 'courtyard',
]

const GROCERY_KEYWORDS = [
  'market', 'grocery', 'trader joe', 'safeway', 'vons',
  'ralphs', 'albertson', 'whole foods', 'sprouts', 'food',
]

const LIQUOR_KEYWORDS = [
  'liquor', 'bevmo', 'wine', 'spirits', 'total wine',
]

function nameMatchesVertical(name: string, vertical: Vertical): boolean {
  const upper = name.toUpperCase()
  const keywordMap: Partial<Record<Vertical, string[]>> = {
    restaurant: RESTAURANT_KEYWORDS,
    bar: BAR_KEYWORDS,
    hotel: HOTEL_KEYWORDS,
    grocery: GROCERY_KEYWORDS,
    liquor: LIQUOR_KEYWORDS,
  }
  const keywords = keywordMap[vertical]
  if (!keywords) return false
  return keywords.some((kw) => upper.includes(kw.toUpperCase()))
}

function nameConflictsWithVertical(name: string, vertical: Vertical): boolean {
  const upper = name.toUpperCase()
  if (vertical === 'restaurant' && HOTEL_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()))) return true
  if (vertical === 'restaurant' && BAR_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()))) return false
  if (vertical === 'hotel' && RESTAURANT_KEYWORDS.some((kw) => upper.includes(kw.toUpperCase()))) return true
  return false
}

export function classifyAbc(record: RawRecord): ClassificationResult {
  const licenseType = String(record['License Type'] || '').trim()
  const premisesName = String(record['Premises Name'] || '').trim()
  const reasons: string[] = []

  const mapping = LICENSE_TYPE_MAP[licenseType]
  if (!mapping) {
    return {
      vertical: 'other',
      subVertical: `abc_type_${licenseType}`,
      confidence: 'low',
      needsReview: true,
      reasons: [`Unknown ABC license type: ${licenseType}`],
    }
  }

  let { vertical, subVertical } = mapping
  reasons.push(`License type ${licenseType} → ${vertical}`)

  const nameMatches = nameMatchesVertical(premisesName, vertical)
  const nameConflicts = nameConflictsWithVertical(premisesName, vertical)

  let confidence: Confidence

  if (nameMatches && !nameConflicts) {
    confidence = 'high'
    reasons.push(`Name "${premisesName}" matches ${vertical} keywords`)
  } else if (nameConflicts) {
    confidence = 'low'
    reasons.push(`Name "${premisesName}" conflicts with ${vertical} classification`)
  } else {
    confidence = 'medium'
    reasons.push(`Name "${premisesName}" has no strong keyword signals`)
  }

  return {
    vertical,
    subVertical,
    confidence,
    needsReview: nameConflicts || confidence === 'low',
    reasons,
  }
}
```

**Step 5: Run tests**

Run: `npm run test:run`
Expected: PASS — all ABC classifier tests green

**Step 6: Write generic classifier for non-ABC sources**

Create `src/lib/classifiers/generic.ts`:
```typescript
import type { ClassificationResult, RawRecord, Vertical } from './types'

type SourceType = 'CalHHS' | 'RCFE' | 'CDE_PUBLIC' | 'CDE_PRIVATE' | 'SNAP' | 'LIHTC' | 'HUD' | 'PHA'

const SOURCE_VERTICAL_MAP: Record<SourceType, { vertical: Vertical; subVertical: string; confidence: 'high' | 'medium' }> = {
  CalHHS: { vertical: 'healthcare', subVertical: 'licensed_facility', confidence: 'high' },
  RCFE: { vertical: 'assisted_living', subVertical: 'rcfe', confidence: 'high' },
  CDE_PUBLIC: { vertical: 'school', subVertical: 'public_school', confidence: 'high' },
  CDE_PRIVATE: { vertical: 'school', subVertical: 'private_school', confidence: 'high' },
  SNAP: { vertical: 'grocery', subVertical: 'snap_retailer', confidence: 'medium' },
  LIHTC: { vertical: 'housing', subVertical: 'lihtc_affordable', confidence: 'high' },
  HUD: { vertical: 'housing', subVertical: 'hud_assisted', confidence: 'high' },
  PHA: { vertical: 'housing', subVertical: 'public_housing_authority', confidence: 'high' },
}

export function classifyGeneric(record: RawRecord, sourceType: SourceType): ClassificationResult {
  const mapping = SOURCE_VERTICAL_MAP[sourceType]
  return {
    vertical: mapping.vertical,
    subVertical: mapping.subVertical,
    confidence: mapping.confidence,
    needsReview: false,
    reasons: [`Source: ${sourceType} → ${mapping.vertical}/${mapping.subVertical}`],
  }
}
```

**Step 7: Commit**

```powershell
git add -A
git commit -m "feat: add classification engine with ABC license rules and confidence scoring"
```

---

## Task 4: CSV Import Pipeline (Server-Side)

**Files:**
- Create: `src/lib/import/parse-csv.ts`, `src/lib/import/import-sites.ts`
- Test: `src/lib/import/__tests__/parse-csv.test.ts`

**Step 1: Install CSV parser**

Run: `npm install papaparse && npm install -D @types/papaparse`

**Step 2: Write CSV parser test**

Create `src/lib/import/__tests__/parse-csv.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { parseCsvText, detectSourceType } from '../parse-csv'

describe('CSV parser', () => {
  it('parses CSV text into records', () => {
    const csv = `Name,Address,City\nJoes Diner,123 Main St,Los Angeles\nBob Cafe,456 Oak Ave,San Diego`
    const records = parseCsvText(csv)
    expect(records).toHaveLength(2)
    expect(records[0]['Name']).toBe('Joes Diner')
    expect(records[1]['City']).toBe('San Diego')
  })

  it('detects ABC source by column headers', () => {
    expect(detectSourceType(['License Type', 'Premises Name', 'Status'])).toBe('ABC')
  })

  it('detects CalHHS source by FACID column', () => {
    expect(detectSourceType(['FACID', 'FACILITY NAME', 'LICENSE TYPE'])).toBe('CalHHS')
  })

  it('detects CDE source by CDSCode column', () => {
    expect(detectSourceType(['CDSCode', 'School', 'District'])).toBe('CDE_PUBLIC')
  })

  it('returns UNKNOWN for unrecognized columns', () => {
    expect(detectSourceType(['Foo', 'Bar', 'Baz'])).toBe('UNKNOWN')
  })
})
```

**Step 3: Run test to verify it fails**

Run: `npm run test:run`
Expected: FAIL

**Step 4: Implement CSV parser**

Create `src/lib/import/parse-csv.ts`:
```typescript
import Papa from 'papaparse'
import type { RawRecord } from '../classifiers/types'

export function parseCsvText(csvText: string): RawRecord[] {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  })
  return result.data as RawRecord[]
}

export type SourceType = 'ABC' | 'CalHHS' | 'RCFE' | 'CDE_PUBLIC' | 'CDE_PRIVATE' | 'SNAP' | 'LIHTC' | 'HUD' | 'PHA' | 'UNKNOWN'

const SOURCE_SIGNATURES: Record<string, SourceType> = {
  'License Type': 'ABC',
  'FACID': 'CalHHS',
  'CDSCode': 'CDE_PUBLIC',
  'SNAP Store Name': 'SNAP',
  'HUD Property Name': 'HUD',
  'Project Name': 'LIHTC',
}

export function detectSourceType(headers: string[]): SourceType {
  for (const header of headers) {
    const trimmed = header.trim()
    if (SOURCE_SIGNATURES[trimmed]) {
      return SOURCE_SIGNATURES[trimmed]
    }
  }
  return 'UNKNOWN'
}
```

**Step 5: Run tests**

Run: `npm run test:run`
Expected: PASS

**Step 6: Implement import-sites logic**

Create `src/lib/import/import-sites.ts`:
```typescript
import { ulid } from 'ulid'
import { db } from '@/db'
import { sites, sourceRecords, imports } from '@/db/schema'
import { classifyAbc } from '../classifiers/abc'
import { classifyGeneric } from '../classifiers/generic'
import { parseCsvText, detectSourceType } from './parse-csv'
import type { RawRecord } from '../classifiers/types'
import type { SourceType } from './parse-csv'

interface ImportResult {
  importId: string
  totalRecords: number
  classified: number
  needsReview: number
  errors: string[]
}

function extractAddress(record: RawRecord, sourceType: SourceType) {
  switch (sourceType) {
    case 'ABC':
      return {
        name: String(record['Premises Name'] || ''),
        address: String(record['Premises Address'] || record['Address'] || ''),
        city: String(record['City'] || ''),
        county: String(record['County'] || ''),
        zip: String(record['Zip Code'] || record['Zip'] || ''),
      }
    case 'CalHHS':
    case 'RCFE':
      return {
        name: String(record['FACILITY NAME'] || record['Facility Name'] || ''),
        address: String(record['ADDRESS'] || record['Address'] || ''),
        city: String(record['CITY'] || record['City'] || ''),
        county: String(record['COUNTY'] || record['County'] || ''),
        zip: String(record['ZIP'] || record['Zip'] || ''),
      }
    default:
      return {
        name: String(record['Name'] || record['name'] || record['FACILITY NAME'] || ''),
        address: String(record['Address'] || record['address'] || record['ADDRESS'] || ''),
        city: String(record['City'] || record['city'] || record['CITY'] || ''),
        county: String(record['County'] || record['county'] || record['COUNTY'] || ''),
        zip: String(record['Zip'] || record['zip'] || record['ZIP'] || record['Zip Code'] || ''),
      }
  }
}

export async function importCsv(
  csvText: string,
  fileName: string,
  importedBy: string,
  sourceOverride?: SourceType,
): Promise<ImportResult> {
  const records = parseCsvText(csvText)
  if (records.length === 0) {
    return { importId: '', totalRecords: 0, classified: 0, needsReview: 0, errors: ['No records found in CSV'] }
  }

  const headers = Object.keys(records[0])
  const sourceType = sourceOverride || detectSourceType(headers)
  const importId = ulid()
  const errors: string[] = []
  let classified = 0
  let needsReview = 0

  await db.insert(imports).values({
    id: importId,
    sourceName: sourceType,
    fileName,
    recordCount: records.length,
    importedBy,
  })

  for (const record of records) {
    try {
      const classification =
        sourceType === 'ABC'
          ? classifyAbc(record)
          : classifyGeneric(record, sourceType as any)

      const addr = extractAddress(record, sourceType)
      const siteId = ulid()

      await db.insert(sites).values({
        id: siteId,
        name: addr.name,
        address: addr.address,
        city: addr.city,
        county: addr.county,
        zip: addr.zip.slice(0, 5),
        vertical: classification.vertical,
        subVertical: classification.subVertical,
        confidence: classification.confidence,
        status: classification.needsReview ? 'needs_review' : 'active',
      })

      await db.insert(sourceRecords).values({
        id: ulid(),
        siteId,
        sourceName: sourceType,
        sourceRecordId: String(record['License Number'] || record['FACID'] || record['CDSCode'] || ''),
        rawData: JSON.stringify(record),
      })

      classified++
      if (classification.needsReview) needsReview++
    } catch (err) {
      errors.push(`Row error: ${(err as Error).message}`)
    }
  }

  return { importId, totalRecords: records.length, classified, needsReview, errors }
}
```

**Step 7: Commit**

```powershell
git add -A
git commit -m "feat: add CSV import pipeline with source detection and classification"
```

---

## Task 5: Auth Setup (NextAuth)

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.ts`, `src/lib/auth.ts`
- Modify: `src/app/layout.tsx`

**Step 1: Create auth config**

Create `src/lib/auth.ts`:
```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Phase 1: simple hardcoded auth. Replace with DB lookup later.
        if (
          credentials?.email === process.env.ADMIN_EMAIL &&
          credentials?.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: '1', email: credentials.email as string, name: 'Admin' }
        }
        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
})
```

**Step 2: Create auth API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

**Step 3: Add auth env vars to `.env.local`**

Add:
```env
ADMIN_EMAIL=admin@intelpro.com
ADMIN_PASSWORD=change-this-password
```

**Step 4: Create login page**

Create `src/app/login/page.tsx` — a simple email/password form that calls `signIn('credentials', ...)`.

**Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add NextAuth credentials auth with login page"
```

---

## Task 6: App Layout & Navigation Shell

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/app/(dashboard)/layout.tsx`

**Step 1: Create dashboard layout with sidebar navigation**

Navigation structure:
- **Prospecting** (rep view) — `/dashboard`
- **Analytics** (manager view) — `/dashboard/analytics`
- **Chains** — `/dashboard/chains`
- **Import** — `/dashboard/import`
- **Review Queue** — `/dashboard/review`

Create `src/app/(dashboard)/layout.tsx` with a sidebar + header + main content area using shadcn components.

**Step 2: Create placeholder pages for each route**

- `src/app/(dashboard)/dashboard/page.tsx` — "Prospecting" placeholder
- `src/app/(dashboard)/dashboard/analytics/page.tsx` — "Analytics" placeholder
- `src/app/(dashboard)/dashboard/chains/page.tsx` — "Chains" placeholder
- `src/app/(dashboard)/dashboard/import/page.tsx` — "Import" placeholder
- `src/app/(dashboard)/dashboard/review/page.tsx` — "Review Queue" placeholder

**Step 3: Verify navigation works**

Run: `npm run dev`
Navigate to each route, verify sidebar highlights correctly.

**Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add dashboard layout shell with sidebar navigation"
```

---

## Task 7: Data Import UI

**Files:**
- Create: `src/app/(dashboard)/dashboard/import/page.tsx`, `src/app/api/import/route.ts`
- Create: `src/components/import/upload-form.tsx`, `src/components/import/preview-table.tsx`

**Step 1: Create the import API route**

Create `src/app/api/import/route.ts`:
- Accept multipart form data (CSV file upload)
- Read file content as text
- Call `importCsv()` from Task 4
- Return JSON with import results (total, classified, needs_review, errors)

**Step 2: Create upload form component**

Create `src/components/import/upload-form.tsx`:
- File input accepting `.csv` files
- Source type dropdown (auto-detect or manual override): ABC, CalHHS, RCFE, CDE, SNAP, LIHTC, HUD, PHA
- "Upload & Classify" button
- Progress indicator during import
- Results summary card showing counts

**Step 3: Create preview table component**

Create `src/components/import/preview-table.tsx`:
- After upload, show first 20 rows in a shadcn Table
- Columns: Name, Address, City, ZIP, Vertical, Sub-Vertical, Confidence, Status
- Color-coded confidence badges: green (high), yellow (medium), red (low)

**Step 4: Wire up the import page**

Compose upload form + preview table in `src/app/(dashboard)/dashboard/import/page.tsx`.

**Step 5: Test with a small CSV**

Create a test CSV with 5 ABC-style rows. Upload via the UI. Verify rows appear in preview and database.

**Step 6: Commit**

```powershell
git add -A
git commit -m "feat: add data import UI with CSV upload, classification, and preview"
```

---

## Task 8: Prospecting View — Data Table with Filters

**Files:**
- Create: `src/app/(dashboard)/dashboard/page.tsx`, `src/app/api/sites/route.ts`
- Create: `src/components/prospecting/site-table.tsx`, `src/components/prospecting/territory-filter.tsx`, `src/components/prospecting/vertical-tabs.tsx`

**Step 1: Create sites API route**

Create `src/app/api/sites/route.ts`:
- Query params: `zip` (comma-separated), `county`, `vertical`, `confidence`, `status`, `search`, `page`, `limit`
- Returns paginated JSON: `{ sites: [...], total: number, page: number, totalPages: number }`
- Uses Drizzle query builder with dynamic where clauses

**Step 2: Create territory filter component**

Create `src/components/prospecting/territory-filter.tsx`:
- Text input for single ZIP
- Textarea for bulk ZIP paste (comma or newline separated)
- County dropdown (58 California counties)
- "Apply Filter" button
- "Clear" button
- Display active filter summary: "Showing 1,234 sites in 15 ZIPs"

**Step 3: Create vertical tabs**

Create `src/components/prospecting/vertical-tabs.tsx`:
- shadcn Tabs: All | Restaurants | Healthcare | Schools | Apartments | Hotels | Retail
- Each tab shows count badge
- Clicking tab filters the table

**Step 4: Create site data table**

Create `src/components/prospecting/site-table.tsx`:
- shadcn Table with columns: Name, Address, City, ZIP, County, Vertical, Confidence, Chain, Status
- Sortable column headers (click to toggle asc/desc)
- Pagination controls at bottom
- Row click → opens site detail drawer (Task 10)
- Checkbox column for row selection (for export)

**Step 5: Compose the prospecting page**

Wire territory filter + vertical tabs + data table in the dashboard page.

**Step 6: Test with sample data**

Verify: ZIP filter works, county filter works, bulk ZIP paste works, vertical tabs filter correctly, pagination works, sorting works.

**Step 7: Commit**

```powershell
git add -A
git commit -m "feat: add prospecting view with territory filter, vertical tabs, and data table"
```

---

## Task 9: Map View (Leaflet)

**Files:**
- Create: `src/components/prospecting/site-map.tsx`, `src/components/prospecting/view-toggle.tsx`

**Step 1: Create dynamic Leaflet map component**

Create `src/components/prospecting/site-map.tsx`:
- Leaflet map centered on California (lat: 36.7783, lng: -119.4179, zoom: 6)
- Load markers from the same filtered dataset as the table
- Color-coded markers by vertical (use CircleMarker for performance at scale)
- Click marker → popup with site name, address, vertical, confidence
- Cluster markers when zoomed out (use `react-leaflet-cluster` or manual clustering)

Install: `npm install react-leaflet-cluster`

**Important:** Leaflet must be dynamically imported in Next.js (no SSR). Use `next/dynamic` with `ssr: false`.

**Step 2: Create view toggle**

Create `src/components/prospecting/view-toggle.tsx`:
- Toggle between "Table", "Map", "Split" views
- Split view: map on top, table on bottom (or side by side on wide screens)

**Step 3: Integrate into prospecting page**

Add view toggle above the content area. Render table, map, or both based on selection.

**Step 4: Test map rendering**

Verify: markers appear for filtered sites, clicking works, zoom/pan is smooth, large datasets (1000+ markers) don't freeze the UI.

**Step 5: Commit**

```powershell
git add -A
git commit -m "feat: add interactive Leaflet map view with color-coded markers and clustering"
```

---

## Task 10: Site Detail Drawer

**Files:**
- Create: `src/components/prospecting/site-detail.tsx`, `src/app/api/sites/[id]/route.ts`

**Step 1: Create site detail API**

Create `src/app/api/sites/[id]/route.ts`:
- Returns full site data including: chain info (joined), contacts (joined), source records (joined)

**Step 2: Create site detail drawer**

Create `src/components/prospecting/site-detail.tsx`:
- shadcn Sheet (slide-out from right)
- Sections:
  - **Site Info:** name, address, city, county, ZIP, vertical, sub-vertical, confidence badge, status
  - **Chain:** if linked, show chain name, brand, total sites, link to chain page
  - **Contacts:** list of contacts with name, title, phone, email, decision-maker badge
  - **Source Records:** table showing source name, source ID, source date, source URL (clickable)
  - **Actions:** "Edit", "Flag for Review", "Mark Inactive"

**Step 3: Wire into site table**

Click a row in site-table → opens the drawer with that site's details.

**Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add site detail drawer with contacts, chain info, and source records"
```

---

## Task 11: Excel Export

**Files:**
- Create: `src/lib/export/excel.ts`, `src/app/api/export/route.ts`
- Create: `src/components/prospecting/export-button.tsx`

**Step 1: Write export utility**

Create `src/lib/export/excel.ts`:
```typescript
import * as XLSX from 'xlsx'

export function sitesToExcel(sites: any[], fileName: string): Buffer {
  const ws = XLSX.utils.json_to_sheet(sites)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sites')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
```

**Step 2: Create export API route**

Create `src/app/api/export/route.ts`:
- Same filter params as the sites API
- Optional `ids` param for exporting selected rows only
- Returns `.xlsx` file as download

**Step 3: Create export button component**

Create `src/components/prospecting/export-button.tsx`:
- "Export to Excel" button
- Two modes: "Export All (filtered)" and "Export Selected"
- Triggers download of .xlsx file

**Step 4: Integrate into prospecting page**

Add export button next to the territory filter bar.

**Step 5: Test export**

Filter to a ZIP code, click export, verify Excel file downloads with correct data and columns.

**Step 6: Commit**

```powershell
git add -A
git commit -m "feat: add Excel export for filtered and selected sites"
```

---

## Task 12: Analytics Dashboard (Manager View)

**Files:**
- Create: `src/app/(dashboard)/dashboard/analytics/page.tsx`, `src/app/api/analytics/route.ts`
- Create: `src/components/analytics/tam-cards.tsx`, `src/components/analytics/vertical-chart.tsx`, `src/components/analytics/confidence-chart.tsx`, `src/components/analytics/county-table.tsx`

**Step 1: Create analytics API**

Create `src/app/api/analytics/route.ts`:
- Returns aggregated stats:
  - Total sites by vertical (for TAM cards)
  - Sites by confidence level
  - Top 20 counties by site count
  - Sites by sub-vertical within each vertical
- Optional territory filter (ZIP/county) for territory-specific analytics

**Step 2: Create TAM overview cards**

Create `src/components/analytics/tam-cards.tsx`:
- Grid of shadcn Cards, one per vertical
- Each card shows: vertical name, total count, confidence breakdown (high/med/low as small bar)
- Total statewide count at the top

**Step 3: Create vertical breakdown chart**

Create `src/components/analytics/vertical-chart.tsx`:
- Recharts BarChart showing site count by vertical
- Click a bar → drill down to sub-vertical breakdown

**Step 4: Create confidence chart**

Create `src/components/analytics/confidence-chart.tsx`:
- Recharts PieChart showing high/medium/low confidence distribution
- Color-coded: green/yellow/red

**Step 5: Create county ranking table**

Create `src/components/analytics/county-table.tsx`:
- Table: County, Total Sites, Top Vertical, Confidence % High
- Sortable, paginated

**Step 6: Compose analytics page**

Wire all components into the analytics page with territory filter at top.

**Step 7: Commit**

```powershell
git add -A
git commit -m "feat: add analytics dashboard with TAM cards, charts, and county breakdown"
```

---

## Task 13: Chain Analysis

**Files:**
- Create: `src/app/(dashboard)/dashboard/chains/page.tsx`, `src/app/api/chains/route.ts`, `src/app/api/chains/[id]/route.ts`
- Create: `src/components/chains/chain-table.tsx`, `src/components/chains/chain-detail.tsx`

**Step 1: Create chains API**

Create `src/app/api/chains/route.ts`:
- Returns all chains sorted by total_sites descending
- Include: name, brand, total sites, top verticals, HQ

Create `src/app/api/chains/[id]/route.ts`:
- Returns chain detail with all linked sites and contacts

**Step 2: Create chain ranking table**

Create `src/components/chains/chain-table.tsx`:
- Columns: Name, Brand, Total Sites, Top Vertical, HQ
- Sortable, searchable
- Click row → chain detail page

**Step 3: Create chain detail view**

Create `src/components/chains/chain-detail.tsx`:
- Chain header: name, brand, total sites, HQ
- Map showing all chain locations in California
- Table of all sites belonging to this chain
- Chain-level contacts section
- Export chain locations to Excel

**Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add chain analysis page with ranking and detail views"
```

---

## Task 14: Review Queue

**Files:**
- Create: `src/app/(dashboard)/dashboard/review/page.tsx`, `src/app/api/review/route.ts`
- Create: `src/components/review/review-table.tsx`

**Step 1: Create review API**

Create `src/app/api/review/route.ts`:
- Returns all sites where `status = 'needs_review'`
- Supports PATCH to update classification/status after review

**Step 2: Create review table**

Create `src/components/review/review-table.tsx`:
- Table showing: Name, Address, Current Vertical, Confidence, Reasons (from classification)
- Inline actions per row:
  - "Approve" (sets status to active, keeps classification)
  - "Reclassify" (dropdown to pick correct vertical + sub-vertical, sets confidence to high)
  - "Reject" (sets status to inactive)
- Batch actions: approve all filtered, reject all filtered

**Step 3: Compose review page**

Wire review table with filter by vertical, confidence level.

**Step 4: Commit**

```powershell
git add -A
git commit -m "feat: add manual review queue for low-confidence classifications"
```

---

## Task 15: Deploy to Vercel

**Files:**
- Create: `vercel.json` (if needed)
- Modify: `.env.local` → Vercel environment variables

**Step 1: Set up Turso database**

Run:
```powershell
npx turso db create intel-pro
npx turso db tokens create intel-pro
```

Copy the URL and token to `.env.local` and to Vercel env vars.

**Step 2: Push migrations**

Run: `npx drizzle-kit push`
Expected: Tables created in Turso

**Step 3: Deploy to Vercel**

Run:
```powershell
npx vercel --prod
```

Or connect GitHub repo to Vercel for auto-deploy.

**Step 4: Verify production deployment**

- Navigate to deployed URL
- Log in
- Upload a small test CSV
- Verify prospecting view, map, export, analytics all work

**Step 5: Commit any deploy config**

```powershell
git add -A
git commit -m "chore: add Vercel deployment config"
```

---

## Build Order Summary

| Task | What it delivers | Depends on |
|------|-----------------|------------|
| 1 | Working Next.js project with all deps | — |
| 2 | Database schema ready | 1 |
| 3 | Classification engine (testable standalone) | 1 |
| 4 | CSV import pipeline | 2, 3 |
| 5 | Auth (login/logout) | 1 |
| 6 | Navigation shell | 1, 5 |
| 7 | Import UI (first usable feature) | 4, 6 |
| 8 | Prospecting table + filters | 6, 7 (needs data) |
| 9 | Map view | 8 |
| 10 | Site detail drawer | 8 |
| 11 | Excel export | 8 |
| 12 | Analytics dashboard | 8 |
| 13 | Chain analysis | 8 |
| 14 | Review queue | 7 |
| 15 | Production deploy | All |
