<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useBuildingRestrictionStore } from '@/stores/buildingrestriction'
import { useBuildingStore } from '@/stores/building'
import type { CreateBuildingRestrictionRequest } from '@/types/buildingrestriction'

const route = useRoute()
const router = useRouter()
const buildingRestrictionStore = useBuildingRestrictionStore()
const buildingStore = useBuildingStore()

const isEdit = computed(() => !!route.params.id)
const restrictionId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const form = ref<CreateBuildingRestrictionRequest>({
  name: '',
  building_ids: [],
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const buildingItems = computed(() =>
  buildingStore.buildingDropdownOptions.map(b => ({
    id: b.id,
    name: b.name,
    building_type: b.building_type,
    title: b.building_type ? `${b.name} (${b.building_type})` : b.name,
  })),
)

const fetchRestriction = async () => {
  if (!restrictionId.value) return
  isLoading.value = true
  try {
    await buildingRestrictionStore.fetchBuildingRestrictionById(restrictionId.value)
    const restriction = buildingRestrictionStore.currentRestriction
    if (restriction) {
      form.value = {
        name: restriction.name,
        building_ids: restriction.buildings.map(b => b.id),
      }
    }
  } catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load building restriction'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await buildingStore.fetchBuildingDropdownOptions()
  if (isEdit.value) {
    await fetchRestriction()
  }
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.name.trim()) {
    errorMessage.value = 'Name is required'
    return
  }
  if (!form.value.building_ids.length) {
    errorMessage.value = 'At least one building is required'
    return
  }

  isSaving.value = true
  try {
    if (isEdit.value && restrictionId.value) {
      await buildingRestrictionStore.updateBuildingRestriction(restrictionId.value, form.value)
      snackbarMessage.value = 'Building restriction updated successfully'
    } else {
      await buildingRestrictionStore.createBuildingRestriction(form.value)
      snackbarMessage.value = 'Building restriction created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'building-restrictions' })
    }, 1000)
  } catch (error: any) {
    console.error('Save error:', error)
    const msg = error?.details?.message || error?.details || 'Failed to save building restriction'
    errorMessage.value = msg
    snackbarMessage.value = msg
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
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
              <VAutocomplete
                v-model="form.building_ids"
                :items="buildingItems"
                item-title="title"
                item-value="id"
                label="Buildings"
                multiple
                chips
                closable-chips
                :loading="buildingStore.isLoading"
                :disabled="isSaving"
                hint="Type to search and select at least one building"
                persistent-hint
                clearable
              />
            </VCol>
            <VCol cols="12" class="d-flex gap-2">
              <VBtn
                type="submit"
                color="primary"
                :loading="isSaving"
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
