<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAdvertiserBrandStore, useCustomerStore } from '@/stores/advertiser'
import { STATUS_OPTIONS } from '@/types/advertiser'
import type { BrandPayload } from '@/types/advertiser'
import { extractApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const store = useAdvertiserBrandStore()
const customerStore = useCustomerStore()

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// customer_id is required on the payload, but the form must represent "not chosen
// yet", and 0 is not that -- no option carries it, so VSelect renders a literal "0".
type BrandDraft = Omit<BrandPayload, 'customer_id'> & { customer_id: number | null }

const form = ref<BrandDraft>({
  code: '',
  customer_id: null,
  name: '',
  category: '',
  status: 'active',
  attention_to: '',
  job_title: '',
  contact_phone: '',
  contact_email: '',
})

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
        attention_to: item.attention_to,
        job_title: item.job_title,
        contact_phone: item.contact_phone,
        contact_email: item.contact_email,
      }
    }
  }
  catch (error: any) {
    errorMessage.value = extractApiError(error, 'Failed to load brand')
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

const CONTACT_FIELDS: { key: 'attention_to' | 'job_title' | 'contact_phone' | 'contact_email'; label: string }[] = [
  { key: 'attention_to', label: 'Attention To' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'contact_phone', label: 'Contact Phone' },
  { key: 'contact_email', label: 'Contact Email' },
]

const missingContact = (): string => {
  for (const field of CONTACT_FIELDS) {
    if (!form.value[field.key].trim())
      return `${field.label} is required`
  }

  return ''
}

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
  const customerId = form.value.customer_id
  if (!customerId) {
    errorMessage.value = 'Customer is required'

    return
  }

  // A quotation is addressed to a person and the printed document carries all four,
  // so the brand must name one. The API refuses a blank; saying so here is kinder.
  const contactError = missingContact()
  if (contactError) {
    errorMessage.value = contactError

    return
  }

  const payload: BrandPayload = { ...form.value, customer_id: customerId }

  isSaving.value = true
  try {
    if (isEdit.value && itemId.value)
      await store.update(itemId.value, payload)
    else
      await store.create(payload)

    router.push({ name: 'advertiser-brands' })
  }
  catch (error: any) {
    errorMessage.value = extractApiError(error, 'Failed to save brand')
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
            <!--
              Quotation contact. Held on the brand because the same person is quoted
              campaign after campaign; the wizard prefills from here, and each
              quotation then keeps its own copy so editing this never rewrites a
              document already sent.
            -->
            <VCol cols="12">
              <VDivider class="mb-4" />
              <div class="text-subtitle-1 mb-1">
                Quotation contact
              </div>
              <div class="text-caption text-disabled mb-3">
                Printed on every quotation raised for this brand. The seller can still
                override it on an individual quotation.
              </div>
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.attention_to"
                label="Attention To"
                placeholder="Budi Santoso"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.job_title"
                label="Job Title"
                placeholder="Marketing Director"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.contact_phone"
                label="Contact Phone"
                placeholder="+62 812 3456 7890"
                :disabled="isSaving"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                v-model="form.contact_email"
                label="Contact Email"
                type="email"
                placeholder="budi@example.com"
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
