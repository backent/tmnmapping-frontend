<script setup lang="ts">
import { getBuildingChanges } from '@/http/building'
import type { BuildingChange } from '@/types/building'

/**
 * Who changed what on a building, and when.
 *
 * This is the recovery path for the spreadsheet import, where a blank cell CLEARS a
 * value. Without somewhere to read the old values back, "the change log is the undo
 * trail" is a claim nobody can act on.
 */
const props = defineProps<{ buildingId: number }>()

const changes = ref<BuildingChange[]>([])
const total = ref(0)
const isLoading = ref(false)
const failed = ref(false)

const load = async () => {
  if (!props.buildingId)
    return

  isLoading.value = true
  failed.value = false
  try {
    const response = await getBuildingChanges(props.buildingId, { take: 50, skip: 0 })

    changes.value = response.data || []
    total.value = response.extras?.total ?? changes.value.length
  }
  catch {
    failed.value = true
  }
  finally {
    isLoading.value = false
  }
}

watch(() => props.buildingId, load)
onMounted(load)

/** `annual_rental` reads as `Annual Rental`; a creation row names no field. */
const fieldLabel = (field: string) =>
  field ? field.replace(/_/g, ' ').replace(/\b\w/g, character => character.toUpperCase()) : '-'

const ACTION_COLOURS: Record<string, string> = {
  created: 'success',
  deleted: 'error',
}

const actionColour = (action: string) => ACTION_COLOURS[action] || 'info'

// A change nobody made by hand should say so: ERP keeps writing photos after the
// cutover, and those rows have no actor.
const SOURCE_LABELS: Record<string, string> = {
  form: 'Edited here',
  import: 'Spreadsheet',
  sync: 'ERP sync',
}

const sourceLabel = (source: string) => SOURCE_LABELS[source] || source

const formatWhen = (value: string) => value?.slice(0, 19).replace('T', ' ') || '-'
</script>

<template>
  <VCard class="mt-6">
    <VCardItem>
      <VCardTitle>History</VCardTitle>
      <VCardSubtitle>
        {{ total }} change{{ total === 1 ? '' : 's' }} recorded
      </VCardSubtitle>
      <template #append>
        <VBtn
          icon="ri-refresh-line"
          size="small"
          variant="text"
          :loading="isLoading"
          @click="load"
        />
      </template>
    </VCardItem>

    <VCardText
      v-if="failed"
      class="text-disabled"
    >
      Could not load the history.
    </VCardText>

    <VTable
      v-else-if="changes.length"
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
            {{ formatWhen(change.created_at) }}
          </td>
          <td>
            {{ change.actor_name || '-' }}
            <div
              v-if="change.actor_role"
              class="text-caption text-disabled"
            >
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
          <td>{{ fieldLabel(change.field) }}</td>
          <!--
            The old value is the thing worth keeping: after a clearing upload it is
            the only place the previous value still exists.
          -->
          <td class="text-disabled">
            {{ change.old_value || '-' }}
          </td>
          <td>{{ change.new_value || '-' }}</td>
          <td>
            <VChip
              size="x-small"
              variant="outlined"
            >
              {{ sourceLabel(change.source) }}
            </VChip>
          </td>
        </tr>
      </tbody>
    </VTable>

    <VCardText
      v-else-if="!isLoading"
      class="text-disabled"
    >
      No changes recorded yet. Edits made here, and every spreadsheet upload, appear
      in this list.
    </VCardText>
  </VCard>
</template>
