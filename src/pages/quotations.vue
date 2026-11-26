<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useQuotationStore } from '@/stores/quotation'
import { useAuthStore } from '@/stores/auth'
import {
  PENDING_STATUS_FILTER,
  QUOTATION_STATUS_COLORS,
  QUOTATION_STATUS_LABELS,
  campaignSummary,
  discountBandColor,
  formatIdr,
  isPending,
  isUnpriced,
} from '@/types/quotation'
import type { Quotation } from '@/types/quotation'
import { extractApiError } from '@/utils/apiError'
import { formatCalendarDate, formatRelativeDay, isPastCalendarDate } from '@/utils/date'
import { useTableSort } from '@/composables/useTableSort'
import SortableTh from '@/components/common/SortableTh.vue'

const router = useRouter()
const store = useQuotationStore()
const authStore = useAuthStore()

// Approvers get a second view for their queue. Everyone else only ever sees their
// own pipeline, which the server enforces regardless of what the client asks for.
const canApprove = computed(() => authStore.can('quotations.approve'))

const view = ref<'mine' | 'queue'>('mine')
const statusFilter = ref('')
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const deleteDialog = ref(false)
const itemToDelete = ref<Quotation | null>(null)
const isDeleting = ref(false)

const items = computed(() => store.items)
const counts = computed(() => store.counts)
const totalPages = computed(() => Math.ceil(store.pagination.total / itemsPerPage.value) || 1)

/**
 * The status tabs replace both the old metric cards and the Status dropdown: the
 * same counts in a third of the height, and the selected filter is visible. The three
 * pending statuses are one tab because what a seller needs to know is whether it is
 * with them or with an approver; the row's chip still says which approver.
 *
 * The counts cover the user's own pipeline, so the tabs belong to "My quotations"
 * only. The approval queue is all pending by definition.
 */
const statusTabs = computed(() => [
  { label: 'All', value: '', count: counts.value.all },
  { label: 'Draft', value: 'draft', count: counts.value.draft },
  { label: 'Returned', value: 'returned', count: counts.value.returned, alert: true },
  { label: 'Pending', value: PENDING_STATUS_FILTER, count: counts.value.pending },
  { label: 'Approved', value: 'approved', count: counts.value.approved },
])

const hasFilter = computed(() => !!statusFilter.value || !!searchQuery.value.trim())

// The skeleton keeps the table's shape while a page loads, so it does not collapse to
// a spinner and jump back. As many rows as were there, so the page height holds.
const skeletonRows = computed(() => Math.min(Math.max(items.value.length, 3), itemsPerPage.value))

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const { orderBy, orderDirection, toggle } = useTableSort('created_at', 'DESC')

const fetchItems = async () => {
  try {
    await store.fetchList({
      take: itemsPerPage.value,
      skip: (currentPage.value - 1) * itemsPerPage.value,
      orderBy: orderBy.value,
      orderDirection: orderDirection.value,
      status: view.value === 'mine' ? statusFilter.value || undefined : undefined,
      mine: view.value === 'mine' || undefined,
      awaiting_me: view.value === 'queue' || undefined,
      search: searchQuery.value.trim() || undefined,
    })
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to load quotations'), 'error')
  }
}

const fetchCounts = () => store.fetchCounts().catch(() => null)

const handleSort = (column: string) => {
  toggle(column)
  currentPage.value = 1
  fetchItems()
}

onMounted(async () => {
  await Promise.all([fetchItems(), fetchCounts()])
})

watch([view, statusFilter], async () => {
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

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  handleSearch()
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchItems()
}

const open = (item: Quotation) =>
  router.push({ name: 'quotation-detail', params: { id: String(item.id) } })

// The server enforces both rules; these only avoid offering an action that would be
// refused. Only the owner edits, and only a draft is deleted -- a returned quotation
// is on the approval record and is resubmitted, not thrown away.
const isMine = (item: Quotation) => item.sales_user_id === authStore.currentUser?.id
const canEdit = (item: Quotation) => item.is_editable && isMine(item)
const canDelete = (item: Quotation) => item.status === 'draft' && isMine(item)

const confirmDelete = (item: Quotation) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value)
    return

  isDeleting.value = true
  try {
    await store.remove(itemToDelete.value.id)
    notify(`${itemToDelete.value.quote_number} deleted`)
    deleteDialog.value = false
    itemToDelete.value = null
    await Promise.all([fetchItems(), fetchCounts()])
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to delete the quotation'), 'error')
  }
  finally {
    isDeleting.value = false
  }
}

// Band names in words, so the dot is never the only signal.
const bandLabel = (discount: number) => ({
  success: 'Standard band',
  warning: 'Elevated band',
  error: 'Executive band',
}[discountBandColor(discount)])

const isExpired = (item: Quotation) => item.status !== 'draft' && isPastCalendarDate(item.valid_until)
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center flex-wrap gap-3 pt-4">
          <span>Quotations</span>

          <!--
            VBtnGroup, not VBtnToggle: the template's _button.scss forces every
            .v-btn-toggle .v-btn to a 44px square, which overlaps text labels.
          -->
          <VBtnGroup
            v-if="canApprove"
            divided
            density="compact"
          >
            <VBtn
              :color="view === 'mine' ? 'primary' : 'default'"
              :variant="view === 'mine' ? 'tonal' : 'outlined'"
              @click="view = 'mine'"
            >
              My quotations
            </VBtn>
            <VBtn
              :color="view === 'queue' ? 'primary' : 'default'"
              :variant="view === 'queue' ? 'tonal' : 'outlined'"
              @click="view = 'queue'"
            >
              Awaiting my approval
              <VChip
                v-if="counts.awaiting_me"
                size="x-small"
                color="error"
                variant="flat"
                class="ms-2"
              >
                {{ counts.awaiting_me }}
              </VChip>
            </VBtn>
          </VBtnGroup>

          <VSpacer />

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
          v-if="view === 'mine'"
          v-model="statusFilter"
          class="px-2"
        >
          <VTab
            v-for="tab in statusTabs"
            :key="tab.label"
            :value="tab.value"
          >
            {{ tab.label }}
            <VChip
              size="x-small"
              :color="tab.alert && tab.count ? 'error' : undefined"
              :variant="tab.alert && tab.count ? 'flat' : 'tonal'"
              class="ms-2"
            >
              {{ tab.count }}
            </VChip>
          </VTab>
        </VTabs>
        <VDivider />

        <VCardText>
          <div class="d-flex align-center gap-4 flex-wrap mb-4">
            <VTextField
              v-model="searchQuery"
              label="Search by number, customer or brand"
              prepend-inner-icon="ri-search-line"
              variant="outlined"
              density="compact"
              clearable
              hide-details
              style="max-width: 340px"
              @input="handleSearch"
              @click:clear="searchQuery = ''; handleSearch()"
            />
            <VSpacer />
            <span
              v-if="!store.isLoading"
              class="text-body-2 text-disabled"
            >
              {{ store.pagination.total }} {{ store.pagination.total === 1 ? 'quotation' : 'quotations' }}
            </span>
          </div>

          <VTable>
            <thead>
              <tr>
                <SortableTh
                  column="quote_number"
                  :order-by="orderBy"
                  :order-direction="orderDirection"
                  @sort="handleSort"
                >
                  Quotation
                </SortableTh>
                <SortableTh
                  column="customer_name"
                  :order-by="orderBy"
                  :order-direction="orderDirection"
                  @sort="handleSort"
                >
                  Customer / Brand
                </SortableTh>
                <th class="text-uppercase">
                  Campaign
                </th>
                <th class="text-uppercase">
                  Discount
                </th>
                <SortableTh
                  column="total_net"
                  :order-by="orderBy"
                  :order-direction="orderDirection"
                  align="end"
                  @sort="handleSort"
                >
                  Nett
                </SortableTh>
                <SortableTh
                  column="status"
                  :order-by="orderBy"
                  :order-direction="orderDirection"
                  @sort="handleSort"
                >
                  Status
                </SortableTh>
                <SortableTh
                  column="updated_at"
                  :order-by="orderBy"
                  :order-direction="orderDirection"
                  @sort="handleSort"
                >
                  Updated
                </SortableTh>
                <th />
              </tr>
            </thead>

            <tbody v-if="store.isLoading">
              <tr
                v-for="n in skeletonRows"
                :key="`skeleton-${n}`"
              >
                <td
                  v-for="col in 8"
                  :key="col"
                >
                  <VSkeletonLoader
                    type="text"
                    :width="col === 8 ? 24 : undefined"
                  />
                </td>
              </tr>
            </tbody>

            <tbody v-else>
              <tr
                v-for="item in items"
                :key="item.id"
                style="cursor: pointer"
                @click="open(item)"
              >
                <td>
                  <div class="d-flex align-center gap-2 font-weight-medium text-no-wrap">
                    {{ item.quote_number }}
                    <VChip
                      v-if="item.version > 1"
                      size="x-small"
                      variant="outlined"
                    >
                      v{{ item.version }}
                    </VChip>
                  </div>
                  <div class="text-caption text-disabled">
                    {{ item.sales_name }}
                    <span v-if="item.is_proxy_entry"> · entered by {{ item.created_by_name }}</span>
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
                <td>
                  <div class="text-body-2">
                    {{ campaignSummary(item.campaign).main }}
                  </div>
                  <div class="text-caption text-disabled">
                    {{ campaignSummary(item.campaign).sub }}
                  </div>
                </td>
                <td>
                  <span
                    class="d-inline-flex align-center gap-2"
                    :title="bandLabel(item.discount)"
                  >
                    <VIcon
                      icon="ri-circle-fill"
                      size="8"
                      :color="discountBandColor(item.discount)"
                      :aria-label="bandLabel(item.discount)"
                    />
                    {{ item.discount }}%
                  </span>
                </td>
                <!-- A draft is priced on submit, so its zero is not a price. -->
                <td
                  v-if="isUnpriced(item.status)"
                  class="text-end text-caption text-disabled font-italic"
                >
                  Not priced yet
                </td>
                <td
                  v-else
                  class="text-end font-weight-medium"
                >
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
                  <div
                    v-if="isPending(item.status) && item.required_approver_name"
                    class="text-caption text-disabled"
                  >
                    with {{ item.required_approver_name }}
                  </div>
                  <div
                    v-if="isExpired(item)"
                    class="text-caption text-error"
                  >
                    Expired {{ formatCalendarDate(item.valid_until) }}
                  </div>
                </td>
                <td class="text-body-2 text-disabled text-no-wrap">
                  {{ formatRelativeDay(item.updated_at) }}
                </td>
                <td
                  class="text-end"
                  @click.stop
                >
                  <VMenu location="bottom end">
                    <template #activator="{ props: menuProps }">
                      <VBtn
                        v-bind="menuProps"
                        icon
                        size="small"
                        variant="text"
                        :aria-label="`Actions for ${item.quote_number}`"
                      >
                        <VIcon icon="ri-more-2-fill" />
                      </VBtn>
                    </template>
                    <VList density="compact">
                      <VListItem
                        prepend-icon="ri-eye-line"
                        title="Open"
                        @click="open(item)"
                      />
                      <VListItem
                        v-if="canEdit(item)"
                        prepend-icon="ri-edit-line"
                        title="Edit"
                        @click="router.push({ name: 'quotation-edit', params: { id: String(item.id) } })"
                      />
                      <VListItem
                        prepend-icon="ri-file-text-line"
                        title="Document"
                        @click="router.push({ name: 'quotation-document', params: { id: String(item.id) } })"
                      />
                      <VListItem
                        v-if="canDelete(item)"
                        prepend-icon="ri-delete-bin-line"
                        title="Delete draft"
                        base-color="error"
                        @click="confirmDelete(item)"
                      />
                    </VList>
                  </VMenu>
                </td>
              </tr>

              <tr v-if="items.length === 0">
                <td
                  colspan="8"
                  class="text-center py-10"
                >
                  <template v-if="view === 'queue'">
                    <div class="text-disabled">
                      Nothing is waiting on your approval.
                    </div>
                  </template>
                  <template v-else-if="hasFilter">
                    <div class="text-disabled mb-3">
                      No quotations match these filters.
                    </div>
                    <VBtn
                      variant="outlined"
                      size="small"
                      @click="clearFilters"
                    >
                      Clear filters
                    </VBtn>
                  </template>
                  <template v-else>
                    <div class="text-disabled mb-3">
                      No quotations yet.
                    </div>
                    <VBtn
                      v-if="authStore.canCreateQuotations"
                      color="primary"
                      size="small"
                      @click="router.push({ name: 'quotation-new' })"
                    >
                      <VIcon
                        icon="ri-add-line"
                        class="me-1"
                      />
                      New Quotation
                    </VBtn>
                  </template>
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
        </VCardText>
      </VCard>
    </VCol>

    <!-- A draft has no approval record, so deleting it loses only the draft itself. -->
    <VDialog
      v-model="deleteDialog"
      max-width="440"
    >
      <VCard>
        <VCardTitle>Delete draft</VCardTitle>
        <VCardText>
          Delete draft "<strong>{{ itemToDelete?.quote_number }}</strong>" for
          {{ itemToDelete?.customer_name }}? This cannot be undone.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            @click="deleteDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            :loading="isDeleting"
            @click="handleDelete"
          >
            Delete
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>
