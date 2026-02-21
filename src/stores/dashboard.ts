import { defineStore } from 'pinia'
import { getAcquisitionReport, getBuildingProposalReport, getLOIReport } from '@/http/dashboard'
import type { DashboardReport, DashboardFilters } from '@/types/dashboard'

interface ResourceState {
  report: DashboardReport | null
  isLoading: boolean
  filters: DashboardFilters
}

function defaultResourceState(): ResourceState {
  return {
    report: null,
    isLoading: false,
    filters: { pic: '', year: '', month: '' },
  }
}

interface DashboardState {
  acquisition: ResourceState
  buildingProposal: ResourceState
  loi: ResourceState
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    acquisition: defaultResourceState(),
    buildingProposal: defaultResourceState(),
    loi: defaultResourceState(),
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

    async fetchAllReports() {
      await Promise.all([
        this.fetchAcquisitionReport(),
        this.fetchBuildingProposalReport(),
        this.fetchLOIReport(),
      ])
    },
  },
})
