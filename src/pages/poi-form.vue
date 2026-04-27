<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'
import { useRoute, useRouter } from 'vue-router'
import { usePOIStore } from '@/stores/poi'
import { useCategoryStore } from '@/stores/category'
import { useSubCategoryStore } from '@/stores/subcategory'
import { useMotherBrandStore } from '@/stores/motherbrand'
import { useBranchStore } from '@/stores/branch'
import PlaceAutocomplete from '@/components/poi/PlaceAutocomplete.vue'
import type { CreatePOIRequest, POIPointInput } from '@/types/poi'

const route = useRoute()
const router = useRouter()
const poiStore = usePOIStore()
const categoryStore = useCategoryStore()
const subCategoryStore = useSubCategoryStore()
const motherBrandStore = useMotherBrandStore()
const branchStore = useBranchStore()

const isEdit = computed(() => !!route.params.id)
const poiId = computed(() => isEdit.value ? Number(route.params.id) : null)

const form = ref<CreatePOIRequest>({
  brand: '',
  color: '#1976D2',
  category_id: null,
  sub_category_id: null,
  mother_brand_id: null,
  points: [],
})

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
const isGoogleMapsLoaded = ref(false)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

// --- Points editor (inline) ---
const pointSearch = ref('')
const pointPage = ref(1)
const pointPerPage = ref(10)

const filteredPoints = computed(() => {
  const q = pointSearch.value.trim().toLowerCase()
  if (!q)
    return form.value.points

  return form.value.points.filter(p =>
    p.poi_name.toLowerCase().includes(q)
    || (p.address && p.address.toLowerCase().includes(q)),
  )
})

const pointTotalPages = computed(() =>
  Math.ceil(filteredPoints.value.length / pointPerPage.value) || 1,
)

const pagedPoints = computed(() => {
  const start = (pointPage.value - 1) * pointPerPage.value

  return filteredPoints.value.slice(start, start + pointPerPage.value)
})

watch(pointSearch, () => { pointPage.value = 1 })

const branchNameById = computed(() => {
  const map = new Map<number, string>()
  for (const b of branchStore.dropdownItems as Array<{ id: number, name: string }>)
    map.set(b.id, b.name)

  return map
})

// --- Point modal ---
const pointDialog = ref(false)
const pointEditIndex = ref<number | null>(null)
const pointDraft = ref<POIPointInput>({
  poi_name: '',
  address: '',
  latitude: 0,
  longitude: 0,
  branch_id: null,
})
const pointDraftError = ref('')

const openAddPointDialog = () => {
  pointEditIndex.value = null
  pointDraft.value = {
    poi_name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    branch_id: null,
  }
  pointDraftError.value = ''
  pointDialog.value = true
}

const openEditPointDialog = (index: number) => {
  const original = form.value.points[index]
  if (!original)
    return

  pointEditIndex.value = index
  pointDraft.value = { ...original }
  pointDraftError.value = ''
  pointDialog.value = true
}

const handlePlaceSelected = (place: {
  place_name: string
  address: string
  latitude: number
  longitude: number
}) => {
  pointDraft.value.poi_name = place.place_name
  pointDraft.value.address = place.address
  pointDraft.value.latitude = place.latitude
  pointDraft.value.longitude = place.longitude
}

const savePoint = () => {
  pointDraftError.value = ''

  if (!pointDraft.value.poi_name.trim()) {
    pointDraftError.value = 'POI Name is required'

    return
  }

  if (!pointDraft.value.latitude || !pointDraft.value.longitude) {
    pointDraftError.value = 'Location (latitude and longitude) is required'

    return
  }

  const draft: POIPointInput = { ...pointDraft.value }

  if (pointEditIndex.value === null)
    form.value.points.push(draft)
  else
    form.value.points[pointEditIndex.value] = draft

  pointDialog.value = false
}

const removePoint = (index: number) => {
  form.value.points.splice(index, 1)
}

// --- Lifecycle ---
onMounted(async () => {
  await Promise.all([
    categoryStore.fetchDropdown(),
    subCategoryStore.fetchDropdown(),
    motherBrandStore.fetchDropdown(),
    branchStore.fetchDropdown(),
  ])

  if (typeof google === 'undefined' || !google.maps) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (apiKey) {
      try {
        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['places'],
        })

        await loader.load()
        isGoogleMapsLoaded.value = true
      }
      catch (error) {
        console.error('Error loading Google Maps:', error)
      }
    }
  }
  else {
    isGoogleMapsLoaded.value = true
  }

  if (isEdit.value)
    await fetchPOI()
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
        category_id: poi.category_id ?? null,
        sub_category_id: poi.sub_category_id ?? null,
        mother_brand_id: poi.mother_brand_id ?? null,
        points: poi.points.map(p => ({
          id: p.id,
          poi_name: p.poi_name,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          branch_id: p.branch_id ?? null,
        })),
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

  if (!form.value.category_id) {
    errorMessage.value = 'Category is required'

    return
  }

  if (!form.value.sub_category_id) {
    errorMessage.value = 'Sub-Category is required'

    return
  }

  if (!form.value.mother_brand_id) {
    errorMessage.value = 'Mother Brand is required'

    return
  }

  if (form.value.points.length === 0) {
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

            <!-- Metadata: same level as Brand -->
            <VCol
              cols="12"
              md="4"
            >
              <VAutocomplete
                v-model="form.category_id"
                :items="categoryStore.dropdownItems"
                item-title="name"
                item-value="id"
                label="Category"
                variant="outlined"
                :disabled="isSaving"
                :rules="[v => !!v || 'Category is required']"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VAutocomplete
                v-model="form.sub_category_id"
                :items="subCategoryStore.dropdownItems"
                item-title="name"
                item-value="id"
                label="Sub-Category"
                variant="outlined"
                :disabled="isSaving"
                :rules="[v => !!v || 'Sub-Category is required']"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VAutocomplete
                v-model="form.mother_brand_id"
                :items="motherBrandStore.dropdownItems"
                item-title="name"
                item-value="id"
                label="Mother Brand"
                variant="outlined"
                :disabled="isSaving"
                :rules="[v => !!v || 'Mother Brand is required']"
              />
            </VCol>

            <!-- Points Table -->
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
                    {{ form.points.length }} total
                  </VChip>
                </div>
                <VBtn
                  color="primary"
                  variant="outlined"
                  :disabled="isSaving"
                  @click="openAddPointDialog"
                >
                  <VIcon
                    icon="ri-add-line"
                    class="me-1"
                  />
                  Add Point
                </VBtn>
              </div>

              <VTextField
                v-model="pointSearch"
                label="Search points"
                placeholder="Search by name or address..."
                prepend-inner-icon="ri-search-line"
                variant="outlined"
                density="compact"
                clearable
                class="mb-3"
                hide-details
                @click:clear="pointSearch = ''"
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
                      Branch
                    </th>
                    <th class="text-uppercase">
                      Coordinate
                    </th>
                    <th
                      class="text-uppercase text-center"
                      style="width: 120px;"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(point, _i) in pagedPoints"
                    :key="(point.id ?? '') + '|' + point.poi_name + '|' + point.latitude"
                  >
                    <td>
                      <span class="font-weight-medium">{{ point.poi_name }}</span>
                    </td>
                    <td>
                      <span class="text-body-2">{{ point.address || '-' }}</span>
                    </td>
                    <td>
                      <span class="text-body-2">
                        {{ point.branch_id ? branchNameById.get(point.branch_id) : '-' }}
                      </span>
                    </td>
                    <td>
                      <span class="text-caption">
                        {{ point.latitude.toFixed(5) }}, {{ point.longitude.toFixed(5) }}
                      </span>
                    </td>
                    <td class="text-center">
                      <VBtn
                        icon
                        size="small"
                        color="primary"
                        variant="text"
                        :disabled="isSaving"
                        @click="openEditPointDialog(form.points.indexOf(point))"
                      >
                        <VIcon icon="ri-edit-line" />
                        <VTooltip
                          activator="parent"
                          location="top"
                        >
                          Edit
                        </VTooltip>
                      </VBtn>
                      <VBtn
                        icon
                        size="small"
                        color="error"
                        variant="text"
                        :disabled="isSaving"
                        @click="removePoint(form.points.indexOf(point))"
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
                  <tr v-if="pagedPoints.length === 0">
                    <td
                      colspan="5"
                      class="text-center text-disabled py-6"
                    >
                      {{ form.points.length === 0 ? 'No points added. Click "Add Point" to add one.' : 'No points match your search.' }}
                    </td>
                  </tr>
                </tbody>
              </VTable>

              <div
                v-if="filteredPoints.length > 0"
                class="d-flex justify-space-between align-center mt-3"
              >
                <div class="text-body-2">
                  Showing {{ (pointPage - 1) * pointPerPage + 1 }} to {{ Math.min(pointPage * pointPerPage, filteredPoints.length) }} of {{ filteredPoints.length }} points
                </div>
                <div class="d-flex align-center gap-2">
                  <VSelect
                    v-model="pointPerPage"
                    :items="[10, 25, 50]"
                    label="Per page"
                    density="compact"
                    hide-details
                    style="max-width: 100px"
                    @update:model-value="pointPage = 1"
                  />
                  <VPagination
                    v-model="pointPage"
                    :length="pointTotalPages"
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
                :disabled="form.points.length === 0"
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

    <!-- Point Add/Edit Dialog -->
    <VDialog
      v-model="pointDialog"
      max-width="700"
      persistent
    >
      <VCard>
        <VCardTitle>
          {{ pointEditIndex === null ? 'Add Point' : 'Edit Point' }}
        </VCardTitle>
        <VDivider />
        <VCardText>
          <VAlert
            v-if="pointDraftError"
            type="error"
            class="mb-4"
          >
            {{ pointDraftError }}
          </VAlert>

          <VRow>
            <VCol cols="12">
              <div class="text-subtitle-2 mb-2">
                Search Location
              </div>
              <VAlert
                v-if="!isGoogleMapsLoaded"
                type="warning"
                class="mb-3"
              >
                Loading Google Maps...
              </VAlert>
              <PlaceAutocomplete
                v-if="isGoogleMapsLoaded"
                @place-selected="handlePlaceSelected"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="pointDraft.poi_name"
                label="POI Name"
                variant="outlined"
                :rules="[v => !!v || 'POI Name is required']"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VAutocomplete
                v-model="pointDraft.branch_id"
                :items="branchStore.dropdownItems"
                item-title="name"
                item-value="id"
                label="Branch"
                variant="outlined"
                clearable
              />
            </VCol>
            <VCol cols="12">
              <VTextField
                v-model="pointDraft.address"
                label="Address"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model.number="pointDraft.latitude"
                label="Latitude"
                type="number"
                variant="outlined"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model.number="pointDraft.longitude"
                label="Longitude"
                type="number"
                variant="outlined"
              />
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="outlined"
            @click="pointDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            @click="savePoint"
          >
            {{ pointEditIndex === null ? 'Add' : 'Save' }}
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
