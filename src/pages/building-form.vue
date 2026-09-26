<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BuildingChangeHistory from '@/components/building/BuildingChangeHistory.vue'
import BuildingPhotos from '@/components/building/BuildingPhotos.vue'
import { createBuilding, getBuildingById, saveBuilding } from '@/http/building'
import type { SaveBuildingRequest } from '@/types/building'
import { extractApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// The route already requires buildings.manage, so this is belt and braces -- but the
// component is reusable, and a read-only caller should not be offered Upload.
const canManage = computed(() => authStore.can('buildings.manage'))

// Keyed on the route NAME, not a param: /buildings/new carries no :id, so
// route.params.id is undefined there rather than 'new'.
const isNew = computed(() => route.name === 'building-new')
const buildingId = computed(() => (isNew.value ? 0 : Number(route.params.id)))

const isLoading = ref(false)
const isSaving = ref(false)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

// Blank means null, exactly as a blank cell does on the spreadsheet import. The form
// REPLACES the record, so the two ways of editing a building agree about what an
// empty field means.
const blankForm = (): SaveBuildingRequest => ({
  external_building_id: '',
  name: '',
  iris_code: '',
  project_id_iris: '',
  latitude: 0,
  longitude: 0,
  subdistrict: '',
  citytown: '',
  province: '',
  cbd_area: '',
  building_type: '',
  grade_resource: '',
  completion_year: 0,
  building_status: '',
  competitor_presence: false,
  competitor_exclusive: false,
  audience: 0,
  impression: 0,
  sellable: '',
  connectivity: '',
  resource_type: '',
})

const form = ref<SaveBuildingRequest>(blankForm())

// Offered, not enforced. ERP adds statuses without warning -- "Building Onboarded"
// appeared on nine buildings unannounced -- so anything typed is accepted and stored
// as written; only the map's progress filter cares.
const buildingStatusOptions = [
  'BAST Signed',
  'Surveyed',
  'Building Proposal Approved',
  'Building Information Updated',
  'Planning',
  'Cancelled',
  'Work Order Submitted',
  'Building Onboarded',
]

// Closed: the map's filter chips are built from this list, so anything else is
// collapsed to Other by the server rather than creating a chip nobody asked for.
const buildingTypeOptions = [
  'Apartment',
  'Office',
  'Hotel',
  'Mall',
  'Golf Course',
  'Tennis & Padel',
  'Yoga Pilates',
  'Dining',
  'Spa & Reflexology',
  'Other',
]

const sellableOptions = [
  { value: 'sell', title: 'Sell' },
  { value: 'not_sell', title: 'Not Sell' },
]

const connectivityOptions = [
  { value: 'online', title: 'Online' },
  { value: 'manual', title: 'Manual' },
  { value: 'not_yet_checked', title: 'Not Yet Checked' },
]

// Derived on the server from status and the two competitor flags. Shown so the
// consequence of a change is visible while making it, never edited: one source of
// truth, so the form cannot disagree with what it is calculated from.
const lcdPresence = computed(() => {
  const isBast = form.value.building_status.trim().toLowerCase() === 'bast signed'

  if (isBast) {
    if (!form.value.competitor_presence && !form.value.competitor_exclusive)
      return 'TMN'
    if (form.value.competitor_presence && !form.value.competitor_exclusive)
      return 'CoExist'

    return '— (contradictory: BAST Signed with an exclusive competitor)'
  }

  return form.value.competitor_presence || form.value.competitor_exclusive
    ? 'Competitor'
    : 'Opportunity'
})

const onMap = computed(() => !!form.value.latitude && !!form.value.longitude)

const load = async () => {
  if (isNew.value)
    return

  isLoading.value = true
  try {
    const response = await getBuildingById(buildingId.value)
    const loaded = response.data

    if (!loaded)
      return

    form.value = {
      external_building_id: loaded.external_building_id || '',
      name: loaded.name || '',
      iris_code: loaded.iris_code || '',
      project_id_iris: loaded.project_id_iris || '',
      latitude: loaded.latitude || 0,
      longitude: loaded.longitude || 0,
      subdistrict: loaded.subdistrict || '',
      citytown: loaded.citytown || '',
      province: loaded.province || '',
      cbd_area: loaded.cbd_area || '',
      building_type: loaded.building_type || '',
      grade_resource: loaded.grade_resource || '',
      completion_year: loaded.completion_year || 0,
      building_status: loaded.building_status || '',
      competitor_presence: !!loaded.competitor_presence,
      competitor_exclusive: !!loaded.competitor_exclusive,
      audience: loaded.audience || 0,
      impression: loaded.impression || 0,
      sellable: loaded.sellable || '',
      connectivity: loaded.connectivity || '',
      resource_type: loaded.resource_type || '',
    }
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to load the building'), 'error')
  }
  finally {
    isLoading.value = false
  }
}

const save = async () => {
  if (!form.value.external_building_id.trim() || !form.value.name.trim()) {
    notify('Building Code and Building Name are both required', 'error')

    return
  }

  isSaving.value = true
  try {
    if (isNew.value) {
      const response = await createBuilding(form.value)

      notify('Building created.')
      router.replace(`/buildings/${response.data?.id}/edit`)
    }
    else {
      await saveBuilding(buildingId.value, form.value)
      notify('Building saved.')
      await load()
    }
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to save the building'), 'error')
  }
  finally {
    isSaving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <VCard :loading="isLoading">
      <VCardItem>
        <VCardTitle>{{ isNew ? 'New Building' : form.name || 'Building' }}</VCardTitle>
        <VCardSubtitle v-if="!isNew && form.external_building_id">
          {{ form.external_building_id }}
        </VCardSubtitle>
        <template #append>
          <VBtn
            variant="text"
            @click="router.push('/buildings')"
          >
            Back
          </VBtn>
        </template>
      </VCardItem>

      <VCardText>
        <div class="text-subtitle-1 mb-3">
          Identity
        </div>
        <VRow>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.external_building_id"
              label="Building Code *"
              hint="The key. Unique, and what the spreadsheet import matches on."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="8"
          >
            <VTextField
              v-model="form.name"
              label="Building Name *"
              hint="One tower, not the whole site — the site is the Project."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.iris_code"
              label="IRIS Code"
              hint="Optional, unique when present. The price import matches on this."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VTextField
              v-model="form.project_id_iris"
              label="Project ID IRIS"
              hint="An unknown code raises an empty project rather than failing."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSelect
              v-model="form.building_type"
              :items="buildingTypeOptions"
              label="Building Type"
              clearable
            />
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <div class="text-subtitle-1 mb-1">
          Location
        </div>
        <div
          class="text-caption mb-3"
          :class="onMap ? 'text-disabled' : 'text-warning'"
        >
          {{ onMap ? 'This building appears on the map.' : 'Without both coordinates it stays off the map.' }}
        </div>
        <VRow>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model.number="form.latitude"
              type="number"
              label="Latitude"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model.number="form.longitude"
              type="number"
              label="Longitude"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="form.subdistrict"
              label="Subdistrict"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="form.citytown"
              label="City / Town"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="form.province"
              label="Province"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="form.cbd_area"
              label="CBD Area"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model="form.grade_resource"
              label="Grade Resource"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model.number="form.completion_year"
              type="number"
              label="Completion Year"
            />
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <div class="text-subtitle-1 mb-3">
          Status and competitors
        </div>
        <VRow>
          <VCol
            cols="12"
            md="4"
          >
            <VCombobox
              v-model="form.building_status"
              :items="buildingStatusOptions"
              label="Building Status"
              clearable
              hint="Another value is accepted and stored as written; only the map's filter cares."
              persistent-hint
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSwitch
              v-model="form.competitor_presence"
              label="Competitor Presence"
              color="primary"
              inset
            />
          </VCol>
          <VCol
            cols="12"
            md="4"
          >
            <VSwitch
              v-model="form.competitor_exclusive"
              label="Competitor Exclusive"
              color="primary"
              inset
            />
          </VCol>
          <VCol cols="12">
            <!--
              Derived, never typed. Shown live so the consequence of a change is
              visible while making it.
            -->
            <VAlert
              type="info"
              variant="tonal"
              density="compact"
            >
              LCD Presence will be <strong>{{ lcdPresence }}</strong> — calculated from
              Building Status and the two competitor switches, never set directly.
            </VAlert>
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <div class="text-subtitle-1 mb-3">
          Audience and operations
        </div>
        <VRow>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model.number="form.audience"
              type="number"
              label="Audience"
            />
          </VCol>
          <VCol
            cols="12"
            md="3"
          >
            <VTextField
              v-model.number="form.impression"
              type="number"
              label="Impressions"
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
          >
            <VSelect
              v-model="form.sellable"
              :items="sellableOptions"
              item-title="title"
              item-value="value"
              label="Sellable"
              clearable
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
          >
            <VSelect
              v-model="form.connectivity"
              :items="connectivityOptions"
              item-title="title"
              item-value="value"
              label="Connectivity"
              clearable
            />
          </VCol>
          <VCol
            cols="12"
            md="2"
          >
            <VTextField
              v-model="form.resource_type"
              label="Resource Type"
            />
          </VCol>
        </VRow>

        <!--
          One URL per slot serves both sources: ours when we host a photo, ERP's
          when we do not. Uploading overrides, removing stops overriding.
        -->
        <template v-if="!isNew">
          <VDivider class="my-6" />
          <BuildingPhotos
            :building-id="buildingId"
            :can-manage="canManage"
          />
        </template>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn
          variant="text"
          @click="router.push('/buildings')"
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
      Every edit here, and every spreadsheet upload, is recorded. On an import a
      blank cell CLEARS a value, so this is where the previous value can be read
      back -- the undo trail that makes that rule safe to live with.
    -->
    <BuildingChangeHistory
      v-if="!isNew && buildingId"
      :building-id="buildingId"
    />

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      location="top end"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>
