import { describe, expect, it } from 'vitest'
import { isEchoOfSelection, withSelectedOption } from '@/utils/autocompleteOptions'
import type { AutocompleteOption } from '@/utils/autocompleteOptions'

const menara: AutocompleteOption = { title: 'Menara Astra (IRIS-123)', value: 7 }
const greenbay: AutocompleteOption = { title: 'Green Bay (IRIS-456)', value: 8 }

describe('withSelectedOption', () => {
  // The bug this exists for: search results are replaced on every query, and an
  // autocomplete holding a value its items cannot label renders the raw id.
  it('keeps the selection when the latest search returned nothing', () => {
    expect(withSelectedOption([], menara)).toEqual([menara])
  })

  it('keeps the selection when the search returned other buildings', () => {
    expect(withSelectedOption([greenbay], menara)).toEqual([menara, greenbay])
  })

  it('does not duplicate a selection the results already contain', () => {
    expect(withSelectedOption([menara, greenbay], menara)).toEqual([menara, greenbay])
  })

  it('returns the results untouched when nothing is selected', () => {
    const options = [menara, greenbay]

    expect(withSelectedOption(options, null)).toBe(options)
  })

  it('matches on value, not on title', () => {
    const renamed = { title: 'Menara Astra — renamed', value: 7 }

    expect(withSelectedOption([renamed], menara)).toEqual([renamed])
  })
})

describe('isEchoOfSelection', () => {
  // Vuetify writes the chosen item's title into the search field on blur. Searching
  // for that label finds nothing, and the empty result is what drops the name.
  it('recognises the title Vuetify writes back on blur', () => {
    expect(isEchoOfSelection('Menara Astra (IRIS-123)', menara)).toBe(true)
  })

  it('ignores surrounding whitespace', () => {
    expect(isEchoOfSelection('  Menara Astra (IRIS-123) ', menara)).toBe(true)
  })

  it('lets a genuine new search through', () => {
    expect(isEchoOfSelection('Menara', menara)).toBe(false)
    expect(isEchoOfSelection('Green Bay (IRIS-456)', menara)).toBe(false)
  })

  it('is false when nothing is selected', () => {
    expect(isEchoOfSelection('Menara Astra (IRIS-123)', null)).toBe(false)
  })

  it('is false for an empty or cleared search', () => {
    expect(isEchoOfSelection('', menara)).toBe(false)
    expect(isEchoOfSelection(null, menara)).toBe(false)
  })
})
