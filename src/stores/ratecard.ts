import { defineStore } from 'pinia'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'
import {
  createRateCardVersion,
  deleteBuildingPrice,
  deletePackagePrice,
  deleteRateCardVersion,
  downloadBuildingPriceTemplate,
  downloadPackagePriceTemplate,
  exportBuildingPrices,
  exportPackagePrices,
  getBuildingPrices,
  getCurrentRateCard,
  getPackagePrices,
  getRateCardVersionById,
  getRateCardVersions,
  importBuildingPrices,
  importPackagePrices,
  publishRateCardVersion,
  updateRateCardVersion,
  upsertBuildingPrice,
  upsertPackagePrice,
} from '@/http/ratecard'
import type {
  BuildingPrice,
  CreateVersionPayload,
  PackagePrice,
  RateCardVersion,
  UpdateVersionPayload,
} from '@/types/ratecard'
import type { ImportResult } from '@/types/advertiser'
import type { PaginationParams } from '@/types/api'

interface Pagination { currentPage: number; lastPage: number; perPage: number; total: number }

function emptyPagination(): Pagination {
  return { currentPage: 1, lastPage: 1, perPage: 10, total: 0 }
}

function derivePagination(extras: any, params?: PaginationParams, fallbackLength = 0): Pagination {
  const take = extras?.take || params?.take || 10
  const skip = extras?.skip ?? params?.skip ?? 0
  const total = extras?.total ?? fallbackLength

  return {
    currentPage: Math.floor(skip / take) + 1,
    lastPage: Math.ceil(total / take) || 1,
    perPage: take,
    total,
  }
}

interface RateCardState {
  versions: RateCardVersion[]
  currentVersion: RateCardVersion | null
  selectedVersion: RateCardVersion | null
  buildingPrices: BuildingPrice[]
  packagePrices: PackagePrice[]
  isLoading: boolean
  isFileBusy: boolean
  lastImport: ImportResult | null
  versionPagination: Pagination
  buildingPagination: Pagination
  packagePagination: Pagination
}

export const useRateCardStore = defineStore('rateCard', {
  state: (): RateCardState => ({
    versions: [],
    currentVersion: null,
    selectedVersion: null,
    buildingPrices: [],
    packagePrices: [],
    isLoading: false,
    isFileBusy: false,
    lastImport: null,
    versionPagination: emptyPagination(),
    buildingPagination: emptyPagination(),
    packagePagination: emptyPagination(),
  }),

  getters: {
    /** Only a draft may be edited; publishing freezes a version for good. */
    isSelectedEditable: (state): boolean => state.selectedVersion?.is_editable === true,
  },

  actions: {
    async fetchVersions(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getRateCardVersions(params)

        this.versions = response.data || []
        this.versionPagination = derivePagination(response.extras, params, this.versions.length)

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * The published rate card the quotation wizard prices against.
     * A 404 here is expected before the first publish, so it is swallowed.
     */
    async fetchCurrentVersion() {
      try {
        const response = await getCurrentRateCard()

        this.currentVersion = response.data || null

        return this.currentVersion
      }
      catch {
        this.currentVersion = null

        return null
      }
    },

    async fetchVersion(id: number) {
      this.isLoading = true
      try {
        const response = await getRateCardVersionById(id)

        this.selectedVersion = response.data || null

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    async createVersion(data: CreateVersionPayload) {
      this.isLoading = true
      try {
        return await createRateCardVersion(data)
      }
      finally {
        this.isLoading = false
      }
    },

    async updateVersion(id: number, data: UpdateVersionPayload) {
      this.isLoading = true
      try {
        const response = await updateRateCardVersion(id, data)

        this.selectedVersion = response.data || this.selectedVersion

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteVersion(id: number) {
      this.isLoading = true
      try {
        await deleteRateCardVersion(id)
        this.versions = this.versions.filter(v => v.id !== id)
      }
      finally {
        this.isLoading = false
      }
    },

    async publishVersion(id: number) {
      this.isLoading = true
      try {
        const response = await publishRateCardVersion(id)

        this.selectedVersion = response.data || this.selectedVersion

        // Publishing demotes whichever version was current, so the cached list and
        // the cached current version are both stale afterwards.
        this.currentVersion = response.data || null

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchBuildingPrices(versionId: number, params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getBuildingPrices(versionId, params)

        this.buildingPrices = response.data || []
        this.buildingPagination = derivePagination(response.extras, params, this.buildingPrices.length)

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchPackagePrices(versionId: number, params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getPackagePrices(versionId, params)

        this.packagePrices = response.data || []
        this.packagePagination = derivePagination(response.extras, params, this.packagePrices.length)

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    async saveBuildingPrice(versionId: number, buildingId: number, price: number) {
      return upsertBuildingPrice(versionId, buildingId, price)
    },

    async savePackagePrice(versionId: number, packageId: number, price: number) {
      return upsertPackagePrice(versionId, packageId, price)
    },

    async removeBuildingPrice(versionId: number, buildingId: number) {
      await deleteBuildingPrice(versionId, buildingId)
      this.buildingPrices = this.buildingPrices.filter(p => p.building_id !== buildingId)
    },

    async removePackagePrice(versionId: number, packageId: number) {
      await deletePackagePrice(versionId, packageId)
      this.packagePrices = this.packagePrices.filter(p => p.sales_package_id !== packageId)
    },

    /**
     * A rejected upload returns 400 with the per-row errors still in the body, so
     * the failure path unwraps them rather than surfacing "request failed".
     */
    async importPrices(versionId: number, file: File, kind: 'building' | 'package') {
      this.isFileBusy = true
      this.lastImport = null
      try {
        const response = kind === 'building'
          ? await importBuildingPrices(versionId, file)
          : await importPackagePrices(versionId, file)

        this.lastImport = response.data || null

        return this.lastImport
      }
      catch (error: any) {
        const rejected = error?.details?.data as ImportResult | undefined
        if (rejected?.errors) {
          this.lastImport = rejected

          return rejected
        }

        throw error
      }
      finally {
        this.isFileBusy = false
      }
    },

    async exportPrices(versionId: number, versionCode: string, kind: 'building' | 'package') {
      this.isFileBusy = true
      try {
        const blob = kind === 'building'
          ? await exportBuildingPrices(versionId)
          : await exportPackagePrices(versionId)

        const label = kind === 'building' ? 'Building' : 'Package'

        saveAs(blob, `Rate_Card_${versionCode}_${label}_Prices_${dayjs().format('DD-MM-YYYY')}.xlsx`)
      }
      finally {
        this.isFileBusy = false
      }
    },

    async downloadTemplate(kind: 'building' | 'package') {
      this.isFileBusy = true
      try {
        const blob = kind === 'building'
          ? await downloadBuildingPriceTemplate()
          : await downloadPackagePriceTemplate()

        const label = kind === 'building' ? 'Building' : 'Package'

        saveAs(blob, `Rate_Card_${label}_Prices_Template.xlsx`)
      }
      finally {
        this.isFileBusy = false
      }
    },

    clearImportResult() {
      this.lastImport = null
    },

    clearSelection() {
      this.selectedVersion = null
      this.buildingPrices = []
      this.packagePrices = []
    },
  },
})
