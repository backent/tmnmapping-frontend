<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'
import { useRoute, useRouter } from 'vue-router'
import { usePOIPointStore } from '@/stores/poipoint'
import PlaceAutocomplete from '@/components/poi/PlaceAutocomplete.vue'
import type { CreatePOIPointRequest } from '@/types/poipoint'

const route = useRoute()
const router = useRouter()
const poiPointStore = usePOIPointStore()

const isEdit = computed(() => !!route.params.id)
const pointId = computed(() => isEdit.value ? Number(route.params.id) : null)

const form = ref<CreatePOIPointRequest>({
  poi_name: '',
  address: '',
  latitude: 0,
  longitude: 0,
  category: '',
  sub_category: '',
  mother_brand: '',
  branch: '',
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const isGoogleMapsLoaded = ref(false)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

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
    fetchPoint()
  }
})

const fetchPoint = async () => {
  if (!pointId.value)
    return

  isLoading.value = true
  try {
    await poiPointStore.fetchPOIPointById(pointId.value)
    const point = poiPointStore.currentPoint
    if (point) {
      form.value = {
        poi_name: point.poi_name,
        address: point.address,
        latitude: point.latitude,
        longitude: point.longitude,
        category: point.category || '',
        sub_category: point.sub_category || '',
        mother_brand: point.mother_brand || '',
        branch: point.branch || '',
      }
    }
  }
  catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load POI point'
  }
  finally {
    isLoading.value = false
  }
}

const handlePlaceSelected = (place: {
  place_name: string
  address: string
  latitude: number
  longitude: number
}) => {
  form.value.poi_name = place.place_name
  form.value.address = place.address
  form.value.latitude = place.latitude
  form.value.longitude = place.longitude
}

const submit = async () => {
  errorMessage.value = ''

  if (!form.value.poi_name.trim()) {
    errorMessage.value = 'POI Name is required'
    return
  }

  if (!form.value.latitude || !form.value.longitude) {
    errorMessage.value = 'Location (latitude and longitude) is required'
    return
  }

  isSaving.value = true
  try {
    const data: CreatePOIPointRequest = {
      poi_name: form.value.poi_name,
      address: form.value.address,
      latitude: form.value.latitude,
      longitude: form.value.longitude,
      category: form.value.category || undefined,
      sub_category: form.value.sub_category || undefined,
      mother_brand: form.value.mother_brand || undefined,
      branch: form.value.branch || undefined,
    }

    if (isEdit.value && pointId.value) {
      await poiPointStore.updatePOIPoint(pointId.value, data)
      snackbarMessage.value = 'POI point updated successfully'
    }
    else {
      await poiPointStore.createPOIPoint(data)
      snackbarMessage.value = 'POI point created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'poi-points' })
    }, 1000)
  }
  catch (error: any) {
    console.error('Save error:', error)
    const msg = error?.details?.message || error?.details || 'Failed to save POI point'
    errorMessage.value = msg
    snackbarMessage.value = msg
    snackbarColor.value = 'error'
    snackbar.value = true
    isSaving.value = false
  }
}

const cancel = () => {
  router.push({ name: 'poi-points' })
}

onUnmounted(() => {
  poiPointStore.clearCurrentPoint()
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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} POI Point</span>
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
            <!-- Location Search -->
            <VCol cols="12">
              <div class="text-subtitle-1 font-weight-medium mb-2">
                Search Location
              </div>
              <VAlert
                v-if="!isGoogleMapsLoaded"
                type="warning"
                class="mb-4"
              >
                Loading Google Maps...
              </VAlert>
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

            <!-- Location Preview -->
            <VCol
              v-if="form.poi_name"
              cols="12"
            >
              <VCard
                variant="tonal"
                color="primary"
                density="compact"
              >
                <VCardText class="py-2">
                  <div class="font-weight-medium">
                    {{ form.poi_name }}
                  </div>
                  <div
                    v-if="form.address"
                    class="text-caption"
                  >
                    {{ form.address }}
                  </div>
                  <div
                    v-if="form.latitude && form.longitude"
                    class="text-caption"
                  >
                    Lat: {{ form.latitude.toFixed(6) }}, Lng: {{ form.longitude.toFixed(6) }}
                  </div>
                </VCardText>
              </VCard>
            </VCol>

            <!-- Metadata Fields -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="text-subtitle-1 font-weight-medium mb-2">
                Additional Details
              </div>
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.category"
                label="Category"
                variant="outlined"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.sub_category"
                label="Sub-Category"
                variant="outlined"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.mother_brand"
                label="Mother Brand"
                variant="outlined"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.branch"
                label="Branch"
                variant="outlined"
                :disabled="isSaving"
              />
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
                :disabled="!form.poi_name"
              >
                {{ isEdit ? 'Update' : 'Create' }}
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

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
