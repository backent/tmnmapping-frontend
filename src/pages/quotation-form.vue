<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useQuotationStore } from '@/stores/quotation'
import { useCustomerStore, useAdvertiserBrandStore } from '@/stores/advertiser'
import { useRateCardStore } from '@/stores/ratecard'
import PricingSummary from '@/components/quotation/PricingSummary.vue'
import { formatIdr } from '@/types/quotation'
import type { SelectionPayload } from '@/types/quotation'
import { getBuildingPrices } from '@/http/ratecard'
import type { BuildingPrice } from '@/types/ratecard'

const route = useRoute()
const router = useRouter()
const store = useQuotationStore()
const customerStore = useCustomerStore()
const brandStore = useAdvertiserBrandStore()
const rateCardStore = useRateCardStore()

const isEdit = computed(() => !!route.params.id)
const quotationId = computed(() => (isEdit.value ? Number(route.params.id) : null))

// Same six steps as the reference wizard: customer, placement, bonus, campaign
// parameters, discount, review.
const STEPS = [
  'Customer & brand',
  'Placement',
  'Bonus',
  'Campaign',
  'Discount',
  'Review',
]

const step = ref(0)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')
const errorMessage = ref('')

const form = ref({
  customer_id: 0,
  brand_id: 0,
  attention_to: '',
  job_title: '',
  contact_phone: '',
  contact_email: '',
  discount: 0,
  tax_rate: 0.11,
})

// Placement is required; bonus is optional and starts off.
const placement = ref<SelectionPayload>({
  mode: 'building', building_ids: [], sales_package_id: 0,
  tvc_duration_seconds: 15, weeks: 4, spots: 180,
})
const wantsBonus = ref(false)
const bonus = ref<SelectionPayload>({
  mode: 'building', building_ids: [], sales_package_id: 0,
  tvc_duration_seconds: 15, weeks: 4, spots: 180,
})

const priceableBuildings = ref<BuildingPrice[]>([])
const buildingSearch = ref('')

const customerOptions = computed(() =>
  customerStore.items.map(c => ({ title: `${c.name} (${c.code})`, value: c.id })))

const brandOptions = computed(() =>
  brandStore.items
    .filter(b => b.customer_id === form.value.customer_id)
    .map(b => ({ title: `${b.name} (${b.code})`, value: b.id })))

const packageOptions = computed(() =>
  rateCardStore.packagePrices.map(p => ({
    title: `${p.sales_package_name} — ${formatIdr(p.price_idr_per_week)}/wk`,
    value: p.sales_package_id,
  })))

const filteredBuildings = computed(() => {
  const term = buildingSearch.value.trim().toLowerCase()
  if (!term)
    return priceableBuildings.value.slice(0, 60)

  return priceableBuildings.value
    .filter(b => b.building_name.toLowerCase().includes(term) || b.citytown.toLowerCase().includes(term))
    .slice(0, 60)
})

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const errorText = (error: any, fallback: string) =>
  error?.details?.data || error?.details?.message || fallback

const selectionPayload = (selection: SelectionPayload): SelectionPayload | null => {
  if (selection.mode === 'package')
    return selection.sales_package_id ? { ...selection, building_ids: undefined } : null

  return selection.building_ids?.length ? { ...selection, sales_package_id: undefined } : null
}

// Ask the server to price. Debounced, because this fires on every keystroke of the
// discount field.
let previewTimeout: ReturnType<typeof setTimeout> | null = null

const refreshPreview = () => {
  if (previewTimeout)
    clearTimeout(previewTimeout)

  previewTimeout = setTimeout(async () => {
    try {
      await store.refreshPreview({
        discount: form.value.discount,
        tax_rate: form.value.tax_rate,
        placement: selectionPayload(placement.value),
        bonus: wantsBonus.value ? selectionPayload(bonus.value) : null,
      })
      errorMessage.value = ''
    }
    catch (error: any) {
      errorMessage.value = errorText(error, 'Could not price this selection')
    }
  }, 300)
}

watch([placement, bonus, wantsBonus, () => form.value.discount, () => form.value.tax_rate],
  refreshPreview, { deep: true })

const loadReferenceData = async () => {
  await Promise.all([
    customerStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    brandStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    rateCardStore.fetchCurrentVersion(),
  ])

  const current = rateCardStore.currentVersion
  if (!current) {
    errorMessage.value = 'No rate card has been published yet, so nothing can be priced.'

    return
  }

  const [buildings] = await Promise.all([
    getBuildingPrices(current.id, { take: 100000, skip: 0 }),
    rateCardStore.fetchPackagePrices(current.id, { take: 1000, skip: 0 }),
  ])

  priceableBuildings.value = buildings.data || []
}

onMounted(async () => {
  await loadReferenceData()

  if (isEdit.value && quotationId.value) {
    await store.fetchById(quotationId.value)

    const q = store.currentItem
    if (q) {
      form.value = {
        customer_id: q.customer_id, brand_id: q.brand_id,
        attention_to: q.attention_to, job_title: q.job_title,
        contact_phone: q.contact_phone, contact_email: q.contact_email,
        discount: q.discount, tax_rate: q.tax_rate,
      }

      const p = q.selections.find(s => s.kind === 'placement')
      if (p) {
        placement.value = {
          mode: p.mode,
          building_ids: p.items.map(i => i.building_id),
          sales_package_id: p.sales_package_id,
          tvc_duration_seconds: p.tvc_duration_seconds, weeks: p.weeks, spots: p.spots,
        }
      }

      const b = q.selections.find(s => s.kind === 'bonus')
      if (b) {
        wantsBonus.value = true
        bonus.value = {
          mode: b.mode,
          building_ids: b.items.map(i => i.building_id),
          sales_package_id: b.sales_package_id,
          tvc_duration_seconds: b.tvc_duration_seconds, weeks: b.weeks, spots: b.spots,
        }
      }

      refreshPreview()
    }
  }
})

onUnmounted(() => store.clearCurrent())

// Each step names what must be true before moving on, so the message can say which.
const stepError = computed(() => {
  switch (step.value) {
    case 0:
      if (!form.value.customer_id)
        return 'Choose a customer'
      if (!form.value.brand_id)
        return 'Choose a brand'

      return ''
    case 1:
      return selectionPayload(placement.value) ? '' : 'Choose at least one building, or a package'
    case 2:
      if (wantsBonus.value && !selectionPayload(bonus.value))
        return 'Choose a bonus selection, or turn Bonus off'

      return ''
    case 3:
      if (placement.value.weeks < 1)
        return 'Campaign duration must be at least one week'

      return ''
    default:
      return ''
  }
})

const next = () => {
  if (stepError.value) {
    notify(stepError.value, 'error')

    return
  }
  step.value = Math.min(step.value + 1, STEPS.length - 1)
}

const previous = () => {
  if (step.value === 0)
    router.push({ name: 'quotations' })
  else
    step.value -= 1
}

const save = async (thenSubmit: boolean) => {
  errorMessage.value = ''
  try {
    const payload = {
      ...form.value,
      placement: selectionPayload(placement.value),
      bonus: wantsBonus.value ? selectionPayload(bonus.value) : null,
    }

    const response = isEdit.value && quotationId.value
      ? await store.update(quotationId.value, payload)
      : await store.create(payload)

    const id = response.data?.id
    if (!id)
      throw new Error('no id returned')

    if (thenSubmit)
      await store.submit(id)

    router.push({ name: 'quotation-detail', params: { id: String(id) } })
  }
  catch (error: any) {
    errorMessage.value = errorText(error, 'Failed to save the quotation')
    notify(errorMessage.value, 'error')
  }
}
</script>

<template>
  <div>
    <VRow class="mb-2">
      <VCol
        cols="12"
        class="d-flex align-center gap-2"
      >
        <VBtn
          icon
          variant="text"
          @click="router.push({ name: 'quotations' })"
        >
          <VIcon icon="ri-arrow-left-s-line" />
        </VBtn>
        <span class="text-h4">{{ isEdit ? 'Edit' : 'New' }} Quotation</span>
        <VSpacer />
        <span class="text-body-2 text-disabled">Step {{ step + 1 }} of {{ STEPS.length }}</span>
      </VCol>
    </VRow>

    <VRow>
      <VCol
        cols="12"
        md="8"
      >
        <VCard>
          <VTabs
            v-model="step"
            grow
            density="compact"
          >
            <VTab
              v-for="(label, index) in STEPS"
              :key="label"
              :value="index"
              :disabled="index > step"
            >
              {{ label }}
            </VTab>
          </VTabs>

          <VCardText>
            <VAlert
              v-if="errorMessage"
              type="error"
              class="mb-4"
            >
              {{ errorMessage }}
            </VAlert>

            <!-- 1. Customer & brand -->
            <div v-if="step === 0">
              <VSelect
                v-model="form.customer_id"
                :items="customerOptions"
                label="Customer"
                class="mb-4"
                @update:model-value="form.brand_id = 0"
              />
              <VSelect
                v-model="form.brand_id"
                :items="brandOptions"
                label="Brand"
                :disabled="!form.customer_id"
                :hint="form.customer_id ? '' : 'Choose a customer first'"
                persistent-hint
                class="mb-4"
              />
              <VDivider class="mb-4" />
              <div class="text-subtitle-2 mb-2">
                Quotation contact
              </div>
              <VRow>
                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    v-model="form.attention_to"
                    label="Attention to"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    v-model="form.job_title"
                    label="Job title"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    v-model="form.contact_phone"
                    label="Phone"
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="6"
                >
                  <VTextField
                    v-model="form.contact_email"
                    label="Email"
                    type="email"
                  />
                </VCol>
              </VRow>
            </div>

            <!-- 2 & 3. Placement and Bonus share one selector -->
            <div v-else-if="step === 1 || step === 2">
              <VSwitch
                v-if="step === 2"
                v-model="wantsBonus"
                label="Include a bonus selection"
                hint="Bonus is always free. It still counts toward total gross, which raises the effective discount."
                persistent-hint
                class="mb-4"
              />

              <template v-if="step === 1 || wantsBonus">
                <VBtnToggle
                  v-model="(step === 1 ? placement : bonus).mode"
                  mandatory
                  density="comfortable"
                  class="mb-4"
                >
                  <VBtn value="building">
                    Individual buildings
                  </VBtn>
                  <VBtn value="package">
                    Sales package
                  </VBtn>
                </VBtnToggle>

                <template v-if="(step === 1 ? placement : bonus).mode === 'package'">
                  <VSelect
                    v-model="(step === 1 ? placement : bonus).sales_package_id"
                    :items="packageOptions"
                    label="Sales package"
                    :hint="packageOptions.length ? 'A package is priced as one resource.' : 'No package has a price in the published rate card yet.'"
                    persistent-hint
                  />
                </template>

                <template v-else>
                  <VTextField
                    v-model="buildingSearch"
                    label="Search buildings"
                    prepend-inner-icon="ri-search-line"
                    density="compact"
                    clearable
                    class="mb-2"
                  />
                  <div class="text-caption text-disabled mb-2">
                    Only buildings priced in the published rate card can be quoted.
                    {{ priceableBuildings.length }} available.
                  </div>
                  <VList
                    density="compact"
                    max-height="340"
                    class="border rounded"
                    style="overflow-y: auto"
                  >
                    <VListItem
                      v-for="b in filteredBuildings"
                      :key="b.building_id"
                    >
                      <template #prepend>
                        <VCheckbox
                          :model-value="(step === 1 ? placement : bonus).building_ids?.includes(b.building_id)"
                          hide-details
                          density="compact"
                          @update:model-value="(on) => {
                            const target = step === 1 ? placement : bonus
                            const ids = new Set(target.building_ids ?? [])
                            on ? ids.add(b.building_id) : ids.delete(b.building_id)
                            target.building_ids = [...ids]
                          }"
                        />
                      </template>
                      <VListItemTitle>{{ b.building_name }}</VListItemTitle>
                      <VListItemSubtitle>
                        {{ b.citytown || '—' }} · {{ b.building_type || '—' }} ·
                        {{ formatIdr(b.price_idr_per_week) }}/wk
                      </VListItemSubtitle>
                    </VListItem>
                  </VList>
                </template>
              </template>
            </div>

            <!-- 4. Campaign parameters, per selection -->
            <div v-else-if="step === 3">
              <div
                v-for="row in [
                  { label: 'Placement', model: placement, show: true },
                  { label: 'Bonus', model: bonus, show: wantsBonus },
                ].filter(r => r.show)"
                :key="row.label"
                class="mb-6"
              >
                <div class="text-subtitle-2 mb-2">
                  {{ row.label }}
                </div>
                <VRow>
                  <VCol
                    cols="12"
                    md="4"
                  >
                    <VTextField
                      v-model.number="row.model.tvc_duration_seconds"
                      label="TVC duration (seconds)"
                      type="number"
                      min="1"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="4"
                  >
                    <VTextField
                      v-model.number="row.model.weeks"
                      label="Campaign duration (weeks)"
                      type="number"
                      min="1"
                      hint="Rates are per week, so gross = rate × weeks."
                      persistent-hint
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    md="4"
                  >
                    <VTextField
                      v-model.number="row.model.spots"
                      label="Spots / day / screen"
                      type="number"
                      min="1"
                    />
                  </VCol>
                </VRow>
              </div>
            </div>

            <!-- 5. Discount -->
            <div v-else-if="step === 4">
              <VSlider
                v-model="form.discount"
                :min="0"
                :max="100"
                :step="0.5"
                thumb-label="always"
                class="mt-8 mb-2"
              />
              <VTextField
                v-model.number="form.discount"
                label="Customer discount (%)"
                type="number"
                min="0"
                max="100"
                hint="Applies to Placement only. This is the figure that decides who approves — not the effective discount."
                persistent-hint
                class="mb-4"
              />
              <VTextField
                v-model.number="form.tax_rate"
                label="VAT rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                hint="0.11 = 11%, charged on nett. Stored per quotation so an approved one keeps its rate."
                persistent-hint
              />
            </div>

            <!-- 6. Review -->
            <div v-else>
              <VTable density="compact">
                <tbody>
                  <tr>
                    <td class="text-body-2">
                      Customer
                    </td>
                    <td>{{ customerOptions.find(c => c.value === form.customer_id)?.title || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Brand
                    </td>
                    <td>{{ brandOptions.find(b => b.value === form.brand_id)?.title || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Attention to
                    </td>
                    <td>{{ form.attention_to || '—' }} <span class="text-disabled">{{ form.job_title }}</span></td>
                  </tr>
                  <tr
                    v-for="section in store.preview?.sections ?? []"
                    :key="section.kind"
                  >
                    <td class="text-body-2 text-capitalize">
                      {{ section.kind }}
                    </td>
                    <td>
                      {{ section.mode === 'package' ? section.sales_package_name : `${section.items.length} buildings` }}
                      · {{ section.tvc_duration_seconds }}s · {{ section.spots }} spots ·
                      {{ section.weeks }} weeks ·
                      {{ formatIdr(section.gross_price_per_week) }}/wk
                    </td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Discount
                    </td>
                    <td>{{ form.discount }}%</td>
                  </tr>
                </tbody>
              </VTable>

              <VAlert
                type="info"
                variant="tonal"
                class="mt-4"
              >
                Submitting re-prices everything against the published rate card and sends
                it to the approver shown on the right. You can still edit it if it comes back.
              </VAlert>
            </div>
          </VCardText>

          <VCardActions class="justify-space-between px-4 pb-4">
            <VBtn
              variant="outlined"
              @click="previous"
            >
              {{ step === 0 ? 'Cancel' : 'Previous' }}
            </VBtn>

            <div class="d-flex gap-2">
              <VBtn
                v-if="step === STEPS.length - 1"
                variant="outlined"
                :loading="store.isSubmitting"
                @click="save(false)"
              >
                Save draft
              </VBtn>
              <VBtn
                v-if="step === STEPS.length - 1"
                color="primary"
                :loading="store.isSubmitting"
                @click="save(true)"
              >
                Submit for approval
              </VBtn>
              <VBtn
                v-else
                color="primary"
                @click="next"
              >
                Next
              </VBtn>
            </div>
          </VCardActions>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        md="4"
      >
        <PricingSummary
          :pricing="store.preview?.pricing ?? null"
          :discount="form.discount"
          :tax-rate="form.tax_rate"
          :approval="store.preview?.approval ?? null"
          :sections="store.preview?.sections ?? []"
          :loading="store.isPreviewing"
        />
      </VCol>
    </VRow>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
