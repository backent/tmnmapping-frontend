<script setup lang="ts">
import { useMappingStore } from '@/stores/mapping'
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

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const dialogOpen = ref(false)
const searchQuery = ref('')
const districtResults = ref<string[]>([])
const subdistrictResults = ref<string[]>([])

const debouncedSearch = useDebounceFn(async (query: string) => {
  if (!query.trim()) {
    districtResults.value = []
    subdistrictResults.value = []
    return
  }

  try {
    const results = await mappingStore.searchRegions(query)
    if (results) {
      districtResults.value = results.district || []
      subdistrictResults.value = results.subdistrict || []
    }
  }
  catch (error) {
    console.error('Error searching regions:', error)
    districtResults.value = []
    subdistrictResults.value = []
  }
}, 500)

watch(searchQuery, (newQuery) => {
  debouncedSearch(newQuery)
})

const toggleItem = (value: string) => {
  const current = [...selected.value]
  const index = current.indexOf(value)

  if (index > -1) {
    current.splice(index, 1)
  }
  else {
    current.push(value)
  }

  selected.value = current
}

const handlePlaceChanged = (place: google.maps.places.PlaceResult) => {
  if (place.geometry?.location) {
    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    mappingStore.setMapCenter(lat, lng)
    emit('placeSelected', place)
  }
}

const items = computed(() => {
  return mappingStore.filterOptions?.district.map(d => ({
    name: d,
    value: d,
  })) || []
})
</script>

<template>
  <!-- Single Location Mode - Google Places Autocomplete -->
  <template v-if="mode === 'single'">
    <VAutocomplete
      :model-value="selected[0] || ''"
      placeholder="Type a location or Region"
      prepend-inner-icon="mdi-map-marker"
      outlined
      hide-details
      class="mb-5"
      @update:model-value="selected = $event ? [$event] : []"
    />
  </template>

  <!-- Multi Location Mode - District/Subdistrict Checkboxes -->
  <template v-else>
    <p
      v-if="selected.length < 1"
      class="p-location"
    >
      Pilih Lokasi
    </p>
    <p
      v-else
      class="p-location"
    >
      <VBadge
        color="brown"
        inline
        :content="selected.length"
      >
        Pilih Lokasi
      </VBadge>
    </p>

    <VListItem
      v-for="(item, i) in items"
      :key="i"
    >
      <VCheckbox
        :model-value="selected.includes(item.value)"
        :label="item.name"
        :value="item.value"
        hide-details
        @update:model-value="toggleItem(item.value)"
      />
    </VListItem>

    <div class="px-4 pt-4">
      <VDialog
        v-model="dialogOpen"
        :close-on-content-click="false"
        width="360"
        scrollable
      >
        <template #activator="{ props: dialogProps }">
          <a
            href="#"
            v-bind="dialogProps"
            class="text-success text-decoration-none"
            @click.prevent
          >
            Lihat Selengkapnya
          </a>
        </template>

        <VCard height="500">
          <VCardTitle>Select Location</VCardTitle>
          <VDivider />

          <VCardText>
            <VTextField
              v-model="searchQuery"
              placeholder="Search Location"
              outlined
              hide-details
              class="mt-4 mb-4"
            />

            <div
              v-if="mappingStore.isSearching"
              class="text-center pb-1"
            >
              <VProgressCircular
                indeterminate
                color="primary"
              />
            </div>

            <div
              v-else-if="districtResults.length === 0 && subdistrictResults.length === 0 && searchQuery"
              class="text-center pt-4"
            >
              <h3>Not Found</h3>
            </div>

            <div v-else>
              <div
                v-if="districtResults.length > 0"
                class="pt-4"
              >
                <h3 class="font-weight-bold mb-0">
                  District
                </h3>
                <VListItem
                  v-for="(district, i) in districtResults"
                  :key="`district-${i}`"
                >
                  <VCheckbox
                    :model-value="selected.includes(district)"
                    :label="district"
                    :value="district"
                    hide-details
                    @update:model-value="toggleItem(district)"
                  />
                </VListItem>
              </div>

              <div
                v-if="subdistrictResults.length > 0"
                class="pt-4"
              >
                <h3 class="font-weight-bold mb-0">
                  Sub District
                </h3>
                <VListItem
                  v-for="(subdistrict, i) in subdistrictResults"
                  :key="`subdistrict-${i}`"
                >
                  <VCheckbox
                    :model-value="selected.includes(subdistrict)"
                    :label="subdistrict"
                    :value="subdistrict"
                    hide-details
                    @update:model-value="toggleItem(subdistrict)"
                  />
                </VListItem>
              </div>
            </div>
          </VCardText>

          <VCardActions>
            <VSpacer />
            <VBtn
              color="primary"
              @click="dialogOpen = false"
            >
              Submit
            </VBtn>
          </VCardActions>
        </VCard>
      </VDialog>
    </div>
  </template>
</template>

<style scoped>
.p-location {
  margin-bottom: 0;
  font-weight: bold;
}
</style>

