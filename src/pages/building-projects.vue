<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import ImportExportToolbar from '@/components/advertiser/ImportExportToolbar.vue'
import {
  deleteBuildingProject,
  downloadBuildingProjectTemplate,
  exportBuildingProjects,
  getBuildingProjectVocabulary,
  getBuildingProjects,
  importBuildingProjects,
} from '@/http/buildingproject'
import type { BuildingProject } from '@/types/buildingproject'
import type { ImportResult } from '@/types/advertiser'
import { importSummary } from '@/utils/buildingProject'
import { formatIdr } from '@/types/quotation'

const router = useRouter()
const authStore = useAuthStore()

const canManage = computed(() => authStore.can('building-projects.manage'))

// Creating a project from the UI is hidden for now, at the business's request.
// Nothing else changed: the POST endpoint is untouched, /building-projects/new still
// renders if opened directly, an existing project is still editable, and the
// spreadsheet import still creates projects -- including the stub it raises when a
// building names a project code that does not exist yet.
//
// Flip this to true to bring the button back.
const canCreateFromUI = false

// Whether the landlord money is visible at all. The server decides: those fields
// simply are not in the response without the permission, so this only controls
// whether columns are rendered for them.
const canSeeFinance = computed(() => authStore.can('building-projects.finance'))

const projects = ref<BuildingProject[]>([])
const total = ref(0)
const isLoading = ref(false)
const search = ref('')
const statusFilter = ref<string | null>(null)
const contractTypeFilter = ref<string | null>(null)
const currentPage = ref(1)
const itemsPerPage = 25
const totalPages = computed(() => Math.ceil(total.value / itemsPerPage) || 1)

const statuses = ref<string[]>([])
const contractTypes = ref<string[]>([])

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
    if (statusFilter.value)
      params.status = statusFilter.value
    if (contractTypeFilter.value)
      params.contract_type = contractTypeFilter.value

    const response = await getBuildingProjects(params)

    projects.value = response.data || []
    total.value = response.extras?.total ?? projects.value.length
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load projects'), 'error')
  }
  finally {
    isLoading.value = false
  }
}

// The filter options come from the server, so they cannot drift from what the
// importer accepts.
const loadVocabulary = async () => {
  try {
    const response = await getBuildingProjectVocabulary()

    statuses.value = response.data?.tmn_project_status || []
    contractTypes.value = response.data?.contract_type || []
  }
  catch {
    // A missing vocabulary costs the filters, not the page.
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    load()
  }, 300)
})

watch([statusFilter, contractTypeFilter], () => {
  currentPage.value = 1
  load()
})

watch(currentPage, load)

onMounted(() => {
  loadVocabulary()
  load()
})

// --- import / export -------------------------------------------------------

const isFileBusy = ref(false)
const lastImport = ref<ImportResult | null>(null)
const preview = ref<ImportResult | null>(null)
const pendingFile = ref<File | null>(null)
const previewDialog = ref(false)

const rejected = (error: any): ImportResult | null => {
  const data = error?.details?.data

  return data && Array.isArray(data.errors) ? data as ImportResult : null
}

// A blank cell CLEARS on this import, so the preview is not a formality. The count
// of fields about to be blanked is shown before anything is written.
const clearedCount = computed(() => preview.value?.cleared ?? 0)

const handleImport = async (file: File) => {
  isFileBusy.value = true
  lastImport.value = null
  try {
    const response = await importBuildingProjects(file, true)

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
    const response = await importBuildingProjects(pendingFile.value, false)
    const result = response.data

    cancelImport()
    await load()

    notify(importSummary(result ?? null))
  }
  catch (error: any) {
    const result = rejected(error)

    cancelImport()
    if (result)
      lastImport.value = result
    else
      notify(errorText(error, 'Failed to apply the projects'), 'error')
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

const handleExport = async () => {
  isFileBusy.value = true
  try {
    saveBlob(await exportBuildingProjects(), `TMN_Projects_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to export'), 'error')
  }
  finally {
    isFileBusy.value = false
  }
}

const handleTemplate = async () => {
  isFileBusy.value = true
  try {
    saveBlob(await downloadBuildingProjectTemplate(), 'TMN_Project_Template.xlsx')
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to download the template'), 'error')
  }
  finally {
    isFileBusy.value = false
  }
}

// --- delete ----------------------------------------------------------------

const deleteDialog = ref(false)
const deleteTarget = ref<BuildingProject | null>(null)

const confirmDelete = (project: BuildingProject) => {
  deleteTarget.value = project
  deleteDialog.value = true
}

const doDelete = async () => {
  if (!deleteTarget.value)
    return

  try {
    await deleteBuildingProject(deleteTarget.value.id)
    notify(`${deleteTarget.value.name} removed.`)
    await load()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to remove the project'), 'error')
  }
  finally {
    deleteDialog.value = false
    deleteTarget.value = null
  }
}

const STATUS_COLOURS: Record<string, string> = {
  Active: 'success',
  Confirmed: 'info',
  Installation: 'warning',
  Cancelled: 'error',
  Terminated: 'error',
}

const statusColour = (status: string) => STATUS_COLOURS[status] || 'secondary'
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Building Projects</VCardTitle>
        <VCardSubtitle>
          The site a contract is signed for. Buildings belong to a project.
        </VCardSubtitle>

        <template #append>
          <div class="d-flex gap-2 flex-wrap">
            <ImportExportToolbar
              entity-label="Projects"
              :busy="isFileBusy"
              :result="lastImport"
              :can-manage="canManage"
              @template="handleTemplate"
              @export="handleExport"
              @import="handleImport"
              @clear-result="lastImport = null"
            />
            <VBtn
              v-if="canManage && canCreateFromUI"
              color="primary"
              prepend-icon="ri-add-line"
              @click="router.push('/building-projects/new')"
            >
              New Project
            </VBtn>
          </div>
        </template>
      </VCardItem>

      <VCardText>
        <VRow>
          <VCol
            cols="12"
            md="5"
          >
            <VTextField
              v-model="search"
              placeholder="Search by project ID, name or PIC"
              prepend-inner-icon="ri-search-line"
              clearable
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="statusFilter"
              :items="statuses"
              label="Status"
              clearable
              density="compact"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VSelect
              v-model="contractTypeFilter"
              :items="contractTypes"
              label="Contract Type"
              clearable
              density="compact"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VTable>
        <thead>
          <tr>
            <th>Project ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
            <th>PIC</th>
            <th class="text-end">
              Towers
            </th>
            <th class="text-end">
              Buildings
            </th>
            <th class="text-end">
              Screens
            </th>
            <th>Contract</th>
            <th
              v-if="canSeeFinance"
              class="text-end"
            >
              Annual Rental
            </th>
            <th class="text-end">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td
              colspan="11"
              class="text-center py-6"
            >
              <VProgressCircular
                indeterminate
                size="24"
              />
            </td>
          </tr>
          <tr v-else-if="!projects.length">
            <td
              colspan="11"
              class="text-center py-6 text-disabled"
            >
              No projects yet. Download the template, fill it in and upload it.
            </td>
          </tr>
          <tr
            v-for="project in projects"
            v-else
            :key="project.id"
          >
            <td class="font-weight-medium">
              {{ project.project_id_iris }}
            </td>
            <td>{{ project.name }}</td>
            <td>{{ project.building_type || '-' }}</td>
            <td>
              <VChip
                v-if="project.tmn_project_status"
                :color="statusColour(project.tmn_project_status)"
                size="small"
              >
                {{ project.tmn_project_status }}
              </VChip>
              <span v-else>-</span>
            </td>
            <td>{{ project.pic || '-' }}</td>
            <td class="text-end">
              {{ project.no_of_tower || '-' }}
            </td>
            <!--
              Declared towers and actual buildings are maintained independently
              and never reconciled by the system, so both are shown.
            -->
            <td class="text-end">
              {{ project.building_count }}
            </td>
            <td class="text-end">
              {{ project.no_of_screen || '-' }}
            </td>
            <td>
              <span v-if="project.contract_end">
                {{ project.contract_start }} → {{ project.contract_end }}
              </span>
              <span
                v-else
                class="text-disabled"
              >-</span>
            </td>
            <td
              v-if="canSeeFinance"
              class="text-end"
            >
              {{ project.annual_rental ? formatIdr(project.annual_rental) : '-' }}
            </td>
            <td class="text-end">
              <VBtn
                icon="ri-eye-line"
                size="small"
                variant="text"
                @click="router.push(`/building-projects/${project.id}`)"
              />
              <VBtn
                v-if="canManage"
                icon="ri-delete-bin-line"
                size="small"
                variant="text"
                color="error"
                @click="confirmDelete(project)"
              />
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCardText
        v-if="totalPages > 1"
        class="d-flex justify-end"
      >
        <VPagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
        />
      </VCardText>
    </VCard>

    <!--
      Import preview. Clearing is the destructive half of this upload, so it is
      called out above the counts rather than left in a column.
    -->
    <VDialog
      v-model="previewDialog"
      max-width="720"
    >
      <VCard>
        <VCardItem>
          <VCardTitle>Check before applying</VCardTitle>
        </VCardItem>
        <VCardText>
          <VAlert
            v-if="clearedCount"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <div class="font-weight-medium mb-1">
              This upload will clear {{ clearedCount }}
              field{{ clearedCount === 1 ? '' : 's' }}.
            </div>
            <div class="text-body-2">
              A blank cell empties the value. Every change is recorded and can be read
              back in the project's history.
            </div>
          </VAlert>

          <div class="d-flex gap-6 flex-wrap mb-4">
            <div>
              <div class="text-caption text-disabled">
                Rows
              </div><div class="text-h6">
                {{ preview?.rows ?? 0 }}
              </div>
            </div>
            <div>
              <div class="text-caption text-disabled">
                New
              </div><div class="text-h6">
                {{ preview?.created ?? 0 }}
              </div>
            </div>
            <div>
              <div class="text-caption text-disabled">
                Changed
              </div><div class="text-h6">
                {{ preview?.updated ?? 0 }}
              </div>
            </div>
            <div>
              <div class="text-caption text-disabled">
                Unchanged
              </div><div class="text-h6">
                {{ preview?.unchanged ?? 0 }}
              </div>
            </div>
            <div v-if="clearedCount">
              <div class="text-caption text-disabled">
                Cleared
              </div>
              <div class="text-h6 text-warning">
                {{ clearedCount }}
              </div>
            </div>
          </div>

          <!--
            A clear destroys a value; a notice only wants reading. Kept apart so a
            preview cannot present one as the other.
          -->
          <div
            v-if="preview?.clears?.length"
            class="mb-4"
          >
            <div class="text-subtitle-2 mb-2 text-warning">
              What will be cleared
            </div>
            <VTable density="compact">
              <thead><tr><th>Row</th><th>Column</th><th>Currently</th></tr></thead>
              <tbody>
                <tr
                  v-for="(clear, i) in preview.clears"
                  :key="i"
                >
                  <td>{{ clear.row }}</td>
                  <td>{{ clear.column }}</td>
                  <td class="text-disabled">
                    {{ clear.value || '(hidden)' }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>

          <div
            v-if="preview?.notices?.length"
            class="mb-4"
          >
            <div class="text-subtitle-2 mb-2">
              Accepted, worth a look
            </div>
            <VTable density="compact">
              <thead><tr><th>Row</th><th>Column</th><th>Value</th><th>Note</th></tr></thead>
              <tbody>
                <tr
                  v-for="(notice, i) in preview.notices"
                  :key="i"
                >
                  <td>{{ notice.row }}</td>
                  <td>{{ notice.column }}</td>
                  <td>{{ notice.value }}</td>
                  <td class="text-disabled">
                    {{ notice.message }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>

          <div v-if="preview?.errors?.length">
            <div class="text-subtitle-2 mb-2 text-error">
              {{ preview.errors.length }} row{{ preview.errors.length === 1 ? '' : 's' }} will be left out
            </div>
            <VTable density="compact">
              <thead><tr><th>Row</th><th>Column</th><th>Problem</th></tr></thead>
              <tbody>
                <tr
                  v-for="(error, i) in preview.errors"
                  :key="i"
                >
                  <td>{{ error.row }}</td>
                  <td>{{ error.column }}</td>
                  <td>{{ error.message }}</td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="cancelImport"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="isFileBusy"
            @click="applyImport"
          >
            Apply
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog
      v-model="deleteDialog"
      max-width="480"
    >
      <VCard>
        <VCardItem><VCardTitle>Remove this project?</VCardTitle></VCardItem>
        <VCardText>
          <p>{{ deleteTarget?.name }} ({{ deleteTarget?.project_id_iris }}) will be removed.</p>
          <p
            v-if="deleteTarget?.building_count"
            class="text-warning mb-0"
          >
            {{ deleteTarget.building_count }} building{{ deleteTarget.building_count === 1 ? '' : 's' }}
            will be unlinked. The buildings themselves are not deleted.
          </p>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="deleteDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            @click="doDelete"
          >
            Remove
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      location="top end"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
