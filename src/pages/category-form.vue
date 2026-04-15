<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/category'
import type { CreateCategoryRequest } from '@/types/category'

const route = useRoute()
const router = useRouter()
const categoryStore = useCategoryStore()

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const form = ref<CreateCategoryRequest>({
  name: '',
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const fetchItem = async () => {
  if (!itemId.value)
    return
  isLoading.value = true
  try {
    await categoryStore.fetchById(itemId.value)

    const item = categoryStore.currentItem
    if (item) {
      form.value = {
        name: item.name,
      }
    }
  }
  catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = error?.details?.message || error?.details || 'Failed to load category'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  if (isEdit.value)
    await fetchItem()
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
      await categoryStore.update(itemId.value, form.value)
      snackbarMessage.value = 'Category updated successfully'
    }
    else {
      await categoryStore.create(form.value)
      snackbarMessage.value = 'Category created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'categories' })
    }, 1000)
  }
  catch (error: any) {
    console.error('Save error:', error)

    const msg = error?.details?.message || error?.details || 'Failed to save category'

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
  router.push({ name: 'categories' })
}

onUnmounted(() => {
  categoryStore.clearCurrentItem()
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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Category</span>
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
