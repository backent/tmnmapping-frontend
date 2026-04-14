<script setup lang="ts">
import { useMappingStore } from '@/stores/mapping'
import { useBuildingStore } from '@/stores/building'
import { useDebounceFn } from '@vueuse/core'

interface Props {
  modelValue: string[]
  mode: 'single' | 'multi'
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
  (e: 'placeSelected', place: google.maps.places.PlaceResult): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const mappingStore = useMappingStore()
const buildingStore = useBuildingStore()

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

// Single Location Mode - AutocompleteService approach (avoids pac-container z-index issues)
const locationTextFieldRef = ref<any>(null)
const locationSearchText = ref('')
const predictions = ref<google.maps.places.AutocompletePrediction[]>([])
const showPredictions = ref(false)
const isLoading = ref(false)
const justSelected = ref(false)
const selectedIndex = ref(-1)

let autocompleteService: google.maps.places.AutocompleteService | null = null
let placesService: google.maps.places.PlacesService | null = null
let sessionToken: google.maps.places.AutocompleteSessionToken | null = null

const createSessionToken = () => {
  if (typeof google !== 'undefined' && google.maps?.places?.AutocompleteSessionToken)
    sessionToken = new google.maps.places.AutocompleteSessionToken()
}

const initializeServices = () => {
  if (typeof google === 'undefined' || !google.maps?.places) {
    setTimeout(initializeServices, 100)
    return
  }

  try {
    autocompleteService = new google.maps.places.AutocompleteService()
    placesService = new google.maps.places.PlacesService(document.createElement('div') as any)
    createSessionToken()
  }
  catch (error) {
    console.error('Error initializing Google Maps services:', error)
  }
}

const getPredictions = useDebounceFn(async (input: string) => {
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
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          predictions.value = results
          showPredictions.value = results.length > 0
          selectedIndex.value = -1
        }
        else {
          predictions.value = []
          showPredictions.value = false
        }
      },
    )
  }
  catch (error) {
    isLoading.value = false
    predictions.value = []
    showPredictions.value = false
  }
}, 300)

watch(() => locationSearchText.value, newValue => {
  if (!newValue) {
    createSessionToken()
    predictions.value = []
    showPredictions.value = false
    selectedIndex.value = -1
    justSelected.value = false
    return
  }

  if (justSelected.value) {
    justSelected.value = false
    return
  }

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

          const placeName = place.formatted_address || place.name || ''
          justSelected.value = true
          locationSearchText.value = placeName
          predictions.value = []

          selected.value = []
          mappingStore.setMapCenter(lat, lng)
          emit('placeSelected', place)

          createSessionToken()
        }
      },
    )
  }
  catch (error) {
    isLoading.value = false
  }
}

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
      if (selectedIndex.value >= 0)
        selectPlace(predictions.value[selectedIndex.value])
      else if (predictions.value.length > 0)
        selectPlace(predictions.value[0])
      break
    case 'Escape':
      showPredictions.value = false
      selectedIndex.value = -1
      break
  }
}

const handleClickOutside = (event: MouseEvent) => {
  setTimeout(() => {
    const target = event.target as HTMLElement
    if (!locationTextFieldRef.value?.$el) return

    const wrapper = locationTextFieldRef.value.$el.closest('.location-filter-wrapper')
    if (wrapper && !wrapper.contains(target) && !target.closest('.location-predictions-dropdown')) {
      showPredictions.value = false
    }
  }, 0)
}

onMounted(async () => {
  if (props.mode === 'single') {
    nextTick(() => {
      initializeServices()
      document.addEventListener('click', handleClickOutside)
    })
  } else if (props.mode === 'multi' && !buildingStore.filterOptions) {
    await buildingStore.fetchFilterOptions()
  }
})

watch(() => props.mode, async (newMode) => {
  if (newMode === 'single') {
    nextTick(() => {
      if (!autocompleteService)
        initializeServices()
      document.addEventListener('click', handleClickOutside)
    })
  } else if (newMode === 'multi' && !buildingStore.filterOptions) {
    await buildingStore.fetchFilterOptions()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Multi Location Mode - Subdistrict items for VAutocomplete
const subdistrictItems = computed(() => {
  const subdistricts = buildingStore.filterOptions?.subdistrict || []
  return subdistricts.map(subdistrict => ({
    title: subdistrict,
    value: subdistrict,
  }))
})

</script>

<template>
  <!-- Single Location Mode - AutocompleteService with custom dropdown -->
  <template v-if="mode === 'single'">
    <div class="location-filter-wrapper" style="position: relative;">
      <VTextField
        ref="locationTextFieldRef"
        v-model="locationSearchText"
        placeholder="Type a location or Region"
        prepend-inner-icon="mdi-map-marker"
        outlined
        hide-details
        class="mb-5"
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
        class="location-predictions-dropdown"
        elevation="4"
        style="
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 9999;
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
              <VIcon icon="mdi-map-marker" class="me-2" />
            </template>
            <VListItemTitle>
              {{ prediction.description }}
            </VListItemTitle>
          </VListItem>
        </VList>
      </VCard>
    </div>
  </template>

  <!-- Multi Location Mode - VAutocomplete for Subdistricts -->
  <template v-else>
    <VAutocomplete
      v-model="selected"
      :items="subdistrictItems"
      label="Pilih Lokasi"
      placeholder="Select subdistricts..."
      multiple
      chips
      closable-chips
      clearable
      outlined
      hide-details
      class="mb-5"
    />
  </template>
</template>

<style scoped>
.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>
