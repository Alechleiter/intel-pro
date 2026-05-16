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
