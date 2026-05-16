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
  bedCount: integer('bed_count'),
  facilityType: text('facility_type'),
  licenseNumber: text('license_number'),
  sourceSystems: text('source_systems'),
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
