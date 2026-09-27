import { defineStore } from 'pinia'
import { getBuildingLCDPresenceSummary, getLOIReport } from '@/http/dashboard'
import type { DashboardFilters, DashboardReport, LCDPresenceSummaryResponse } from '@/types/dashboard'

interface ResourceState {
  report: DashboardReport | null
  isLoading: boolean
  filters: DashboardFilters
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultResourceState(): ResourceState {
  const today = new Date()
  const weekAgo = new Date(today)

  weekAgo.setDate(today.getDate() - 7)

  return {
    report: null,
    isLoading: false,
    filters: { pics: [], date_from: toISODate(weekAgo), date_to: toISODate(today) },
  }
}

interface DashboardState {
  loi: ResourceState
  buildingLCDPresence: {
    data: LCDPresenceSummaryResponse | null
    isLoading: boolean
  }
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    loi: defaultResourceState(),
    buildingLCDPresence: {
      data: null,
      isLoading: false,
    },
  }),

  actions: {

    async fetchLOIReport() {
      this.loi.isLoading = true
      try {
        const response = await getLOIReport(this.loi.filters)

        this.loi.report = response.data || null
      }
      catch (error) {
        console.error('Error fetching LOI report:', error)
        throw error
      }
      finally {
        this.loi.isLoading = false
      }
    },

    async fetchBuildingLCDPresenceSummary() {
      this.buildingLCDPresence.isLoading = true
      try {
        const response = await getBuildingLCDPresenceSummary()

        this.buildingLCDPresence.data = response.data || null
      }
      catch (error) {
        console.error('Error fetching building LCD presence summary:', error)
        throw error
      }
      finally {
        this.buildingLCDPresence.isLoading = false
      }
    },

    async fetchAllReports() {
      await Promise.all([
        this.fetchLOIReport(),
        this.fetchBuildingLCDPresenceSummary(),
      ])
    },
  },
})
