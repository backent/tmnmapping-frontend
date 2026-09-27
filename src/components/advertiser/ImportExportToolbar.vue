<script setup lang="ts">
import type { ImportResult } from '@/types/advertiser'

const props = defineProps<{
  entityLabel: string
  busy: boolean
  result: ImportResult | null
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'template'): void
  (e: 'export'): void
  (e: 'import', file: File): void
  (e: 'clear-result'): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const resultDialog = computed({
  get: () => props.result !== null,
  set: value => {
    if (!value)
      emit('clear-result')
  },
})

const handleFileSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file)
    emit('import', file)

  // Reset so selecting the same file twice still fires a change event.
  input.value = ''
}
</script>

<template>
  <div class="d-flex gap-2 flex-wrap">
    <VBtn
      color="secondary"
      variant="outlined"
      :loading="busy"
      @click="emit('template')"
    >
      <VIcon
        icon="ri-file-download-line"
        class="me-1"
      />
      Template
    </VBtn>

    <VBtn
      color="secondary"
      variant="outlined"
      :loading="busy"
      @click="emit('export')"
    >
      <VIcon
        icon="ri-download-line"
        class="me-1"
      />
      Export
    </VBtn>

    <VBtn
      v-if="canManage"
      color="secondary"
      variant="outlined"
      :loading="busy"
      @click="fileInput?.click()"
    >
      <VIcon
        icon="ri-upload-line"
        class="me-1"
      />
      Import
    </VBtn>

    <input
      ref="fileInput"
      type="file"
      accept=".xlsx,.csv"
      style="display: none"
      @change="handleFileSelected"
    >

    <!-- Import outcome. Imports are all-or-nothing, so a failure means nothing was
         written and the operator can fix every listed row in one pass. -->
    <VDialog
      v-model="resultDialog"
      max-width="760"
    >
      <VCard v-if="result">
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon
            :icon="result.imported ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'"
            :color="result.imported ? 'success' : 'error'"
          />
          <span>{{ result.imported ? `${entityLabel} imported` : `${entityLabel} import rejected` }}</span>
        </VCardTitle>

        <VCardText>
          <VAlert
            v-if="result.imported"
            type="success"
            variant="tonal"
            class="mb-4"
          >
            {{ result.created }} created, {{ result.updated }} updated,
            {{ result.rows }} row{{ result.rows === 1 ? '' : 's' }} read.
          </VAlert>

          <VAlert
            v-else
            type="error"
            variant="tonal"
            class="mb-4"
          >
            Nothing was saved. Every row is checked before anything is written, so fix
            the {{ result.errors.length }} problem{{ result.errors.length === 1 ? '' : 's' }}
            below and upload the file again.
          </VAlert>

          <VTable
            v-if="result.errors.length"
            density="compact"
          >
            <thead>
              <tr>
                <th class="text-uppercase">
                  Row
                </th>
                <th class="text-uppercase">
                  Column
                </th>
                <th class="text-uppercase">
                  Value
                </th>
                <th class="text-uppercase">
                  Problem
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(error, index) in result.errors"
                :key="index"
              >
                <td>{{ error.row }}</td>
                <td>{{ error.column }}</td>
                <td class="text-disabled">
                  {{ error.value || '—' }}
                </td>
                <td>{{ error.message }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>

        <VCardActions class="justify-end">
          <VBtn @click="emit('clear-result')">
            Close
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
