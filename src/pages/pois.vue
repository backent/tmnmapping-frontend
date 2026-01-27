<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePOIStore } from '@/stores/poi'
import type { POI } from '@/types/poi'

const router = useRouter()
const poiStore = usePOIStore()

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const pois = computed(() => poiStore.pois)
const isLoading = computed(() => poiStore.isLoading)

// Fetch POIs on mount
onMounted(async () => {
  try {
    await poiStore.fetchPOIs()
  }
  catch (error: any) {
    snackbarMessage.value = error?.response?.data?.data || 'Failed to load POIs'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
})

// Handle edit
const handleEdit = (poi: POI) => {
  router.push({ name: 'poi-edit', params: { id: poi.id.toString() } })
}

// Handle delete
const handleDelete = async (poi: POI) => {
  if (!confirm(`Are you sure you want to delete "${poi.name}"?`))
    return

  try {
    await poiStore.deletePOI(poi.id)
    snackbarMessage.value = 'POI deleted successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
  }
  catch (error: any) {
    snackbarMessage.value = error?.response?.data?.data || 'Failed to delete POI'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

// Handle create
const handleCreate = () => {
  router.push({ name: 'poi-new' })
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Points of Interest</span>
          <VBtn
            color="primary"
            @click="handleCreate"
          >
            <VIcon
              icon="ri-add-line"
              class="me-1"
            />
            Create POI
          </VBtn>
        </VCardTitle>

        <VCardText>
          <!-- Loading State -->
          <div
            v-if="isLoading"
            class="d-flex justify-center align-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>

          <!-- POIs Table -->
          <div v-else>
            <VTable>
              <thead>
                <tr>
                  <th class="text-uppercase">
                    Name
                  </th>
                  <th class="text-uppercase">
                    Color
                  </th>
                  <th class="text-uppercase">
                    Points
                  </th>
                  <th class="text-uppercase">
                    Created At
                  </th>
                  <th class="text-uppercase text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="poi in pois"
                  :key="poi.id"
                >
                  <td>
                    <span class="font-weight-medium">{{ poi.name }}</span>
                  </td>
                  <td>
                    <VAvatar
                      :color="poi.color"
                      size="24"
                    />
                    <span class="ms-2">{{ poi.color }}</span>
                  </td>
                  <td>
                    <VChip
                      color="primary"
                      size="small"
                    >
                      {{ poi.points.length }} {{ poi.points.length === 1 ? 'point' : 'points' }}
                    </VChip>
                  </td>
                  <td>
                    <span class="text-body-2">{{ new Date(poi.created_at).toLocaleString() }}</span>
                  </td>
                  <td class="text-center">
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="handleEdit(poi)"
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
                      @click="handleDelete(poi)"
                    >
                      <VIcon icon="ri-delete-bin-line" />
                      <VTooltip
                        activator="parent"
                        location="top"
                      >
                        Delete
                      </VTooltip>
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="pois.length === 0">
                  <td
                    colspan="5"
                    class="text-center text-disabled py-8"
                  >
                    No POIs found. Click "Create POI" to add one.
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Snackbar for feedback -->
    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>
