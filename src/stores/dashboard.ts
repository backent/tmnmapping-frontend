import { defineStore } from 'pinia'
import { getAcquisitionReport, getBuildingProposalReport, getLOIReport, getBuildingLCDPresenceSummary } from '@/http/dashboard'
import type { DashboardReport, DashboardFilters, LCDPresenceSummaryResponse } from '@/types/dashboard'

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
  acquisition: ResourceState
  buildingProposal: ResourceState
  loi: ResourceState
  buildingLCDPresence: {
    data: LCDPresenceSummaryResponse | null
    isLoading: boolean
  }
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    acquisition: defaultResourceState(),
    buildingProposal: defaultResourceState(),
    loi: defaultResourceState(),
    buildingLCDPresence: {
      data: null,
      isLoading: false,
    },
  }),

  actions: {
    async fetchAcquisitionReport() {
      this.acquisition.isLoading = true
      try {
        const response = await getAcquisitionReport(this.acquisition.filters)
        this.acquisition.report = response.data || null
      }
      catch (error) {
        console.error('Error fetching acquisition report:', error)
        throw error
      }
      finally {
        this.acquisition.isLoading = false
      }
    },

    async fetchBuildingProposalReport() {
      this.buildingProposal.isLoading = true
      try {
        const response = await getBuildingProposalReport(this.buildingProposal.filters)
        this.buildingProposal.report = response.data || null
      }
      catch (error) {
        console.error('Error fetching building proposal report:', error)
        throw error
      }
      finally {
        this.buildingProposal.isLoading = false
      }
    },

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
        this.fetchAcquisitionReport(),
        this.fetchBuildingProposalReport(),
        this.fetchLOIReport(),
        this.fetchBuildingLCDPresenceSummary(),
      ])
    },
  },
})
