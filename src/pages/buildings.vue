<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBuildingStore } from '@/stores/building'
import type { Building } from '@/types/building'

const router = useRouter()
const buildingStore = useBuildingStore()

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const currentPage = ref(1)
const itemsPerPage = ref(10)

// Fetch buildings on component mount
onMounted(async () => {
  await loadBuildings()
})

const loadBuildings = async () => {
  try {
    // Build params object with pagination and ordering
    const skip = (currentPage.value - 1) * itemsPerPage.value
    const params = {
      take: itemsPerPage.value,
      skip: skip,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    }

    await buildingStore.fetchBuildings(params)
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || 'Failed to load buildings'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

// Computed properties from store
const buildings = computed(() => buildingStore.buildings)
const isLoading = computed(() => buildingStore.isLoading)
const totalPages = computed(() => buildingStore.pagination.lastPage || 1)
const totalBuildings = computed(() => buildingStore.pagination.total || 0)

const handleEdit = (building: Building) => {
  router.push({
    path: '/building-form',
    query: { id: building.id.toString() },
  })
}

const handleDelete = async (id: number) => {
  if (confirm('Are you sure you want to delete this building?')) {
    try {
      await buildingStore.deleteBuilding(id)
      
      snackbarMessage.value = 'Building deleted successfully'
      snackbarColor.value = 'success'
      snackbar.value = true
      await loadBuildings()
    }
    catch (error: any) {
      snackbarMessage.value = error?.details?.message || 'Failed to delete building'
      snackbarColor.value = 'error'
      snackbar.value = true
    }
  }
}

const handleAddNew = () => {
  router.push('/building-form')
}

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await loadBuildings()
}

const handleItemsPerPageChange = async () => {
  currentPage.value = 1
  await loadBuildings()
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Buildings List</span>
          <VBtn
            color="primary"
            @click="handleAddNew"
          >
            <VIcon
              icon="ri-add-line"
              class="me-1"
            />
            Add New Building
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

          <!-- Empty State -->
          <div
            v-else-if="buildings.length === 0"
            class="text-center py-8"
          >
            <VIcon
              icon="ri-building-line"
              size="48"
              color="grey"
              class="mb-4"
            />
            <p class="text-body-1 text-medium-emphasis">
              No buildings found. Add your first building to get started.
            </p>
          </div>

          <!-- Buildings Table -->
          <div v-else>
            <VTable>
              <thead>
                <tr>
                  <th class="text-uppercase">
                    ID
                  </th>
                  <th class="text-uppercase">
                    Building Name
                  </th>
                  <th class="text-uppercase">
                    Address
                  </th>
                  <th class="text-uppercase text-center">
                    Latitude
                  </th>
                  <th class="text-uppercase text-center">
                    Longitude
                  </th>
                  <th class="text-uppercase">
                    Description
                  </th>
                  <th class="text-uppercase text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="building in buildings"
                  :key="building.id"
                >
                  <td>
                    {{ building.id }}
                  </td>
                  <td>
                    <span class="font-weight-medium">{{ building.name }}</span>
                  </td>
                  <td>
                    {{ building.address }}
                  </td>
                  <td class="text-center">
                    {{ building.latitude ?? '-' }}
                  </td>
                  <td class="text-center">
                    {{ building.longitude ?? '-' }}
                  </td>
                  <td>
                    <span class="text-truncate d-inline-block" style="max-width: 200px;">
                      {{ building.description }}
                    </span>
                  </td>
                  <td class="text-center">
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="handleEdit(building)"
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
                      @click="handleDelete(building.id)"
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
              </tbody>
            </VTable>

            <!-- Pagination Controls -->
            <div
              v-if="totalBuildings > 0"
              class="d-flex align-center justify-space-between mt-4"
            >
              <div class="text-body-2 text-disabled">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, totalBuildings) }} of {{ totalBuildings }} buildings
              </div>
              <div class="d-flex align-center gap-4">
                <VSelect
                  v-model="itemsPerPage"
                  :items="[5, 10, 25, 50]"
                  label="Items per page"
                  density="compact"
                  style="width: 150px;"
                  @update:model-value="handleItemsPerPageChange"
                />
                <VPagination
                  v-model="currentPage"
                  :length="totalPages"
                  :total-visible="7"
                  @update:model-value="handlePageChange"
                />
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Snackbar -->
    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>

