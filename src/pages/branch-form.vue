<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useBranchStore } from '@/stores/branch'
import type { CreateBranchRequest } from '@/types/branch'

const route = useRoute()
const router = useRouter()
const branchStore = useBranchStore()

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const form = ref<CreateBranchRequest>({
  name: '',
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const fetchItem = async () => {
  if (!itemId.value) return
  isLoading.value = true
  try {
    await branchStore.fetchById(itemId.value)
    const item = branchStore.currentItem
    if (item) {
      form.value = {
        name: item.name,
      }
    }
  }
  catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load branch'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) {
    await fetchItem()
  }
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.name.trim()) {
    errorMessage.value = 'Name is required'
    return
  }

  isSaving.value = true
  try {
    if (isEdit.value && itemId.value) {
      await branchStore.update(itemId.value, form.value)
      snackbarMessage.value = 'Branch updated successfully'
    }
    else {
      await branchStore.create(form.value)
      snackbarMessage.value = 'Branch created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'branches' })
    }, 1000)
  }
  catch (error: any) {
    console.error('Save error:', error)
    const msg = error?.details?.message || error?.details || 'Failed to save branch'
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
  router.push({ name: 'branches' })
}

onUnmounted(() => {
  branchStore.clearCurrentItem()
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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Branch</span>
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
            <VCol
              cols="12"
              class="d-flex gap-2"
            >
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
