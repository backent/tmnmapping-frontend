import type { BuildingProject, SaveBuildingProjectRequest } from '@/types/buildingproject'
import type { ImportResult } from '@/types/advertiser'

/**
 * Price per screen, per YEAR: annual rental divided by screens.
 *
 * Mirrors PricePerScreen in services/buildingproject/response_mapping.go, including
 * the integer division, so the figure the form shows while editing matches the one
 * the server returns after saving. A float here would differ in the last rupiah and
 * look like a bug.
 */
export function pricePerScreen(annualRental: number, screens: number): number | null {
  if (!annualRental || !screens)
    return null

  return Math.floor(annualRental / screens)
}

/** The whole contract: annual rental over its actual length. */
export function contractValue(annualRental: number, periodMonth: number): number | null {
  if (!annualRental || !periodMonth)
    return null

  return Math.floor(annualRental * periodMonth / 12)
}

/**
 * Whether the viewer was served the landlord money at all.
 *
 * The server OMITS those keys rather than sending zero, so `undefined` means "you may
 * not see this" while 0 means "there is none". Reading them as `?? 0` without this
 * distinction would render a withheld rental as "Rp 0", which reads as a fact.
 */
export function hasFinanceFields(project: Pick<BuildingProject, 'annual_rental' | 'company_name' | 'contract_no'>): boolean {
  return project.annual_rental !== undefined
    || project.company_name !== undefined
    || project.contract_no !== undefined
}

/**
 * Fills the form from a project.
 *
 * Withheld finance fields become 0 / '' here, which would normally CLEAR them on save
 * -- the form replaces the record. That is safe only because the server keeps its own
 * copy for a caller without the permission and ignores what they send. If that rule
 * ever changes, this is the line that silently starts wiping rentals.
 */
export function projectToForm(project: BuildingProject): SaveBuildingProjectRequest {
  return {
    project_id_iris: project.project_id_iris,
    name: project.name,
    building_type: project.building_type,
    grade: project.grade,
    pic: project.pic,
    tmn_project_status: project.tmn_project_status,
    no_of_tower: project.no_of_tower,
    no_of_screen: project.no_of_screen,
    created_date: project.created_date,
    remark: project.remark,
    contract_type: project.contract_type,
    contract_no: project.contract_no ?? '',
    contract_date: project.contract_date,
    contract_start: project.contract_start,
    contract_end: project.contract_end,
    period_month: project.period_month,
    annual_rental: project.annual_rental ?? 0,
    payment_term: project.payment_term,
    company_name: project.company_name ?? '',
    exclusivity: project.exclusivity,
    doc_type: project.doc_type,
    contract_status: project.contract_status,
    cancelled_at: project.cancelled_at,
    cancel_last_status: project.cancel_last_status,
    cancel_reason: project.cancel_reason,
  }
}

/**
 * What to tell the operator after an upload.
 *
 * Cleared fields are named explicitly. On this import a blank cell EMPTIES a value,
 * so "12 changed" alone would hide the destructive half of what just happened.
 */
export function importSummary(result: ImportResult | null): string {
  const created = result?.created ?? 0
  const updated = result?.updated ?? 0
  const cleared = result?.cleared ?? 0

  const head = `Projects applied: ${created} new, ${updated} changed`

  if (!cleared)
    return `${head}.`

  return `${head}, ${cleared} field${cleared === 1 ? '' : 's'} cleared.`
}

/** Column heading for a change-log field: `annual_rental` reads as `Annual Rental`. */
export function changeFieldLabel(field: string): string {
  if (!field)
    return '-'

  return field.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase())
}
