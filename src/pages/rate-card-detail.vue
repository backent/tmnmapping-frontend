<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useRateCardStore } from '@/stores/ratecard'
import { useAuthStore } from '@/stores/auth'
import ImportExportToolbar from '@/components/advertiser/ImportExportToolbar.vue'
import {
  RATE_CARD_STATUS_COLORS,
  RATE_CARD_STATUS_LABELS,
  formatIdr,
} from '@/types/ratecard'

const route = useRoute()
const router = useRouter()
const store = useRateCardStore()
const authStore = useAuthStore()

const versionId = computed(() => Number(route.params.id))
const tab = ref<'building' | 'package'>('building')

const canManage = computed(() => authStore.can('rate-cards.manage'))
const canPublish = computed(() => authStore.can('rate-cards.publish'))

// Publishing freezes the version, so every edit control keys off this.
const isEditable = computed(() => store.isSelectedEditable && canManage.value)

const version = computed(() => store.selectedVersion)
const buildingPrices = computed(() => store.buildingPrices)
const packagePrices = computed(() => store.packagePrices)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const publishDialog = ref(false)
const isPublishing = ref(false)

const editDialog = ref(false)
const editingLabel = ref('')
const editingPrice = ref<number>(0)
const editingId = ref(0)

const currentPage = ref(1)
const itemsPerPage = ref(25)

const pagination = computed(() =>
  tab.value === 'building' ? store.buildingPagination : store.packagePagination)

const totalPages = computed(() => Math.ceil(pagination.value.total / itemsPerPage.value) || 1)

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const errorText = (error: any, fallback: string) =>
  error?.details?.data || error?.details?.message || fallback

const fetchPrices = async () => {
  const params = {
    take: itemsPerPage.value,
    skip: (currentPage.value - 1) * itemsPerPage.value,
  }

  try {
    if (tab.value === 'building')
      await store.fetchBuildingPrices(versionId.value, params)
    else
      await store.fetchPackagePrices(versionId.value, params)
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load prices'), 'error')
  }
}

const load = async () => {
  try {
    await store.fetchVersion(versionId.value)
    await fetchPrices()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load the rate card'), 'error')
  }
}

onMounted(load)
onUnmounted(() => store.clearSelection())

watch(tab, async () => {
  currentPage.value = 1
  await fetchPrices()
})

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchPrices()
}

const openEdit = (id: number, label: string, price: number) => {
  editingId.value = id
  editingLabel.value = label
  editingPrice.value = price
  editDialog.value = true
}

const submitEdit = async () => {
  try {
    if (tab.value === 'building')
      await store.saveBuildingPrice(versionId.value, editingId.value, editingPrice.value)
    else
      await store.savePackagePrice(versionId.value, editingId.value, editingPrice.value)

    editDialog.value = false
    await load()
    notify('Price updated')
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to save the price'), 'error')
  }
}

const removePrice = async (id: number) => {
  try {
    if (tab.value === 'building')
      await store.removeBuildingPrice(versionId.value, id)
    else
      await store.removePackagePrice(versionId.value, id)

    await load()
    notify('Price removed')
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to remove the price'), 'error')
  }
}

const handleTemplate = () => store.downloadTemplate(tab.value)

const handleExport = async () => {
  try {
    await store.exportPrices(versionId.value, version.value?.version_code || 'draft', tab.value)
  }
  catch {
    notify('Failed to export prices', 'error')
  }
}

const handleImport = async (file: File) => {
  try {
    const result = await store.importPrices(versionId.value, file, tab.value)

    if (result?.imported)
      await load()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to import prices'), 'error')
  }
}

const handlePublish = async () => {
  isPublishing.value = true
  try {
    await store.publishVersion(versionId.value)
    publishDialog.value = false
    await load()
    notify('Rate card published. It is now the current price list.')
  }
  catch (error: any) {
    publishDialog.value = false
    notify(errorText(error, 'Failed to publish'), 'error')
  }
  finally {
    isPublishing.value = false
  }
}
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
          @click="router.push({ name: 'rate-cards' })"
        >
          <VIcon icon="ri-arrow-left-s-line" />
        </VBtn>
        <span class="text-h4">{{ version?.version_code || 'Rate Card' }}</span>
        <VChip
          v-if="version"
          size="small"
          :color="RATE_CARD_STATUS_COLORS[version.status]"
          variant="tonal"
        >
          {{ RATE_CARD_STATUS_LABELS[version.status] }}
        </VChip>
        <VSpacer />
        <VBtn
          v-if="canPublish && version?.is_editable"
          color="primary"
          @click="publishDialog = true"
        >
          <VIcon
            icon="ri-send-plane-line"
            class="me-1"
          />
          Publish
        </VBtn>
      </VCol>
    </VRow>

    <VAlert
      v-if="version && !version.is_editable"
      type="info"
      variant="tonal"
      class="mb-4"
    >
      This rate card is <strong>{{ RATE_CARD_STATUS_LABELS[version.status].toLowerCase() }}</strong>
      and can no longer be changed. Quotations reference it, so its prices must stay
      exactly as they were. To change prices, create a new rate card — you can copy
      this one as a starting point.
    </VAlert>

    <VCard>
      <VTabs v-model="tab">
        <VTab value="building">
          Building Prices
          <VChip
            size="x-small"
            class="ms-2"
          >
            {{ version?.building_price_count ?? 0 }}
          </VChip>
        </VTab>
        <VTab value="package">
          Package Prices
          <VChip
            size="x-small"
            class="ms-2"
          >
            {{ version?.package_price_count ?? 0 }}
          </VChip>
        </VTab>
      </VTabs>

      <VCardText>
        <div class="d-flex justify-space-between align-center flex-wrap gap-2 mb-4">
          <div class="text-body-2 text-disabled">
            Prices are per four weeks, in {{ version?.currency || 'IDR' }}.
          </div>
          <ImportExportToolbar
            :entity-label="tab === 'building' ? 'Building prices' : 'Package prices'"
            :busy="store.isFileBusy"
            :result="store.lastImport"
            :can-manage="isEditable"
            @template="handleTemplate"
            @export="handleExport"
            @import="handleImport"
            @clear-result="store.clearImportResult()"
          />
        </div>

        <div
          v-if="store.isLoading"
          class="d-flex justify-center py-8"
        >
          <VProgressCircular
            indeterminate
            color="primary"
          />
        </div>

        <div v-else>
          <!-- Building prices -->
          <VTable v-if="tab === 'building'">
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
                  Price / 4 weeks
                </th>
                <th
                  v-if="isEditable"
                  class="text-uppercase text-center"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="price in buildingPrices"
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
                  {{ formatIdr(price.price_idr_per_4_weeks) }}
                </td>
                <td
                  v-if="isEditable"
                  class="text-center"
                >
                  <VBtn
                    icon
                    size="small"
                    color="primary"
                    variant="text"
                    @click="openEdit(price.building_id, price.building_name, price.price_idr_per_4_weeks)"
                  >
                    <VIcon icon="ri-edit-line" />
                  </VBtn>
                  <VBtn
                    icon
                    size="small"
                    color="error"
                    variant="text"
                    @click="removePrice(price.building_id)"
                  >
                    <VIcon icon="ri-delete-bin-line" />
                  </VBtn>
                </td>
              </tr>
              <tr v-if="buildingPrices.length === 0">
                <td
                  :colspan="isEditable ? 5 : 4"
                  class="text-center text-disabled py-8"
                >
                  No building prices yet. Download the template, fill it in, then Import.
                </td>
              </tr>
            </tbody>
          </VTable>

          <!-- Package prices -->
          <VTable v-else>
            <thead>
              <tr>
                <th class="text-uppercase">
                  Sales Package
                </th>
                <th class="text-uppercase">
                  Buildings
                </th>
                <th class="text-uppercase text-end">
                  Price / 4 weeks
                </th>
                <th
                  v-if="isEditable"
                  class="text-uppercase text-center"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="price in packagePrices"
                :key="price.id"
              >
                <td class="font-weight-medium">
                  {{ price.sales_package_name }}
                </td>
                <td>
                  <span v-if="version?.is_editable">
                    <span class="text-disabled">frozen on publish</span>
                  </span>
                  <span v-else>{{ price.building_count }}</span>
                </td>
                <td class="text-end font-weight-medium">
                  {{ formatIdr(price.price_idr_per_4_weeks) }}
                </td>
                <td
                  v-if="isEditable"
                  class="text-center"
                >
                  <VBtn
                    icon
                    size="small"
                    color="primary"
                    variant="text"
                    @click="openEdit(price.sales_package_id, price.sales_package_name, price.price_idr_per_4_weeks)"
                  >
                    <VIcon icon="ri-edit-line" />
                  </VBtn>
                  <VBtn
                    icon
                    size="small"
                    color="error"
                    variant="text"
                    @click="removePrice(price.sales_package_id)"
                  >
                    <VIcon icon="ri-delete-bin-line" />
                  </VBtn>
                </td>
              </tr>
              <tr v-if="packagePrices.length === 0">
                <td
                  :colspan="isEditable ? 4 : 3"
                  class="text-center text-disabled py-8"
                >
                  No package prices yet.
                </td>
              </tr>
            </tbody>
          </VTable>

          <div
            v-if="pagination.total > itemsPerPage"
            class="d-flex justify-end mt-4"
          >
            <VPagination
              v-model="currentPage"
              :length="totalPages"
              :total-visible="5"
              density="compact"
              @update:model-value="handlePageChange"
            />
          </div>
        </div>
      </VCardText>
    </VCard>

    <!-- Edit one price -->
    <VDialog
      v-model="editDialog"
      max-width="420"
    >
      <VCard>
        <VCardTitle>{{ editingLabel }}</VCardTitle>
        <VCardText>
          <VTextField
            v-model.number="editingPrice"
            label="Price per 4 weeks (IDR)"
            type="number"
            min="0"
            hint="Whole rupiah. A campaign of N weeks is charged this × N ÷ 4."
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
            @click="submitEdit"
          >
            Save
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Publish -->
    <VDialog
      v-model="publishDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>Publish {{ version?.version_code }}?</VCardTitle>
        <VCardText>
          <p class="mb-3">
            This becomes the current rate card, and every new quotation will be priced
            against it. Whichever rate card is current now becomes historical.
          </p>
          <VAlert
            type="warning"
            variant="tonal"
          >
            Publishing cannot be undone. The prices freeze, and each priced package's
            building list is captured as it stands right now.
          </VAlert>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            :disabled="isPublishing"
            @click="publishDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="isPublishing"
            @click="handlePublish"
          >
            Publish
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="5000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
