<script setup lang="ts">
import { useMappingStore } from '@/stores/mapping'
import { useDebounceFn } from '@vueuse/core'
import type { ScreenTypeOption } from '@/types/mapping'

interface Props {
  modelValue: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const mappingStore = useMappingStore()

const dialogOpen = ref(false)
const searchQuery = ref('')
const searchResults = ref<ScreenTypeOption[]>([])

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const items = computed(() => {
  // Return empty array if no screen types available
  if (!mappingStore.screenTypes || mappingStore.screenTypes.length === 0) {
    return []
  }
  return mappingStore.screenTypes.map(st => ({
    name: st.name,
    value: JSON.stringify(st),
  }))
})

const visibleItems = computed(() => {
  return items.value.slice(0, 4)
})

const hasMore = computed(() => {
  return items.value.length > 4
})

const debouncedSearch = useDebounceFn(async (query: string) => {
  if (!query.trim()) {
    searchResults.value = mappingStore.screenTypes
    return
  }

  try {
    const results = await mappingStore.searchScreenTypes(query)
    searchResults.value = results || []
  }
  catch (error) {
    console.error('Error searching screen types:', error)
    searchResults.value = []
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

// Removed API call since it returns 404
// onMounted(async () => {
//   if (mappingStore.screenTypes.length === 0) {
//     await mappingStore.fetchScreenTypes()
//   }
// })
</script>

<template>
  <VListGroup>
    <template #activator="{ props: activatorProps }">
      <VListItem
        v-bind="activatorProps"
        title="Screen Type"
      >
        <template #append>
          <VBadge
            v-if="selected.length > 0"
            color="brown"
            :content="selected.length"
          />
        </template>
      </VListItem>
    </template>

    <VListItem
      v-for="(item, i) in visibleItems"
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

    <VListItem
      v-if="hasMore"
      class="px-4 pt-4"
    >
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
          <VCardTitle>Select Screen Type</VCardTitle>
          <VDivider />

          <VCardText>
            <VTextField
              v-model="searchQuery"
              placeholder="Search Screen Type"
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
              v-else-if="searchResults.length === 0 && searchQuery"
              class="text-center pt-4"
            >
              <h3>Not Found</h3>
            </div>

            <VList v-else>
              <VListItem
                v-for="(item, i) in searchResults"
                :key="i"
              >
                <VCheckbox
                  :model-value="selected.includes(JSON.stringify(item))"
                  :label="item.name"
                  :value="JSON.stringify(item)"
                  hide-details
                  @update:model-value="toggleItem(JSON.stringify(item))"
                />
              </VListItem>
            </VList>
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
    </VListItem>
  </VListGroup>
</template>

