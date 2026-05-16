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

  const { vertical, subVertical } = mapping
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
