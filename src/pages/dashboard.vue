<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'
import { useDashboardStore } from '@/stores/dashboard'
import ReportTab from '@/components/dashboard/ReportTab.vue'
import type { DashboardFilters } from '@/types/dashboard'

const dashboardStore = useDashboardStore()
const activeTab = ref('acquisition')

// Fixed LCD status order for consistent column display
const LCD_STATUSES = ['TMN', 'Competitor', 'CoExist', 'Opportunity']

const lcdSummary = computed(() => dashboardStore.buildingLCDPresence.data)
const lcdLoading = computed(() => dashboardStore.buildingLCDPresence.isLoading)

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

function getCount(byStatus: Record<string, number>, status: string): number {
  return byStatus?.[status] ?? 0
}

function getPct(percentages: Record<string, number>, status: string): string {
  const v = percentages?.[status]
  return v != null ? `${v}%` : '0%'
}

async function downloadLCDPresenceExcel() {
  const summary = lcdSummary.value
  if (!summary) return

  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  // ── Section 1 header: All Occupied + Market Exclusivity
  const s1Headers1: (string | null)[] = [
    'All Occupied', null, null, null, null, null,
    'Market Exclusivity', null, null, null, null,
  ]
  const s1Headers2 = [
    'City - All Building', 'All', 'Total TMN', 'Total Competitor', 'Total CoExist', 'Total Opportunity',
    'TMN %', 'Competitor %', 'CoExist %', 'Opportunity %',
  ]

  const s1Rows = summary.data.map(row => [
    row.citytown,
    row.total,
    getCount(row.by_status, 'TMN'),
    getCount(row.by_status, 'Competitor'),
    getCount(row.by_status, 'CoExist'),
    getCount(row.by_status, 'Opportunity'),
    getPct(row.percentages, 'TMN'),
    getPct(row.percentages, 'Competitor'),
    getPct(row.percentages, 'CoExist'),
    getPct(row.percentages, 'Opportunity'),
  ])

  const totals = summary.totals
  const s1Total = [
    'Total',
    totals.total,
    getCount(totals.by_status, 'TMN'),
    getCount(totals.by_status, 'Competitor'),
    getCount(totals.by_status, 'CoExist'),
    getCount(totals.by_status, 'Opportunity'),
    getPct(totals.percentages, 'TMN'),
    getPct(totals.percentages, 'Competitor'),
    getPct(totals.percentages, 'CoExist'),
    getPct(totals.percentages, 'Opportunity'),
  ]

  const aoa = [
    s1Headers1,
    s1Headers2,
    ...s1Rows,
    s1Total,
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Set column widths
  ws['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
    { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'LCD Presence Summary')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const filename = `TMN - LCD Presence Summary - ${dayjs().format('DD-MM-YYYY')}.xlsx`
  saveAs(blob, filename)
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

    <!-- LCD Presence Summary -->
    <VCol cols="12">
      <VCard>
        <VCardTitle class="pa-4 pb-0 mb-5 d-flex align-center justify-space-between">
          <h2 class="text-h5">
            Building LCD Presence Summary
          </h2>
          <VBtn
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-download"
            :disabled="lcdLoading || !lcdSummary"
            @click="downloadLCDPresenceExcel"
          >
            Download Excel
          </VBtn>
        </VCardTitle>

        <VCardText>
          <VProgressLinear
            v-if="lcdLoading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <template v-else-if="lcdSummary">
            <div
              
            >
              <VTable
                density="compact"
                height="480px"
                fixed-header
                fixed-footer
                striped="odd"
              >
                <thead>
                  <tr>
                    <th>City</th>
                    <th class="text-right">
                      All
                    </th>
                    <th
                      v-for="status in LCD_STATUSES"
                      :key="status"
                      class="text-right"
                    >
                      Total {{ status }}
                    </th>
                    <th
                      v-for="status in LCD_STATUSES"
                      :key="'pct-' + status"
                      class="text-right"
                    >
                      {{ status }} %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in lcdSummary.data"
                    :key="row.citytown"
                  >
                    <td>{{ row.citytown }}</td>
                    <td class="text-right">
                      {{ row.total.toLocaleString() }}
                    </td>
                    <td
                      v-for="status in LCD_STATUSES"
                      :key="status"
                      class="text-right"
                    >
                      {{ (row.by_status[status] ?? 0).toLocaleString() }}
                    </td>
                    <td
                      v-for="status in LCD_STATUSES"
                      :key="'pct-' + status"
                      class="text-right"
                    >
                      {{ row.percentages[status] != null ? `${row.percentages[status]}%` : '0%' }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="font-weight-bold bg-secondary text-white">
                    <td>Total</td>
                    <td class="text-right">
                      {{ lcdSummary.totals.total.toLocaleString() }}
                    </td>
                    <td
                      v-for="status in LCD_STATUSES"
                      :key="status"
                      class="text-right"
                    >
                      {{ (lcdSummary.totals.by_status[status] ?? 0).toLocaleString() }}
                    </td>
                    <td
                      v-for="status in LCD_STATUSES"
                      :key="'pct-' + status"
                      class="text-right"
                    >
                      {{ lcdSummary.totals.percentages[status] != null ? `${lcdSummary.totals.percentages[status]}%` : '0%' }}
                    </td>
                  </tr>
                </tfoot>
              </VTable>
            </div>
          </template>

          <VAlert
            v-else
            type="info"
            variant="tonal"
          >
            No building LCD presence data available.
          </VAlert>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
