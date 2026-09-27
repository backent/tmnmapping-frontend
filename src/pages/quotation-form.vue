<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useQuotationStore } from '@/stores/quotation'
import { useSalesPackageStore } from '@/stores/salespackage'
import { getAllBuildingPrices } from '@/http/buildingprice'
import {
  addBuildings,
  countSelected,
  filterBuildings,
  indexPriceableBuildings,
  removeBuildings,
  sortedUnique,
  toggleBuilding as toggleBuildingId,
} from '@/utils/buildingPicker'
import type { PriceableBuilding } from '@/utils/buildingPicker'
import { useAdvertiserBrandStore, useCustomerStore } from '@/stores/advertiser'
import PricingSummary from '@/components/quotation/PricingSummary.vue'
import { formatIdr } from '@/types/quotation'
import { hasBrandContact, mergeBrandContact } from '@/utils/brandContact'
import { DEFAULT_VAT_PERCENT, vatPercentToRate, vatRateToPercent } from '@/utils/vat'
import {
  SPOTS_OPTIONS,
  TVC_DURATION_OPTIONS,
  durationLabel,
  rateMultiplier,
  spotsLabel,
  toCampaignNumber,
} from '@/utils/campaignUnits'
import type { QuotationPayload, SelectionPayload } from '@/types/quotation'
import { extractApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const store = useQuotationStore()
const customerStore = useCustomerStore()
const brandStore = useAdvertiserBrandStore()
const salesPackageStore = useSalesPackageStore()

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
  customer_id: null as number | null,
  brand_id: null as number | null,
  attention_to: '',
  job_title: '',
  contact_phone: '',
  contact_email: '',
  discount: 0,
  tax_rate: DEFAULT_VAT_PERCENT / 100,
})

/**
 * VAT as the seller types it: 11 means 11%.
 *
 * `form.tax_rate` keeps the fraction the API expects (0.11) and only changes when
 * this holds a usable percentage, so a half-typed or cleared field never reaches the
 * server. Previously the field took the fraction directly, and clearing it sent ""
 * to a Go float64, which failed with a 500.
 */
const vatPercent = ref<number | string>(vatRateToPercent(form.value.tax_rate))

watch(vatPercent, value => {
  const rate = vatPercentToRate(value)
  if (rate !== null)
    form.value.tax_rate = rate
})

// Loading an existing quotation replaces the form; the field follows the stored rate.
watch(() => form.value.tax_rate, rate => {
  if (vatPercentToRate(vatPercent.value) !== rate)
    vatPercent.value = vatRateToPercent(rate)
})

/**
 * The discount as a number the API can decode. An emptied field holds "" (Vue's
 * v-model.number keeps unparseable input as a string), and "" into a Go float64 is a
 * 500. With the slider gone the text field is the only control, so this matters more.
 */
const discountNumber = (): number => {
  const value = Number(form.value.discount)

  return Number.isFinite(value) ? value : 0
}

const discountError = computed(() => {
  const raw = String(form.value.discount ?? '').trim()
  const value = Number(raw)

  return raw === '' || !Number.isFinite(value) || value < 0 || value > 100
    ? 'Customer discount must be between 0 and 100%'
    : ''
})

const vatError = computed(() => (vatPercentToRate(vatPercent.value) === null
  ? 'VAT must be more than 0% and at most 100%'
  : ''))

const durationOptions = TVC_DURATION_OPTIONS.map(value => ({ title: durationLabel(value), value }))
const spotsOptions = SPOTS_OPTIONS.map(value => ({ title: spotsLabel(value), value }))

const rateMultiplierFor = (selection: SelectionPayload) =>
  rateMultiplier(selection.tvc_duration_seconds, selection.spots)

const MODE_OPTIONS = [
  { value: 'building' as const, label: 'Individual buildings' },
  { value: 'package' as const, label: 'Sales package' },
]

// Placement is required; bonus is optional and starts off.
const placement = ref<SelectionPayload>({
  mode: 'building',
  building_ids: [],
  tvc_duration_seconds: 15,
  weeks: 4,
  spots: 180,
})

const wantsBonus = ref(false)

const bonus = ref<SelectionPayload>({
  mode: 'building',
  building_ids: [],
  tvc_duration_seconds: 15,
  weeks: 4,
  spots: 180,
})

const priceableBuildings = ref<PriceableBuilding[]>([])
const buildingSearch = ref('')
const typeFilter = ref<string[]>([])
const cityFilter = ref<string[]>([])

// Which side of the quotation the picker is editing. Step 1 is placement, step 2 is
// bonus; they share one selector.
const activeSelection = computed(() => (step.value === 1 ? placement.value : bonus.value))

// A Set, because membership is asked once per rendered row. `includes` on the id
// array made selecting buildings quadratic.
const activeIds = computed(() => new Set(activeSelection.value.building_ids ?? []))

const typeOptions = computed(() =>
  sortedUnique(priceableBuildings.value.map(b => b.building_type)))

const cityOptions = computed(() =>
  sortedUnique(priceableBuildings.value.map(b => b.citytown)))

const hasBuildingFilter = computed(() =>
  !!buildingSearch.value?.trim() || typeFilter.value.length > 0 || cityFilter.value.length > 0)

const clearBuildingFilters = () => {
  buildingSearch.value = ''
  typeFilter.value = []
  cityFilter.value = []
}

const customerOptions = computed(() =>
  customerStore.items.map(c => ({ title: `${c.name} (${c.code})`, value: c.id })))

const brandOptions = computed(() =>
  brandStore.items
    .filter(b => b.customer_id === form.value.customer_id)
    .map(b => ({ title: `${b.name} (${b.code})`, value: b.id })))

const selectedBrand = computed(() =>
  brandStore.items.find(b => b.id === form.value.brand_id) ?? null)

/**
 * Prefill the contact from the brand when one is chosen.
 *
 * The brand holds the master contact so nobody retypes the same person for every
 * campaign, but the quotation keeps its own copy — the document prints what was
 * agreed, not whatever the brand says today.
 *
 * Only blank fields are filled. A seller who has already typed a different contact,
 * or is editing a quotation that was sent to someone else, must not have it
 * overwritten by switching brand back and forth.
 */
const applyBrandContact = (force = false) => {
  Object.assign(form.value, mergeBrandContact(form.value, selectedBrand.value, force))
}

const brandContactMissing = computed(() =>
  !!selectedBrand.value && !hasBrandContact(selectedBrand.value))

watch(() => form.value.brand_id, () => applyBrandContact())

/**
 * Drop the brand when it does not belong to the newly chosen customer.
 *
 * Without this the wizard kept a brand from the previous customer: it vanished from
 * the dropdown but stayed in the payload, and the contact stayed prefilled from it.
 * The server refuses the mismatch on save, but only after the seller has filled in
 * the rest of the quotation.
 *
 * Deliberately conditional rather than a blanket reset: loading an existing quotation
 * sets customer and brand together, and a blanket reset would wipe the brand it just
 * loaded.
 */
watch(() => form.value.customer_id, () => {
  if (!form.value.brand_id)
    return

  const stillValid = brandStore.items.some(
    b => b.id === form.value.brand_id && b.customer_id === form.value.customer_id)

  if (!stillValid)
    form.value.brand_id = null
})

// Only a package that carries its own price can be quoted -- the rest would be
// refused on submit. Inactive packages are not offered either.
const packageOptions = computed(() =>
  salesPackageStore.packages
    .filter(p => p.status !== 'inactive' && p.price_idr_per_week > 0)
    .map(p => ({
      title: `${p.name} — ${formatIdr(p.price_idr_per_week)}/wk`,
      value: p.id,
    })))

/**
 * Every building matching the current filters — not a truncated page of them.
 *
 * The list used to be sliced to 60, which is why "select all" has to be built on
 * this array rather than on what is rendered: selecting only the visible 60 while
 * claiming to select the match is the one behaviour worth ruling out. Rendering is
 * kept cheap by virtual scrolling instead of by truncating.
 */
const filteredBuildings = computed(() => filterBuildings(priceableBuildings.value, {
  term: buildingSearch.value,
  types: typeFilter.value,
  cities: cityFilter.value,
}))

const selectedCount = computed(() => activeSelection.value.building_ids?.length ?? 0)

const selectedInFilter = computed(() =>
  countSelected(filteredBuildings.value, activeIds.value))

const allFilteredSelected = computed(() =>
  filteredBuildings.value.length > 0 && selectedInFilter.value === filteredBuildings.value.length)

// One array rebuild per action, not one per building. Each of these assigns
// building_ids exactly once, so the deep watcher fires a single pricing preview
// however many buildings the seller just took.
const toggleBuilding = (buildingId: number, on: boolean) => {
  activeSelection.value.building_ids = toggleBuildingId(
    activeSelection.value.building_ids ?? [], buildingId, on)
}

const selectAllFiltered = () => {
  activeSelection.value.building_ids = addBuildings(
    activeSelection.value.building_ids ?? [], filteredBuildings.value)
}

const deselectAllFiltered = () => {
  activeSelection.value.building_ids = removeBuildings(
    activeSelection.value.building_ids ?? [], filteredBuildings.value)
}

const clearSelection = () => {
  activeSelection.value.building_ids = []
}

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

/**
 * The selection as the API should receive it.
 *
 * Campaign numbers are coerced on the way out: an emptied field holds `''`, which a
 * Go `int` cannot decode, and that surfaced as a 500 instead of a validation message.
 * A zero here is refused cleanly by the server's `gt=0` rule, and `stepError` stops
 * the seller long before that.
 */
const selectionPayload = (selection: SelectionPayload): SelectionPayload | null => {
  const campaign = {
    ...selection,
    weeks: toCampaignNumber(selection.weeks),
    tvc_duration_seconds: toCampaignNumber(selection.tvc_duration_seconds),
    spots: toCampaignNumber(selection.spots),
  }

  if (campaign.mode === 'package')
    return campaign.sales_package_id ? { ...campaign, building_ids: undefined } : null

  return campaign.building_ids?.length ? { ...campaign, sales_package_id: undefined } : null
}

/**
 * What is wrong with one side's campaign, named so the message can say which side.
 *
 * Bonus was previously unchecked entirely, so an empty bonus duration only failed at
 * save — as a 500.
 */
const campaignError = (selection: SelectionPayload, label: string): string => {
  if (toCampaignNumber(selection.weeks) < 1)
    return `${label}: campaign duration must be at least one week`

  if (rateMultiplier(selection.tvc_duration_seconds, selection.spots) === 0) {
    return `${label}: choose a TVC duration of ${TVC_DURATION_OPTIONS.join('/')}s `
      + `and ${SPOTS_OPTIONS.join('/')} spots`
  }

  return ''
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
        discount: discountNumber(),
        tax_rate: form.value.tax_rate,
        placement: selectionPayload(placement.value),
        bonus: wantsBonus.value ? selectionPayload(bonus.value) : null,
      })
      errorMessage.value = ''
    }
    catch (error: any) {
      errorMessage.value = extractApiError(error, 'Could not price this selection')
    }
  }, 300)
}

watch([placement, bonus, wantsBonus, () => form.value.discount, () => form.value.tax_rate],
  refreshPreview, { deep: true })

const loadReferenceData = async () => {
  const [, , buildings] = await Promise.all([
    customerStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    brandStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }),
    getAllBuildingPrices(),
    salesPackageStore.fetchSalesPackages({ take: 1000, skip: 0 }),
  ])

  priceableBuildings.value = indexPriceableBuildings(buildings.data || [])
}

onMounted(async () => {
  await loadReferenceData()

  if (isEdit.value && quotationId.value) {
    await store.fetchById(quotationId.value)

    const q = store.currentItem
    if (q) {
      form.value = {
        customer_id: q.customer_id,
        brand_id: q.brand_id,
        attention_to: q.attention_to,
        job_title: q.job_title,
        contact_phone: q.contact_phone,
        contact_email: q.contact_email,
        discount: q.discount,
        tax_rate: q.tax_rate,
      }

      const p = q.selections.find(s => s.kind === 'placement')
      if (p) {
        placement.value = {
          mode: p.mode,
          building_ids: p.items.map(i => i.building_id),
          sales_package_id: p.sales_package_id,
          tvc_duration_seconds: p.tvc_duration_seconds,
          weeks: p.weeks,
          spots: p.spots,
        }
      }

      const b = q.selections.find(s => s.kind === 'bonus')
      if (b) {
        wantsBonus.value = true
        bonus.value = {
          mode: b.mode,
          building_ids: b.items.map(i => i.building_id),
          sales_package_id: b.sales_package_id,
          tvc_duration_seconds: b.tvc_duration_seconds,
          weeks: b.weeks,
          spots: b.spots,
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
      return campaignError(placement.value, 'Placement')
        || (wantsBonus.value ? campaignError(bonus.value, 'Bonus') : '')
    case 4:
      return discountError.value || vatError.value
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
    // Narrow the two ids the payload requires. The wizard cannot reach save
    // without them, but the state models "not chosen yet" as null.
    const customerId = form.value.customer_id
    const brandId = form.value.brand_id
    if (!customerId || !brandId) {
      errorMessage.value = 'Choose a customer and a brand'

      return
    }

    const payload: QuotationPayload = {
      ...form.value,
      discount: discountNumber(),
      customer_id: customerId,
      brand_id: brandId,
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
    errorMessage.value = extractApiError(error, 'Failed to save the quotation')
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
                @update:model-value="form.brand_id = null"
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
              <div class="d-flex align-center flex-wrap gap-2 mb-2">
                <div class="text-subtitle-2">
                  Quotation contact
                </div>
                <VSpacer />
                <!--
                  Prefilled from the brand, and still editable: the quotation keeps
                  its own copy, so this document prints what was agreed even if the
                  brand's contact changes later.
                -->
                <VBtn
                  v-if="selectedBrand && !brandContactMissing"
                  size="small"
                  variant="text"
                  @click="applyBrandContact(true)"
                >
                  <VIcon
                    icon="ri-refresh-line"
                    class="me-1"
                  />
                  Reset to brand contact
                </VBtn>
              </div>

              <VAlert
                v-if="brandContactMissing"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-3"
              >
                This brand has no contact saved yet, so nothing was prefilled. Add one
                under Brands to reuse it on every quotation.
              </VAlert>
              <div
                v-else-if="selectedBrand"
                class="text-caption text-disabled mb-3"
              >
                Prefilled from {{ selectedBrand.name }}. Edit it here to address this
                one quotation differently — the brand is left unchanged.
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
                <!--
                  VBtnGroup, not VBtnToggle: the template's _button.scss forces
                  every .v-btn-toggle .v-btn to a 44px square with !important,
                  assuming toggles hold icons. Text labels overlap inside it.
                -->
                <VBtnGroup
                  divided
                  density="comfortable"
                  class="mb-4"
                >
                  <VBtn
                    v-for="option in MODE_OPTIONS"
                    :key="option.value"
                    :color="(step === 1 ? placement : bonus).mode === option.value ? 'primary' : 'default'"
                    :variant="(step === 1 ? placement : bonus).mode === option.value ? 'flat' : 'outlined'"
                    @click="(step === 1 ? placement : bonus).mode = option.value"
                  >
                    {{ option.label }}
                  </VBtn>
                </VBtnGroup>

                <template v-if="(step === 1 ? placement : bonus).mode === 'package'">
                  <VSelect
                    v-model="(step === 1 ? placement : bonus).sales_package_id"
                    :items="packageOptions"
                    label="Sales package"
                    :hint="packageOptions.length ? 'A package is priced as one resource.' : 'No package has a price yet. Set one on the sales package.'"
                    persistent-hint
                  />
                </template>

                <template v-else>
                  <VRow dense>
                    <VCol
                      cols="12"
                      md="4"
                    >
                      <VTextField
                        v-model="buildingSearch"
                        label="Search name, IRIS code or city"
                        prepend-inner-icon="ri-search-line"
                        density="compact"
                        clearable
                        hide-details
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      sm="6"
                      md="4"
                    >
                      <VSelect
                        v-model="typeFilter"
                        :items="typeOptions"
                        label="Building type"
                        density="compact"
                        multiple
                        chips
                        closable-chips
                        clearable
                        hide-details
                      />
                    </VCol>
                    <VCol
                      cols="12"
                      sm="6"
                      md="4"
                    >
                      <VSelect
                        v-model="cityFilter"
                        :items="cityOptions"
                        label="City"
                        density="compact"
                        multiple
                        chips
                        closable-chips
                        clearable
                        hide-details
                      />
                    </VCol>
                  </VRow>

                  <!--
                    Bulk actions act on every match, not on what happens to be
                    rendered. "Select all" that quietly meant "select the visible
                    ones" would be worse than no button at all.
                  -->
                  <div class="d-flex align-center flex-wrap gap-2 my-3">
                    <VBtn
                      size="small"
                      variant="tonal"
                      :disabled="!filteredBuildings.length || allFilteredSelected"
                      @click="selectAllFiltered"
                    >
                      <VIcon
                        icon="ri-checkbox-multiple-line"
                        class="me-1"
                      />
                      Select all {{ filteredBuildings.length }} shown
                    </VBtn>
                    <VBtn
                      size="small"
                      variant="text"
                      :disabled="!selectedInFilter"
                      @click="deselectAllFiltered"
                    >
                      Deselect shown
                    </VBtn>
                    <VBtn
                      v-if="selectedCount > selectedInFilter"
                      size="small"
                      variant="text"
                      color="error"
                      @click="clearSelection"
                    >
                      Clear all {{ selectedCount }}
                    </VBtn>
                    <VSpacer />
                    <VBtn
                      v-if="hasBuildingFilter"
                      size="small"
                      variant="text"
                      @click="clearBuildingFilters"
                    >
                      Reset filters
                    </VBtn>
                  </div>

                  <div class="d-flex align-center flex-wrap gap-2 mb-2">
                    <VChip
                      size="small"
                      :color="selectedCount ? 'primary' : undefined"
                      variant="tonal"
                    >
                      {{ selectedCount }} selected
                    </VChip>
                    <span class="text-caption text-disabled">
                      Showing {{ filteredBuildings.length }} of {{ priceableBuildings.length }}.
                      Only buildings with a price can be quoted.
                    </span>
                  </div>

                  <!--
                    Virtual scroll rather than a 60-row cap: the whole priced list is
                    already in memory, and rendering only the visible rows keeps a
                    1,500-building list responsive while still letting the seller
                    scroll the entire match.
                  -->
                  <VVirtualScroll
                    v-if="filteredBuildings.length"
                    :items="filteredBuildings"
                    :item-height="56"
                    height="340"
                    class="border rounded"
                  >
                    <template #default="{ item: b }">
                      <VListItem
                        density="compact"
                        :title="b.building_name"
                      >
                        <template #prepend>
                          <VCheckbox
                            :model-value="activeIds.has(b.building_id)"
                            hide-details
                            density="compact"
                            @update:model-value="(on) => toggleBuilding(b.building_id, !!on)"
                          />
                        </template>
                        <VListItemSubtitle>
                          {{ b.citytown || '—' }} · {{ b.building_type || '—' }} ·
                          {{ formatIdr(b.price_idr_per_week) }}/wk
                        </VListItemSubtitle>
                      </VListItem>
                    </template>
                  </VVirtualScroll>
                  <VAlert
                    v-else
                    type="info"
                    variant="tonal"
                    density="compact"
                  >
                    No priced building matches these filters.
                  </VAlert>
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
                    <!--
                      A dropdown, not a number field: the rate card sells 15-second
                      spots, so 20 seconds has no price and the server refuses it.
                      Offering only what can be quoted beats explaining a rejection.
                    -->
                    <VSelect
                      v-model.number="row.model.tvc_duration_seconds"
                      :items="durationOptions"
                      label="TVC duration"
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
                    <VSelect
                      v-model.number="row.model.spots"
                      :items="spotsOptions"
                      label="Spots / day / screen"
                    />
                  </VCol>
                </VRow>

                <!--
                  The rate a building or package carries buys 15 seconds at 180 spots
                  for one week. Nothing else on this step says that a longer spot
                  costs more, so it is said here, with the arithmetic shown.
                -->
                <VAlert
                  :type="rateMultiplierFor(row.model) > 1 ? 'info' : 'success'"
                  variant="tonal"
                  density="compact"
                  class="mt-2"
                >
                  <span v-if="rateMultiplierFor(row.model) > 1">
                    <strong>×{{ rateMultiplierFor(row.model) }} the base rate</strong> —
                    {{ row.model.tvc_duration_seconds }}s is
                    ×{{ row.model.tvc_duration_seconds / 15 }} and
                    {{ row.model.spots }} spots is ×{{ row.model.spots / 180 }},
                    then ×{{ row.model.weeks }} for the weeks.
                  </span>
                  <span v-else>
                    Base rate — 15s at 180 spots is what a building or package price
                    buys, then ×{{ row.model.weeks }} for the weeks.
                  </span>
                </VAlert>
              </div>
            </div>

            <!-- 5. Discount -->
            <div v-else-if="step === 4">
              <VTextField
                v-model.number="form.discount"
                label="Customer discount (%)"
                type="number"
                min="0"
                max="100"
                suffix="%"
                :error-messages="discountError"
                hint="Applies to Placement only. This is the figure that decides who approves — not the effective discount."
                persistent-hint
                class="mb-4"
              />
              <VTextField
                v-model="vatPercent"
                label="VAT (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                suffix="%"
                :error-messages="vatError"
                hint="Enter 11 for 11%. Charged on nett, and stored per quotation so an approved one keeps its rate."
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
                Submitting re-prices everything at current prices and sends
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
