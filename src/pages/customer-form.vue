<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/advertiser'
import { STATUS_OPTIONS } from '@/types/advertiser'
import type { CustomerPayload } from '@/types/advertiser'
import { extractApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const store = useCustomerStore()

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const form = ref<CustomerPayload>({ code: '', name: '', industry: '', status: 'active' })

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const fetchItem = async () => {
  if (!itemId.value)
    return
  isLoading.value = true
  try {
    await store.fetchById(itemId.value)

    const item = store.currentItem
    if (item)
      form.value = { code: item.code, name: item.name, industry: item.industry, status: item.status }
  }
  catch (error: any) {
    errorMessage.value = extractApiError(error, 'Failed to load customer')
  }
  finally {
    isLoading.value = false
  }
}

onMounted(() => {
  if (isEdit.value)
    fetchItem()
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.code.trim()) {
    errorMessage.value = 'Customer Code is required'

    return
  }
  if (!form.value.name.trim()) {
    errorMessage.value = 'Customer Name is required'

    return
  }

  isSaving.value = true
  try {
    if (isEdit.value && itemId.value)
      await store.update(itemId.value, form.value)
    else
      await store.create(form.value)

    router.push({ name: 'customers' })
  }
  catch (error: any) {
    errorMessage.value = extractApiError(error, 'Failed to save customer')
  }
  finally {
    isSaving.value = false
  }
}

const cancel = () => router.push({ name: 'customers' })

onUnmounted(() => store.clearCurrentItem())
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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Customer</span>
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
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.code"
                label="Customer Code"
                hint="Unique. Also the key used when importing a spreadsheet."
                persistent-hint
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.name"
                label="Customer Name"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.industry"
                label="Industry"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.status"
                :items="STATUS_OPTIONS"
                label="Status"
                hint="Inactive customers stay in history but are hidden from the quotation wizard."
                persistent-hint
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
  </div>
</template>
