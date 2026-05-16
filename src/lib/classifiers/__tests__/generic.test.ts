import { describe, it, expect } from 'vitest'
import { classifyGeneric } from '../generic'

describe('generic classifier', () => {
  it('classifies CalHHS as healthcare with high confidence', () => {
    const result = classifyGeneric({}, 'CalHHS')
    expect(result.vertical).toBe('healthcare')
    expect(result.confidence).toBe('high')
  })

  it('classifies RCFE as assisted_living', () => {
    const result = classifyGeneric({}, 'RCFE')
    expect(result.vertical).toBe('assisted_living')
    expect(result.subVertical).toBe('rcfe')
  })

  it('classifies SNAP as grocery with medium confidence', () => {
    const result = classifyGeneric({}, 'SNAP')
    expect(result.vertical).toBe('grocery')
    expect(result.confidence).toBe('medium')
  })

  it('classifies CDE_PUBLIC as school', () => {
    const result = classifyGeneric({}, 'CDE_PUBLIC')
    expect(result.vertical).toBe('school')
    expect(result.subVertical).toBe('public_school')
  })
})
