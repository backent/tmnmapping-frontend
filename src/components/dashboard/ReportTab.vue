<script setup lang="ts">
import { computed, watch } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { DashboardReport, DashboardFilters } from '@/types/dashboard'

const props = defineProps<{
  report: DashboardReport | null
  isLoading: boolean
  filters: DashboardFilters
}>()

const emit = defineEmits<{
  (e: 'filter-change', filters: DashboardFilters): void
}>()

const localPic = computed({
  get: () => props.filters.pic,
  set: (val: string) => emit('filter-change', { ...props.filters, pic: val }),
})

const localMonth = computed({
  get: () => props.filters.month,
  set: (val: string) => emit('filter-change', { ...props.filters, month: val }),
})

// Stat cards
const statCards = computed(() => {
  if (!props.report) return []
  const { total, by_status } = props.report.stats
  const entries = Object.entries(by_status).sort((a, b) => b[1] - a[1])
  return [
    { label: 'Total', value: total, color: 'primary' },
    ...entries.slice(0, 3).map(([label, value]) => ({ label, value, color: 'secondary' })),
  ]
})

// Bar chart — grouped vertical bars: persons × building_type
const barChartSeries = computed(() => {
  if (!props.report?.by_person_building_type?.length) return []
  const types = new Set<string>()
  props.report.by_person_building_type.forEach(p => Object.keys(p.by_type).forEach(t => types.add(t)))
  return Array.from(types).map(type => ({
    name: type,
    data: props.report!.by_person_building_type.map(p => p.by_type[type] || 0),
  }))
})

const barChartCategories = computed(() =>
  props.report?.by_person_building_type?.map(p => p.person) || [],
)

const barChartOptions = computed(() => ({
  chart: { type: 'bar', toolbar: { show: false } },
  plotOptions: { bar: { columnWidth: '60%', grouped: true } },
  xaxis: { categories: barChartCategories.value },
  yaxis: { title: { text: 'Count' } },
  legend: { position: 'top' },
  dataLabels: { enabled: false },
}))

// Horizontal stacked bar — persons × workflow_state
const knownStatusColors: Record<string, string> = {
  'LOI Signed': '#4CAF50',
  'On Negotiation': '#FFC107',
  'Rejected': '#F44336',
  'Submitted': '#2196F3',
  'Cancelled': '#9E9E9E',
  'LOI Sent': '#9C27B0',
  'Approved': '#00BCD4',
  'Review': '#FF9800',
  'Draft': '#607D8B',
}

const fallbackPalette = [
  '#E91E63',
  '#673AB7',
  '#3F51B5',
  '#009688',
  '#CDDC39',
  '#795548',
  '#FF5722',
  '#03A9F4',
]

const stackedBarSeries = computed(() => {
  if (!props.report?.by_person_status?.length) return []
  const statuses = new Set<string>()
  props.report.by_person_status.forEach(p => Object.keys(p.by_status).forEach(s => statuses.add(s)))
  return Array.from(statuses).map(status => ({
    name: status,
    data: props.report!.by_person_status.map(p => p.by_status[status] || 0),
  }))
})

const stackedBarCategories = computed(() =>
  props.report?.by_person_status?.map(p => p.person) || [],
)

const stackedBarColors = computed(() => {
  let fallbackIdx = 0

  return stackedBarSeries.value.map(
    s => knownStatusColors[s.name] || fallbackPalette[fallbackIdx++ % fallbackPalette.length],
  )
})

const stackedBarOptions = computed(() => ({
  chart: { type: 'bar', stacked: true, toolbar: { show: false } },
  plotOptions: { bar: { horizontal: true, barHeight: '60%' } },
  xaxis: { categories: stackedBarCategories.value, title: { text: 'Count' } },
  yaxis: {},
  legend: { position: 'top' },
  dataLabels: { enabled: false },
  colors: stackedBarColors.value,
}))

const hasBuildingTypeData = computed(() => barChartSeries.value.length > 0)
const hasStatusData = computed(() => stackedBarSeries.value.length > 0)
</script>

<template>
  <div>
    <!-- Filter row -->
    <VRow class="mb-4 mt-2">
      <VCol cols="12" md="4">
        <VAutocomplete
          v-model="localPic"
          :items="report?.pics || []"
          label="Filter by PIC"
          clearable
          density="compact"
          hide-details
          placeholder="All PICs"
        />
      </VCol>
      <VCol cols="12" md="3">
        <VTextField
          v-model="localMonth"
          label="Filter by Month"
          type="month"
          clearable
          density="compact"
          hide-details
        />
      </VCol>
    </VRow>

    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="d-flex justify-center align-center"
      style="min-height: 200px;"
    >
      <VProgressCircular
        indeterminate
        color="primary"
        size="48"
      />
    </div>

    <template v-else-if="report">
      <!-- Stat cards -->
      <VRow class="mb-4">
        <VCol
          v-for="card in statCards"
          :key="card.label"
          cols="12"
          sm="6"
          md="3"
        >
          <VCard
            :color="card.color"
            variant="tonal"
          >
            <VCardText class="text-center pa-4">
              <div class="text-h3 font-weight-bold mb-1">
                {{ card.value }}
              </div>
              <div class="text-body-2 text-capitalize">
                {{ card.label }}
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>

      <!-- Charts -->
      <VRow>
        <!-- Grouped bar: by person × building type -->
        <VCol cols="12" md="6">
          <VCard>
            <VCardTitle class="text-body-1 font-weight-medium pa-4 pb-0">
              By Person & Building Type
            </VCardTitle>
            <VCardText>
              <VueApexCharts
                v-if="hasBuildingTypeData"
                type="bar"
                height="320"
                :series="barChartSeries"
                :options="barChartOptions"
              />
              <div
                v-else
                class="d-flex align-center justify-center"
                style="height: 320px;"
              >
                <span class="text-medium-emphasis">No data available</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <!-- Horizontal stacked bar: by person × status -->
        <VCol cols="12" md="6">
          <VCard>
            <VCardTitle class="text-body-1 font-weight-medium pa-4 pb-0">
              By Person & Status
            </VCardTitle>
            <VCardText>
              <VueApexCharts
                v-if="hasStatusData"
                type="bar"
                height="320"
                :series="stackedBarSeries"
                :options="stackedBarOptions"
              />
              <div
                v-else
                class="d-flex align-center justify-center"
                style="height: 320px;"
              >
                <span class="text-medium-emphasis">No data available</span>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </template>

    <!-- Empty state -->
    <div
      v-else
      class="d-flex justify-center align-center"
      style="min-height: 200px;"
    >
      <span class="text-medium-emphasis">No report data available.</span>
    </div>
  </div>
</template>
