/**
 * A building project: the site a contract is signed for -- Gading Resort Residence,
 * not its 31 towers. Buildings belong to one.
 *
 * The money here is COST, what TMN pays the landlord, unlike every other figure in
 * this app. The three finance fields and the two derived from them are ABSENT from
 * the response for a caller without `building-projects.finance` -- not zero, not
 * empty -- so `undefined` means "you may not see this", never "there is none".
 */
export interface BuildingProject {
  id: number

  project_id_iris: string
  name: string

  building_type: string
  grade: string
  pic: string
  tmn_project_status: string

  no_of_tower: number
  no_of_screen: number

  created_date: string
  remark: string

  contract_type: string
  contract_date: string
  contract_start: string
  contract_end: string
  period_month: number
  payment_term: string
  exclusivity: string
  doc_type: string
  contract_status: string

  cancelled_at: string
  cancel_last_status: string
  cancel_reason: string

  /** Gated by `building-projects.finance`. Absent, not zero, when withheld. */
  annual_rental?: number
  company_name?: string
  contract_no?: string

  /** Derived on read from annual_rental, so gated with it. */
  price_per_screen?: number
  contract_value?: number

  /** How many buildings carry this project. Joined, not stored. */
  building_count: number

  created_at: string
  updated_at: string
}

/**
 * The form payload. Create and update are the same shape: the form REPLACES the
 *  record, so every field is sent and a blank clears it.
 */
export interface SaveBuildingProjectRequest {
  project_id_iris: string
  name: string
  building_type: string
  grade: string
  pic: string
  tmn_project_status: string
  no_of_tower: number
  no_of_screen: number
  created_date: string
  remark: string
  contract_type: string
  contract_no: string
  contract_date: string
  contract_start: string
  contract_end: string
  period_month: number
  annual_rental: number
  payment_term: string
  company_name: string
  exclusivity: string
  doc_type: string
  contract_status: string
  cancelled_at: string
  cancel_last_status: string
  cancel_reason: string
}

/**
 * One field of one project changing. `old_value` and `new_value` come back empty for
 * a finance field when the viewer lacks the permission -- the field and the actor are
 * still named, because that a rental changed is not itself secret.
 */
export interface BuildingProjectChange {
  id: number
  project_id: number
  project_id_iris: string
  actor_user_id: number
  actor_name: string
  actor_role: string
  action: 'created' | 'updated' | 'deleted'
  source: 'form' | 'import'

  /** Groups one upload. Empty for a form edit. */
  batch_id: string
  field: string
  old_value: string
  new_value: string
  created_at: string
}
