<script setup lang="ts">
interface Props {
  label: string
  items: Array<{ name: string; value: string | number }>
  modelValue: (string | number)[]
  badgeCount?: number
  showSearch?: boolean
  searchPlaceholder?: string
  maxVisible?: number
}

interface Emits {
  (e: 'update:modelValue', value: (string | number)[]): void
}

const props = withDefaults(defineProps<Props>(), {
  badgeCount: 0,
  showSearch: false,
  maxVisible: 4,
  searchPlaceholder: 'Search...',
})

const emit = defineEmits<Emits>()

const dialogOpen = ref(false)
const searchQuery = ref('')

const filteredItems = computed(() => {
  if (!props.showSearch || !searchQuery.value) {
    return props.items
  }
  const query = searchQuery.value.toLowerCase()
  return props.items.filter(item =>
    item.name.toLowerCase().includes(query) ||
    String(item.value).toLowerCase().includes(query),
  )
})

const visibleItems = computed(() => {
  return filteredItems.value.slice(0, props.maxVisible)
})

const hasMore = computed(() => {
  return filteredItems.value.length > props.maxVisible
})

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const toggleItem = (value: string | number) => {
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
</script>

<template>
  <VListGroup>
    <template #activator="{ props: activatorProps }">
      <VListItem
        v-bind="activatorProps"
        :title="label"
      >
        <template #append>
          <VBadge
            v-if="badgeCount > 0"
            color="brown"
            :content="badgeCount"
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
      v-if="hasMore || showSearch"
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
          <VCardTitle>{{ label }}</VCardTitle>
          <VDivider />

          <VCardText>
            <VTextField
              v-if="showSearch"
              v-model="searchQuery"
              :placeholder="searchPlaceholder"
              outlined
              hide-details
              class="mt-4 mb-4"
            />

            <div
              v-if="filteredItems.length === 0"
              class="text-center pt-4"
            >
              <h3>Not Found</h3>
            </div>

            <VList v-else>
              <VListItem
                v-for="(item, i) in filteredItems"
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

