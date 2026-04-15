<script setup lang="ts">
import { useBuildingStore } from '@/stores/building'
import type { Building } from '@/types/building'

interface BuildingRef {
  id: number
  name: string
  project_name: string
  subdistrict: string
  citytown: string
  province: string
  building_type: string
}

const props = withDefaults(
  defineProps<{
    modelValue: BuildingRef[]
    disabled?: boolean
    label?: string
  }>(),
  { disabled: false, label: 'Buildings' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: BuildingRef[]): void
}>()

const buildingStore = useBuildingStore()

const PER_PAGE_OPTIONS = [10, 25, 50]

function toRef(b: Building): BuildingRef {
  return {
    id: b.id,
    name: b.name,
    project_name: b.project_name,
    subdistrict: b.subdistrict,
    citytown: b.citytown,
    province: b.province,
    building_type: b.building_type,
  }
}

// --- Selected-items table (client-side filter + pagination over props.modelValue) ---

const mainSearch = ref('')
const mainPage = ref(1)
const mainPerPage = ref(10)

function matchesSearch(b: BuildingRef, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q)
    return true

  return (
    b.name.toLowerCase().includes(q)
    || (!!b.project_name && b.project_name.toLowerCase().includes(q))
    || (!!b.subdistrict && b.subdistrict.toLowerCase().includes(q))
    || (!!b.citytown && b.citytown.toLowerCase().includes(q))
    || (!!b.province && b.province.toLowerCase().includes(q))
    || (!!b.building_type && b.building_type.toLowerCase().includes(q))
  )
}

const filteredSelected = computed(() =>
  props.modelValue.filter(b => matchesSearch(b, mainSearch.value)),
)

const mainTotalPages = computed(() =>
  Math.ceil(filteredSelected.value.length / mainPerPage.value) || 1,
)

const pagedSelected = computed(() => {
  const start = (mainPage.value - 1) * mainPerPage.value

  return filteredSelected.value.slice(start, start + mainPerPage.value)
})

watch(mainSearch, () => { mainPage.value = 1 })
watch([() => props.modelValue.length, mainPerPage], () => {
  if (mainPage.value > mainTotalPages.value)
    mainPage.value = mainTotalPages.value
})

function removeBuilding(id: number) {
  emit('update:modelValue', props.modelValue.filter(b => b.id !== id))
}

// --- Modal picker (server-side search + pagination via buildingStore) ---

const dialogOpen = ref(false)
const dialogSearch = ref('')
const dialogPage = ref(1)
const dialogPerPage = ref(10)

// Pending picks keyed by id so selections survive page/search changes.
const dialogPending = ref<Map<number, BuildingRef>>(new Map())

const pickerBuildings = computed(() => buildingStore.pickerBuildings)
const pickerLoading = computed(() => buildingStore.pickerIsLoading)
const pickerTotal = computed(() => buildingStore.pickerPagination.total)
const pickerTotalPages = computed(() => buildingStore.pickerPagination.lastPage)

const selectedIds = computed(() => new Set(props.modelValue.map(b => b.id)))

async function loadPickerPage() {
  const skip = (dialogPage.value - 1) * dialogPerPage.value

  const params: Record<string, string | number> = {
    take: dialogPerPage.value,
    skip,
    orderBy: 'name',
    orderDirection: 'ASC',
  }

  const q = dialogSearch.value.trim()
  if (q)
    params.search = q
  if (props.modelValue.length > 0)
    params.exclude_ids = props.modelValue.map(b => b.id).join(',')
  await buildingStore.fetchBuildingsForPicker(params)
}

let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(dialogSearch, () => {
  if (!dialogOpen.value)
    return
  dialogPage.value = 1
  if (searchDebounce)
    clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { loadPickerPage() }, 500)
})

watch([dialogPage, dialogPerPage], () => {
  if (!dialogOpen.value)
    return
  loadPickerPage()
})

function openDialog() {
  dialogSearch.value = ''
  dialogPage.value = 1
  dialogPerPage.value = 10
  dialogPending.value = new Map()
  dialogOpen.value = true
  loadPickerPage()
}

function closeDialog() {
  dialogOpen.value = false
}

function isPending(id: number): boolean {
  return dialogPending.value.has(id)
}

function togglePending(b: Building) {
  if (selectedIds.value.has(b.id))
    return // already attached
  const next = new Map(dialogPending.value)
  if (next.has(b.id))
    next.delete(b.id)
  else next.set(b.id, toRef(b))
  dialogPending.value = next
}

function confirmDialog() {
  const pending = Array.from(dialogPending.value.values())
  if (pending.length === 0) {
    closeDialog()

    return
  }

  // Dedupe defensively; selectedIds should already exclude these but guard anyway.
  const existingIds = selectedIds.value
  const merged = [...props.modelValue, ...pending.filter(b => !existingIds.has(b.id))]

  emit('update:modelValue', merged)
  closeDialog()
}
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-subtitle-1 font-weight-medium">
        {{ label }}
        <VChip
          color="primary"
          size="small"
          class="ms-2"
        >
          {{ modelValue.length }} selected
        </VChip>
      </div>
      <VBtn
        color="primary"
        variant="outlined"
        :disabled="disabled"
        @click="openDialog"
      >
        <VIcon
          icon="ri-add-line"
          class="me-1"
        />
        Add Buildings
      </VBtn>
    </div>

    <VTextField
      v-model="mainSearch"
      label="Search selected buildings"
      placeholder="Search by name, project, subdistrict, city, province, type..."
      prepend-inner-icon="ri-search-line"
      variant="outlined"
      density="compact"
      clearable
      class="mb-3"
      hide-details
      @click:clear="mainSearch = ''"
    />

    <VTable density="compact">
      <thead>
        <tr>
          <th class="text-uppercase">
            Name
          </th>
          <th class="text-uppercase">
            Project Name
          </th>
          <th class="text-uppercase">
            Subdistrict
          </th>
          <th class="text-uppercase">
            City/Town
          </th>
          <th class="text-uppercase">
            Province
          </th>
          <th class="text-uppercase">
            Building Type
          </th>
          <th
            class="text-uppercase text-center"
            style="width: 80px;"
          >
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="b in pagedSelected"
          :key="b.id"
        >
          <td>
            <span class="font-weight-medium">{{ b.name }}</span>
          </td>
          <td>
            <span class="text-body-2">{{ b.project_name || '-' }}</span>
          </td>
          <td>
            <span class="text-body-2">{{ b.subdistrict || '-' }}</span>
          </td>
          <td>
            <span class="text-body-2">{{ b.citytown || '-' }}</span>
          </td>
          <td>
            <span class="text-body-2">{{ b.province || '-' }}</span>
          </td>
          <td>
            <span class="text-body-2">{{ b.building_type || '-' }}</span>
          </td>
          <td class="text-center">
            <VBtn
              icon
              size="small"
              color="error"
              variant="text"
              :disabled="disabled"
              @click="removeBuilding(b.id)"
            >
              <VIcon icon="ri-close-line" />
              <VTooltip
                activator="parent"
                location="top"
              >
                Remove
              </VTooltip>
            </VBtn>
          </td>
        </tr>
        <tr v-if="pagedSelected.length === 0">
          <td
            colspan="7"
            class="text-center text-disabled py-6"
          >
            {{ modelValue.length === 0 ? 'No buildings selected. Click "Add Buildings" to select.' : 'No buildings match your search.' }}
          </td>
        </tr>
      </tbody>
    </VTable>

    <div
      v-if="filteredSelected.length > 0"
      class="d-flex justify-space-between align-center mt-3"
    >
      <div class="text-body-2">
        Showing {{ (mainPage - 1) * mainPerPage + 1 }} to {{ Math.min(mainPage * mainPerPage, filteredSelected.length) }} of {{ filteredSelected.length }} buildings
      </div>
      <div class="d-flex align-center gap-2">
        <VSelect
          v-model="mainPerPage"
          :items="PER_PAGE_OPTIONS"
          label="Per page"
          density="compact"
          hide-details
          style="max-width: 100px"
          @update:model-value="mainPage = 1"
        />
        <VPagination
          v-model="mainPage"
          :length="mainTotalPages"
          :total-visible="5"
          density="compact"
        />
      </div>
    </div>

    <!-- Add Buildings Dialog -->
    <VDialog
      v-model="dialogOpen"
      max-width="1100"
    >
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Add Buildings</span>
          <VChip
            v-if="dialogPending.size > 0"
            color="primary"
            size="small"
          >
            {{ dialogPending.size }} selected
          </VChip>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VTextField
            v-model="dialogSearch"
            label="Search buildings"
            placeholder="Search by name, project, city..."
            prepend-inner-icon="ri-search-line"
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
            hide-details
            @click:clear="dialogSearch = ''"
          />

          <VTable density="compact">
            <thead>
              <tr>
                <th style="width: 50px;" />
                <th class="text-uppercase">
                  Name
                </th>
                <th class="text-uppercase">
                  Project Name
                </th>
                <th class="text-uppercase">
                  Subdistrict
                </th>
                <th class="text-uppercase">
                  City/Town
                </th>
                <th class="text-uppercase">
                  Province
                </th>
                <th class="text-uppercase">
                  Building Type
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in pickerBuildings"
                :key="b.id"
                :class="{ 'bg-primary-lighten-5': isPending(b.id) }"
                style="cursor: pointer"
                @click="togglePending(b)"
              >
                <td>
                  <VCheckbox
                    :model-value="isPending(b.id)"
                    hide-details
                    density="compact"
                    @click.stop="togglePending(b)"
                  />
                </td>
                <td>
                  <span class="font-weight-medium">{{ b.name }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ b.project_name || '-' }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ b.subdistrict || '-' }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ b.citytown || '-' }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ b.province || '-' }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ b.building_type || '-' }}</span>
                </td>
              </tr>
              <tr v-if="!pickerLoading && pickerBuildings.length === 0">
                <td
                  colspan="7"
                  class="text-center text-disabled py-4"
                >
                  No buildings found.
                </td>
              </tr>
              <tr v-if="pickerLoading">
                <td
                  colspan="7"
                  class="py-4"
                >
                  <VProgressLinear indeterminate />
                </td>
              </tr>
            </tbody>
          </VTable>

          <div
            v-if="pickerTotal > 0"
            class="d-flex justify-space-between align-center mt-3"
          >
            <div class="text-body-2">
              Showing {{ (dialogPage - 1) * dialogPerPage + 1 }} to {{ Math.min(dialogPage * dialogPerPage, pickerTotal) }} of {{ pickerTotal }} buildings
            </div>
            <div class="d-flex align-center gap-2">
              <VSelect
                v-model="dialogPerPage"
                :items="PER_PAGE_OPTIONS"
                label="Per page"
                density="compact"
                hide-details
                style="max-width: 100px"
                @update:model-value="dialogPage = 1"
              />
              <VPagination
                v-model="dialogPage"
                :length="pickerTotalPages"
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
            :disabled="dialogPending.size === 0"
            @click="confirmDialog"
          >
            Add {{ dialogPending.size }} {{ dialogPending.size === 1 ? 'Building' : 'Buildings' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
