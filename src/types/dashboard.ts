export interface StatsSummary {
  total: number
  by_status: Record<string, number>
}

export interface PersonTypeStat {
  person: string
  by_type: Record<string, number>
}

export interface PersonStatusStat {
  person: string
  by_status: Record<string, number>
}

export interface DashboardReport {
  stats: StatsSummary
  by_person_building_type: PersonTypeStat[]
  by_person_status: PersonStatusStat[]
  pics: string[]
}

export interface DashboardFilters {
  pic: string
  year: string
  month: string
}

export interface LCDPresenceCitySummary {
  citytown: string
  total: number
  by_status: Record<string, number>
  percentages: Record<string, number>
}

export interface LCDPresenceTotals {
  total: number
  by_status: Record<string, number>
  percentages: Record<string, number>
}

export interface LCDPresenceSummaryResponse {
  data: LCDPresenceCitySummary[]
  totals: LCDPresenceTotals
}
