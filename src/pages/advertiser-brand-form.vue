<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAdvertiserBrandStore, useCustomerStore } from '@/stores/advertiser'
import { STATUS_OPTIONS } from '@/types/advertiser'
import type { BrandPayload } from '@/types/advertiser'

const route = useRoute()
const router = useRouter()
const store = useAdvertiserBrandStore()
const customerStore = useCustomerStore()

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const form = ref<BrandPayload>({ code: '', customer_id: 0, name: '', category: '', status: 'active' })

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const customerOptions = computed(() =>
  customerStore.items.map(customer => ({
    title: `${customer.name} (${customer.code})`,
    value: customer.id,
  })))

const loadCustomers = async () => {
  // The dropdown needs the full list, not the paginated first page.
  await customerStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' })
}

const fetchItem = async () => {
  if (!itemId.value)
    return
  isLoading.value = true
  try {
    await store.fetchById(itemId.value)

    const item = store.currentItem
    if (item) {
      form.value = {
        code: item.code,
        customer_id: item.customer_id,
        name: item.name,
        category: item.category,
        status: item.status,
      }
    }
  }
  catch (error: any) {
    errorMessage.value = error?.details?.data || 'Failed to load brand'
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadCustomers()
  if (isEdit.value)
    await fetchItem()
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.code.trim()) {
    errorMessage.value = 'Brand Code is required'

    return
  }
  if (!form.value.name.trim()) {
    errorMessage.value = 'Brand Name is required'

    return
  }
  if (!form.value.customer_id) {
    errorMessage.value = 'Customer is required'

    return
  }

  isSaving.value = true
  try {
    if (isEdit.value && itemId.value)
      await store.update(itemId.value, form.value)
    else
      await store.create(form.value)

    router.push({ name: 'advertiser-brands' })
  }
  catch (error: any) {
    errorMessage.value = error?.details?.data || error?.details?.message || 'Failed to save brand'
  }
  finally {
    isSaving.value = false
  }
}

const cancel = () => router.push({ name: 'advertiser-brands' })

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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Brand</span>
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

        <VAlert
          v-if="!customerOptions.length"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          There are no customers yet. A brand always belongs to a customer, so create or
          import one first.
        </VAlert>

        <VForm @submit.prevent="submit">
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.code"
                label="Brand Code"
                hint="Unique. Also the key used when importing a spreadsheet."
                persistent-hint
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.customer_id"
                :items="customerOptions"
                label="Customer"
                :disabled="isSaving || !customerOptions.length"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.name"
                label="Brand Name"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.category"
                label="Category"
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
