<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAdvertiserBrandStore, useCustomerStore, useSalesAssignmentStore } from '@/stores/advertiser'
import { getQuotationOwners } from '@/http/user'
import type { QuotationOwner } from '@/types/user'
import { STATUS_OPTIONS } from '@/types/advertiser'
import type { MasterDataStatus, SalesAssignment, SalesAssignmentPayload, SalesAssignmentStatus } from '@/types/advertiser'
import { extractApiError } from '@/utils/apiError'
import { ASSIGNMENT_TERM_MONTHS, assignmentStatusChip, isAssignmentExpired, termExpiry, todayWIB } from '@/utils/salesAssignmentTerm'

const route = useRoute()
const router = useRouter()
const store = useSalesAssignmentStore()
const customerStore = useCustomerStore()
const brandStore = useAdvertiserBrandStore()

// Who may hold a brand: names only, readable by sales admin as well as admin.
const owners = ref<QuotationOwner[]>([])

const isEdit = computed(() => !!route.params.id)
const itemId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// The payload requires the three ids; the form has to represent "not chosen yet",
// and 0 is not that -- no option carries it, so VSelect renders a literal "0".
type AssignmentDraft = Omit<SalesAssignmentPayload, 'customer_id' | 'brand_id' | 'sales_user_id' | 'status'> & {

  // An expired assignment is shown as it is; only active and inactive are ever sent.
  status: SalesAssignmentStatus
  customer_id: number | null
  brand_id: number | null
  sales_user_id: number | null
}

const form = ref<AssignmentDraft>({
  customer_id: null,
  brand_id: null,
  sales_user_id: null,
  status: 'active',
})

/** The assignment as loaded, for edit: what the term rules compare against. */
const original = ref<SalesAssignment | null>(null)

/** Expired assignments are history: shown read-only, never saved. */
const isExpired = computed(() => !!original.value && isAssignmentExpired(original.value))

/** Expired is offered only to display an expired row; nobody can choose it. */
const statusOptions = computed(() =>
  isExpired.value ? [...STATUS_OPTIONS, { title: 'Expired', value: 'expired' as const }] : STATUS_OPTIONS)

/** What the backend will store as the expiry when this form is saved. */
/**
 * Both dates belong to the system: a new assignment is registered today and runs
 * 3 months, and an existing one keeps its dates whatever is edited. Only an approved
 * quotation moves the expiry.
 */
const registrationShown = computed(() => original.value?.registration_date || todayWIB())
const expiryShown = computed(() => original.value?.expiry_date || termExpiry(todayWIB()))

const expiryHint = computed(() => {
  if (isExpired.value)
    return 'This term has ended.'
  if (!original.value)
    return `Set automatically: ${ASSIGNMENT_TERM_MONTHS} months from today.`

  return `Set automatically. Each approved quotation for this brand renews it for ${ASSIGNMENT_TERM_MONTHS} months; a new PIC takes over the remaining term.`
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
  owners.value.map(u => ({ title: `${u.name} (${u.username})`, value: u.id })))

const loadReferenceData = async () => {
  await Promise.all([
    customerStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    brandStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    getQuotationOwners().then(r => { owners.value = r.data || [] }),
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
      original.value = { ...item }
      form.value = {
        customer_id: item.customer_id,
        brand_id: item.brand_id,
        sales_user_id: item.sales_user_id,

        status: isAssignmentExpired(item) ? 'expired' : item.status,
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

/**
 * Fills the form for the current route. It runs on mount and again on every route
 * change: Edit and New share this component, so going from an expired assignment to
 * "New assignment for this brand" reuses the instance and never mounts it again.
 */
const initForm = async () => {
  errorMessage.value = ''
  original.value = null
  form.value = { customer_id: null, brand_id: null, sales_user_id: null, status: 'active' }

  if (isEdit.value) {
    await fetchItem()

    return
  }

  // "New assignment for this brand", from an expired one, arrives with the pair.
  const customerId = Number(route.query.customer_id)
  const brandId = Number(route.query.brand_id)
  if (customerId > 0) {
    form.value.customer_id = customerId
    await nextTick()
    if (brandId > 0)
      form.value.brand_id = brandId
  }
}

onMounted(async () => {
  isLoading.value = true
  await loadReferenceData()
  isLoading.value = false
  await initForm()
})

watch(() => route.fullPath, initForm)

const startNewForThisBrand = () => {
  if (!original.value)
    return
  router.push({
    name: 'sales-assignment-new',
    query: { customer_id: String(original.value.customer_id), brand_id: String(original.value.brand_id) },
  })
}

// Changing customer invalidates a brand of another customer. Only such a brand is
// cleared: loading an assignment sets customer and brand together, and a blanket
// reset wiped the brand it had just loaded, so Edit always opened with Brand empty.
watch(() => form.value.customer_id, () => {
  if (form.value.brand_id && !brandOptions.value.some(b => b.value === form.value.brand_id))
    form.value.brand_id = null
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.customer_id || !form.value.brand_id || !form.value.sales_user_id) {
    errorMessage.value = 'Customer, Brand and Sales PIC are all required'

    return
  }
  if (isExpired.value)
    return

  // The guard above proves these three, but the state models "not chosen yet"
  // as null, so narrow them into the payload explicitly.
  const payload: SalesAssignmentPayload = {
    ...form.value,
    customer_id: form.value.customer_id,
    brand_id: form.value.brand_id,
    sales_user_id: form.value.sales_user_id,

    // Expired never reaches here: submit returns early for an expired assignment.
    status: form.value.status as MasterDataStatus,
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
        <span class="text-h4 ms-4">{{ isExpired ? 'Expired' : isEdit ? 'Edit' : 'Create' }} Sales Assignment</span>
        <VChip
          v-if="original"
          size="small"
          variant="tonal"
          class="ms-3"
          :color="assignmentStatusChip(original).color"
        >
          {{ assignmentStatusChip(original).label }}
        </VChip>
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
          v-if="isExpired"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          <div>
            This assignment expired on <strong>{{ original?.expiry_date }}</strong> because no
            quotation for this brand was approved within {{ ASSIGNMENT_TERM_MONTHS }} months. It is
            kept as history and cannot be changed or deleted.
          </div>
          <VBtn
            class="mt-3"
            color="primary"
            size="small"
            @click="startNewForThisBrand"
          >
            New assignment for this brand
          </VBtn>
        </VAlert>
        <VAlert
          v-else
          type="info"
          variant="tonal"
          class="mb-4"
        >
          A brand has one current sales PIC. The PIC holds it for {{ ASSIGNMENT_TERM_MONTHS }}
          months from the registration date, and every approved quotation for the brand renews
          that for another {{ ASSIGNMENT_TERM_MONTHS }} months. When the term runs out the
          assignment expires and the brand needs a new one.
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
                :disabled="isSaving || isExpired"
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
                :disabled="isSaving || isExpired || !form.customer_id"
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
                :disabled="isSaving || isExpired"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VSelect
                v-model="form.status"
                :items="statusOptions"
                label="Status"
                :disabled="isSaving || isExpired"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                :model-value="registrationShown"
                label="Registration Date"
                type="date"
                readonly
                disabled
                :hint="original ? 'The day this assignment was created.' : 'Set automatically: today.'"
                persistent-hint
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                :model-value="expiryShown"
                label="Expiry Date"
                type="date"
                readonly
                disabled
                :hint="expiryHint"
                persistent-hint
              />
            </VCol>
            <VCol
              cols="12"
              class="d-flex gap-2"
            >
              <VBtn
                v-if="!isExpired"
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
                {{ isExpired ? 'Back' : 'Cancel' }}
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </div>
</template>
