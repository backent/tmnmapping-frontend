<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAdvertiserBrandStore, useCustomerStore, useSalesAssignmentStore } from '@/stores/advertiser'
import { useUserStore } from '@/stores/user'
import { STATUS_OPTIONS } from '@/types/advertiser'
import type { SalesAssignmentPayload } from '@/types/advertiser'
import { extractApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const store = useSalesAssignmentStore()
const customerStore = useCustomerStore()
const brandStore = useAdvertiserBrandStore()
const userStore = useUserStore()

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// The payload requires the three ids; the form has to represent "not chosen yet",
// and 0 is not that -- no option carries it, so VSelect renders a literal "0".
type AssignmentDraft = Omit<SalesAssignmentPayload, 'customer_id' | 'brand_id' | 'sales_user_id'> & {
  customer_id: number | null
  brand_id: number | null
  sales_user_id: number | null
}

const form = ref<AssignmentDraft>({
  customer_id: null,
  brand_id: null,
  sales_user_id: null,
  status: 'active',
  registration_date: '',
  expiry_date: '',
})

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const customerOptions = computed(() =>
  customerStore.items.map(c => ({ title: `${c.name} (${c.code})`, value: c.id })))

// Only brands under the chosen customer: the API rejects a mismatched pair, so
// offering the others would just produce an error on save.
const brandOptions = computed(() =>
  brandStore.items
    .filter(b => b.customer_id === form.value.customer_id)
    .map(b => ({ title: `${b.name} (${b.code})`, value: b.id })))

const userOptions = computed(() =>
  userStore.items.map(u => ({ title: `${u.name} (${u.username})`, value: u.id })))

const loadReferenceData = async () => {
  await Promise.all([
    customerStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    brandStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    userStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
  ])
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
        customer_id: item.customer_id,
        brand_id: item.brand_id,
        sales_user_id: item.sales_user_id,
        status: item.status,
        registration_date: item.registration_date,
        expiry_date: item.expiry_date,
      }
    }
  }
  catch (error: any) {
    errorMessage.value = extractApiError(error, 'Failed to load assignment')
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  isLoading.value = true
  await loadReferenceData()
  isLoading.value = false
  if (isEdit.value)
    await fetchItem()
})

// Changing customer invalidates the brand choice.
watch(() => form.value.customer_id, (next, previous) => {
  if (previous !== undefined && next !== previous)
    form.value.brand_id = null
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.customer_id || !form.value.brand_id || !form.value.sales_user_id) {
    errorMessage.value = 'Customer, Brand and Sales PIC are all required'

    return
  }
  if (form.value.registration_date && form.value.expiry_date
    && form.value.expiry_date < form.value.registration_date) {
    errorMessage.value = 'Expiry Date cannot be earlier than Registration Date'

    return
  }

  // The guard above proves these three, but the state models "not chosen yet"
  // as null, so narrow them into the payload explicitly.
  const payload: SalesAssignmentPayload = {
    ...form.value,
    customer_id: form.value.customer_id,
    brand_id: form.value.brand_id,
    sales_user_id: form.value.sales_user_id,
  }

  isSaving.value = true
  try {
    if (isEdit.value && itemId.value)
      await store.update(itemId.value, payload)
    else
      await store.create(payload)

    router.push({ name: 'sales-assignments' })
  }
  catch (error: any) {
    errorMessage.value = extractApiError(error, 'Failed to save assignment')
  }
  finally {
    isSaving.value = false
  }
}

const cancel = () => router.push({ name: 'sales-assignments' })

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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Sales Assignment</span>
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
          type="info"
          variant="tonal"
          class="mb-4"
        >
          A brand has exactly one sales PIC. Assigning a brand that already has one
          replaces the existing assignment.
        </VAlert>

        <VForm @submit.prevent="submit">
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.customer_id"
                :items="customerOptions"
                label="Customer"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.brand_id"
                :items="brandOptions"
                label="Brand"
                :hint="form.customer_id ? '' : 'Choose a customer first'"
                persistent-hint
                :disabled="isSaving || !form.customer_id"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.sales_user_id"
                :items="userOptions"
                label="Sales PIC"
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
              md="6"
            >
              <VTextField
                v-model="form.registration_date"
                label="Registration Date"
                type="date"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.expiry_date"
                label="Expiry Date"
                type="date"
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
