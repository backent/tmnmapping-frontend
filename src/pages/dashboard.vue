<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import ReportTab from '@/components/dashboard/ReportTab.vue'
import type { DashboardFilters } from '@/types/dashboard'

const dashboardStore = useDashboardStore()
const activeTab = ref('acquisition')

onMounted(() => {
  dashboardStore.fetchAllReports()
})

onUnmounted(() => {
  dashboardStore.$reset()
})

function onAcquisitionFilterChange(filters: DashboardFilters) {
  dashboardStore.acquisition.filters = filters
  dashboardStore.fetchAcquisitionReport()
}

function onBuildingProposalFilterChange(filters: DashboardFilters) {
  dashboardStore.buildingProposal.filters = filters
  dashboardStore.fetchBuildingProposalReport()
}

function onLOIFilterChange(filters: DashboardFilters) {
  dashboardStore.loi.filters = filters
  dashboardStore.fetchLOIReport()
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="pa-4 pb-0">
          <h2 class="text-h5">
            Assignment & Activities Report
          </h2>
        </VCardTitle>

        <VCardText>
          <VTabs
            v-model="activeTab"
            color="primary"
            class="mb-4"
          >
            <VTab value="acquisition">
              Acquisition
            </VTab>
            <VTab value="building-proposal">
              Building Proposal
            </VTab>
            <VTab value="loi">
              LOI
            </VTab>
          </VTabs>

          <VTabsWindow v-model="activeTab">
            <VTabsWindowItem value="acquisition">
              <ReportTab
                :report="dashboardStore.acquisition.report"
                :is-loading="dashboardStore.acquisition.isLoading"
                :filters="dashboardStore.acquisition.filters"
                @filter-change="onAcquisitionFilterChange"
              />
            </VTabsWindowItem>

            <VTabsWindowItem value="building-proposal">
              <ReportTab
                :report="dashboardStore.buildingProposal.report"
                :is-loading="dashboardStore.buildingProposal.isLoading"
                :filters="dashboardStore.buildingProposal.filters"
                @filter-change="onBuildingProposalFilterChange"
              />
            </VTabsWindowItem>

            <VTabsWindowItem value="loi">
              <ReportTab
                :report="dashboardStore.loi.report"
                :is-loading="dashboardStore.loi.isLoading"
                :filters="dashboardStore.loi.filters"
                @filter-change="onLOIFilterChange"
              />
            </VTabsWindowItem>
          </VTabsWindow>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
