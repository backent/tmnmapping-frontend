<script setup lang="ts">
import { useMappingStore } from '@/stores/mapping'
import { useBuildingStore } from '@/stores/building'

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

// For Google Maps Places Autocomplete (Single Location Mode)
const locationTextFieldRef = ref<any>(null)
const autocomplete = ref<google.maps.places.Autocomplete | null>(null)
const locationSearchText = ref('')

// Initialize Google Maps Places Autocomplete
onMounted(async () => {
  if (props.mode === 'single') {
    nextTick(() => {
      initializeAutocomplete()
    })
  } else if (props.mode === 'multi' && !buildingStore.filterOptions) {
    await buildingStore.fetchFilterOptions()
  }
})

// Re-initialize when mode changes to single
watch(() => props.mode, (newMode) => {
  if (newMode === 'single') {
    nextTick(() => {
      if (!autocomplete.value) {
        initializeAutocomplete()
      }
    })
  }
})

const initializeAutocomplete = () => {
  if (typeof google === 'undefined' || !locationTextFieldRef.value) {
    // Retry after a short delay if Google Maps isn't loaded yet
    setTimeout(initializeAutocomplete, 100)
    return
  }

  try {
    // Get the native input element from VTextField
    const inputElement = locationTextFieldRef.value.$el.querySelector('input')
    
    if (!inputElement) {
      console.error('Could not find input element in VTextField')
      return
    }

    // Create autocomplete instance
    autocomplete.value = new google.maps.places.Autocomplete(inputElement, {
      fields: ['geometry', 'formatted_address', 'name'],
    })

    // Listen for place selection
    autocomplete.value.addListener('place_changed', () => {
      if (!autocomplete.value) return

      const place = autocomplete.value.getPlace()
      
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        
        // Update the text field to show the place name
        const placeName = place.formatted_address || place.name || ''
        locationSearchText.value = placeName
        
        // Clear the district_subdistrict filter - we don't want to filter by the full address
        // Instead, we'll use lat/lng with radius to search
        selected.value = []
        
        // Update map center and trigger search with radius
        mappingStore.setMapCenter(lat, lng)
        
        emit('placeSelected', place)
      }
    })
  } catch (error) {
    console.error('Error initializing Google Maps Autocomplete:', error)
  }
}

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
  <!-- Single Location Mode - Google Places Autocomplete -->
  <template v-if="mode === 'single'">
    <VTextField
      ref="locationTextFieldRef"
      v-model="locationSearchText"
      placeholder="Type a location or Region"
      prepend-inner-icon="mdi-map-marker"
      outlined
      hide-details
      class="mb-5"
      clearable
    />
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
