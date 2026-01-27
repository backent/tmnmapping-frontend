<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'
import { useRoute, useRouter } from 'vue-router'
import { usePOIStore } from '@/stores/poi'
import PlaceAutocomplete from '@/components/poi/PlaceAutocomplete.vue'
import PointList from '@/components/poi/PointList.vue'
import type { POIPoint, CreatePOIRequest } from '@/types/poi'

const route = useRoute()
const router = useRouter()
const poiStore = usePOIStore()

// Check if editing or creating
const isEdit = computed(() => !!route.params.id)
const poiId = computed(() => isEdit.value ? Number(route.params.id) : null)

// Form state
const form = ref<CreatePOIRequest>({
  name: '',
  color: '#1976D2',
  points: [],
})

// Ensure color always has # prefix and is in hex format
watch(() => form.value.color, (newColor) => {
  if (newColor) {
    // Handle different color formats from VColorPicker
    if (typeof newColor === 'string') {
      // If it's already a hex string, ensure it has #
      if (!newColor.startsWith('#')) {
        form.value.color = `#${newColor}`
      }
    }
    else if (typeof newColor === 'object' && newColor !== null) {
      // If VColorPicker returns an object (RGBA/HSLA), convert to hex
      // This shouldn't happen with mode="hex" but just in case
      if ('hex' in newColor) {
        form.value.color = newColor.hex
      }
    }
  }
})

const selectedPlace = ref<{
  place_name: string
  address: string
  latitude: number
  longitude: number
} | null>(null)

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const isGoogleMapsLoaded = ref(false)
const colorPickerDialog = ref(false)

// Load Google Maps API
onMounted(async () => {
  // Load Google Maps if not already loaded
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
        name: poi.name,
        color: poi.color,
        points: poi.points.map(p => ({
          place_name: p.place_name,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
        })),
      }
    }
  }
  catch (error: any) {
    errorMessage.value = 'Failed to load POI'
    console.error('Fetch error:', error)
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
  selectedPlace.value = place
}

// Add point to form
const addPoint = () => {
  if (!selectedPlace.value)
    return

  form.value.points.push({
    place_name: selectedPlace.value.place_name,
    address: selectedPlace.value.address,
    latitude: selectedPlace.value.latitude,
    longitude: selectedPlace.value.longitude,
  })

  selectedPlace.value = null
}

// Remove point from form
const removePoint = (index: number) => {
  form.value.points.splice(index, 1)
}

// Submit form
const submit = async () => {
  errorMessage.value = ''

  // Validation
  if (!form.value.name.trim()) {
    errorMessage.value = 'POI name is required'
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
    }
    else {
      await poiStore.createPOI(form.value)
    }

    // Navigate back to list
    router.push({ name: 'pois' })
  }
  catch (error: any) {
    errorMessage.value = error.response?.data?.data || 'Failed to save POI'
    console.error('Save error:', error)
  }
  finally {
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
            <!-- POI Name -->
            <VCol cols="12" md="6">
              <VTextField
                v-model="form.name"
                label="POI Name"
                placeholder="Enter POI name"
                required
                variant="outlined"
                :rules="[v => !!v || 'POI name is required']"
              />
            </VCol>

            <!-- Color Picker -->
            <VCol cols="12" md="6">
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

              <VRow>
                <VCol cols="12" md="10">
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
                <VCol cols="12" md="2">
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
                  <div><strong>{{ selectedPlace.place_name }}</strong></div>
                  <div class="text-caption">{{ selectedPlace.address }}</div>
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
              />
            </VCol>
          </VRow>

          <!-- Actions -->
          <VRow class="mt-4">
            <VCol cols="12" class="d-flex gap-2">
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
  </div>
</template>
