<script setup lang="ts">
import { nextTick, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

interface Emits {
  (e: 'placeSelected', place: {
    place_name: string
    address: string
    latitude: number
    longitude: number
  }): void
}

const emit = defineEmits<Emits>()

const locationTextFieldRef = ref<any>(null)
const locationSearchText = ref('')
const predictions = ref<google.maps.places.AutocompletePrediction[]>([])
const showPredictions = ref(false)
const selectedIndex = ref(-1)
const isLoading = ref(false)
const justSelected = ref(false)

let autocompleteService: google.maps.places.AutocompleteService | null = null
let placesService: google.maps.places.PlacesService | null = null
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null

// Create a new session token
const createSessionToken = () => {
  if (typeof google !== 'undefined' && google.maps?.places?.AutocompleteSessionToken)
    sessionToken = new google.maps.places.AutocompleteSessionToken()
}

// Initialize services
const initializeServices = () => {
  if (typeof google === 'undefined' || !google.maps?.places) {
    setTimeout(initializeServices, 100)

    return
  }

  try {
    autocompleteService = new google.maps.places.AutocompleteService()

    // PlacesService needs a map, but we can create a dummy one or use null
    // For getDetails, we can pass null as map - it works
    placesService = new google.maps.places.PlacesService(document.createElement('div') as any)
    createSessionToken()
  }
  catch (error) {
    console.error('Error initializing Google Maps services:', error)
  }
}

// Get place predictions with debounce
const getPredictions = useDebounceFn(async (input: string) => {
  // Ensure services are initialized
  if (typeof google === 'undefined' || !google.maps?.places) {
    initializeServices()
    return
  }

  if (!autocompleteService) {
    try {
      autocompleteService = new google.maps.places.AutocompleteService()
    }
    catch (error) {
      console.error('Error creating AutocompleteService:', error)
      return
    }
  }

  if (!input.trim()) {
    predictions.value = []
    showPredictions.value = false
    return
  }

  // Create new session token if input was cleared and user started typing again
  if (!sessionToken)
    createSessionToken()

  isLoading.value = true
  try {
    autocompleteService.getPlacePredictions(
      {
        input,
        sessionToken: sessionToken || undefined,
        componentRestrictions: { country: 'ID' },
      },
      (results: google.maps.places.AutocompletePrediction[] | null, status: google.maps.places.PlacesServiceStatus) => {
        isLoading.value = false
        console.log('Autocomplete response:', { status, resultsCount: results?.length, results })
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          predictions.value = results
          showPredictions.value = results.length > 0
          selectedIndex.value = -1
          console.log('Showing predictions:', showPredictions.value, 'Count:', predictions.value.length)
        }
        else {
          console.warn('Autocomplete failed:', status)
          predictions.value = []
          showPredictions.value = false
        }
      },
    )
  }
  catch (error) {
    isLoading.value = false
    console.error('Error getting predictions:', error)
    predictions.value = []
    showPredictions.value = false
  }
}, 300)

// Watch for input changes
watch(() => locationSearchText.value, newValue => {
  if (!newValue) {
    // Reset session token when input is cleared
    createSessionToken()
    predictions.value = []
    showPredictions.value = false
    selectedIndex.value = -1
    justSelected.value = false
    return
  }

  // Suppress prediction fetch immediately after a place is selected
  if (justSelected.value) {
    justSelected.value = false
    return
  }

  // Ensure services are ready before getting predictions
  if (!autocompleteService && typeof google !== 'undefined' && google.maps?.places) {
    try {
      autocompleteService = new google.maps.places.AutocompleteService()
    }
    catch (error) {
      console.error('Error creating AutocompleteService in watch:', error)
    }
  }
  getPredictions(newValue)
})

// Handle place selection
const selectPlace = async (prediction: google.maps.places.AutocompletePrediction) => {
  if (!placesService || !sessionToken)
    return

  showPredictions.value = false
  isLoading.value = true

  try {
    placesService.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['geometry', 'formatted_address', 'name'],
        sessionToken,
      },
      (place: google.maps.places.PlaceResult | null, status: google.maps.places.PlacesServiceStatus) => {
        isLoading.value = false

        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const placeName = place.name || ''
          const address = place.formatted_address || ''

          // Emit place data to parent
          emit('placeSelected', {
            place_name: placeName,
            address,
            latitude: lat,
            longitude: lng,
          })

          // Update input with selected place name (flag prevents watcher re-triggering predictions)
          justSelected.value = true
          locationSearchText.value = placeName || address
          predictions.value = []

          // Create a new session token for the next search session
          createSessionToken()
        }
        else {
          console.error('Error getting place details:', status)
        }
      },
    )
  }
  catch (error) {
    isLoading.value = false
    console.error('Error selecting place:', error)
  }
}

// Handle keyboard navigation
const handleKeydown = (event: KeyboardEvent) => {
  if (!showPredictions.value || predictions.value.length === 0)
    return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, predictions.value.length - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
      break
    case 'Enter':
      event.preventDefault()
      if (selectedIndex.value >= 0 && selectedIndex.value < predictions.value.length)
        selectPlace(predictions.value[selectedIndex.value])
      else if (predictions.value.length > 0) {
        // Select first prediction if none selected
        selectPlace(predictions.value[0])
      }
      break
    case 'Escape':
      showPredictions.value = false
      selectedIndex.value = -1
      break
  }
}

// Close predictions when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  // Use setTimeout to allow click events on dropdown items to process first
  setTimeout(() => {
    const target = event.target as HTMLElement
    if (!locationTextFieldRef.value?.$el) return

    const wrapper = locationTextFieldRef.value.$el.closest('.place-autocomplete-wrapper')
    // Check if click is outside the wrapper (including dropdown)
    if (wrapper && !wrapper.contains(target) && !target.closest('.predictions-dropdown')) {
      showPredictions.value = false
    }
  }, 0)
}

// Initialize on mount
onMounted(async () => {
  nextTick(() => {
    initializeServices()

    // Add click outside listener
    document.addEventListener('click', handleClickOutside)
  })
})

// Cleanup
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="place-autocomplete-wrapper" style="position: relative;">
    <VTextField
      ref="locationTextFieldRef"
      v-model="locationSearchText"
      placeholder="Search for a place..."
      prepend-inner-icon="ri-map-pin-line"
      outlined
      hide-details
      clearable
      @keydown="handleKeydown"
      @focus="() => { if (locationSearchText && !justSelected) getPredictions(locationSearchText) }"
    >
      <template #append-inner>
        <VProgressCircular
          v-if="isLoading"
          size="20"
          width="2"
          indeterminate
          class="me-2"
        />
      </template>
    </VTextField>

    <!-- Predictions Dropdown -->
    <VCard
      v-if="showPredictions && predictions.length > 0"
      class="predictions-dropdown"
      elevation="4"
      style="
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 1000;
        max-height: 300px;
        overflow-y: auto;
        margin-top: 4px;
      "
    >
      <VList density="compact">
        <VListItem
          v-for="(prediction, index) in predictions"
          :key="prediction.place_id"
          :class="{ 'bg-primary-lighten-5': selectedIndex === index }"
          @click.stop="selectPlace(prediction)"
          @mouseenter="selectedIndex = index"
        >
          <template #prepend>
            <VIcon
              icon="ri-map-pin-line"
              class="me-2"
            >
            </VIcon>
          </template>
          <VListItemTitle>
            {{ prediction.description }}
          </VListItemTitle>
        </VListItem>
      </VList>
    </VCard>
  </div>
</template>

<style scoped>
.predictions-dropdown {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
