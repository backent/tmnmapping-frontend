<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useBuildingStore } from '@/stores/building'
import { useBuildingAreaStore } from '@/stores/building-area'
import { useBuildingSubAreaStore } from '@/stores/building-sub-area'
import { useBuildingTypeStore } from '@/stores/building-type'
import { useResourceTypeStore } from '@/stores/resource-type'

const route = useRoute()
const router = useRouter()
const buildingStore = useBuildingStore()
const buildingAreaStore = useBuildingAreaStore()
const buildingSubAreaStore = useBuildingSubAreaStore()
const buildingTypeStore = useBuildingTypeStore()
const resourceTypeStore = useResourceTypeStore()

const buildingId = computed(() => route.query.id as string | undefined)
const isEditMode = computed(() => !!buildingId.value)

const formTitle = computed(() => isEditMode.value ? 'Edit Building' : 'Create Building')

const form = ref({
  name: '',
  iris_building_id: '',
  external_building_id: '',
  project_name: '',
  resource_type_id: null as number | null,
  audience: null as number | null,
  traffic_per_week: null as number | null,
  address: '',
  latitude: null as number | null,
  longitude: null as number | null,
  description: '',
  building_area_id: null as number | null,
  building_sub_area_id: null as number | null,
  building_type_id: null as number | null,
})

const isLoading = ref(false)
const errorMessage = ref('')
const isSubmitting = ref(false)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const formRef = ref()

// Validation rules
const rules = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '' || value === 0) {
      return 'This field is required'
    }
    return true
  },
  name: (value: string) => {
    if (!value || value.trim() === '') {
      return 'Building name is required'
    }
    return true
  },
  address: (value: string) => {
    if (!value || value.trim() === '') {
      return 'Address is required'
    }
    return true
  },
  buildingArea: (value: number | null) => {
    if (value === null || value === undefined || value === 0) {
      return 'Building area is required'
    }
    return true
  },
  buildingSubArea: (value: number | null) => {
    if (value === null || value === undefined || value === 0) {
      return 'Building sub area is required'
    }
    return true
  },
  buildingType: (value: number | null) => {
    if (value === null || value === undefined || value === 0) {
      return 'Building type is required'
    }
    return true
  },
}

// Fetch master data lists on mount
onMounted(async () => {
  try {
    // Fetch all master data lists to map IDs to names
    // Use take: 9999 to fetch all items for lookup purposes
    await Promise.all([
      buildingAreaStore.fetchBuildingAreas({ take: 9999, skip: 0 }),
      buildingSubAreaStore.fetchBuildingSubAreas({ take: 9999, skip: 0 }),
      buildingTypeStore.fetchBuildingTypes({ take: 9999, skip: 0 }),
      resourceTypeStore.fetchResourceTypes({ take: 9999, skip: 0 }),
    ])
  }
  catch (error) {
    console.error('Error loading master data:', error)
  }

  // If edit mode, load building data from backend
  if (isEditMode.value) {
    isLoading.value = true
    errorMessage.value = ''
    
    try {
      await buildingStore.fetchBuildingById(Number(buildingId.value))
      
      if (buildingStore.currentBuilding) {
        form.value = {
          name: buildingStore.currentBuilding.name,
          iris_building_id: buildingStore.currentBuilding.iris_building_id || '',
          external_building_id: buildingStore.currentBuilding.external_building_id || '',
          project_name: buildingStore.currentBuilding.project_name || '',
          resource_type_id: buildingStore.currentBuilding.resource_type_id || null,
          audience: buildingStore.currentBuilding.audience || null,
          traffic_per_week: buildingStore.currentBuilding.traffic_per_week || null,
          address: buildingStore.currentBuilding.address,
          latitude: buildingStore.currentBuilding.latitude,
          longitude: buildingStore.currentBuilding.longitude,
          description: buildingStore.currentBuilding.description,
          building_area_id: buildingStore.currentBuilding.building_area_id,
          building_sub_area_id: buildingStore.currentBuilding.building_sub_area_id,
          building_type_id: buildingStore.currentBuilding.building_type_id,
        }
      }
    }
    catch (error: any) {
      console.error('Error loading building:', error)
      errorMessage.value = error?.details?.message || 'Failed to load building'
    }
    finally {
      isLoading.value = false
    }
  }
})

const handleSubmit = async () => {
  // Validate form
  const { valid } = await formRef.value.validate()
  if (!valid) {
    errorMessage.value = 'Please fill in all required fields'
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true
  
  try {
    // Convert latitude and longitude to numbers or null
    const latitude = form.value.latitude ? Number(form.value.latitude) : null
    const longitude = form.value.longitude ? Number(form.value.longitude) : null
    // Convert audience and traffic_per_week to numbers or null
    const audience = form.value.audience ? Number(form.value.audience) : null
    const trafficPerWeek = form.value.traffic_per_week ? Number(form.value.traffic_per_week) : null
    
    const buildingData = {
      name: form.value.name,
      iris_building_id: form.value.iris_building_id || null,
      external_building_id: form.value.external_building_id || null,
      project_name: form.value.project_name || null,
      resource_type_id: form.value.resource_type_id || null,
      audience: audience,
      traffic_per_week: trafficPerWeek,
      address: form.value.address,
      latitude: latitude,
      longitude: longitude,
      description: form.value.description || '',
      building_area_id: form.value.building_area_id || 0,
      building_sub_area_id: form.value.building_sub_area_id || 0,
      building_type_id: form.value.building_type_id || 0,
    }
    
    if (isEditMode.value) {
      // Update existing building
      await buildingStore.updateBuilding(Number(buildingId.value), {
        id: Number(buildingId.value),
        ...buildingData,
      })
      
      // Show success message
      snackbarMessage.value = 'Building updated successfully'
      snackbarColor.value = 'success'
      snackbar.value = true
      
      // Navigate after brief delay to show message
      setTimeout(() => {
        router.push('/buildings')
      }, 1000)
    }
    else {
      // Create new building
      await buildingStore.createBuilding(buildingData)
      
      // Show success message
      snackbarMessage.value = 'Building created successfully'
      snackbarColor.value = 'success'
      snackbar.value = true
      
      // Navigate after brief delay to show message
      setTimeout(() => {
        router.push('/buildings')
      }, 1000)
    }
  }
  catch (error: any) {
    console.error('Error saving building:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to save building'
    isSubmitting.value = false
  }
}

const handleCancel = () => {
  router.push('/buildings')
}

const handleReset = () => {
  form.value = {
    name: '',
    iris_building_id: '',
    external_building_id: '',
    project_name: '',
    resource_type_id: null,
    audience: null,
    traffic_per_week: null,
    address: '',
    latitude: null,
    longitude: null,
    description: '',
    building_area_id: null,
    building_sub_area_id: null,
    building_type_id: null,
  }
  errorMessage.value = ''
}

// Computed properties for autocomplete items
const buildingAreaItems = computed(() => {
  return buildingAreaStore.buildingAreas.map(ba => ({
    title: ba.name,
    value: ba.id,
  }))
})

const buildingSubAreaItems = computed(() => {
  return buildingSubAreaStore.buildingSubAreas.map(bsa => ({
    title: bsa.name,
    value: bsa.id,
  }))
})

const buildingTypeItems = computed(() => {
  return buildingTypeStore.buildingTypes.map(bt => ({
    title: bt.name,
    value: bt.id,
  }))
})

const resourceTypeItems = computed(() => {
  return resourceTypeStore.resourceTypes.map(rt => ({
    title: rt.name,
    value: rt.id,
  }))
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle>
          {{ formTitle }}
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

          <VForm
            v-else
            ref="formRef"
            @submit.prevent="handleSubmit"
          >
            <VRow>
              <!-- Error Alert -->
              <VCol
                v-if="errorMessage"
                cols="12"
              >
                <VAlert
                  type="error"
                  variant="tonal"
                  closable
                  @click:close="errorMessage = ''"
                >
                  {{ errorMessage }}
                </VAlert>
              </VCol>

              <!-- Building Name -->
              <VCol cols="12">
                <VTextField
                  v-model="form.name"
                  label="Building Name"
                  placeholder="Enter building name"
                  :disabled="isSubmitting"
                  :rules="[rules.name]"
                  required
                />
              </VCol>

              <!-- IRIS Building ID -->
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.iris_building_id"
                  label="IRIS Building ID"
                  placeholder="Enter IRIS Building ID"
                  :disabled="isSubmitting"
                />
              </VCol>

              <!-- External Building ID -->
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.external_building_id"
                  label="External Building ID"
                  placeholder="Enter External Building ID"
                  :disabled="isSubmitting"
                />
              </VCol>

              <!-- Project Name -->
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.project_name"
                  label="Project Name"
                  placeholder="Enter project name"
                  :disabled="isSubmitting"
                />
              </VCol>

              <!-- Resource Type -->
              <VCol
                cols="12"
                md="6"
              >
                <VAutocomplete
                  v-model="form.resource_type_id"
                  :items="resourceTypeItems"
                  label="Resource Type"
                  placeholder="Search and select resource type"
                  :disabled="isSubmitting"
                  clearable
                />
              </VCol>

              <!-- Audience -->
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.audience"
                  label="Audience"
                  placeholder="Enter audience number"
                  type="number"
                  :disabled="isSubmitting"
                />
              </VCol>

              <!-- Traffic/Week -->
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.traffic_per_week"
                  label="Traffic/Week"
                  placeholder="Enter traffic per week"
                  type="number"
                  :disabled="isSubmitting"
                />
              </VCol>

              <!-- Address -->
              <VCol cols="12">
                <VTextField
                  v-model="form.address"
                  label="Address"
                  placeholder="Enter complete address"
                  :disabled="isSubmitting"
                  :rules="[rules.address]"
                  required
                />
              </VCol>

              <!-- Latitude -->
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.latitude"
                  label="Latitude"
                  placeholder="e.g., 40.748817"
                  type="number"
                  step="any"
                  :disabled="isSubmitting"
                  required
                />
              </VCol>

              <!-- Longitude -->
              <VCol
                cols="12"
                md="6"
              >
                <VTextField
                  v-model="form.longitude"
                  label="Longitude"
                  placeholder="e.g., -73.985428"
                  type="number"
                  step="any"
                  :disabled="isSubmitting"
                  required
                />
              </VCol>

              <!-- Description -->
              <VCol cols="12">
                <VTextarea
                  v-model="form.description"
                  label="Description"
                  placeholder="Enter building description"
                  rows="4"
                  :disabled="isSubmitting"
                />
              </VCol>

              <!-- Building Area -->
              <VCol cols="12">
                <VAutocomplete
                  v-model="form.building_area_id"
                  :items="buildingAreaItems"
                  label="Building Area"
                  placeholder="Search and select building area"
                  :disabled="isSubmitting"
                  :rules="[rules.buildingArea]"
                  required
                  clearable
                />
              </VCol>

              <!-- Building Sub Area -->
              <VCol cols="12">
                <VAutocomplete
                  v-model="form.building_sub_area_id"
                  :items="buildingSubAreaItems"
                  label="Building Sub Area"
                  placeholder="Search and select building sub area"
                  :disabled="isSubmitting"
                  :rules="[rules.buildingSubArea]"
                  required
                  clearable
                />
              </VCol>

              <!-- Building Type -->
              <VCol cols="12">
                <VAutocomplete
                  v-model="form.building_type_id"
                  :items="buildingTypeItems"
                  label="Building Type"
                  placeholder="Search and select building type"
                  :disabled="isSubmitting"
                  :rules="[rules.buildingType]"
                  required
                  clearable
                />
              </VCol>

              <!-- Action Buttons -->
              <VCol
                cols="12"
                class="d-flex gap-4"
              >
                <VBtn
                  type="submit"
                  color="primary"
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                >
                  {{ isEditMode ? 'Update' : 'Create' }}
                </VBtn>

                <VBtn
                  color="secondary"
                  variant="outlined"
                  :disabled="isSubmitting"
                  @click="handleCancel"
                >
                  Cancel
                </VBtn>

                <VBtn
                  v-if="!isEditMode"
                  type="reset"
                  color="error"
                  variant="outlined"
                  :disabled="isSubmitting"
                  @click="handleReset"
                >
                  Reset
                </VBtn>
              </VCol>
            </VRow>
          </VForm>
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

