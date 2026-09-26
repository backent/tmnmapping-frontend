<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useQuotationStore } from '@/stores/quotation'
import { useAuthStore } from '@/stores/auth'
import {
  QUOTATION_STATUS_COLORS,
  QUOTATION_STATUS_LABELS,
  formatIdr,
} from '@/types/quotation'
import type { Quotation } from '@/types/quotation'
import { extractApiError } from '@/utils/apiError'

const router = useRouter()
const store = useQuotationStore()
const authStore = useAuthStore()

// Approvers get a second tab for their queue. Everyone else only ever sees their
// own pipeline, which the server enforces regardless of what the client asks for.
const canApprove = computed(() => authStore.can('quotations.approve'))

const tab = ref<'mine' | 'queue'>('mine')
const statusFilter = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const items = computed(() => store.items)
const counts = computed(() => store.counts)
const totalPages = computed(() => Math.ceil(store.pagination.total / itemsPerPage.value) || 1)

// Mirrors the reference app's five-card metric grid, including the explanatory
// note under each number.
const metrics = computed(() => [
  { label: 'Draft', value: counts.value.draft, color: 'secondary', status: 'draft', note: 'Not submitted yet' },
  { label: 'Returned', value: counts.value.returned, color: 'error', status: 'returned', note: 'Sent back for changes' },
  { label: 'Pending', value: counts.value.pending, color: 'warning', status: '', note: 'Waiting on an approver' },
  { label: 'Approved', value: counts.value.approved, color: 'success', status: 'approved', note: 'Signed off' },
  { label: 'All', value: counts.value.all, color: 'info', status: '', note: 'Everything you own' },
])

const statusOptions = [
  { title: 'All statuses', value: '' },
  ...Object.entries(QUOTATION_STATUS_LABELS).map(([value, title]) => ({ title, value })),
]

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const fetchItems = async () => {
  try {
    await store.fetchList({
      take: itemsPerPage.value,
      skip: (currentPage.value - 1) * itemsPerPage.value,
      orderBy: 'created_at',
      orderDirection: 'DESC',
      status: statusFilter.value || undefined,
      mine: tab.value === 'mine' || undefined,
      awaiting_me: tab.value === 'queue' || undefined,
      search: searchQuery.value.trim() || undefined,
    })
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to load quotations'), 'error')
  }
}

onMounted(async () => {
  await Promise.all([fetchItems(), store.fetchCounts().catch(() => null)])
})

watch([tab, statusFilter], async () => {
  currentPage.value = 1
  await fetchItems()
})

const handleSearch = () => {
  if (searchTimeout)
    clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchItems()
  }, 300)
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchItems()
}

const open = (item: Quotation) =>
  router.push({ name: 'quotation-detail', params: { id: String(item.id) } })
</script>

<template>
  <VRow>
    <!--
      Metric grid. The three pending statuses collapse into one number: what a
      seller needs to know is whether it is with them or with an approver.
    -->
    <VCol cols="12">
      <VRow dense>
        <VCol
          v-for="metric in metrics"
          :key="metric.label"
          cols="6"
          md="auto"
          class="flex-grow-1"
        >
          <VCard
            :color="metric.color"
            variant="tonal"
            style="cursor: pointer"
            @click="statusFilter = metric.status; tab = 'mine'"
          >
            <VCardText class="py-3">
              <div class="text-h4 font-weight-medium">
                {{ metric.value }}
              </div>
              <div class="text-body-2">
                {{ metric.label }}
              </div>
              <div class="text-caption text-disabled">
                {{ metric.note }}
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VCol>

    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span>Quotations</span>
          <VBtn
            v-if="authStore.canCreateQuotations"
            color="primary"
            @click="router.push({ name: 'quotation-new' })"
          >
            <VIcon
              icon="ri-add-line"
              class="me-1"
            />
            New Quotation
          </VBtn>
        </VCardTitle>

        <VTabs
          v-if="canApprove"
          v-model="tab"
        >
          <VTab value="mine">
            My quotations
          </VTab>
          <VTab value="queue">
            Awaiting my approval
          </VTab>
        </VTabs>

        <VCardText>
          <div class="d-flex gap-4 flex-wrap mb-4">
            <VTextField
              v-model="searchQuery"
              label="Search by number, customer or brand"
              prepend-inner-icon="ri-search-line"
              variant="outlined"
              density="compact"
              clearable
              style="max-width: 340px"
              @input="handleSearch"
              @click:clear="searchQuery = ''; handleSearch()"
            />
            <VSelect
              v-model="statusFilter"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              style="max-width: 240px"
            />
          </div>

          <div
            v-if="store.isLoading"
            class="d-flex justify-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>

          <div v-else>
            <VTable>
              <thead>
                <tr>
                  <th class="text-uppercase">
                    Quotation
                  </th>
                  <th class="text-uppercase">
                    Customer / Brand
                  </th>
                  <th class="text-uppercase">
                    Discount
                  </th>
                  <th class="text-uppercase text-end">
                    Nett
                  </th>
                  <th class="text-uppercase">
                    Status
                  </th>
                  <th class="text-uppercase">
                    Waiting on
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.id"
                  style="cursor: pointer"
                  @click="open(item)"
                >
                  <td>
                    <div class="font-weight-medium">
                      {{ item.quote_number }}
                    </div>
                    <div class="text-caption text-disabled">
                      {{ item.sales_name }}
                      <span v-if="item.is_proxy_entry"> · entered by {{ item.created_by_name }}</span>
                      <span v-if="item.version > 1"> · v{{ item.version }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="text-body-2">
                      {{ item.customer_name }}
                    </div>
                    <div class="text-caption text-disabled">
                      {{ item.brand_name }}
                    </div>
                  </td>
                  <td>{{ item.discount }}%</td>
                  <td class="text-end font-weight-medium">
                    {{ formatIdr(item.pricing.total_net) }}
                  </td>
                  <td>
                    <VChip
                      size="small"
                      :color="QUOTATION_STATUS_COLORS[item.status]"
                      variant="tonal"
                    >
                      {{ QUOTATION_STATUS_LABELS[item.status] }}
                    </VChip>
                  </td>
                  <td>
                    <span class="text-body-2">{{ item.required_approver_name || '—' }}</span>
                  </td>
                </tr>
                <tr v-if="items.length === 0">
                  <td
                    colspan="6"
                    class="text-center text-disabled py-8"
                  >
                    {{ tab === 'queue'
                      ? 'Nothing is waiting on your approval.'
                      : 'No quotations yet. Click "New Quotation" to build one.' }}
                  </td>
                </tr>
              </tbody>
            </VTable>

            <div
              v-if="store.pagination.total > itemsPerPage"
              class="d-flex justify-end mt-4"
            >
              <VPagination
                v-model="currentPage"
                :length="totalPages"
                :total-visible="5"
                density="compact"
                @update:model-value="handlePageChange"
              />
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>
