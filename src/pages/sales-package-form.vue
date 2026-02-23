<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useSalesPackageStore } from '@/stores/salespackage'
import { useBuildingStore } from '@/stores/building'
import type { CreateSalesPackageRequest } from '@/types/salespackage'

const route = useRoute()
const router = useRouter()
const salesPackageStore = useSalesPackageStore()
const buildingStore = useBuildingStore()

const isEdit = computed(() => !!route.params.id)
const packageId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const form = ref<CreateSalesPackageRequest>({
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

const fetchPackage = async () => {
  if (!packageId.value) return
  isLoading.value = true
  try {
    await salesPackageStore.fetchSalesPackageById(packageId.value)
    const pkg = salesPackageStore.currentPackage
    if (pkg) {
      form.value = {
        name: pkg.name,
        building_ids: pkg.buildings.map(b => b.id),
      }
    }
  } catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load sales package'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await buildingStore.fetchBuildingDropdownOptions()
  if (isEdit.value) {
    await fetchPackage()
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
    if (isEdit.value && packageId.value) {
      await salesPackageStore.updateSalesPackage(packageId.value, form.value)
      snackbarMessage.value = 'Sales package updated successfully'
    } else {
      await salesPackageStore.createSalesPackage(form.value)
      snackbarMessage.value = 'Sales package created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'sales-packages' })
    }, 1000)
  } catch (error: any) {
    console.error('Save error:', error)
    const msg = error?.details?.message || error?.details || 'Failed to save sales package'
    errorMessage.value = msg
    snackbarMessage.value = msg
    snackbarColor.value = 'error'
    snackbar.value = true
  } finally {
    isSaving.value = false
  }
}

const cancel = () => {
  router.push({ name: 'sales-packages' })
}

onUnmounted(() => {
  salesPackageStore.clearCurrentPackage()
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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Sales Package</span>
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
