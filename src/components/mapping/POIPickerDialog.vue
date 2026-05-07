<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCategoryStore } from '@/stores/category'
import { useMotherBrandStore } from '@/stores/motherbrand'
import { usePOIStore } from '@/stores/poi'
import { useSubCategoryStore } from '@/stores/subcategory'
import type { POI } from '@/types/poi'

interface Props {
  modelValue: boolean
  selectedIds: number[]
  selectedPois?: POI[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'apply', payload: { ids: number[]; pois: POI[] }): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedPois: () => [],
})

const emit = defineEmits<Emits>()

const poiStore = usePOIStore()
const categoryStore = useCategoryStore()
const subCategoryStore = useSubCategoryStore()
const motherBrandStore = useMotherBrandStore()

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

const currentPage = ref(1)
const itemsPerPage = ref(10)
const searchQuery = ref('')
const filterCategoryIds = ref<number[]>([])
const filterSubCategoryIds = ref<number[]>([])
const filterMotherBrandIds = ref<number[]>([])
const showSelectedOnly = ref(false)

// Pending selections keyed by id; values are full POI objects so we can return
// them on Apply without forcing the parent/store to re-fetch.
const pendingMap = ref<Map<number, POI>>(new Map())

// Client-side derived list when "Show selected only" is on. Off-page placeholder
// rows (no brand) are filtered out — they're still in pendingMap and will be
// included on Apply, but we don't show blank rows.
const selectedClientList = computed<POI[]>(() => {
  const list = Array.from(pendingMap.value.values()).filter(p => p.brand)
  const q = searchQuery.value.trim().toLowerCase()
  if (!q)
    return list

  return list.filter(p => p.brand.toLowerCase().includes(q))
})

const isLoading = computed(() => !showSelectedOnly.value && poiStore.isLoading)

const totalRecords = computed(() =>
  showSelectedOnly.value
    ? selectedClientList.value.length
    : poiStore.pagination.total,
)

const totalPages = computed(() =>
  showSelectedOnly.value
    ? Math.ceil(selectedClientList.value.length / itemsPerPage.value) || 1
    : poiStore.pagination.lastPage || 1,
)

const pois = computed<POI[]>(() => {
  if (!showSelectedOnly.value)
    return poiStore.pois

  const start = (currentPage.value - 1) * itemsPerPage.value

  return selectedClientList.value.slice(start, start + itemsPerPage.value)
})

const dialogOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

async function fetchPage() {
  const skip = (currentPage.value - 1) * itemsPerPage.value

  const params: Record<string, string | number> = {
    take: itemsPerPage.value,
    skip,
    orderBy: 'created_at',
    orderDirection: 'DESC',
  }

  const q = searchQuery.value.trim()
  if (q)
    params.search = q
  if (filterCategoryIds.value.length > 0)
    params.category_ids = filterCategoryIds.value.join(',')
  if (filterSubCategoryIds.value.length > 0)
    params.sub_category_ids = filterSubCategoryIds.value.join(',')
  if (filterMotherBrandIds.value.length > 0)
    params.mother_brand_ids = filterMotherBrandIds.value.join(',')

  await poiStore.fetchPOIs(params)
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
  if (!dialogOpen.value)
    return
  if (searchDebounce)
    clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    if (!showSelectedOnly.value)
      fetchPage()
  }, 300)
})

watch([filterCategoryIds, filterSubCategoryIds, filterMotherBrandIds], () => {
  if (!dialogOpen.value || showSelectedOnly.value)
    return
  currentPage.value = 1
  fetchPage()
})

watch([currentPage, itemsPerPage], () => {
  if (!dialogOpen.value || showSelectedOnly.value)
    return
  fetchPage()
})

// Toggle "Show selected only": reset pagination, fetch from server if turning off.
watch(showSelectedOnly, async value => {
  if (!dialogOpen.value)
    return
  currentPage.value = 1
  if (!value)
    await fetchPage()
})

// If selection becomes empty while in "selected only" mode, flip back so the
// user isn't stranded on an empty table behind a disabled switch.
watch(() => pendingMap.value.size, async size => {
  if (size === 0 && showSelectedOnly.value)
    showSelectedOnly.value = false
})

// Initialize state when dialog opens.
watch(() => props.modelValue, async open => {
  if (!open)
    return

  searchQuery.value = ''
  filterCategoryIds.value = []
  filterSubCategoryIds.value = []
  filterMotherBrandIds.value = []
  showSelectedOnly.value = false
  currentPage.value = 1
  itemsPerPage.value = 10

  // Seed pending from currently-applied selection. Use parent-supplied full
  // POI objects when available; fall back to the store list (which may not
  // contain off-page items, in which case those ids are seeded with a
  // placeholder POI so the checkbox still shows checked).
  const seed = new Map<number, POI>()
  for (const id of props.selectedIds) {
    const fromProp = props.selectedPois.find(p => p.id === id)
    if (fromProp) {
      seed.set(id, fromProp)
      continue
    }
    const fromStore = poiStore.pois.find(p => p.id === id)
    if (fromStore)
      seed.set(id, fromStore)
    else
      seed.set(id, { id, brand: '', color: '', points: [], created_at: '', updated_at: '' } as POI)
  }
  pendingMap.value = seed

  await Promise.all([
    categoryStore.fetchDropdown(),
    subCategoryStore.fetchDropdown(),
    motherBrandStore.fetchDropdown(),
  ])
  await fetchPage()
})

function isPending(id: number): boolean {
  return pendingMap.value.has(id)
}

function togglePending(poi: POI) {
  const next = new Map(pendingMap.value)
  if (next.has(poi.id))
    next.delete(poi.id)
  else
    next.set(poi.id, poi)
  pendingMap.value = next
}

function closeDialog() {
  dialogOpen.value = false
}

function confirmDialog() {
  const ids = Array.from(pendingMap.value.keys())
  const selected = Array.from(pendingMap.value.values())

  emit('apply', { ids, pois: selected })
  closeDialog()
}

function clearPending() {
  pendingMap.value = new Map()
}

const pendingCount = computed(() => pendingMap.value.size)
</script>

<template>
  <VDialog
    v-model="dialogOpen"
    max-width="1100"
    height="85vh"
    scrollable
  >
    <VCard class="poi-picker-card">
      <VCardTitle class="d-flex align-center justify-space-between">
        <span>Select POIs</span>
        <div
          v-if="pendingCount > 0"
          class="d-flex align-center gap-2"
        >
          <VChip
            color="primary"
            size="small"
          >
            {{ pendingCount }} selected
          </VChip>
          <VBtn
            variant="text"
            size="small"
            color="error"
            @click="clearPending"
          >
            Clear selection
          </VBtn>
        </div>
      </VCardTitle>
      <VDivider />
      <VCardText class="pt-6">
        <!-- Filters -->
        <VRow class="mb-2">
          <VCol
            cols="12"
            md="4"
          >
            <VAutocomplete
              v-model="filterCategoryIds"
              :items="categoryStore.dropdownItems"
              item-title="name"
              item-value="id"
              label="Category"
              placeholder="All"
              multiple
              clearable
              density="compact"
              hide-details
              :disabled="showSelectedOnly"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VAutocomplete
              v-model="filterSubCategoryIds"
              :items="subCategoryStore.dropdownItems"
              item-title="name"
              item-value="id"
              label="Sub-Category"
              placeholder="All"
              multiple
              clearable
              density="compact"
              hide-details
              :disabled="showSelectedOnly"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VAutocomplete
              v-model="filterMotherBrandIds"
              :items="motherBrandStore.dropdownItems"
              item-title="name"
              item-value="id"
              label="Mother Brand"
              placeholder="All"
              multiple
              clearable
              density="compact"
              hide-details
              :disabled="showSelectedOnly"
            />
          </VCol>
        </VRow>

        <!-- Search + Show selected only -->
        <div class="d-flex align-center gap-3 mb-3">
          <VTextField
            v-model="searchQuery"
            label="Search by brand"
            placeholder="Type to search..."
            prepend-inner-icon="ri-search-line"
            variant="outlined"
            density="compact"
            clearable
            hide-details
            class="flex-grow-1"
            @click:clear="searchQuery = ''"
          />
          <VSwitch
            v-model="showSelectedOnly"
            label="Show selected only"
            color="primary"
            density="compact"
            hide-details
            :disabled="pendingCount === 0"
          />
        </div>

        <!-- Table: Brand / Color / Points only -->
        <VTable density="compact">
          <thead>
            <tr>
              <th style="width: 50px;" />
              <th class="text-uppercase">
                Brand
              </th>
              <th class="text-uppercase">
                Color
              </th>
              <th class="text-uppercase">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="poi in pois"
              :key="poi.id"
              :class="{ 'bg-primary-lighten-5': isPending(poi.id) }"
              style="cursor: pointer"
              @click="togglePending(poi)"
            >
              <td>
                <VCheckbox
                  :model-value="isPending(poi.id)"
                  hide-details
                  density="compact"
                  @click.stop="togglePending(poi)"
                />
              </td>
              <td>
                <span class="font-weight-medium">{{ poi.brand }}</span>
              </td>
              <td>
                <VAvatar
                  :color="poi.color"
                  size="24"
                />
              </td>
              <td>
                <VChip
                  color="primary"
                  size="small"
                >
                  {{ poi.points.length }} {{ poi.points.length === 1 ? 'point' : 'points' }}
                </VChip>
              </td>
            </tr>
            <tr v-if="!isLoading && pois.length === 0">
              <td
                colspan="4"
                class="text-center text-disabled py-4"
              >
                No POIs found.
              </td>
            </tr>
            <tr v-if="isLoading">
              <td
                colspan="4"
                class="py-4"
              >
                <VProgressLinear indeterminate />
              </td>
            </tr>
          </tbody>
        </VTable>

        <!-- Pagination -->
        <div
          v-if="totalRecords > 0"
          class="d-flex justify-space-between align-center mt-3"
        >
          <div class="text-body-2">
            Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, totalRecords) }} of {{ totalRecords }} entries
          </div>
          <div class="d-flex align-center gap-2">
            <VSelect
              v-model="itemsPerPage"
              :items="PER_PAGE_OPTIONS"
              label="Per page"
              density="compact"
              hide-details
              style="max-width: 100px"
              @update:model-value="currentPage = 1"
            />
            <VPagination
              v-model="currentPage"
              :length="totalPages"
              :total-visible="5"
              density="compact"
            />
          </div>
        </div>
      </VCardText>
      <VDivider />
      <VCardActions>
        <VSpacer />
        <VBtn
          variant="outlined"
          @click="closeDialog"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          @click="confirmDialog"
        >
          Apply ({{ pendingCount }} selected)
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.poi-picker-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.poi-picker-card :deep(.v-card-text) {
  flex: 1 1 auto;
  overflow-y: auto;
}
</style>
