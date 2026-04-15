<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useBuildingRestrictionStore } from '@/stores/buildingrestriction'
import BuildingSelectField from '@/components/building/BuildingSelectField.vue'
import type { BuildingRef, CreateBuildingRestrictionRequest } from '@/types/buildingrestriction'

const route = useRoute()
const router = useRouter()
const buildingRestrictionStore = useBuildingRestrictionStore()

const isEdit = computed(() => !!route.params.id)
const restrictionId = computed(() => (isEdit.value ? Number(route.params.id) : null))

interface BuildingRestrictionForm {
  name: string
  buildings: BuildingRef[]
}

const form = ref<BuildingRestrictionForm>({
  name: '',
  buildings: [],
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const fetchRestriction = async () => {
  if (!restrictionId.value)
    return
  isLoading.value = true
  try {
    await buildingRestrictionStore.fetchBuildingRestrictionById(restrictionId.value)

    const restriction = buildingRestrictionStore.currentRestriction
    if (restriction) {
      form.value = {
        name: restriction.name,
        buildings: restriction.buildings,
      }
    }
  }
  catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load building restriction'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (isEdit.value)
    await fetchRestriction()
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.name.trim()) {
    errorMessage.value = 'Name is required'

    return
  }
  if (!form.value.buildings.length) {
    errorMessage.value = 'At least one building is required'

    return
  }

  const payload: CreateBuildingRestrictionRequest = {
    name: form.value.name,
    building_ids: form.value.buildings.map(b => b.id),
  }

  isSaving.value = true
  try {
    if (isEdit.value && restrictionId.value) {
      await buildingRestrictionStore.updateBuildingRestriction(restrictionId.value, payload)
      snackbarMessage.value = 'Building restriction updated successfully'
    }
    else {
      await buildingRestrictionStore.createBuildingRestriction(payload)
      snackbarMessage.value = 'Building restriction created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'building-restrictions' })
    }, 1000)
  }
  catch (error: any) {
    console.error('Save error:', error)

    const msg = error?.details?.message || error?.details || 'Failed to save building restriction'

    errorMessage.value = msg
    snackbarMessage.value = msg
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isSaving.value = false
  }
}

const cancel = () => {
  router.push({ name: 'building-restrictions' })
}

onUnmounted(() => {
  buildingRestrictionStore.clearCurrentRestriction()
})
</script>

<template>
  <div>
    <VRow class="mb-4">
      <VCol cols="12">
        <VBtn
          icon
          variant="text"
          @click="cancel"
        >
          <VIcon icon="ri-arrow-left-s-line" />
        </VBtn>
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Building Restriction</span>
      </VCol>
    </VRow>

    <VProgressLinear
      v-if="isLoading"
      indeterminate
    />

    <VCard v-else>
      <VCardText>
        <VAlert
          v-if="errorMessage"
          type="error"
          class="mb-4"
        >
          {{ errorMessage }}
        </VAlert>

        <VForm @submit.prevent="submit">
          <VRow>
            <VCol cols="12">
              <VTextField
                v-model="form.name"
                label="Name"
                required
                :disabled="isSaving"
              />
            </VCol>
            <VCol cols="12">
              <VDivider class="my-2" />
              <BuildingSelectField
                v-model="form.buildings"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              class="d-flex gap-2"
            >
              <VBtn
                type="submit"
                color="primary"
                :loading="isSaving"
                :disabled="form.buildings.length === 0"
              >
                {{ isEdit ? 'Update' : 'Create' }}
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

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
