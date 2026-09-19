<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import ImportExportToolbar from '@/components/advertiser/ImportExportToolbar.vue'
import {
  deleteBuildingPrice,
  downloadBuildingPriceTemplate,
  exportBuildingPrices,
  getBuildingPrices,
  importBuildingPrices,
  upsertBuildingPrice,
} from '@/http/buildingprice'
import { getBuildings } from '@/http/building'
import { isEchoOfSelection, withSelectedOption } from '@/utils/autocompleteOptions'
import type { AutocompleteOption } from '@/utils/autocompleteOptions'
import type { BuildingPrice } from '@/types/buildingprice'
import type { ImportResult } from '@/types/advertiser'
import { formatIdr } from '@/types/quotation'

const authStore = useAuthStore()
const canManage = computed(() => authStore.can('building-prices.manage'))

const prices = ref<BuildingPrice[]>([])
const total = ref(0)
const isLoading = ref(false)
const search = ref('')
const currentPage = ref(1)
const itemsPerPage = 25
const totalPages = computed(() => Math.ceil(total.value / itemsPerPage) || 1)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const errorText = (error: any, fallback: string) =>
  error?.details?.data || error?.details?.message || fallback

const load = async () => {
  isLoading.value = true
  try {
    const params: Record<string, string | number> = {
      take: itemsPerPage,
      skip: (currentPage.value - 1) * itemsPerPage,
    }

    const term = search.value?.trim()
    if (term)
      params.search = term

    const response = await getBuildingPrices(params)

    prices.value = response.data || []
    total.value = response.extras?.total ?? prices.value.length
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load prices'), 'error')
  }
  finally {
    isLoading.value = false
  }
}

onMounted(load)

let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchDebounce)
    clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    currentPage.value = 1
    load()
  }, 300)
})

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await load()
}

// ---------------------------------------------------------------------------
// Add or edit one price by hand
// ---------------------------------------------------------------------------

const editDialog = ref(false)
const isAdding = ref(false)
const editingBuildingId = ref<number | null>(null)
const editingLabel = ref('')
const editingPrice = ref(0)
const isSaving = ref(false)

const buildingOptions = ref<AutocompleteOption[]>([])
const buildingSearch = ref('')
const isSearchingBuildings = ref(false)

/**
 * The option the user picked, held separately from the search results.
 *
 * The results are replaced by every query, and an autocomplete whose items no longer
 * contain its value renders that value raw — which is how selecting a building and
 * clicking away used to leave its id on screen instead of its name.
 */
const selectedBuildingOption = ref<AutocompleteOption | null>(null)

const buildingItems = computed(() =>
  withSelectedOption(buildingOptions.value, selectedBuildingOption.value))

watch(editingBuildingId, id => {
  if (id === null) {
    selectedBuildingOption.value = null

    return
  }

  const match = buildingOptions.value.find(option => option.value === id)
  if (match)
    selectedBuildingOption.value = match
})

const openEdit = (price: BuildingPrice) => {
  isAdding.value = false
  editingBuildingId.value = price.building_id
  editingLabel.value = price.building_name
  editingPrice.value = price.price_idr_per_week
  editDialog.value = true
}

const openAdd = () => {
  isAdding.value = true
  editingBuildingId.value = null
  editingLabel.value = 'Add a price'
  editingPrice.value = 0
  buildingOptions.value = []
  selectedBuildingOption.value = null
  buildingSearch.value = ''
  editDialog.value = true
}

let buildingDebounce: ReturnType<typeof setTimeout> | null = null
watch(buildingSearch, term => {
  if (!isAdding.value)
    return

  // On blur Vuetify writes the selected item's title back into the search field.
  // Querying for that formatted label matches nothing, and the empty result is what
  // used to strip the selection of its name.
  if (isEchoOfSelection(term, selectedBuildingOption.value))
    return

  if (buildingDebounce)
    clearTimeout(buildingDebounce)
  buildingDebounce = setTimeout(async () => {
    const q = (term || '').trim()
    if (q.length < 2) {
      buildingOptions.value = []

      return
    }

    isSearchingBuildings.value = true
    try {
      const response = await getBuildings({ take: 20, skip: 0, search: q, orderBy: 'name', orderDirection: 'ASC' })

      buildingOptions.value = (response.data || []).map((b: any) => ({
        title: `${b.name} (${b.iris_code || 'no IRIS code'})`,
        value: b.id,
      }))
    }
    finally {
      isSearchingBuildings.value = false
    }
  }, 300)
})

const submitEdit = async () => {
  if (!editingBuildingId.value) {
    notify('Choose a building', 'error')

    return
  }

  isSaving.value = true
  try {
    await upsertBuildingPrice(editingBuildingId.value, editingPrice.value || 0)
    editDialog.value = false
    await load()
    notify(isAdding.value ? 'Price added' : 'Price updated')
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to save the price'), 'error')
  }
  finally {
    isSaving.value = false
  }
}

const removePrice = async (price: BuildingPrice) => {
  try {
    await deleteBuildingPrice(price.building_id)
    await load()
    notify(`Removed the price for ${price.building_name}`)
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to remove the price'), 'error')
  }
}

// ---------------------------------------------------------------------------
// Upload, previewed before it is applied
// ---------------------------------------------------------------------------

const isFileBusy = ref(false)
const lastImport = ref<ImportResult | null>(null)
const previewDialog = ref(false)
const preview = ref<ImportResult | null>(null)
const pendingFile = ref<File | null>(null)

const changeCount = computed(() => (preview.value?.created ?? 0) + (preview.value?.updated ?? 0))
const leftOut = computed(() => preview.value?.errors ?? [])

// A refused upload comes back as a 400 whose body is still the per-row result.
const rejected = (error: any): ImportResult | null => {
  const data = error?.details?.data

  return data && Array.isArray(data.errors) ? data as ImportResult : null
}

// The file is checked first and applied only on confirm, so a bad file never
// reprices anything. The preview and the apply read the rows the same way.
const handleImport = async (file: File) => {
  isFileBusy.value = true
  lastImport.value = null
  try {
    const response = await importBuildingPrices(file, true)

    preview.value = response.data || null
    pendingFile.value = file
    previewDialog.value = true
  }
  catch (error: any) {
    const result = rejected(error)
    if (result)
      lastImport.value = result
    else
      notify(errorText(error, 'Failed to read the file'), 'error')
  }
  finally {
    isFileBusy.value = false
  }
}

const cancelImport = () => {
  previewDialog.value = false
  pendingFile.value = null
  preview.value = null
}

const applyImport = async () => {
  if (!pendingFile.value)
    return

  isFileBusy.value = true
  try {
    const response = await importBuildingPrices(pendingFile.value, false)
    const result = response.data

    cancelImport()
    await load()

    const skipped = result?.errors?.length ?? 0

    notify(`Prices applied: ${result?.created ?? 0} new, ${result?.updated ?? 0} changed${
      skipped ? `, ${skipped} row${skipped === 1 ? '' : 's'} left out.` : '.'}`)
  }
  catch (error: any) {
    const result = rejected(error)

    cancelImport()
    if (result)
      lastImport.value = result
    else
      notify(errorText(error, 'Failed to apply the prices'), 'error')
  }
  finally {
    isFileBusy.value = false
  }
}

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const handleTemplate = async () => {
  try {
    saveBlob(await downloadBuildingPriceTemplate(), 'Building_Prices_Template.xlsx')
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to download the template'), 'error')
  }
}

const handleExport = async () => {
  try {
    saveBlob(await exportBuildingPrices(), `Building_Prices_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to export prices'), 'error')
  }
}
</script>

<template>
  <div>
    <VCard>
      <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
        <span>Prices</span>
        <VBtn
          v-if="canManage"
          color="primary"
          @click="openAdd"
        >
          <VIcon
            icon="ri-add-line"
            class="me-1"
          />
          Add price
        </VBtn>
      </VCardTitle>

      <VCardText>
        <p class="text-body-2 text-medium-emphasis mb-4">
          What one week on each building costs, in IDR. Quotations are priced from here.
          Changing a price never alters a quotation already submitted — it keeps the
          prices it was given.
        </p>

        <div class="d-flex justify-space-between align-center flex-wrap gap-2 mb-4">
          <VTextField
            v-model="search"
            label="Search by building, IRIS code or city"
            prepend-inner-icon="ri-search-line"
            density="compact"
            clearable
            hide-details
            style="max-inline-size: 360px;"
          />
          <ImportExportToolbar
            entity-label="Building prices"
            :busy="isFileBusy"
            :result="lastImport"
            :can-manage="canManage"
            @template="handleTemplate"
            @export="handleExport"
            @import="handleImport"
            @clear-result="lastImport = null"
          />
        </div>

        <div
          v-if="isLoading"
          class="d-flex justify-center py-8"
        >
          <VProgressCircular
            indeterminate
            color="primary"
          />
        </div>

        <VTable v-else>
          <thead>
            <tr>
              <th class="text-uppercase">
                Building
              </th>
              <th class="text-uppercase">
                Type
              </th>
              <th class="text-uppercase">
                City
              </th>
              <th class="text-uppercase text-end">
                Price / week
              </th>
              <th
                v-if="canManage"
                class="text-uppercase text-center"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="price in prices"
              :key="price.id"
            >
              <td>
                <div class="font-weight-medium">
                  {{ price.building_name }}
                </div>
                <div class="text-caption text-disabled">
                  {{ price.building_iris_code || '—' }}
                </div>
              </td>
              <td>{{ price.building_type || '—' }}</td>
              <td>{{ price.citytown || '—' }}</td>
              <td class="text-end font-weight-medium">
                {{ formatIdr(price.price_idr_per_week) }}
              </td>
              <td
                v-if="canManage"
                class="text-center"
              >
                <VBtn
                  icon
                  size="small"
                  color="primary"
                  variant="text"
                  @click="openEdit(price)"
                >
                  <VIcon icon="ri-edit-line" />
                </VBtn>
                <VBtn
                  icon
                  size="small"
                  color="error"
                  variant="text"
                  @click="removePrice(price)"
                >
                  <VIcon icon="ri-delete-bin-line" />
                </VBtn>
              </td>
            </tr>
            <tr v-if="prices.length === 0">
              <td
                :colspan="canManage ? 5 : 4"
                class="text-center text-disabled py-8"
              >
                {{ search ? 'No priced building matches that search.' : 'No prices yet. Download the template, fill it in and Import it, or add one by hand.' }}
              </td>
            </tr>
          </tbody>
        </VTable>

        <div
          v-if="totalPages > 1"
          class="d-flex justify-center mt-4"
        >
          <VPagination
            :model-value="currentPage"
            :length="totalPages"
            @update:model-value="handlePageChange"
          />
        </div>
      </VCardText>
    </VCard>

    <!-- Add or edit one price -->
    <VDialog
      v-model="editDialog"
      max-width="480"
    >
      <VCard>
        <VCardTitle>{{ editingLabel }}</VCardTitle>
        <VCardText>
          <VAutocomplete
            v-if="isAdding"
            v-model="editingBuildingId"
            v-model:search="buildingSearch"
            :items="buildingItems"
            :loading="isSearchingBuildings"
            label="Building"
            placeholder="Type at least 2 characters"
            no-filter
            class="mb-4"
          />
          <VTextField
            v-model.number="editingPrice"
            label="Price per week (IDR)"
            type="number"
            min="0"
            hint="Whole rupiah. A campaign of N weeks is charged this × N."
            persistent-hint
          />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            @click="editDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="isSaving"
            @click="submitEdit"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Preview an upload before applying it -->
    <VDialog
      v-model="previewDialog"
      max-width="680"
      persistent
    >
      <VCard>
        <VCardTitle>Apply these prices?</VCardTitle>
        <VCardText v-if="preview">
          <p class="mb-3">
            Nothing has changed yet. This is what the file would do:
          </p>
          <VTable density="compact">
            <tbody>
              <tr>
                <td>Rows read</td>
                <td class="text-end">
                  {{ preview.rows }}
                </td>
              </tr>
              <tr>
                <td>New prices</td>
                <td class="text-end">
                  {{ preview.created }}
                </td>
              </tr>
              <tr>
                <td>Changed prices</td>
                <td class="text-end">
                  {{ preview.updated }}
                </td>
              </tr>
              <tr>
                <td>Already correct</td>
                <td class="text-end">
                  {{ preview.unchanged ?? 0 }}
                </td>
              </tr>
              <tr>
                <td>Skipped (priced 0)</td>
                <td class="text-end">
                  {{ preview.skipped ?? 0 }}
                </td>
              </tr>
              <tr>
                <td :class="leftOut.length ? 'text-error' : ''">
                  Left out (problems below)
                </td>
                <td
                  class="text-end"
                  :class="leftOut.length ? 'text-error' : ''"
                >
                  {{ leftOut.length }}
                </td>
              </tr>
            </tbody>
          </VTable>

          <!--
            Rows that cannot be applied are listed, not a reason to refuse the file:
            the valid rows still apply.
          -->
          <template v-if="leftOut.length">
            <div class="text-subtitle-2 text-error mt-4 mb-1">
              These {{ leftOut.length }} row{{ leftOut.length === 1 ? '' : 's' }} will be left out
            </div>
            <VTable
              density="compact"
              class="border rounded"
            >
              <tbody>
                <tr
                  v-for="(problem, index) in leftOut.slice(0, 8)"
                  :key="index"
                >
                  <td class="text-no-wrap">
                    Row {{ problem.row }}
                  </td>
                  <td class="text-no-wrap">
                    {{ problem.value || '(blank)' }}
                  </td>
                  <td>{{ problem.message }}</td>
                </tr>
              </tbody>
            </VTable>
            <div
              v-if="leftOut.length > 8"
              class="text-caption text-medium-emphasis mt-1"
            >
              …and {{ leftOut.length - 8 }} more.
            </div>
          </template>
          <p
            v-if="changeCount === 0"
            class="mt-3 text-medium-emphasis"
          >
            Every price in this file already matches. Applying would change nothing.
          </p>
          <p class="mt-3 text-caption text-medium-emphasis">
            Buildings that are not in the file keep their current price.
          </p>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            :disabled="isFileBusy"
            @click="cancelImport"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="isFileBusy"
            :disabled="changeCount === 0"
            @click="applyImport"
          >
            Apply {{ changeCount }} change{{ changeCount === 1 ? '' : 's' }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
