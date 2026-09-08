<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useQuotationStore } from '@/stores/quotation'
import { useAuthStore } from '@/stores/auth'
import PricingSummary from '@/components/quotation/PricingSummary.vue'
import {
  QUOTATION_STATUS_COLORS,
  QUOTATION_STATUS_LABELS,
  formatIdr,
  isPending,
} from '@/types/quotation'

const route = useRoute()
const router = useRouter()
const store = useQuotationStore()
const authStore = useAuthStore()

const quotationId = computed(() => Number(route.params.id))
const quotation = computed(() => store.currentItem)

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')
const returnDialog = ref(false)
const returnComment = ref('')

// Only the person routing named may act, and only while it is pending. The server
// enforces both; hiding the buttons just avoids offering a guaranteed 403.
const isMyQueue = computed(() =>
  !!quotation.value
  && isPending(quotation.value.status)
  && quotation.value.required_approver_name === authStore.userName
  && authStore.can('quotations.approve'))

const canEdit = computed(() =>
  !!quotation.value
  && quotation.value.is_editable
  && quotation.value.sales_user_id === authStore.currentUser?.id)

const placement = computed(() => quotation.value?.selections.find(s => s.kind === 'placement'))
const bonus = computed(() => quotation.value?.selections.find(s => s.kind === 'bonus'))

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const errorText = (error: any, fallback: string) =>
  error?.details?.data || error?.details?.message || fallback

const load = async () => {
  try {
    await store.fetchById(quotationId.value)
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load the quotation'), 'error')
  }
}

onMounted(load)
onUnmounted(() => store.clearCurrent())

const submit = async () => {
  try {
    await store.submit(quotationId.value)
    notify('Submitted for approval')
    await load()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to submit'), 'error')
  }
}

const approve = async () => {
  try {
    await store.approve(quotationId.value)
    notify('Quotation approved')
    await load()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to approve'), 'error')
  }
}

const doReturn = async () => {
  if (!returnComment.value.trim()) {
    notify('A reason is required when returning a quotation', 'error')

    return
  }
  try {
    await store.returnToSales(quotationId.value, returnComment.value.trim())
    returnDialog.value = false
    returnComment.value = ''
    notify('Returned to the sales owner')
    await load()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to return'), 'error')
  }
}

const actionLabel = (action: string) => ({
  submitted: 'Submitted',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  returned: 'Returned',
}[action] ?? action)

const actionColor = (action: string) => ({
  submitted: 'info',
  resubmitted: 'info',
  approved: 'success',
  returned: 'error',
}[action] ?? 'secondary')
</script>

<template>
  <div>
    <VProgressLinear
      v-if="store.isLoading && !quotation"
      indeterminate
    />

    <template v-if="quotation">
      <VRow class="mb-2">
        <VCol
          cols="12"
          class="d-flex align-center flex-wrap gap-2"
        >
          <VBtn
            icon
            variant="text"
            @click="router.push({ name: 'quotations' })"
          >
            <VIcon icon="ri-arrow-left-s-line" />
          </VBtn>
          <span class="text-h4">{{ quotation.quote_number }}</span>
          <VChip
            size="small"
            :color="QUOTATION_STATUS_COLORS[quotation.status]"
            variant="tonal"
          >
            {{ QUOTATION_STATUS_LABELS[quotation.status] }}
          </VChip>
          <VChip
            v-if="quotation.version > 1"
            size="small"
            variant="outlined"
          >
            v{{ quotation.version }}
          </VChip>
          <VSpacer />

          <VBtn
            variant="outlined"
            @click="router.push({ name: 'quotation-document', params: { id: String(quotation.id) } })"
          >
            <VIcon
              icon="ri-file-text-line"
              class="me-1"
            />
            Document
          </VBtn>
          <VBtn
            v-if="canEdit"
            variant="outlined"
            @click="router.push({ name: 'quotation-edit', params: { id: String(quotation.id) } })"
          >
            <VIcon
              icon="ri-edit-line"
              class="me-1"
            />
            Edit
          </VBtn>
          <VBtn
            v-if="canEdit"
            color="primary"
            :loading="store.isSubmitting"
            @click="submit"
          >
            Submit for approval
          </VBtn>

          <template v-if="isMyQueue">
            <VBtn
              color="error"
              variant="outlined"
              @click="returnDialog = true"
            >
              Return
            </VBtn>
            <VBtn
              color="success"
              :loading="store.isSubmitting"
              @click="approve"
            >
              Approve
            </VBtn>
          </template>
        </VCol>
      </VRow>

      <VAlert
        v-if="quotation.status === 'returned'"
        type="error"
        variant="tonal"
        class="mb-4"
      >
        This quotation was returned. Edit it and resubmit — that creates a new version,
        leaving the previous one on the record.
      </VAlert>

      <VRow>
        <VCol
          cols="12"
          md="8"
        >
          <VCard class="mb-4">
            <VCardTitle class="text-subtitle-1">
              Client & brand
            </VCardTitle>
            <VCardText>
              <VTable density="compact">
                <tbody>
                  <tr>
                    <td class="text-body-2">
                      Customer
                    </td>
                    <td>{{ quotation.customer_name }}</td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Brand
                    </td>
                    <td>{{ quotation.brand_name }}</td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Attention to
                    </td>
                    <td>
                      {{ quotation.attention_to || '—' }}
                      <span class="text-disabled">{{ quotation.job_title }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Contact
                    </td>
                    <td>{{ quotation.contact_email || '—' }} {{ quotation.contact_phone }}</td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Sales owner
                    </td>
                    <td>
                      {{ quotation.sales_name }}
                      <span
                        v-if="quotation.is_proxy_entry"
                        class="text-disabled"
                      >· entered by {{ quotation.created_by_name }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Valid until
                    </td>
                    <td>{{ quotation.valid_until || '—' }}</td>
                  </tr>
                  <tr>
                    <td class="text-body-2">
                      Rate card
                    </td>
                    <td>{{ quotation.rate_card_version_code || '—' }}</td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>

          <!-- Resources: one row per selection, as on the real quotation document -->
          <VCard class="mb-4">
            <VCardTitle class="text-subtitle-1">
              Resources
            </VCardTitle>
            <VCardText>
              <VTable density="compact">
                <thead>
                  <tr>
                    <th class="text-uppercase">
                      Line
                    </th>
                    <th class="text-uppercase">
                      Selection
                    </th>
                    <th class="text-uppercase">
                      TVC
                    </th>
                    <th class="text-uppercase">
                      Spots
                    </th>
                    <th class="text-uppercase">
                      Weeks
                    </th>
                    <th class="text-uppercase text-end">
                      Rate / week
                    </th>
                    <th class="text-uppercase text-end">
                      Gross
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="section in quotation.selections"
                    :key="section.kind"
                  >
                    <td class="text-capitalize font-weight-medium">
                      {{ section.kind }}
                    </td>
                    <td>
                      {{ section.mode === 'package'
                        ? section.sales_package_name
                        : `${section.items.length} buildings` }}
                      <div class="text-caption text-disabled">
                        {{ section.screen_count }} screens
                      </div>
                    </td>
                    <td>{{ section.tvc_duration_seconds }}s</td>
                    <td>{{ section.spots }}</td>
                    <td>{{ section.weeks }}</td>
                    <td class="text-end">
                      {{ formatIdr(section.gross_price_per_week) }}
                    </td>
                    <td class="text-end font-weight-medium">
                      {{ formatIdr(section.gross_price) }}
                    </td>
                  </tr>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>

          <!--
            Building appendix. On the real document this ships as a separate
            attachment; showing it here saves opening another file.
          -->
          <VCard
            v-if="placement?.items.length || bonus?.items.length"
            class="mb-4"
          >
            <VCardTitle class="text-subtitle-1">
              Buildings
            </VCardTitle>
            <VCardText>
              <VTable density="compact">
                <thead>
                  <tr>
                    <th class="text-uppercase">
                      Building
                    </th>
                    <th class="text-uppercase">
                      Region / type
                    </th>
                    <th class="text-uppercase text-end">
                      Daily traffic
                    </th>
                    <th class="text-uppercase text-end">
                      Monthly impressions
                    </th>
                    <th class="text-uppercase text-end">
                      Rate / week
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template
                    v-for="section in quotation.selections"
                    :key="section.kind"
                  >
                    <tr
                      v-for="item in section.items"
                      :key="`${section.kind}-${item.building_id}`"
                    >
                      <td>{{ item.building_name }}</td>
                      <td class="text-body-2">
                        {{ item.citytown || '—' }} · {{ item.building_type || '—' }}
                      </td>
                      <td class="text-end">
                        {{ item.traffic.toLocaleString() }}
                      </td>
                      <td class="text-end">
                        {{ item.impressions.toLocaleString() }}
                      </td>
                      <td class="text-end">
                        {{ formatIdr(item.unit_price_idr) }}
                      </td>
                    </tr>
                  </template>
                </tbody>
              </VTable>
            </VCardText>
          </VCard>

          <!-- Approval timeline -->
          <VCard>
            <VCardTitle class="text-subtitle-1">
              Approval history
            </VCardTitle>
            <VCardText>
              <VTimeline
                v-if="quotation.approvals.length"
                side="end"
                density="compact"
                truncate-line="both"
              >
                <VTimelineItem
                  v-for="(event, index) in quotation.approvals"
                  :key="index"
                  :dot-color="actionColor(event.action)"
                  size="x-small"
                >
                  <div class="d-flex justify-space-between flex-wrap">
                    <span class="font-weight-medium">
                      {{ actionLabel(event.action) }}
                      <span class="text-disabled">v{{ event.version }}</span>
                    </span>
                    <span class="text-caption text-disabled">
                      {{ new Date(event.created_at).toLocaleString() }}
                    </span>
                  </div>
                  <div class="text-body-2">
                    {{ event.actor_name }}
                  </div>
                  <div
                    v-if="event.comment"
                    class="text-body-2 mt-1"
                  >
                    "{{ event.comment }}"
                  </div>
                </VTimelineItem>
              </VTimeline>
              <div
                v-else
                class="text-disabled text-body-2"
              >
                Not submitted yet.
              </div>
            </VCardText>
          </VCard>
        </VCol>

        <VCol
          cols="12"
          md="4"
        >
          <PricingSummary
            :pricing="quotation.pricing"
            :discount="quotation.discount"
            :tax-rate="quotation.tax_rate"
            :approval="quotation.required_approver_name
              ? { band: '', approver_role: '', approver_name: quotation.required_approver_name, resolvable: true, reason: '' }
              : null"
            :sections="quotation.selections"
          />
        </VCol>
      </VRow>
    </template>

    <!-- Return needs a reason. The server refuses a blank one, and so does this. -->
    <VDialog
      v-model="returnDialog"
      max-width="520"
    >
      <VCard>
        <VCardTitle>Return this quotation</VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-3">
            The sales owner will see this reason and can edit and resubmit. A reason is
            required.
          </p>
          <VTextarea
            v-model="returnComment"
            label="Reason"
            rows="3"
            autofocus
          />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            @click="returnDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            :loading="store.isSubmitting"
            @click="doReturn"
          >
            Return
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
  </div>
</template>
