import type { ClassificationResult, RawRecord, Vertical } from './types'

export type GenericSourceType = 'CalHHS' | 'RCFE' | 'CDE_PUBLIC' | 'CDE_PRIVATE' | 'SNAP' | 'LIHTC' | 'HUD' | 'PHA'

const SOURCE_VERTICAL_MAP: Record<GenericSourceType, { vertical: Vertical; subVertical: string; confidence: 'high' | 'medium' }> = {
  CalHHS: { vertical: 'healthcare', subVertical: 'licensed_facility', confidence: 'high' },
  RCFE: { vertical: 'assisted_living', subVertical: 'rcfe', confidence: 'high' },
  CDE_PUBLIC: { vertical: 'school', subVertical: 'public_school', confidence: 'high' },
  CDE_PRIVATE: { vertical: 'school', subVertical: 'private_school', confidence: 'high' },
  SNAP: { vertical: 'grocery', subVertical: 'snap_retailer', confidence: 'medium' },
  LIHTC: { vertical: 'housing', subVertical: 'lihtc_affordable', confidence: 'high' },
  HUD: { vertical: 'housing', subVertical: 'hud_assisted', confidence: 'high' },
  PHA: { vertical: 'housing', subVertical: 'public_housing_authority', confidence: 'high' },
}

export function classifyGeneric(record: RawRecord, sourceType: GenericSourceType): ClassificationResult {
  const mapping = SOURCE_VERTICAL_MAP[sourceType]
  if (!mapping) {
    return {
      vertical: 'other',
      subVertical: '',
      confidence: 'low',
      needsReview: true,
      reasons: [`Unknown source type: ${sourceType}`],
    }
  }
  return {
    vertical: mapping.vertical,
    subVertical: mapping.subVertical,
    confidence: mapping.confidence,
    needsReview: false,
    reasons: [`Source: ${sourceType} → ${mapping.vertical}/${mapping.subVertical}`],
  }
}
