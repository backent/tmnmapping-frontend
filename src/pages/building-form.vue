<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useBuildingStore } from '@/stores/building'
import type { BuildingUpdateData } from '@/types/building'
import { getImageProxyPath } from '@/utils/images'

const route = useRoute()
const router = useRouter()
const buildingStore = useBuildingStore()

// Building ID from route
const buildingId = computed(() => Number(route.params.id))

// Form state (only user-editable fields)
const form = ref<BuildingUpdateData>({
  sellable: '',
  connectivity: '',
  resource_type: '',
})

// Read-only ERP fields
const building = computed(() => buildingStore.currentBuilding)

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

// Options for dropdowns
const sellableOptions = [
  { value: 'sell', title: 'Sell' },
  { value: 'not_sell', title: 'Not Sell' },
]

const connectivityOptions = [
  { value: 'online', title: 'Online' },
  { value: 'manual', title: 'Manual' },
  { value: 'not_yet_checked', title: 'Not Yet Checked' },
]

// Fetch building
const fetchBuilding = async () => {
  if (!buildingId.value)
    return

  isLoading.value = true
  try {
    await buildingStore.fetchBuildingById(buildingId.value)

    const b = buildingStore.currentBuilding
    if (b) {
      form.value = {
        sellable: b.sellable || '',
        connectivity: b.connectivity || '',
        resource_type: b.resource_type || '',
      }
    }
  }
  catch (error: any) {
    errorMessage.value = 'Failed to load building'
    console.error('Fetch error:', error)
  }
  finally {
    isLoading.value = false
  }
}

// Submit form
const submit = async () => {
  errorMessage.value = ''

  isSaving.value = true

  try {
    await buildingStore.updateBuilding(buildingId.value, form.value)

    // Navigate back to list
    router.push({ name: 'buildings' })
  }
  catch (error: any) {
    errorMessage.value = error.response?.data?.data || 'Failed to update building'
    console.error('Save error:', error)
  }
  finally {
    isSaving.value = false
  }
}

// Cancel and go back
const cancel = () => {
  router.push({ name: 'buildings' })
}

// Fetch building on mount
onMounted(() => {
  fetchBuilding()
})

// Cleanup
onUnmounted(() => {
  buildingStore.clearCurrentBuilding()
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
        <span class="text-h4 ms-4">Edit Building</span>
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
        <!-- Read-only ERP fields section -->
        <h3 class="text-h6 mb-4">
          ERP Data (Read-only)
        </h3>
        <VRow>
          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.name"
              label="Building Name"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.external_building_id"
              label="Building ID"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.project_name"
              label="Project Name"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.cbd_area"
              label="CBD Area"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.subdistrict || '-'"
              label="Subdistrict"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.citytown || '-'"
              label="City/Town"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.province || '-'"
              label="Province"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.grade_resource || '-'"
              label="Grade Resource"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.building_type || '-'"
              label="Building Type"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.completion_year || '-'"
              label="Completion Year"
              readonly
              variant="outlined"
              type="number"
            />
          </VCol>

          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              :model-value="building?.audience"
              label="Audience"
              readonly
              variant="outlined"
              type="number"
            />
          </VCol>

          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              :model-value="building?.impression"
              label="Impression"
              readonly
              variant="outlined"
              type="number"
            />
          </VCol>

          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              :model-value="building?.building_status || '-'"
              label="Building Status"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.competitor_location ? 'Yes' : 'No'"
              label="Competitor Location"
              readonly
              variant="outlined"
            />
          </VCol>

          <VCol
            cols="12"
            md="6"
          >
            <VTextField
              :model-value="building?.synced_at ? new Date(building.synced_at).toLocaleString() : '-'"
              label="Last Synced"
              readonly
              variant="outlined"
            />
          </VCol>
        </VRow>

        <!-- Building Images Section -->
        <VRow class="mt-4">
          <VCol cols="12">
            <h4 class="text-subtitle-1 mb-2">
              Building Images
            </h4>
            <VRow v-if="building?.images && building.images.length > 0">
              <VCol
                v-for="(image, index) in building.images"
                :key="index"
                cols="12"
                sm="6"
                md="3"
              >
                <VCard>
                  <VCardText class="pa-2">
                    <div class="text-caption mb-1 text-capitalize">
                      {{ image.name.replace('_', ' ') }}
                    </div>
                    <VImg
                      :src="getImageProxyPath(image.path)"
                      :alt="image.name"
                      aspect-ratio="1"
                      cover
                      class="rounded"
                      @error="(e: any) => { e.target.style.display = 'none' }"
                    >
                      <template #placeholder>
                        <div class="d-flex align-center justify-center fill-height">
                          <VProgressCircular
                            indeterminate
                            color="grey-lighten-5"
                          />
                        </div>
                      </template>
                      <template #error>
                        <div class="d-flex align-center justify-center fill-height bg-grey-lighten-4">
                          <span class="text-caption text-grey">Image not available</span>
                        </div>
                      </template>
                    </VImg>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
            <VAlert
              v-else
              type="info"
              variant="tonal"
            >
              No images available for this building.
            </VAlert>
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <!-- Editable user fields section -->
        <h3 class="text-h6 mb-4">
          User Input (Editable)
        </h3>
        <VForm @submit.prevent="submit">
          <VRow>
            <!-- Sellable -->
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.sellable"
                :items="sellableOptions"
                label="Sellable"
                placeholder="Select sellable status"
                :disabled="isSaving"
                clearable
              />
            </VCol>

            <!-- Connectivity -->
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.connectivity"
                :items="connectivityOptions"
                label="Connectivity"
                placeholder="Select connectivity status"
                :disabled="isSaving"
                clearable
              />
            </VCol>

            <!-- Resource Type -->
            <VCol cols="12">
              <VTextField
                v-model="form.resource_type"
                label="Resource Type"
                placeholder="Enter resource type"
                :disabled="isSaving"
                clearable
              />
            </VCol>

            <!-- Error Message -->
            <VCol
              v-if="errorMessage"
              cols="12"
            >
              <VAlert type="error">
                {{ errorMessage }}
              </VAlert>
            </VCol>

            <!-- Actions -->
            <VCol
              cols="12"
              class="d-flex gap-4"
            >
              <VBtn
                type="submit"
                color="primary"
                :loading="isSaving"
                :disabled="isSaving"
              >
                Update
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
  </div>
</template>
