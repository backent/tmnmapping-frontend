<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { usePOIStore } from '@/stores/poi'
import { usePOIPointStore } from '@/stores/poipoint'
import type { CreatePOIRequest } from '@/types/poi'
import type { POIPoint } from '@/types/poipoint'

const route = useRoute()
const router = useRouter()
const poiStore = usePOIStore()
const poiPointStore = usePOIPointStore()

const isEdit = computed(() => !!route.params.id)
const poiId = computed(() => isEdit.value ? Number(route.params.id) : null)

const form = ref<CreatePOIRequest>({
  brand: '',
  color: '#1976D2',
  point_ids: [],
})

// Ensure color always has # prefix and is in hex format
watch(() => form.value.color, newColor => {
  const color: unknown = newColor
  if (color) {
    if (typeof color === 'string') {
      if (!color.startsWith('#'))
        form.value.color = `#${color}`
    }
    else if (typeof color === 'object' && color !== null && 'hex' in color) {
      form.value.color = (color as { hex: string }).hex
    }
  }
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const colorPickerDialog = ref(false)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

// --- Helper: filter points by query ---
function filterPoints(points: POIPoint[], query: string): POIPoint[] {
  const q = query.trim().toLowerCase()
  if (!q)
    return points

  return points.filter(p =>
    p.poi_name.toLowerCase().includes(q)
    || (p.address && p.address.toLowerCase().includes(q))
    || (p.category && p.category.toLowerCase().includes(q))
    || (p.mother_brand && p.mother_brand.toLowerCase().includes(q))
    || (p.branch && p.branch.toLowerCase().includes(q)),
  )
}

// --- Helper: paginate an array ---
function paginate<T>(items: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage

  return items.slice(start, start + perPage)
}

// All points from dropdown
const allPoints = computed(() => poiPointStore.dropdownPoints)

// ==========================================
// Main table (selected points)
// ==========================================
const mainSearch = ref('')
const mainPage = ref(1)
const mainPerPage = ref(10)

const selectedPoints = computed(() =>
  allPoints.value.filter(p => form.value.point_ids.includes(p.id)),
)

const filteredSelectedPoints = computed(() =>
  filterPoints(selectedPoints.value, mainSearch.value),
)

const mainTotalPages = computed(() =>
  Math.ceil(filteredSelectedPoints.value.length / mainPerPage.value) || 1,
)

const pagedSelectedPoints = computed(() =>
  paginate(filteredSelectedPoints.value, mainPage.value, mainPerPage.value),
)

// Reset page when search changes
watch(mainSearch, () => { mainPage.value = 1 })

const removePoint = (id: number) => {
  form.value.point_ids = form.value.point_ids.filter(pid => pid !== id)
}

// ==========================================
// Dialog table (available points)
// ==========================================
const addPointsDialog = ref(false)
const dialogSearch = ref('')
const dialogPage = ref(1)
const dialogPerPage = ref(10)
const dialogPendingIds = ref<number[]>([])

const filteredAvailablePoints = computed(() => {
  const selectedSet = new Set(form.value.point_ids)
  const available = allPoints.value.filter(p => !selectedSet.has(p.id))

  return filterPoints(available, dialogSearch.value)
})

const dialogTotalPages = computed(() =>
  Math.ceil(filteredAvailablePoints.value.length / dialogPerPage.value) || 1,
)

const pagedAvailablePoints = computed(() =>
  paginate(filteredAvailablePoints.value, dialogPage.value, dialogPerPage.value),
)

// Reset page when search changes
watch(dialogSearch, () => { dialogPage.value = 1 })

const isDialogPointChecked = (id: number) => dialogPendingIds.value.includes(id)

const toggleDialogPoint = (id: number) => {
  const idx = dialogPendingIds.value.indexOf(id)
  if (idx === -1)
    dialogPendingIds.value.push(id)
  else
    dialogPendingIds.value.splice(idx, 1)
}

const openAddPointsDialog = () => {
  dialogSearch.value = ''
  dialogPage.value = 1
  dialogPendingIds.value = []
  addPointsDialog.value = true
}

const confirmAddPoints = () => {
  form.value.point_ids.push(...dialogPendingIds.value)
  addPointsDialog.value = false
}

onMounted(async () => {
  await poiPointStore.fetchPOIPointsDropdown()
  if (isEdit.value)
    fetchPOI()
})

const fetchPOI = async () => {
  if (!poiId.value)
    return

  isLoading.value = true
  try {
    await poiStore.fetchPOIById(poiId.value)

    const poi = poiStore.currentPOI
    if (poi) {
      form.value = {
        brand: poi.brand,
        color: poi.color,
        point_ids: poi.points.map(p => p.id),
      }
    }
  }
  catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load POI'
  }
  finally {
    isLoading.value = false
  }
}

const submit = async () => {
  errorMessage.value = ''

  if (!form.value.brand.trim()) {
    errorMessage.value = 'Brand is required'

    return
  }

  if (!form.value.color) {
    errorMessage.value = 'Color is required'

    return
  }

  if (form.value.point_ids.length === 0) {
    errorMessage.value = 'At least one point is required'

    return
  }

  isSaving.value = true
  try {
    if (isEdit.value && poiId.value) {
      await poiStore.updatePOI(poiId.value, form.value)
      snackbarMessage.value = 'POI updated successfully'
    }
    else {
      await poiStore.createPOI(form.value)
      snackbarMessage.value = 'POI created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'pois' })
    }, 1000)
  }
  catch (error: any) {
    console.error('Save error:', error)

    const errorMsg = error?.details?.message || error?.details || 'Failed to save POI'

    errorMessage.value = errorMsg
    snackbarMessage.value = errorMsg
    snackbarColor.value = 'error'
    snackbar.value = true
    isSaving.value = false
  }
}

const cancel = () => {
  router.push({ name: 'pois' })
}

onUnmounted(() => {
  poiStore.clearCurrentPOI()
})
</script>

<template>
  <div>
    <VRow class="mb-4">
      <VCol cols="12">
        <VBtn
          icon
          variant="text"
          @click="cancel"
        >
          <VIcon icon="ri-arrow-left-s-line" />
        </VBtn>
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Point of Interest</span>
      </VCol>
    </VRow>

    <VProgressLinear
      v-if="isLoading"
      indeterminate
    />

    <VCard v-else>
      <VCardText>
        <VAlert
          v-if="errorMessage"
          type="error"
          class="mb-4"
        >
          {{ errorMessage }}
        </VAlert>

        <VForm @submit.prevent="submit">
          <VRow>
            <!-- Brand -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.brand"
                label="Brand"
                placeholder="Enter brand name"
                required
                variant="outlined"
                :disabled="isSaving"
                :rules="[v => !!v || 'Brand is required']"
              />
            </VCol>

            <!-- Color Picker -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.color"
                label="Color"
                variant="outlined"
                required
                :disabled="isSaving"
                :rules="[v => !!v || 'Color is required']"
                prepend-inner-icon="mdi-palette"
                hint="Click the color swatch to open color picker"
                persistent-hint
              >
                <template #append>
                  <VBtn
                    icon
                    variant="text"
                    size="small"
                    @click="colorPickerDialog = true"
                  >
                    <VAvatar
                      :color="form.color"
                      size="32"
                    />
                  </VBtn>
                </template>
              </VTextField>

              <VDialog
                v-model="colorPickerDialog"
                max-width="400"
              >
                <VCard>
                  <VCardTitle>
                    Select Color
                  </VCardTitle>
                  <VDivider />
                  <VCardText>
                    <VColorPicker
                      v-model="form.color"
                      mode="hex"
                      show-swatches
                      :swatches="[
                        ['#1976D2', '#424242', '#FF6F00', '#E91E63'],
                        ['#388E3C', '#C2185B', '#7B1FA2', '#0097A7'],
                        ['#0288D1', '#00796B', '#F57C00', '#D32F2F'],
                        ['#5D4037', '#455A64', '#303F9F', '#C62828'],
                      ]"
                      elevation="0"
                    />
                  </VCardText>
                  <VDivider />
                  <VCardActions>
                    <VSpacer />
                    <VBtn
                      color="primary"
                      @click="colorPickerDialog = false"
                    >
                      Done
                    </VBtn>
                  </VCardActions>
                </VCard>
              </VDialog>
            </VCol>

            <!-- Selected Points Table -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="text-subtitle-1 font-weight-medium">
                  Points
                  <VChip
                    color="primary"
                    size="small"
                    class="ms-2"
                  >
                    {{ selectedPoints.length }} selected
                  </VChip>
                </div>
                <VBtn
                  color="primary"
                  variant="outlined"
                  :disabled="isSaving"
                  @click="openAddPointsDialog"
                >
                  <VIcon
                    icon="ri-add-line"
                    class="me-1"
                  />
                  Add Points
                </VBtn>
              </div>

              <VTextField
                v-model="mainSearch"
                label="Search selected points"
                placeholder="Search by name, address, category, mother brand, branch..."
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
                      POI Name
                    </th>
                    <th class="text-uppercase">
                      Address
                    </th>
                    <th class="text-uppercase">
                      Category
                    </th>
                    <th class="text-uppercase">
                      Mother Brand
                    </th>
                    <th class="text-uppercase">
                      Branch
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
                    v-for="point in pagedSelectedPoints"
                    :key="point.id"
                  >
                    <td>
                      <span class="font-weight-medium">{{ point.poi_name }}</span>
                    </td>
                    <td>
                      <span class="text-body-2">{{ point.address || '-' }}</span>
                    </td>
                    <td>
                      <span class="text-body-2">{{ point.category || '-' }}</span>
                    </td>
                    <td>
                      <span class="text-body-2">{{ point.mother_brand || '-' }}</span>
                    </td>
                    <td>
                      <span class="text-body-2">{{ point.branch || '-' }}</span>
                    </td>
                    <td class="text-center">
                      <VBtn
                        icon
                        size="small"
                        color="error"
                        variant="text"
                        :disabled="isSaving"
                        @click="removePoint(point.id)"
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
                  <tr v-if="pagedSelectedPoints.length === 0">
                    <td
                      colspan="6"
                      class="text-center text-disabled py-6"
                    >
                      {{ selectedPoints.length === 0 ? 'No points selected. Click "Add Points" to select points.' : 'No points match your search.' }}
                    </td>
                  </tr>
                </tbody>
              </VTable>

              <!-- Main table pagination -->
              <div
                v-if="filteredSelectedPoints.length > 0"
                class="d-flex justify-space-between align-center mt-3"
              >
                <div class="text-body-2">
                  Showing {{ (mainPage - 1) * mainPerPage + 1 }} to {{ Math.min(mainPage * mainPerPage, filteredSelectedPoints.length) }} of {{ filteredSelectedPoints.length }} points
                </div>
                <div class="d-flex align-center gap-2">
                  <VSelect
                    v-model="mainPerPage"
                    :items="[10, 25, 50]"
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
            </VCol>

            <!-- Actions -->
            <VCol
              cols="12"
              class="d-flex gap-2"
            >
              <VBtn
                type="submit"
                color="primary"
                :loading="isSaving"
                :disabled="form.point_ids.length === 0"
              >
                {{ isEdit ? 'Update' : 'Create' }} POI
              </VBtn>
              <VBtn
                variant="outlined"
                :disabled="isSaving"
                @click="cancel"
              >
                Cancel
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <!-- Add Points Dialog -->
    <VDialog
      v-model="addPointsDialog"
      max-width="900"
    >
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Add Points</span>
          <VChip
            v-if="dialogPendingIds.length > 0"
            color="primary"
            size="small"
          >
            {{ dialogPendingIds.length }} selected
          </VChip>
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VTextField
            v-model="dialogSearch"
            label="Search points"
            placeholder="Search by name, address, category, mother brand, branch..."
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
                  POI Name
                </th>
                <th class="text-uppercase">
                  Address
                </th>
                <th class="text-uppercase">
                  Category
                </th>
                <th class="text-uppercase">
                  Mother Brand
                </th>
                <th class="text-uppercase">
                  Branch
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="point in pagedAvailablePoints"
                :key="point.id"
                :class="{ 'bg-primary-lighten-5': isDialogPointChecked(point.id) }"
                style="cursor: pointer;"
                @click="toggleDialogPoint(point.id)"
              >
                <td>
                  <VCheckbox
                    :model-value="isDialogPointChecked(point.id)"
                    hide-details
                    density="compact"
                    @click.stop="toggleDialogPoint(point.id)"
                  />
                </td>
                <td>
                  <span class="font-weight-medium">{{ point.poi_name }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ point.address || '-' }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ point.category || '-' }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ point.mother_brand || '-' }}</span>
                </td>
                <td>
                  <span class="text-body-2">{{ point.branch || '-' }}</span>
                </td>
              </tr>
              <tr v-if="pagedAvailablePoints.length === 0">
                <td
                  colspan="6"
                  class="text-center text-disabled py-4"
                >
                  No available points found.
                </td>
              </tr>
            </tbody>
          </VTable>

          <!-- Dialog table pagination -->
          <div
            v-if="filteredAvailablePoints.length > 0"
            class="d-flex justify-space-between align-center mt-3"
          >
            <div class="text-body-2">
              Showing {{ (dialogPage - 1) * dialogPerPage + 1 }} to {{ Math.min(dialogPage * dialogPerPage, filteredAvailablePoints.length) }} of {{ filteredAvailablePoints.length }} points
            </div>
            <div class="d-flex align-center gap-2">
              <VSelect
                v-model="dialogPerPage"
                :items="[10, 25, 50]"
                label="Per page"
                density="compact"
                hide-details
                style="max-width: 100px"
                @update:model-value="dialogPage = 1"
              />
              <VPagination
                v-model="dialogPage"
                :length="dialogTotalPages"
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
            @click="addPointsDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :disabled="dialogPendingIds.length === 0"
            @click="confirmAddPoints"
          >
            Add {{ dialogPendingIds.length }} {{ dialogPendingIds.length === 1 ? 'Point' : 'Points' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
