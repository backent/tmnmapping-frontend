<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useSalesPackageStore } from '@/stores/salespackage'
import BuildingSelectField from '@/components/building/BuildingSelectField.vue'
import { SALES_PACKAGE_STATUS_OPTIONS } from '@/types/salespackage'
import { getAllBuildingPrices } from '@/http/buildingprice'
import { formatIdr } from '@/types/quotation'
import type { BuildingRef, CreateSalesPackageRequest, SalesPackageStatus } from '@/types/salespackage'
import { extractApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const salesPackageStore = useSalesPackageStore()

const isEdit = computed(() => !!route.params.id)
const packageId = computed(() => (isEdit.value ? Number(route.params.id) : null))

interface SalesPackageForm {
  package_code: string
  name: string
  description: string
  status: SalesPackageStatus

  // A package carries its own figures rather than summing its buildings -- the
  // quotation copies these onto the selection, and the printed document shows the
  // screen count. Leaving them at zero prints "0 screens" on a real quotation.
  screen_count: number
  traffic: number
  impressions: number
  price_idr_per_week: number

  buildings: BuildingRef[]
}

const form = ref<SalesPackageForm>({
  package_code: '',
  name: '',
  description: '',
  status: 'active',
  screen_count: 0,
  traffic: 0,
  impressions: 0,
  price_idr_per_week: 0,
  buildings: [],
})

// Prices of every building we can quote, so the form can suggest what this
// package's member buildings add up to. A package is priced independently -- the
// suggestion is a starting point, never enforced.
const buildingRates = ref<Record<number, number>>({})

const suggestedPrice = computed(() =>
  form.value.buildings.reduce((sum, b) => sum + (buildingRates.value[b.id] ?? 0), 0))

const pricedCount = computed(() =>
  form.value.buildings.filter(b => buildingRates.value[b.id] !== undefined).length)

const applySuggestion = () => {
  form.value.price_idr_per_week = suggestedPrice.value
}

const loadBuildingRates = async () => {
  try {
    const response = await getAllBuildingPrices()
    const map: Record<number, number> = {}
    for (const price of response.data || [])
      map[price.building_id] = price.price_idr_per_week
    buildingRates.value = map
  }
  catch {
    // Missing prices only cost the suggestion, not the form.
  }
}

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const fetchPackage = async () => {
  if (!packageId.value)
    return
  isLoading.value = true
  try {
    await salesPackageStore.fetchSalesPackageById(packageId.value)

    const pkg = salesPackageStore.currentPackage
    if (pkg) {
      form.value = {
        package_code: pkg.package_code,
        name: pkg.name,
        description: pkg.description ?? '',
        status: pkg.status ?? 'active',
        screen_count: pkg.screen_count ?? 0,
        traffic: pkg.traffic ?? 0,
        impressions: pkg.impressions ?? 0,
        price_idr_per_week: pkg.price_idr_per_week ?? 0,
        buildings: pkg.buildings,
      }
    }
  }
  catch (error: any) {
    console.error('Fetch error:', error)
    errorMessage.value = extractApiError(error, 'Failed to load sales package')
  }
  finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadBuildingRates()
  if (isEdit.value)
    await fetchPackage()
})

const submit = async () => {
  errorMessage.value = ''
  if (!form.value.package_code.trim()) {
    errorMessage.value = 'Package code is required'

    return
  }
  if (!form.value.name.trim()) {
    errorMessage.value = 'Name is required'

    return
  }
  if (!form.value.buildings.length) {
    errorMessage.value = 'At least one building is required'

    return
  }

  const payload: CreateSalesPackageRequest = {
    package_code: form.value.package_code.trim(),
    name: form.value.name.trim(),
    description: form.value.description,
    status: form.value.status,
    screen_count: form.value.screen_count || 0,
    traffic: form.value.traffic || 0,
    impressions: form.value.impressions || 0,
    price_idr_per_week: form.value.price_idr_per_week || 0,
    building_ids: form.value.buildings.map(b => b.id),
  }

  isSaving.value = true
  try {
    if (isEdit.value && packageId.value) {
      await salesPackageStore.updateSalesPackage(packageId.value, payload)
      snackbarMessage.value = 'Sales package updated successfully'
    }
    else {
      await salesPackageStore.createSalesPackage(payload)
      snackbarMessage.value = 'Sales package created successfully'
    }
    snackbarColor.value = 'success'
    snackbar.value = true
    setTimeout(() => {
      router.push({ name: 'sales-packages' })
    }, 1000)
  }
  catch (error: any) {
    console.error('Save error:', error)

    const msg = extractApiError(error, 'Failed to save sales package')

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
  router.push({ name: 'sales-packages' })
}

onUnmounted(() => {
  salesPackageStore.clearCurrentPackage()
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
        <span class="text-h4 ms-4">{{ isEdit ? 'Edit' : 'Create' }} Sales Package</span>
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
              md="4"
            >
              <VTextField
                v-model="form.package_code"
                label="Package code"
                required
                :disabled="isSaving"
                hint="Unique. Existing packages were given SP-0001 style codes."
                persistent-hint
              />
            </VCol>
            <VCol
              cols="12"
              md="5"
            >
              <VTextField
                v-model="form.name"
                label="Name"
                required
                :disabled="isSaving"
                hint="The package price sheet matches on this name exactly."
                persistent-hint
              />
            </VCol>
            <VCol
              cols="12"
              md="3"
            >
              <VSelect
                v-model="form.status"
                :items="SALES_PACKAGE_STATUS_OPTIONS"
                label="Status"
                :disabled="isSaving"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="form.description"
                label="Description"
                rows="2"
                auto-grow
                :disabled="isSaving"
              />
            </VCol>

            <!--
              Screen count, traffic and impressions are still sent (as zeros) and
              still stored, but have no input here: nothing displays them any more.
              Audience is absent for 95% of sellable buildings, and screen count is
              unverified. Both come back with the inputs the moment the rate card
              upload carries real figures.
              See backend/docs/QUOTATION_DOCUMENT_ANALYSIS.md §4.2 and §4.3.
            -->

            <VCol cols="12">
              <VDivider class="mb-3" />
              <div class="text-subtitle-2 mb-1">
                Price
              </div>
              <div class="text-caption text-medium-emphasis mb-3">
                What the advertiser pays for one week of the whole package. A
                package is priced in its own right, so this does not have to match
                what its buildings add up to -- the suggestion is a starting point.
              </div>
            </VCol>
            <VCol
              cols="12"
              md="5"
            >
              <VTextField
                v-model.number="form.price_idr_per_week"
                label="Price per week (IDR)"
                type="number"
                min="0"
                :disabled="isSaving"
                :hint="form.price_idr_per_week > 0 ? '' : 'A package priced at 0 cannot be quoted.'"
                persistent-hint
              />
            </VCol>
            <VCol
              cols="12"
              md="7"
              class="d-flex align-center"
            >
              <div v-if="form.buildings.length">
                <div class="text-caption text-medium-emphasis">
                  Its {{ pricedCount }} priced building{{ pricedCount === 1 ? '' : 's' }}
                  add up to
                </div>
                <div class="d-flex align-center gap-2">
                  <span class="text-body-1 font-weight-medium">{{ formatIdr(suggestedPrice) }}</span>
                  <VBtn
                    size="small"
                    variant="tonal"
                    :disabled="isSaving || suggestedPrice === 0"
                    @click="applySuggestion"
                  >
                    Use this
                  </VBtn>
                </div>
                <div
                  v-if="pricedCount < form.buildings.length"
                  class="text-caption text-warning"
                >
                  {{ form.buildings.length - pricedCount }} of
                  {{ form.buildings.length }} have no price yet, so the total is
                  lower than the real one.
                </div>
              </div>
              <div
                v-else
                class="text-caption text-medium-emphasis"
              >
                Add buildings below to see what they add up to.
              </div>
            </VCol>
            <VCol cols="12">
              <VDivider class="my-2" />
              <BuildingSelectField
                v-model="form.buildings"
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
                :disabled="form.buildings.length === 0"
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
