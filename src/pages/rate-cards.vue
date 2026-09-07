<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useRateCardStore } from '@/stores/ratecard'
import { useAuthStore } from '@/stores/auth'
import { RATE_CARD_STATUS_COLORS, RATE_CARD_STATUS_LABELS } from '@/types/ratecard'
import type { RateCardVersion } from '@/types/ratecard'

const router = useRouter()
const store = useRateCardStore()
const authStore = useAuthStore()

const canManage = computed(() => authStore.can('rate-cards.manage'))

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const currentPage = ref(1)
const itemsPerPage = ref(10)

const createDialog = ref(false)
const deleteDialog = ref(false)
const itemToDelete = ref<RateCardVersion | null>(null)
const isSaving = ref(false)

const form = ref({ version_code: '', description: '', currency: 'IDR', copy_from_version_id: 0 })

const versions = computed(() => store.versions)
const isLoading = computed(() => store.isLoading)
const totalRecords = computed(() => store.versionPagination.total)
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value) || 1)

// Only a published version has prices worth copying forward.
const copyOptions = computed(() => [
  { title: 'Start empty', value: 0 },
  ...versions.value
    .filter(v => v.status !== 'draft')
    .map(v => ({ title: `${v.version_code} (${RATE_CARD_STATUS_LABELS[v.status]})`, value: v.id })),
])

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const errorText = (error: any, fallback: string) =>
  error?.details?.data || error?.details?.message || fallback

const fetchItems = async () => {
  try {
    await store.fetchVersions({
      take: itemsPerPage.value,
      skip: (currentPage.value - 1) * itemsPerPage.value,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    })
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load rate cards'), 'error')
  }
}

onMounted(fetchItems)

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchItems()
}

const openCreate = () => {
  form.value = { version_code: '', description: '', currency: 'IDR', copy_from_version_id: 0 }
  createDialog.value = true
}

const submitCreate = async () => {
  if (!form.value.version_code.trim()) {
    notify('Version code is required', 'error')

    return
  }

  isSaving.value = true
  try {
    const response = await store.createVersion({
      version_code: form.value.version_code.trim(),
      description: form.value.description,
      currency: form.value.currency || 'IDR',
      copy_from_version_id: form.value.copy_from_version_id || undefined,
    })

    createDialog.value = false
    if (response.data)
      router.push({ name: 'rate-card-detail', params: { id: String(response.data.id) } })
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to create the rate card'), 'error')
  }
  finally {
    isSaving.value = false
  }
}

const confirmDelete = (item: RateCardVersion) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value)
    return
  try {
    await store.deleteVersion(itemToDelete.value.id)
    notify('Draft deleted')
    deleteDialog.value = false
    itemToDelete.value = null
    await fetchItems()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to delete the draft'), 'error')
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span>Rate Cards</span>
          <VBtn
            v-if="canManage"
            color="primary"
            @click="openCreate"
          >
            <VIcon
              icon="ri-add-line"
              class="me-1"
            />
            New Rate Card
          </VBtn>
        </VCardTitle>

        <VCardText>
          <VAlert
            type="info"
            variant="tonal"
            class="mb-4"
          >
            Every price is a <strong>weekly rate</strong>, matching the rate card
            spreadsheet. A campaign of N weeks is charged price × N. Only a draft can
            be edited — publishing freezes a version so approved quotations never re-price.
          </VAlert>

          <div
            v-if="isLoading"
            class="d-flex justify-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>

          <div v-else>
            <VTable>
              <thead>
                <tr>
                  <th class="text-uppercase">
                    Version
                  </th>
                  <th class="text-uppercase">
                    Status
                  </th>
                  <th class="text-uppercase">
                    Prices
                  </th>
                  <th class="text-uppercase">
                    Published
                  </th>
                  <th class="text-uppercase text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in versions"
                  :key="item.id"
                >
                  <td>
                    <div class="font-weight-medium">
                      {{ item.version_code }}
                    </div>
                    <div class="text-caption text-disabled">
                      {{ item.description || '—' }}
                    </div>
                  </td>
                  <td>
                    <VChip
                      size="small"
                      :color="RATE_CARD_STATUS_COLORS[item.status]"
                      variant="tonal"
                    >
                      {{ RATE_CARD_STATUS_LABELS[item.status] }}
                    </VChip>
                  </td>
                  <td>
                    <span class="text-body-2">
                      {{ item.building_price_count }} building,
                      {{ item.package_price_count }} package
                    </span>
                  </td>
                  <td>
                    <span
                      v-if="item.published_at"
                      class="text-body-2"
                    >
                      {{ new Date(item.published_at).toLocaleDateString() }}
                      <span class="text-disabled">by {{ item.published_by_name || '—' }}</span>
                    </span>
                    <span
                      v-else
                      class="text-disabled"
                    >—</span>
                  </td>
                  <td class="text-center">
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="router.push({ name: 'rate-card-detail', params: { id: String(item.id) } })"
                    >
                      <VIcon :icon="item.is_editable ? 'ri-edit-line' : 'ri-eye-line'" />
                    </VBtn>
                    <VBtn
                      v-if="canManage && item.is_editable"
                      icon
                      size="small"
                      color="error"
                      variant="text"
                      @click="confirmDelete(item)"
                    >
                      <VIcon icon="ri-delete-bin-line" />
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="versions.length === 0">
                  <td
                    colspan="5"
                    class="text-center text-disabled py-8"
                  >
                    No rate cards yet. Create one, add prices, then publish it.
                  </td>
                </tr>
              </tbody>
            </VTable>

            <div
              v-if="totalRecords > itemsPerPage"
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
    </VCol>

    <!-- Create -->
    <VDialog
      v-model="createDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>New Rate Card</VCardTitle>
        <VCardText>
          <VTextField
            v-model="form.version_code"
            label="Version code"
            hint="For example RC-2027-H1. Must be unique."
            persistent-hint
            class="mb-4"
            :disabled="isSaving"
          />
          <VTextField
            v-model="form.description"
            label="Description"
            class="mb-4"
            :disabled="isSaving"
          />
          <VSelect
            v-model="form.copy_from_version_id"
            :items="copyOptions"
            label="Start from"
            hint="Copying an existing rate card seeds this draft with its prices."
            persistent-hint
            :disabled="isSaving"
          />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            :disabled="isSaving"
            @click="createDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="isSaving"
            @click="submitCreate"
          >
            Create
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete -->
    <VDialog
      v-model="deleteDialog"
      max-width="440"
    >
      <VCard>
        <VCardTitle>Delete draft</VCardTitle>
        <VCardText>
          Delete "<strong>{{ itemToDelete?.version_code }}</strong>" and all of its prices?
          Only drafts can be deleted; a published rate card is kept because quotations
          reference it.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            @click="deleteDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            @click="handleDelete"
          >
            Delete
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>
