<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'
import { useRoute, useRouter } from 'vue-router'
import { usePOIStore } from '@/stores/poi'
import PlaceAutocomplete from '@/components/poi/PlaceAutocomplete.vue'
import PointList from '@/components/poi/PointList.vue'
import type { CreatePOIRequest } from '@/types/poi'

const route = useRoute()
const router = useRouter()
const poiStore = usePOIStore()

// Check if editing or creating
const isEdit = computed(() => !!route.params.id)
const poiId = computed(() => isEdit.value ? Number(route.params.id) : null)

// Form state
const form = ref<CreatePOIRequest>({
  brand: '',
  color: '#1976D2',
  points: [],
})

// Ensure color always has # prefix and is in hex format
watch(() => form.value.color, (newColor) => {
  const color: unknown = newColor
  if (color) {
    if (typeof color === 'string') {
      if (!color.startsWith('#')) {
        form.value.color = `#${color}`
      }
    }
    else if (typeof color === 'object' && color !== null && 'hex' in color) {
      form.value.color = (color as { hex: string }).hex
    }
  }
})

const selectedPlace = ref<{
  poi_name: string
  address: string
  latitude: number
  longitude: number
} | null>(null)

// Per-point metadata fields
const pointMeta = ref({
  category: '',
  sub_category: '',
  mother_brand: '',
  branch: '',
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const isGoogleMapsLoaded = ref(false)
const colorPickerDialog = ref(false)

// Snackbar state
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

// Load Google Maps API
onMounted(async () => {
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
        errorMessage.value = 'Failed to load Google Maps. Please refresh the page.'
      }
    }
    else {
      console.error('VITE_GOOGLE_MAPS_API_KEY is not set')
      errorMessage.value = 'Google Maps API key is not configured.'
    }
  }
  else {
    isGoogleMapsLoaded.value = true
  }

  if (isEdit.value) {
    fetchPOI()
  }
})

// Fetch POI if editing
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
        points: poi.points.map(p => ({
          poi_name: p.poi_name,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          category: p.category,
          sub_category: p.sub_category,
          mother_brand: p.mother_brand,
          branch: p.branch,
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

// Handle place selection from autocomplete
const handlePlaceSelected = (place: {
  place_name: string
  address: string
  latitude: number
  longitude: number
}) => {
  selectedPlace.value = {
    poi_name: place.place_name,
    address: place.address,
    latitude: place.latitude,
    longitude: place.longitude,
  }
}

// Add point to form
const addPoint = () => {
  if (!selectedPlace.value)
    return

  form.value.points.push({
    poi_name: selectedPlace.value.poi_name,
    address: selectedPlace.value.address,
    latitude: selectedPlace.value.latitude,
    longitude: selectedPlace.value.longitude,
    category: pointMeta.value.category || undefined,
    sub_category: pointMeta.value.sub_category || undefined,
    mother_brand: pointMeta.value.mother_brand || undefined,
    branch: pointMeta.value.branch || undefined,
  })

  selectedPlace.value = null
  pointMeta.value = { category: '', sub_category: '', mother_brand: '', branch: '' }
}

// Remove point from form
const removePoint = (index: number) => {
  form.value.points.splice(index, 1)
}

// Edit point dialog
const editPointDialog = ref(false)
const editPointIndex = ref<number | null>(null)
const editPointForm = ref({
  poi_name: '',
  address: '',
  latitude: 0,
  longitude: 0,
  category: '',
  sub_category: '',
  mother_brand: '',
  branch: '',
})

const openEditPoint = (index: number) => {
  const point = form.value.points[index]
  editPointIndex.value = index
  editPointForm.value = {
    poi_name: point.poi_name,
    address: point.address,
    latitude: point.latitude,
    longitude: point.longitude,
    category: point.category || '',
    sub_category: point.sub_category || '',
    mother_brand: point.mother_brand || '',
    branch: point.branch || '',
  }
  editPointDialog.value = true
}

const handleEditPlaceSelected = (place: {
  place_name: string
  address: string
  latitude: number
  longitude: number
}) => {
  editPointForm.value.poi_name = place.place_name
  editPointForm.value.address = place.address
  editPointForm.value.latitude = place.latitude
  editPointForm.value.longitude = place.longitude
}

const saveEditPoint = () => {
  if (editPointIndex.value === null)
    return

  form.value.points[editPointIndex.value] = {
    poi_name: editPointForm.value.poi_name,
    address: editPointForm.value.address,
    latitude: editPointForm.value.latitude,
    longitude: editPointForm.value.longitude,
    category: editPointForm.value.category || undefined,
    sub_category: editPointForm.value.sub_category || undefined,
    mother_brand: editPointForm.value.mother_brand || undefined,
    branch: editPointForm.value.branch || undefined,
  }

  editPointDialog.value = false
  editPointIndex.value = null
}

// Submit form
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

  if (form.value.points.length === 0) {
    errorMessage.value = 'At least one point is required'
    return
  }

  isSaving.value = true

  try {
    if (isEdit.value && poiId.value) {
      await poiStore.updatePOI(poiId.value, form.value)

      snackbarMessage.value = 'POI updated successfully'
      snackbarColor.value = 'success'
      snackbar.value = true

      setTimeout(() => {
        router.push({ name: 'pois' })
      }, 1000)
    }
    else {
      await poiStore.createPOI(form.value)

      snackbarMessage.value = 'POI created successfully'
      snackbarColor.value = 'success'
      snackbar.value = true

      setTimeout(() => {
        router.push({ name: 'pois' })
      }, 1000)
    }
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

// Cancel and go back
const cancel = () => {
  router.push({ name: 'pois' })
}

// Cleanup
onUnmounted(() => {
  poiStore.clearCurrentPOI()
})
</script>

<template>
  <div>
    <!-- Header -->
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

    <!-- Loading -->
    <VProgressLinear
      v-if="isLoading"
      indeterminate
    />

    <!-- Form -->
    <VCard v-else>
      <VCardText>
        <!-- Error Message -->
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

              <!-- Color Picker Dialog -->
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

            <!-- Add Point Section -->
            <VCol cols="12">
              <VDivider class="my-4" />
              <h3 class="text-h6 mb-4">
                Add Points
              </h3>

              <VAlert
                v-if="!isGoogleMapsLoaded"
                type="warning"
                class="mb-4"
              >
                Loading Google Maps...
              </VAlert>

              <!-- Point metadata fields -->
              <VRow class="mb-2">
                <VCol
                  cols="12"
                  md="3"
                >
                  <VTextField
                    v-model="pointMeta.category"
                    label="Category"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="3"
                >
                  <VTextField
                    v-model="pointMeta.sub_category"
                    label="Sub-Category"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="3"
                >
                  <VTextField
                    v-model="pointMeta.mother_brand"
                    label="Mother Brand"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="3"
                >
                  <VTextField
                    v-model="pointMeta.branch"
                    label="Branch"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
              </VRow>

              <VRow>
                <VCol
                  cols="12"
                  md="10"
                >
                  <PlaceAutocomplete
                    v-if="isGoogleMapsLoaded"
                    @place-selected="handlePlaceSelected"
                  />
                  <VTextField
                    v-else
                    disabled
                    placeholder="Loading Google Maps..."
                    variant="outlined"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="2"
                >
                  <VBtn
                    block
                    color="primary"
                    :disabled="!selectedPlace"
                    @click="addPoint"
                  >
                    Add Point
                  </VBtn>
                </VCol>
              </VRow>

              <!-- Selected Place Preview -->
              <VCard
                v-if="selectedPlace"
                class="mt-4"
                variant="outlined"
              >
                <VCardText>
                  <div><strong>{{ selectedPlace.poi_name }}</strong></div>
                  <div class="text-caption">
                    {{ selectedPlace.address }}
                  </div>
                  <div class="text-caption">
                    Lat: {{ selectedPlace.latitude.toFixed(6) }}, Lng: {{ selectedPlace.longitude.toFixed(6) }}
                  </div>
                </VCardText>
              </VCard>
            </VCol>

            <!-- Points List -->
            <VCol cols="12">
              <VDivider class="my-4" />
              <h3 class="text-h6 mb-4">
                Points ({{ form.points.length }})
              </h3>
              <PointList
                :points="form.points"
                @remove="removePoint"
                @edit="openEditPoint"
              />
            </VCol>
          </VRow>

          <!-- Actions -->
          <VRow class="mt-4">
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
                @click="cancel"
              >
                Cancel
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>

    <!-- Edit Point Dialog -->
    <VDialog
      v-model="editPointDialog"
      max-width="600"
    >
      <VCard>
        <VCardTitle>Edit Point</VCardTitle>
        <VDivider />
        <VCardText>
          <VRow>
            <!-- Metadata fields -->
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="editPointForm.category"
                label="Category"
                variant="outlined"
                density="compact"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="editPointForm.sub_category"
                label="Sub-Category"
                variant="outlined"
                density="compact"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="editPointForm.mother_brand"
                label="Mother Brand"
                variant="outlined"
                density="compact"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="editPointForm.branch"
                label="Branch"
                variant="outlined"
                density="compact"
              />
            </VCol>

            <!-- Location search -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="text-subtitle-2 mb-2">
                Location
              </div>
              <PlaceAutocomplete
                v-if="isGoogleMapsLoaded"
                @place-selected="handleEditPlaceSelected"
              />
              <VTextField
                v-else
                disabled
                placeholder="Loading Google Maps..."
                variant="outlined"
              />
            </VCol>

            <!-- Current / selected location preview -->
            <VCol cols="12">
              <VCard
                variant="tonal"
                color="primary"
                density="compact"
              >
                <VCardText class="py-2">
                  <div class="font-weight-medium">
                    {{ editPointForm.poi_name || 'No location selected' }}
                  </div>
                  <div
                    v-if="editPointForm.address"
                    class="text-caption"
                  >
                    {{ editPointForm.address }}
                  </div>
                  <div
                    v-if="editPointForm.latitude && editPointForm.longitude"
                    class="text-caption"
                  >
                    Lat: {{ editPointForm.latitude.toFixed(6) }}, Lng: {{ editPointForm.longitude.toFixed(6) }}
                  </div>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="outlined"
            @click="editPointDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            @click="saveEditPoint"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Snackbar for feedback -->
    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
