<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { useQuotationStore } from '@/stores/quotation'
import { useSalesPackageStore } from '@/stores/salespackage'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
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
import PricingBar from '@/components/quotation/PricingBar.vue'
import {
  APPROVAL_BANDS,
  APPROVER_ROLE_LABELS,
  DISCOUNT_THRESHOLDS,
  formatIdr,
  selectionPayloadFrom,
} from '@/types/quotation'
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
import {
  WIZARD_STEPS,
  campaignYearOptions,
  defaultValidUntil,
  isStepReachable,
  selectedBuildings,
  toCalendarDate,
  weeklyBaseTotal,
} from '@/utils/quotationWizard'
import { formatCalendarDate } from '@/utils/date'
import type { QuotationPayload, SelectionPayload } from '@/types/quotation'
import { extractApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const { mdAndUp } = useDisplay()
const store = useQuotationStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const customerStore = useCustomerStore()
const brandStore = useAdvertiserBrandStore()
const salesPackageStore = useSalesPackageStore()

const isEdit = computed(() => !!route.params.id)
const quotationId = computed(() => (isEdit.value ? Number(route.params.id) : null))

const STEPS = WIZARD_STEPS
const STEP = { client: 0, placement: 1, bonus: 2, campaign: 3, terms: 4, review: 5 } as const

const step = ref<number>(STEP.client)

// The furthest step a new quotation has reached; every step up to it stays open.
const furthest = ref<number>(STEP.client)

// Set by a Next that was refused, so the step shows what is missing in place rather
// than in a toast that disappears. Cleared whenever the step changes.
const showErrors = ref(false)

watch(step, value => {
  furthest.value = Math.max(furthest.value, value)
  showErrors.value = false
})

const canReach = (index: number) => isStepReachable(index, furthest.value, isEdit.value)

const goTo = (index: number) => {
  if (canReach(index))
    step.value = index
}

// The stepper numbers its steps by their value, so it counts from 1 while the
// steps themselves are indexed from 0.
const stepperValue = computed({
  get: () => step.value + 1,
  set: (value: number) => goTo(value - 1),
})

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')
const errorMessage = ref('')

const pricingSheet = ref(false)

const today = toCalendarDate(new Date())

const form = ref({
  customer_id: null as number | null,
  brand_id: null as number | null,
  attention_to: '',
  job_title: '',
  contact_phone: '',
  contact_email: '',
  discount: 0,
  tax_rate: DEFAULT_VAT_PERCENT / 100,
  valid_until: defaultValidUntil(),
  campaign_year: new Date().getFullYear(),
})

/**
 * Proxy entry: an admin raising a quotation on a seller's behalf. Only admins get
 * the field. Other users may proxy only for the sellers on their allow-list, which
 * no endpoint exposes yet, so offering them a list of everyone would invite refusals.
 * The owner is fixed once saved -- the server ignores it on update -- so it is only
 * offered on a new quotation.
 */
const salesOwnerId = ref<number | null>(null)
const canChooseOwner = computed(() => authStore.isAdmin && !isEdit.value)

const ownerOptions = computed(() => [
  { title: `Me (${authStore.currentUser?.name ?? 'you'})`, value: null as number | null },
  ...userStore.items
    .filter(u => u.can_create_quotations && u.id !== authStore.currentUser?.id)
    .map(u => ({ title: `${u.name} (${u.username})`, value: u.id as number | null })),
])

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

// A quotation that is already out of date when sent cannot be accepted. An edited
// quotation whose validity has passed has to be given a new date before it goes out.
const validUntilError = computed(() => {
  if (!form.value.valid_until)
    return 'Choose the date this quotation is valid until'
  if (form.value.valid_until < today)
    return 'The validity date has passed. Choose today or later'

  return ''
})

const yearOptions = computed(() => campaignYearOptions(new Date().getFullYear(), form.value.campaign_year))

// Where the discount sits on the 0-100 meter, kept inside the bar while typing.
const meterPosition = computed(() => Math.min(Math.max(discountNumber(), 0), 100))

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

// Which side of the quotation the picker is editing. The Placement step edits
// placement, the Bonus step edits bonus; they share one picker.
const activeSelection = computed(() => (step.value === STEP.placement ? placement.value : bonus.value))

// A Set, because membership is asked once per rendered row. `includes` on the id
// array made selecting buildings quadratic.
const activeIds = computed(() => new Set(activeSelection.value.building_ids ?? []))

const catalogue = computed(() => new Map(priceableBuildings.value.map(b => [b.building_id, b])))

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

const packageName = (id?: number) =>
  salesPackageStore.packages.find(p => p.id === id)?.name ?? 'No package chosen'

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

const visibleIds = computed(() => new Set(filteredBuildings.value.map(b => b.building_id)))

// The selected-buildings panel lists every selection, including ones the filter
// hides, so a selection never goes out of sight.
const selectedList = computed(() =>
  selectedBuildings(activeSelection.value.building_ids ?? [], catalogue.value, visibleIds.value))

const selectedBaseTotal = computed(() => weeklyBaseTotal(selectedList.value))

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

/** What a line holds, in a few words: "42 buildings" or the package's name. */
const selectionLabel = (selection: SelectionPayload) => {
  if (selection.mode === 'package')
    return packageName(selection.sales_package_id)

  const n = selection.building_ids?.length ?? 0

  return `${n} building${n === 1 ? '' : 's'}`
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
    canChooseOwner.value
      ? userStore.fetchList({ take: 1000, skip: 0, orderBy: 'name', orderDirection: 'ASC' }).catch(() => null)
      : null,
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

        // Older backends sent a timestamp; the date is the first ten characters.
        valid_until: (q.valid_until || '').slice(0, 10) || defaultValidUntil(),
        campaign_year: q.campaign_year || new Date().getFullYear(),
      }

      const p = q.selections.find(s => s.kind === 'placement')
      if (p)
        placement.value = selectionPayloadFrom(p)

      const b = q.selections.find(s => s.kind === 'bonus')
      if (b) {
        wantsBonus.value = true
        bonus.value = selectionPayloadFrom(b)
      }

      refreshPreview()
    }
  }
})

onUnmounted(() => store.clearCurrent())

// Each step names what must be true before moving on, so the message can say which.
const errorForStep = (index: number): string => {
  switch (index) {
    case STEP.client:
      if (!form.value.customer_id)
        return 'Choose a customer'
      if (!form.value.brand_id)
        return 'Choose a brand'

      return ''
    case STEP.placement:
      return selectionPayload(placement.value) ? '' : 'Choose at least one building, or a package'
    case STEP.bonus:
      if (wantsBonus.value && !selectionPayload(bonus.value))
        return 'Choose a bonus selection, or turn Bonus off'

      return ''
    case STEP.campaign:
      return campaignError(placement.value, 'Placement')
        || (wantsBonus.value ? campaignError(bonus.value, 'Bonus') : '')
    case STEP.terms:
      return discountError.value || vatError.value || validUntilError.value
    default:
      return ''
  }
}

const stepError = computed(() => errorForStep(step.value))

// The first step that is not ready, so Submit on Review can send the seller straight
// to it. An edited quotation can reach Review with any step open.
const firstInvalidStep = computed(() =>
  [STEP.client, STEP.placement, STEP.bonus, STEP.campaign, STEP.terms].find(i => errorForStep(i)) ?? null)

const next = () => {
  if (stepError.value) {
    showErrors.value = true

    return
  }
  step.value = Math.min(step.value + 1, STEPS.length - 1)
}

const previous = () => {
  if (step.value === STEP.client)
    router.push({ name: 'quotations' })
  else
    step.value -= 1
}

// A draft can be saved from any step once it has a customer and a brand, which is
// all the server requires of one; the rest is checked on submit.
const canSaveDraft = computed(() =>
  !!form.value.customer_id && !!form.value.brand_id && !discountError.value && !vatError.value)

const save = async (thenSubmit: boolean) => {
  errorMessage.value = ''

  if (thenSubmit && firstInvalidStep.value !== null) {
    step.value = firstInvalidStep.value
    await nextTick()
    showErrors.value = true

    return
  }

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
      valid_until: form.value.valid_until || undefined,
      discount: discountNumber(),
      customer_id: customerId,
      brand_id: brandId,
      placement: selectionPayload(placement.value),
      bonus: wantsBonus.value ? selectionPayload(bonus.value) : null,
      ...(canChooseOwner.value && salesOwnerId.value ? { sales_owner_user_id: salesOwnerId.value } : {}),
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

const previewApproval = computed(() => store.preview?.approval ?? null)
const previewBand = computed(() => APPROVAL_BANDS[previewApproval.value?.band ?? ''] ?? null)

const customerTitle = computed(() => customerOptions.value.find(c => c.value === form.value.customer_id)?.title ?? '—')
const brandTitle = computed(() => brandOptions.value.find(b => b.value === form.value.brand_id)?.title ?? '—')
const ownerTitle = computed(() => ownerOptions.value.find(o => o.value === salesOwnerId.value)?.title ?? '—')

const campaignLine = (selection: SelectionPayload) =>
  `${durationLabel(selection.tvc_duration_seconds)} · ${spotsLabel(selection.spots)} · ${selection.weeks} wk`
</script>

<template>
  <div>
    <VRow class="mb-2">
      <VCol
        cols="12"
        class="d-flex align-center flex-wrap gap-2"
      >
        <VBtn
          icon
          variant="text"
          aria-label="Back to quotations"
          @click="router.push({ name: 'quotations' })"
        >
          <VIcon icon="ri-arrow-left-s-line" />
        </VBtn>
        <span class="text-h4">{{ isEdit ? 'Edit' : 'New' }} Quotation</span>
        <VChip
          v-if="isEdit && store.currentItem"
          size="small"
          variant="outlined"
        >
          {{ store.currentItem.quote_number }}
        </VChip>
        <VChip
          v-else-if="!isEdit"
          size="small"
          variant="outlined"
        >
          Not saved yet
        </VChip>
        <VSpacer />
        <VBtn
          v-if="step !== STEP.review"
          variant="outlined"
          :disabled="!canSaveDraft"
          :loading="store.isSubmitting"
          @click="save(false)"
        >
          Save draft
        </VBtn>
      </VCol>
    </VRow>

    <VRow>
      <VCol
        cols="12"
        md="8"
      >
        <VCard>
          <!--
            Steps already reached stay clickable; on an existing quotation they all
            are. Using the stepper's header only: the step content below is ours.
          -->
          <VStepper
            v-model="stepperValue"
            flat
            hide-actions
            :mobile="!mdAndUp"
            class="wizard-stepper"
          >
            <VStepperHeader>
              <template
                v-for="(label, index) in STEPS"
                :key="label"
              >
                <VDivider v-if="index > 0" />
                <VStepperItem
                  :value="index + 1"
                  :title="label"
                  :complete="index !== step && (isEdit || index < furthest) && !errorForStep(index)"
                  :editable="index !== step && canReach(index)"
                  :error="showErrors && index === step && !!stepError"
                  color="primary"
                />
              </template>
            </VStepperHeader>
          </VStepper>
          <!-- On a phone the stepper shows numbers only, so the step is named here. -->
          <div
            v-if="!mdAndUp"
            class="text-body-2 px-4 pb-3"
          >
            Step {{ step + 1 }} of {{ STEPS.length }} · <strong>{{ STEPS[step] }}</strong>
          </div>

          <VDivider />

          <VCardText>
            <VAlert
              v-if="errorMessage"
              type="error"
              class="mb-4"
            >
              {{ errorMessage }}
            </VAlert>

            <!-- What stops this step, shown in place once Next has been tried. -->
            <VAlert
              v-if="showErrors && stepError && step !== STEP.client && step !== STEP.terms"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              {{ stepError }}
            </VAlert>

            <!-- 1. Client -->
            <div v-if="step === STEP.client">
              <VSelect
                v-if="canChooseOwner"
                v-model="salesOwnerId"
                :items="ownerOptions"
                label="Sales owner"
                hint="Who this quotation is for. Leave it as you unless you are entering it for a seller."
                persistent-hint
                class="mb-4"
              />
              <VAutocomplete
                v-model="form.customer_id"
                :items="customerOptions"
                label="Customer"
                :error-messages="showErrors && !form.customer_id ? 'Choose a customer' : ''"
                class="mb-4"
                @update:model-value="form.brand_id = null"
              />
              <VAutocomplete
                v-model="form.brand_id"
                :items="brandOptions"
                label="Brand"
                :disabled="!form.customer_id"
                :hint="form.customer_id ? '' : 'Choose a customer first'"
                :error-messages="showErrors && form.customer_id && !form.brand_id ? 'Choose a brand' : ''"
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

            <!-- 2 & 3. Placement and Bonus share one picker -->
            <div v-else-if="step === STEP.placement || step === STEP.bonus">
              <VSwitch
                v-if="step === STEP.bonus"
                v-model="wantsBonus"
                label="Include a bonus selection"
                hint="Bonus is always free. It still counts toward total gross, which raises the effective discount."
                persistent-hint
                class="mb-4"
              />

              <template v-if="step === STEP.placement || wantsBonus">
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
                    :color="activeSelection.mode === option.value ? 'primary' : 'default'"
                    :variant="activeSelection.mode === option.value ? 'flat' : 'outlined'"
                    @click="activeSelection.mode = option.value"
                  >
                    {{ option.label }}
                  </VBtn>
                </VBtnGroup>

                <template v-if="activeSelection.mode === 'package'">
                  <VAutocomplete
                    v-model="activeSelection.sales_package_id"
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

                  <VRow class="mt-2">
                    <!-- Left: every priced building matching the filters -->
                    <VCol
                      cols="12"
                      lg="7"
                    >
                      <div class="picker-panel">
                        <!--
                          Bulk actions act on every match, not on what happens to be
                          rendered. "Select all" that quietly meant "select the visible
                          ones" would be worse than no button at all.
                        -->
                        <div class="picker-panel__head">
                          <span class="text-body-2 font-weight-medium">
                            {{ filteredBuildings.length }} of {{ priceableBuildings.length }} match
                          </span>
                          <VSpacer />
                          <VBtn
                            v-if="hasBuildingFilter"
                            size="small"
                            variant="text"
                            @click="clearBuildingFilters"
                          >
                            Reset filters
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
                            size="small"
                            variant="tonal"
                            :disabled="!filteredBuildings.length || allFilteredSelected"
                            @click="selectAllFiltered"
                          >
                            Select all {{ filteredBuildings.length }}
                          </VBtn>
                        </div>

                        <div class="picker-row picker-row--head">
                          <span />
                          <span>Building</span>
                          <span>City</span>
                          <span>Type</span>
                          <span class="text-end">Rate / wk</span>
                        </div>

                        <!--
                          Virtual scroll rather than a 60-row cap: the whole priced list
                          is already in memory, and rendering only the visible rows keeps
                          a 1,500-building list responsive while still letting the seller
                          scroll the entire match.
                        -->
                        <VVirtualScroll
                          v-if="filteredBuildings.length"
                          :items="filteredBuildings"
                          :item-height="52"
                          height="340"
                        >
                          <template #default="{ item: b }">
                            <!--
                              The whole row toggles; the checkbox stops its own click so it
                              toggles once, and still works from the keyboard.
                            -->
                            <div
                              class="picker-row"
                              @click="toggleBuilding(b.building_id, !activeIds.has(b.building_id))"
                            >
                              <!--
                                Its own cell: Vuetify gives the control a named grid-area, which would
                                push it out of this grid.
                              -->
                              <span @click.stop>
                                <VCheckboxBtn
                                  :model-value="activeIds.has(b.building_id)"
                                  density="compact"
                                  :aria-label="`Select ${b.building_name}`"
                                  @update:model-value="(on) => toggleBuilding(b.building_id, !!on)"
                                />
                              </span>
                              <span class="picker-row__name">
                                <span class="text-body-2 text-truncate">{{ b.building_name }}</span>
                                <span class="text-caption text-disabled">{{ b.building_iris_code }}</span>
                              </span>
                              <span class="text-body-2 text-truncate">{{ b.citytown || '—' }}</span>
                              <span class="text-body-2 text-truncate">{{ b.building_type || '—' }}</span>
                              <span class="text-body-2 text-end text-no-wrap">{{ formatIdr(b.price_idr_per_week) }}</span>
                            </div>
                          </template>
                        </VVirtualScroll>
                        <div
                          v-else
                          class="text-body-2 text-disabled text-center py-8"
                        >
                          No priced building matches these filters.
                        </div>
                      </div>
                    </VCol>

                    <!-- Right: what is selected, whatever the filter shows -->
                    <VCol
                      cols="12"
                      lg="5"
                    >
                      <div class="picker-panel">
                        <div class="picker-panel__head">
                          <span class="text-body-2 font-weight-medium">Selected · {{ selectedCount }}</span>
                          <VSpacer />
                          <VBtn
                            v-if="selectedCount"
                            size="small"
                            variant="text"
                            color="error"
                            @click="clearSelection"
                          >
                            Clear
                          </VBtn>
                        </div>

                        <VVirtualScroll
                          v-if="selectedList.length"
                          :items="selectedList"
                          :item-height="44"
                          max-height="340"
                        >
                          <template #default="{ item: s }">
                            <div class="selected-row">
                              <span class="selected-row__name">
                                <span
                                  class="text-body-2 text-truncate"
                                  :class="{ 'text-disabled': s.outsideFilter }"
                                >{{ s.building_name }}</span>
                                <VChip
                                  v-if="s.unpriced"
                                  size="x-small"
                                  color="error"
                                  variant="tonal"
                                >
                                  no price
                                </VChip>
                                <VChip
                                  v-else-if="s.outsideFilter"
                                  size="x-small"
                                  variant="outlined"
                                >
                                  not in filter
                                </VChip>
                              </span>
                              <span class="text-caption text-no-wrap">{{ formatIdr(s.price_idr_per_week) }}</span>
                              <VBtn
                                icon
                                size="x-small"
                                variant="text"
                                :aria-label="`Remove ${s.building_name}`"
                                @click="toggleBuilding(s.building_id, false)"
                              >
                                <VIcon icon="ri-close-line" />
                              </VBtn>
                            </div>
                          </template>
                        </VVirtualScroll>
                        <div
                          v-else
                          class="text-body-2 text-disabled text-center py-8 px-4"
                        >
                          Nothing selected yet. Tick buildings on the left.
                        </div>

                        <div class="picker-panel__foot">
                          <span class="text-caption text-disabled">Base rate / week</span>
                          <span class="text-body-2 font-weight-medium">{{ formatIdr(selectedBaseTotal) }}</span>
                        </div>
                      </div>
                    </VCol>
                  </VRow>
                  <div class="text-caption text-disabled mt-2">
                    Only buildings with a price can be quoted. The base rate is before
                    campaign settings, weeks and discount.
                  </div>
                </template>
              </template>
            </div>

            <!-- 4. Campaign, for each line side by side -->
            <div v-else-if="step === STEP.campaign">
              <div
                v-for="row in [
                  { label: 'Placement', model: placement, show: true },
                  { label: 'Bonus', model: bonus, show: wantsBonus },
                ].filter(r => r.show)"
                :key="row.label"
                class="mb-6"
              >
                <div class="text-subtitle-2 mb-4">
                  {{ row.label }}
                  <span class="text-disabled font-weight-regular">· {{ selectionLabel(row.model) }}</span>
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
                      :error-messages="showErrors && toCampaignNumber(row.model.weeks) < 1 ? 'At least one week' : ''"
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

            <!-- 5. Terms -->
            <div v-else-if="step === STEP.terms">
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
              />

              <!--
                Where the discount sits against the approval bands, so the seller sees
                the boundary coming instead of discovering it after submitting. The
                bands are the default thresholds, for orientation; the approver named
                underneath comes from the server's preview.
              -->
              <div class="discount-meter my-5">
                <div class="discount-meter__bar">
                  <span
                    class="bg-success"
                    :style="{ flex: DISCOUNT_THRESHOLDS.standard }"
                  />
                  <span
                    class="bg-warning"
                    :style="{ flex: DISCOUNT_THRESHOLDS.elevated - DISCOUNT_THRESHOLDS.standard }"
                  />
                  <span
                    class="bg-error"
                    :style="{ flex: 100 - DISCOUNT_THRESHOLDS.elevated }"
                  />
                </div>
                <span
                  class="discount-meter__pin"
                  :style="{ insetInlineStart: `${meterPosition}%` }"
                />
                <div class="discount-meter__labels text-caption text-disabled">
                  <span :style="{ flex: DISCOUNT_THRESHOLDS.standard }">Head of Sales · ≤{{ DISCOUNT_THRESHOLDS.standard }}%</span>
                  <span :style="{ flex: DISCOUNT_THRESHOLDS.elevated - DISCOUNT_THRESHOLDS.standard }">BC</span>
                  <span
                    class="text-end"
                    :style="{ flex: 100 - DISCOUNT_THRESHOLDS.elevated }"
                  >CEO · &gt;{{ DISCOUNT_THRESHOLDS.elevated }}%</span>
                </div>
              </div>

              <VAlert
                v-if="previewApproval"
                :type="previewApproval.resolvable ? 'info' : 'warning'"
                :color="previewApproval.resolvable ? previewBand?.color : undefined"
                variant="tonal"
                density="compact"
                class="mb-5"
              >
                <div
                  v-if="previewBand"
                  class="text-caption"
                >
                  {{ previewBand.label }} · {{ previewBand.range }}
                </div>
                <div class="font-weight-medium">
                  Goes to {{ APPROVER_ROLE_LABELS[previewApproval.approver_role] ?? previewApproval.approver_role }}
                  <span v-if="previewApproval.approver_name"> · {{ previewApproval.approver_name }}</span>
                </div>
                <div
                  v-if="!previewApproval.resolvable"
                  class="text-caption mt-1"
                >
                  {{ previewApproval.reason }}
                </div>
              </VAlert>

              <VRow>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VTextField
                    v-model="vatPercent"
                    label="VAT (%)"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    suffix="%"
                    :error-messages="vatError"
                    hint="Enter 11 for 11%. Charged on nett."
                    persistent-hint
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VTextField
                    v-model="form.valid_until"
                    label="Valid until"
                    type="date"
                    :min="today"
                    :error-messages="validUntilError"
                    hint="Printed on the document. Defaults to 30 days from today."
                    persistent-hint
                  />
                </VCol>
                <VCol
                  cols="12"
                  md="4"
                >
                  <VSelect
                    v-model="form.campaign_year"
                    :items="yearOptions"
                    label="Campaign year"
                    hint="The year the campaign runs in."
                    persistent-hint
                  />
                </VCol>
              </VRow>
            </div>

            <!-- 6. Review: one card per step, each with a way back to it -->
            <div v-else>
              <div class="review-grid">
                <div class="review-card">
                  <div class="review-card__head">
                    <span>Client</span>
                    <VBtn
                      size="small"
                      variant="text"
                      @click="goTo(STEP.client)"
                    >
                      Edit
                    </VBtn>
                  </div>
                  <div class="text-body-2 font-weight-medium">
                    {{ customerTitle }}
                  </div>
                  <div class="text-body-2">
                    {{ brandTitle }}
                  </div>
                  <div class="text-caption text-disabled">
                    {{ form.attention_to || 'No contact' }}<span v-if="form.job_title"> · {{ form.job_title }}</span>
                  </div>
                  <div
                    v-if="canChooseOwner && salesOwnerId"
                    class="text-caption text-disabled"
                  >
                    For {{ ownerTitle }}
                  </div>
                </div>

                <div class="review-card">
                  <div class="review-card__head">
                    <span>Placement</span>
                    <VBtn
                      size="small"
                      variant="text"
                      @click="goTo(STEP.placement)"
                    >
                      Edit
                    </VBtn>
                  </div>
                  <div class="text-body-2 font-weight-medium">
                    {{ selectionLabel(placement) }}
                  </div>
                </div>

                <div class="review-card">
                  <div class="review-card__head">
                    <span>Bonus</span>
                    <VBtn
                      size="small"
                      variant="text"
                      @click="goTo(STEP.bonus)"
                    >
                      Edit
                    </VBtn>
                  </div>
                  <div
                    v-if="wantsBonus"
                    class="text-body-2 font-weight-medium"
                  >
                    {{ selectionLabel(bonus) }} · free
                  </div>
                  <div
                    v-else
                    class="text-body-2 text-disabled"
                  >
                    No bonus
                  </div>
                </div>

                <div class="review-card">
                  <div class="review-card__head">
                    <span>Campaign</span>
                    <VBtn
                      size="small"
                      variant="text"
                      @click="goTo(STEP.campaign)"
                    >
                      Edit
                    </VBtn>
                  </div>
                  <div class="text-body-2">
                    Placement: {{ campaignLine(placement) }}
                  </div>
                  <div
                    v-if="wantsBonus"
                    class="text-body-2"
                  >
                    Bonus: {{ campaignLine(bonus) }}
                  </div>
                </div>

                <div class="review-card">
                  <div class="review-card__head">
                    <span>Terms</span>
                    <VBtn
                      size="small"
                      variant="text"
                      @click="goTo(STEP.terms)"
                    >
                      Edit
                    </VBtn>
                  </div>
                  <div class="text-body-2 font-weight-medium">
                    {{ form.discount }}% discount · VAT {{ vatPercent }}%
                  </div>
                  <div class="text-caption text-disabled">
                    Valid until {{ formatCalendarDate(form.valid_until) }} · Campaign {{ form.campaign_year }}
                  </div>
                </div>
              </div>

              <VAlert
                type="info"
                variant="tonal"
                class="mt-4"
              >
                Submitting re-prices everything at current prices and sends it to
                {{ previewApproval ? (APPROVER_ROLE_LABELS[previewApproval.approver_role] ?? 'the approver') : 'the approver' }}
                for approval. You can still edit it if it comes back.
              </VAlert>
            </div>
          </VCardText>

          <VCardActions
            v-if="mdAndUp"
            class="justify-space-between px-4 pb-4"
          >
            <VBtn
              variant="outlined"
              @click="previous"
            >
              {{ step === STEP.client ? 'Cancel' : 'Back' }}
            </VBtn>

            <div class="d-flex gap-2">
              <template v-if="step === STEP.review">
                <VBtn
                  variant="outlined"
                  :disabled="!canSaveDraft"
                  :loading="store.isSubmitting"
                  @click="save(false)"
                >
                  Save draft
                </VBtn>
                <VBtn
                  color="primary"
                  variant="elevated"
                  :loading="store.isSubmitting"
                  @click="save(true)"
                >
                  Submit for approval
                </VBtn>
              </template>
              <VBtn
                v-else
                color="primary"
                variant="elevated"
                @click="next"
              >
                Next: {{ STEPS[step + 1] }}
              </VBtn>
            </div>
          </VCardActions>
        </VCard>
      </VCol>

      <VCol
        v-if="mdAndUp"
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

    <!-- Phone: the pricing card folds into a bar that stays in view, with the step's actions. -->
    <template v-if="!mdAndUp">
      <PricingBar
        :pricing="store.preview?.pricing ?? null"
        :approval="store.preview?.approval ?? null"
        :loading="store.isPreviewing"
        @open="pricingSheet = true"
      >
        <VBtn
          variant="outlined"
          @click="previous"
        >
          {{ step === STEP.client ? 'Cancel' : 'Back' }}
        </VBtn>
        <VBtn
          v-if="step === STEP.review"
          color="primary"
          :loading="store.isSubmitting"
          @click="save(true)"
        >
          Submit
        </VBtn>
        <VBtn
          v-else
          color="primary"
          @click="next"
        >
          Next
        </VBtn>
      </PricingBar>

      <VBottomSheet v-model="pricingSheet">
        <PricingSummary
          :pricing="store.preview?.pricing ?? null"
          :discount="form.discount"
          :tax-rate="form.tax_rate"
          :approval="store.preview?.approval ?? null"
          :sections="store.preview?.sections ?? []"
          :loading="store.isPreviewing"
          :sticky="false"
        />
      </VBottomSheet>
    </template>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.wizard-stepper :deep(.v-stepper-header) {
  box-shadow: none;
}

.picker-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
}

.picker-panel__head,
.picker-panel__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  padding-block: 6px;
  padding-inline: 12px;
  gap: 4px;
}

.picker-panel__head {
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.picker-panel__foot {
  justify-content: space-between;
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.picker-row {
  display: grid;
  align-items: center;
  padding-inline: 4px 12px;
  block-size: 52px;
  cursor: pointer;
  gap: 8px;
  grid-template-columns: 36px minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1fr) auto;
}

.picker-row:hover {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.picker-row--head {
  block-size: 32px;
  cursor: default;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  opacity: 0.7;
  text-transform: uppercase;
}

.picker-row--head:hover {
  background: none;
}

.picker-row__name,
.selected-row__name {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
}

.selected-row {
  display: grid;
  align-items: center;
  padding-inline: 12px 4px;
  block-size: 44px;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto auto;
}

.selected-row__name {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.discount-meter {
  position: relative;
}

.discount-meter__bar {
  display: flex;
  overflow: hidden;
  block-size: 8px;
  border-radius: 999px;
}

.discount-meter__pin {
  position: absolute;
  border-radius: 2px;
  background: rgb(var(--v-theme-on-surface));
  block-size: 20px;
  inline-size: 3px;
  inset-block-start: -6px;
  transform: translateX(-50%);
  transition: inset-inline-start 0.15s ease;
}

.discount-meter__labels {
  display: flex;
  margin-block-start: 6px;
  gap: 4px;
}

.review-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.review-card {
  display: flex;
  flex-direction: column;
  padding-block: 10px 12px;
  padding-inline: 14px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  gap: 2px;
}

.review-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  opacity: 0.85;
  text-transform: uppercase;
}

@media (prefers-reduced-motion: reduce) {
  .discount-meter__pin {
    transition: none;
  }
}
</style>
