/**
 * What an advertiser pays for one week on one building. One price per building and
 * no versions: a submitted quotation keeps its own copy of every price it was given,
 * so changing a price here never alters a quotation already sent.
 */
export interface BuildingPrice {
  id: number
  building_id: number
  building_name: string
  building_iris_code: string
  building_type: string
  citytown: string
  price_idr_per_week: number
  created_at: string
  updated_at: string
}
