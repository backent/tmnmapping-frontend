<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import {
  createBuildingProject,
  getBuildingProject,
  getBuildingProjectChanges,
  getBuildingProjectVocabulary,
  updateBuildingProject,
} from '@/http/buildingproject'
import type { BuildingProjectChange, SaveBuildingProjectRequest } from '@/types/buildingproject'
import { changeFieldLabel, contractValue, pricePerScreen, projectToForm } from '@/utils/buildingProject'
import { formatIdr } from '@/types/quotation'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const canManage = computed(() => authStore.can('building-projects.manage'))
const canSeeFinance = computed(() => authStore.can('building-projects.finance'))

const isNew = computed(() => route.params.id === 'new')
const projectId = computed(() => Number(route.params.id))

const isLoading = ref(false)
const isSaving = ref(false)

// Blank means null on the form, exactly as it does in the import: the form REPLACES
// the record. Numbers start at 0, which the server stores as "not set".
const blankForm = (): SaveBuildingProjectRequest => ({
  project_id_iris: '',
  name: '',
  building_type: '',
  grade: '',
  pic: '',
  tmn_project_status: '',
  no_of_tower: 0,
  no_of_screen: 0,
  created_date: '',
  remark: '',
  contract_type: '',
  contract_no: '',
  contract_date: '',
  contract_start: '',
  contract_end: '',
  period_month: 0,
  annual_rental: 0,
  payment_term: '',
  company_name: '',
  exclusivity: '',
  doc_type: '',
  contract_status: '',
  cancelled_at: '',
  cancel_last_status: '',
  cancel_reason: '',
})

const form = ref<SaveBuildingProjectRequest>(blankForm())
const buildingCount = ref(0)

// Dropdowns come from the server, never a copy here: the options offered and the
// values the importer accepts are then the same list by construction.
const vocabulary = ref<Record<string, string[]>>({})
const options = (field: string) => vocabulary.value[field] || []

const changes = ref<BuildingProjectChange[]>([])
const changesTotal = ref(0)

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

const derivedPricePerScreen = computed(() => pricePerScreen(form.value.annual_rental, form.value.no_of_screen))
const derivedContractValue = computed(() => contractValue(form.value.annual_rental, form.value.period_month))

const load = async () => {
  if (isNew.value)
    return

  isLoading.value = true
  try {
    const response = await getBuildingProject(projectId.value)
    const project = response.data

    if (!project)
      return

    buildingCount.value = project.building_count

    form.value = projectToForm(project)
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load the project'), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const loadChanges = async () => {
  if (isNew.value)
    return

  try {
    const response = await getBuildingProjectChanges(projectId.value, { take: 50, skip: 0 })

    changes.value = response.data || []
    changesTotal.value = response.extras?.total ?? changes.value.length
  }
  catch {
    // The history is supporting detail; losing it must not break the page.
  }
}

const loadVocabulary = async () => {
  try {
    vocabulary.value = (await getBuildingProjectVocabulary()).data || {}
  }
  catch {
    // Without it the selects are empty; the fields still accept what is typed.
  }
}

const save = async () => {
  if (!form.value.project_id_iris.trim() || !form.value.name.trim()) {
    notify('Project ID IRIS and Project Name are both required', 'error')

    return
  }

  isSaving.value = true
  try {
    if (isNew.value) {
      const response = await createBuildingProject(form.value)

      notify('Project created.')
      router.replace(`/building-projects/${response.data?.id}`)
    }
    else {
      await updateBuildingProject(projectId.value, form.value)
      notify('Project saved.')
      await loadChanges()
    }
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to save the project'), 'error')
  }
  finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await loadVocabulary()
  await load()
  await loadChanges()
})

const ACTION_COLOURS: Record<string, string> = {
  created: 'success',
  deleted: 'error',
}

const actionColour = (action: string) => ACTION_COLOURS[action] || 'info'
</script>

<template>
  <div>
    <VCard :loading="isLoading">
      <VCardItem>
        <VCardTitle>{{ isNew ? 'New Project' : form.name || 'Project' }}</VCardTitle>
        <VCardSubtitle v-if="!isNew && buildingCount">
          {{ buildingCount }} building{{ buildingCount === 1 ? '' : 's' }} linked
        </VCardSubtitle>
        <template #append>
          <VBtn
            variant="text"
            @click="router.push('/building-projects')"
          >
            Back
          </VBtn>
        </template>
      </VCardItem>

      <VCardText>
        <div class="text-subtitle-1 mb-3">
          Project
        </div>
        <VRow>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.project_id_iris"
              label="Project ID IRIS *"
              :readonly="!canManage"
              hint="The key. Must match IRIS exactly; it decides which project an upload updates."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="8"
          >
            <VTextField
              v-model="form.name"
              label="Project Name *"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.building_type"
              label="Building Type"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VCombobox
              v-model="form.grade"
              :items="options('grade_suggestions')"
              label="Grade"
              :readonly="!canManage"
              hint="Suggestions only; anything is accepted."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.pic"
              label="PIC"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.tmn_project_status"
              :items="options('tmn_project_status')"
              label="TMN Project Status"
              clearable
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
          >
            <VTextField
              v-model.number="form.no_of_tower"
              type="number"
              label="No of Tower"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
          >
            <VTextField
              v-model.number="form.no_of_screen"
              type="number"
              label="No of Screen"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.created_date"
              type="date"
              label="Create Date"
              :readonly="!canManage"
            />
          </VCol>
          <VCol cols="12">
            <VTextarea
              v-model="form.remark"
              label="Remark"
              rows="2"
              :readonly="!canManage"
            />
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <div class="text-subtitle-1 mb-3">
          Contract
        </div>
        <VRow>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.contract_type"
              :items="options('contract_type')"
              label="Contract Type"
              clearable
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.contract_status"
              :items="options('contract_status')"
              label="Contract Status"
              clearable
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.doc_type"
              :items="options('doc_type')"
              label="Doc. Type"
              clearable
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.contract_date"
              type="date"
              label="Contract Date"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.contract_start"
              type="date"
              label="Contract Start"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.contract_end"
              type="date"
              label="Contract End"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model.number="form.period_month"
              type="number"
              label="Period Month"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.payment_term"
              :items="options('payment_term')"
              label="Payment Term"
              clearable
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.exclusivity"
              :items="options('exclusivity')"
              label="Exclusivity"
              clearable
              :readonly="!canManage"
            />
          </VCol>
        </VRow>

        <!--
          What TMN pays the landlord. Hidden entirely without the permission: the
          server does not send these fields, so there is nothing to show.
        -->
        <template v-if="canSeeFinance">
          <VDivider class="my-6" />
          <div class="text-subtitle-1 mb-1">
            Landlord cost
          </div>
          <div class="text-caption text-disabled mb-3">
            What TMN pays for this site. Restricted to finance roles.
          </div>
          <VRow>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model.number="form.annual_rental"
                type="number"
                label="Annual Rental (IDR / year)"
                :readonly="!canManage"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="form.company_name"
                label="Company Name"
                :readonly="!canManage"
              />
            </VCol>
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="form.contract_no"
                label="Contract No"
                :readonly="!canManage"
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                :model-value="derivedPricePerScreen ? formatIdr(derivedPricePerScreen) : '-'"
                label="Price Per Screen (per year)"
                readonly
                hint="Calculated from Annual Rental and No of Screen. Not stored."
                persistent-hint
              />
            </VCol>
            <VCol
              cols="12"
              md="6"
            >
              <VTextField
                :model-value="derivedContractValue ? formatIdr(derivedContractValue) : '-'"
                label="Contract Value"
                readonly
                hint="Annual Rental over the contract's length. Not stored."
                persistent-hint
              />
            </VCol>
          </VRow>
        </template>

        <VDivider class="my-6" />

        <div class="text-subtitle-1 mb-3">
          Cancellation
        </div>
        <VRow>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.cancelled_at"
              type="date"
              label="Cancelled / Terminate Date"
              :readonly="!canManage"
              hint="Leave empty unless the contract ended early."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.cancel_last_status"
              label="Last Status"
              :readonly="!canManage"
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.cancel_reason"
              label="Reason"
              :readonly="!canManage"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions v-if="canManage">
        <VSpacer />
        <VBtn
          variant="text"
          @click="router.push('/building-projects')"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSaving"
          @click="save"
        >
          {{ isNew ? 'Create' : 'Save' }}
        </VBtn>
      </VCardActions>
    </VCard>

    <!--
      History. Every field change, who made it and when. An import shows as one
      batch; a form edit has none.
    -->
    <VCard
      v-if="!isNew"
      class="mt-6"
    >
      <VCardItem>
        <VCardTitle>History</VCardTitle>
        <VCardSubtitle>
          {{ changesTotal }} change{{ changesTotal === 1 ? '' : 's' }} recorded
        </VCardSubtitle>
      </VCardItem>
      <VTable
        v-if="changes.length"
        density="compact"
      >
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Field</th>
            <th>From</th>
            <th>To</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="change in changes"
            :key="change.id"
          >
            <td class="text-no-wrap">
              {{ change.created_at?.slice(0, 19).replace('T', ' ') }}
            </td>
            <td>
              {{ change.actor_name || 'Unknown' }}
              <div class="text-caption text-disabled">
                {{ change.actor_role }}
              </div>
            </td>
            <td>
              <VChip
                :color="actionColour(change.action)"
                size="x-small"
              >
                {{ change.action }}
              </VChip>
            </td>
            <td>{{ changeFieldLabel(change.field) }}</td>
            <td class="text-disabled">
              {{ change.old_value || '-' }}
            </td>
            <td>{{ change.new_value || '-' }}</td>
            <td>
              <VChip
                size="x-small"
                variant="outlined"
              >
                {{ change.source }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
      <VCardText
        v-else
        class="text-disabled"
      >
        No changes recorded yet.
      </VCardText>
    </VCard>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      location="top end"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
