<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useQuotationStore } from '@/stores/quotation'
import { useAuthStore } from '@/stores/auth'
import PricingSummary from '@/components/quotation/PricingSummary.vue'
import { extractApiError } from '@/utils/apiError'
import { formatCalendarDate, isPastCalendarDate } from '@/utils/date'
import { approvalTrack, latestEvent } from '@/utils/quotationDetail'
import type { TrackState } from '@/utils/quotationDetail'
import {
  APPROVAL_BANDS,
  APPROVER_ROLE_LABELS,
  QUOTATION_STATUS_COLORS,
  QUOTATION_STATUS_LABELS,
  approvalHintFor,
  discountBandColor,
  formatIdr,
  isPending,
  isUnpriced,
  selectionPayloadFrom,
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
const approveDialog = ref(false)
const deleteDialog = ref(false)
const isDeleting = ref(false)

const tab = ref<'overview' | 'buildings' | 'history'>('overview')
const buildingSearch = ref('')

// Only the person routing named may act, and only while it is pending. The server
// enforces both; hiding the buttons just avoids offering a guaranteed 403.
const isMyQueue = computed(() =>
  !!quotation.value
  && isPending(quotation.value.status)
  && quotation.value.required_approver_name === authStore.userName
  && authStore.can('quotations.approve'))

const isOwner = computed(() =>
  !!quotation.value && quotation.value.sales_user_id === authStore.currentUser?.id)

const canEdit = computed(() => !!quotation.value && quotation.value.is_editable && isOwner.value)

// Only a draft is deleted. A returned quotation is on the approval record and is
// resubmitted, not thrown away.
const canDelete = computed(() => isOwner.value && quotation.value?.status === 'draft')

const placement = computed(() => quotation.value?.selections.find(s => s.kind === 'placement'))
const bonus = computed(() => quotation.value?.selections.find(s => s.kind === 'bonus'))

// A draft's stored totals are zero until it is submitted, so it is shown a preview
// priced at today's rates instead, labelled as an estimate.
const isDraft = computed(() => !!quotation.value && isUnpriced(quotation.value.status))

const pricing = computed(() => (isDraft.value
  ? store.preview?.pricing ?? null
  : quotation.value?.pricing ?? null))

// For a draft the preview names who would approve at this discount; once submitted,
// the status names who it is actually waiting on.
const approval = computed(() => {
  if (!quotation.value)
    return null

  return isDraft.value ? store.preview?.approval ?? null : approvalHintFor(quotation.value)
})

const track = computed(() => (quotation.value
  ? approvalTrack(quotation.value, isDraft.value ? store.preview?.approval?.approver_role : null)
  : []))

// The reason a seller needs before anything else on a returned quotation. It used to
// sit at the bottom of the history card.
const lastReturn = computed(() =>
  quotation.value?.status === 'returned' ? latestEvent(quotation.value.approvals, ['returned']) : null)

const band = computed(() => APPROVAL_BANDS[approval.value?.band ?? ''] ?? null)

const isExpired = computed(() =>
  !!quotation.value && !isDraft.value && isPastCalendarDate(quotation.value.valid_until))

const buildingCount = computed(() =>
  (quotation.value?.selections ?? []).reduce((n, s) => n + s.items.length, 0))

// Grouped by line: placement and bonus can hold different buildings. Searching keeps
// the groups, so a match still says which line it is on.
const buildingGroups = computed(() => {
  const term = buildingSearch.value.trim().toLowerCase()

  return (quotation.value?.selections ?? [])
    .filter(s => s.items.length)
    .map(s => ({
      kind: s.kind,
      total: s.items.length,
      items: term
        ? s.items.filter(i => `${i.building_name} ${i.building_iris_code} ${i.citytown} ${i.building_type}`.toLowerCase().includes(term))
        : s.items,
    }))
})

const previewDraft = async () => {
  const q = quotation.value
  if (!q || !isUnpriced(q.status))
    return

  await store.refreshPreview({
    discount: q.discount,
    tax_rate: q.tax_rate,
    placement: placement.value ? selectionPayloadFrom(placement.value) : null,
    bonus: bonus.value ? selectionPayloadFrom(bonus.value) : null,
  }).catch(() => null)
}

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const load = async () => {
  try {
    await store.fetchById(quotationId.value)
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to load the quotation'), 'error')

    return
  }
  await previewDraft()
}

onMounted(load)
onUnmounted(() => store.clearCurrent())

const goEdit = () => router.push({ name: 'quotation-edit', params: { id: String(quotationId.value) } })
const goDocument = () => router.push({ name: 'quotation-document', params: { id: String(quotationId.value) } })

const submit = async () => {
  try {
    await store.submit(quotationId.value)
    notify('Submitted for approval')
    await load()
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to submit'), 'error')
  }
}

const approve = async () => {
  try {
    await store.approve(quotationId.value)
    approveDialog.value = false
    notify('Quotation approved')
    await load()
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to approve'), 'error')
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
    notify(extractApiError(error, 'Failed to return'), 'error')
  }
}

const doDelete = async () => {
  isDeleting.value = true
  try {
    await store.remove(quotationId.value)
    router.push({ name: 'quotations' })
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to delete the quotation'), 'error')
  }
  finally {
    isDeleting.value = false
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

const roleLabel = (role: string) => APPROVER_ROLE_LABELS[role] ?? (role === 'sales' ? 'Sales' : role)

const trackIcon: Record<TrackState, string> = {
  done: 'ri-check-line',
  current: 'ri-time-line',
  returned: 'ri-arrow-go-back-line',
  todo: 'ri-checkbox-blank-circle-line',
  skipped: 'ri-subtract-line',
}

const trackColor: Record<TrackState, string | undefined> = {
  done: 'success',
  current: 'warning',
  returned: 'error',
  todo: undefined,
  skipped: undefined,
}
</script>

<template>
  <div>
    <VProgressLinear
      v-if="store.isLoading && !quotation"
      indeterminate
    />

    <template v-if="quotation">
      <!-- Header: who it is for, where it stands, and the one thing to do next. -->
      <VCard class="mb-4">
        <VCardText class="pb-2">
          <div class="d-flex align-center flex-wrap gap-2">
            <VBtn
              icon
              variant="text"
              aria-label="Back to quotations"
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

            <div class="detail-actions d-flex flex-wrap gap-2">
              <VBtn
                v-if="canDelete"
                variant="text"
                color="error"
                @click="deleteDialog = true"
              >
                Delete draft
              </VBtn>
              <VBtn
                variant="outlined"
                @click="goDocument"
              >
                <VIcon
                  icon="ri-file-text-line"
                  class="me-1"
                />
                Document
              </VBtn>

              <!-- Approver: decide. -->
              <template v-if="isMyQueue">
                <VBtn
                  color="error"
                  variant="outlined"
                  @click="returnDialog = true"
                >
                  Return…
                </VBtn>
                <VBtn
                  color="success"
                  :loading="store.isSubmitting"
                  @click="approveDialog = true"
                >
                  Approve
                </VBtn>
              </template>

              <!-- Owner of a returned quotation: change it, then resubmit as a new version. -->
              <template v-else-if="canEdit && quotation.status === 'returned'">
                <VBtn
                  variant="text"
                  :loading="store.isSubmitting"
                  @click="submit"
                >
                  Resubmit unchanged
                </VBtn>
                <VBtn
                  color="primary"
                  @click="goEdit"
                >
                  Edit and resubmit
                </VBtn>
              </template>

              <!-- Owner of a draft: send it. -->
              <template v-else-if="canEdit">
                <VBtn
                  variant="outlined"
                  @click="goEdit"
                >
                  <VIcon
                    icon="ri-edit-line"
                    class="me-1"
                  />
                  Edit
                </VBtn>
                <VBtn
                  color="primary"
                  :loading="store.isSubmitting"
                  @click="submit"
                >
                  Submit for approval
                </VBtn>
              </template>
            </div>
          </div>

          <div class="text-body-2 text-disabled detail-meta">
            {{ quotation.customer_name }} · {{ quotation.brand_name }}
            · Owner {{ quotation.sales_name }}
            <span v-if="quotation.is_proxy_entry"> (entered by {{ quotation.created_by_name }})</span>
            · Created {{ formatCalendarDate(quotation.created_at) }}
            ·
            <span :class="{ 'text-error': isExpired }">
              {{ isExpired ? 'Expired' : 'Valid until' }} {{ formatCalendarDate(quotation.valid_until) }}
            </span>
          </div>
        </VCardText>

        <VDivider />

        <!--
          The approval tracker. Only one approver is ever needed; the other two are
          drawn dimmed so the seller sees which level the discount reached.
        -->
        <div class="approval-track">
          <div
            v-for="(item, index) in track"
            :key="item.key"
            class="approval-track__step"
            :class="[`approval-track__step--${item.state}`, { 'approval-track__step--first': index === 0 }]"
          >
            <VAvatar
              size="26"
              :color="trackColor[item.state]"
              :variant="item.state === 'done' ? 'flat' : 'tonal'"
              class="approval-track__dot"
            >
              <VIcon
                :icon="trackIcon[item.state]"
                size="15"
              />
            </VAvatar>
            <div class="text-body-2 font-weight-medium">
              {{ item.label }}
            </div>
            <div class="text-caption text-disabled">
              {{ item.detail || ' ' }}
            </div>
          </div>
        </div>

        <!-- Seller: why it came back, before anything else. -->
        <VCardText
          v-if="lastReturn"
          class="pt-0"
        >
          <VAlert
            type="error"
            variant="tonal"
            icon="ri-arrow-go-back-line"
          >
            <div>
              <strong>Returned by {{ lastReturn.actor_name }}</strong>
              <span class="text-caption"> · {{ roleLabel(lastReturn.actor_role) }} · {{ new Date(lastReturn.created_at).toLocaleString() }}</span>
            </div>
            <div class="font-italic my-1">
              "{{ lastReturn.comment }}"
            </div>
            <div
              v-if="canEdit"
              class="text-caption"
            >
              Edit it and resubmit. That sends it as v{{ quotation.version + 1 }} and keeps
              v{{ quotation.version }} on the record.
            </div>
          </VAlert>
        </VCardText>

        <!-- Approver: what the decision rests on, next to the buttons that make it. -->
        <VCardText
          v-if="isMyQueue && pricing"
          class="pt-0"
        >
          <div class="decision-grid">
            <div class="decision-kpi">
              <span class="text-caption text-disabled">Customer discount</span>
              <span class="text-h6 d-flex align-center gap-2">
                {{ quotation.discount }}%
                <VIcon
                  icon="ri-circle-fill"
                  size="10"
                  :color="discountBandColor(quotation.discount)"
                />
              </span>
              <span class="text-caption text-disabled">{{ band ? `${band.label}, ${band.range}` : '' }}</span>
            </div>
            <div class="decision-kpi">
              <span class="text-caption text-disabled">Effective discount</span>
              <span class="text-h6">{{ pricing.effective_discount_rate.toFixed(2) }}%</span>
              <span class="text-caption text-disabled">includes the free bonus</span>
            </div>
            <div class="decision-kpi">
              <span class="text-caption text-disabled">Total nett</span>
              <span class="text-h6">{{ formatIdr(pricing.total_net) }}</span>
              <span class="text-caption text-disabled">gross {{ formatIdr(pricing.total_gross) }}</span>
            </div>
            <div class="decision-kpi">
              <span class="text-caption text-disabled">Total incl. VAT</span>
              <span class="text-h6">{{ formatIdr(pricing.total_including_tax) }}</span>
              <span class="text-caption text-disabled">what the customer pays</span>
            </div>
          </div>
        </VCardText>
      </VCard>

      <VRow>
        <VCol
          cols="12"
          md="8"
        >
          <VCard>
            <VTabs
              v-model="tab"
              class="px-2"
            >
              <VTab value="overview">
                Overview
              </VTab>
              <VTab value="buildings">
                Buildings
                <VChip
                  size="x-small"
                  variant="tonal"
                  class="ms-2"
                >
                  {{ buildingCount }}
                </VChip>
              </VTab>
              <VTab value="history">
                History
                <VChip
                  size="x-small"
                  variant="tonal"
                  class="ms-2"
                >
                  {{ quotation.approvals.length }}
                </VChip>
              </VTab>
            </VTabs>
            <VDivider />

            <VWindow v-model="tab">
              <!-- Overview: who it is addressed to, and what was sold -->
              <VWindowItem value="overview">
                <VCardText>
                  <dl class="detail-dl">
                    <dt>Attention to</dt>
                    <dd>
                      {{ quotation.attention_to || '—' }}
                      <span
                        v-if="quotation.job_title"
                        class="text-disabled"
                      >· {{ quotation.job_title }}</span>
                    </dd>
                    <dt>Email</dt>
                    <dd>{{ quotation.contact_email || '—' }}</dd>
                    <dt>Phone</dt>
                    <dd>{{ quotation.contact_phone || '—' }}</dd>
                    <dt>Campaign year</dt>
                    <dd>{{ quotation.campaign_year || '—' }}</dd>
                  </dl>

                  <!-- Resources: one row per selection, as on the real quotation document -->
                  <VTable
                    density="compact"
                    class="mt-4"
                  >
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
                        <td>
                          <VChip
                            size="small"
                            variant="tonal"
                            :color="section.kind === 'placement' ? 'primary' : 'success'"
                            class="text-capitalize"
                          >
                            {{ section.kind }}
                          </VChip>
                        </td>
                        <td>
                          {{ section.mode === 'package'
                            ? section.sales_package_name
                            : `${section.items.length} ${section.items.length === 1 ? 'building' : 'buildings'}` }}
                          <div class="text-caption text-disabled">
                            {{ section.screen_count }} screens
                          </div>
                        </td>
                        <td>{{ section.tvc_duration_seconds }}s</td>
                        <td>{{ section.spots }}</td>
                        <td>{{ section.weeks }}</td>
                        <td class="text-end text-no-wrap">
                          {{ formatIdr(section.gross_price_per_week) }}
                        </td>
                        <td class="text-end font-weight-medium text-no-wrap">
                          {{ formatIdr(section.gross_price) }}
                          <div
                            v-if="section.kind === 'bonus'"
                            class="text-caption text-success"
                          >
                            free
                          </div>
                        </td>
                      </tr>
                      <tr v-if="!quotation.selections.length">
                        <td
                          colspan="7"
                          class="text-center text-disabled py-6"
                        >
                          Nothing selected yet.
                        </td>
                      </tr>
                    </tbody>
                  </VTable>
                </VCardText>
              </VWindowItem>

              <!--
                Buildings. On the real document this ships as a separate attachment;
                showing it here saves opening another file.
              -->
              <VWindowItem value="buildings">
                <VCardText>
                  <template v-if="buildingCount">
                    <VTextField
                      v-model="buildingSearch"
                      label="Search name, IRIS code, city or type"
                      prepend-inner-icon="ri-search-line"
                      density="compact"
                      clearable
                      hide-details
                      class="mb-4"
                      style="max-width: 340px"
                    />
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
                            Rate / week
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <template
                          v-for="group in buildingGroups"
                          :key="group.kind"
                        >
                          <tr class="bg-var-theme-background">
                            <td
                              colspan="3"
                              class="text-caption text-uppercase font-weight-medium"
                            >
                              {{ group.kind }} · {{ group.total }} {{ group.total === 1 ? 'building' : 'buildings' }}
                              <span v-if="group.items.length !== group.total"> · {{ group.items.length }} match</span>
                            </td>
                          </tr>
                          <tr
                            v-for="item in group.items"
                            :key="`${group.kind}-${item.building_id}`"
                          >
                            <td>
                              {{ item.building_name }}
                              <div class="text-caption text-disabled">
                                {{ item.building_iris_code }}
                              </div>
                            </td>
                            <td class="text-body-2">
                              {{ item.citytown || '—' }} · {{ item.building_type || '—' }}
                            </td>
                            <td class="text-end text-no-wrap">
                              {{ formatIdr(item.unit_price_idr) }}
                            </td>
                          </tr>
                        </template>
                      </tbody>
                    </VTable>
                  </template>
                  <div
                    v-else
                    class="text-body-2 text-disabled py-4"
                  >
                    No individual buildings. A package is priced as one resource.
                  </div>
                </VCardText>
              </VWindowItem>

              <!-- History: every submit and decision, newest last -->
              <VWindowItem value="history">
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
                      <div class="d-flex justify-space-between flex-wrap gap-2">
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
                        <span class="text-disabled">· {{ roleLabel(event.actor_role) }}</span>
                      </div>
                      <div
                        v-if="event.comment"
                        class="text-body-2 font-italic mt-1"
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
              </VWindowItem>
            </VWindow>
          </VCard>
        </VCol>

        <VCol
          cols="12"
          md="4"
        >
          <PricingSummary
            :pricing="pricing"
            :discount="quotation.discount"
            :tax-rate="quotation.tax_rate"
            :approval="approval"
            :sections="quotation.selections"
            :loading="isDraft && store.isPreviewing"
            :estimate="isDraft"
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
            The sales owner will see this reason at the top of the quotation and can edit
            and resubmit. A reason is required.
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
            variant="elevated"
            :loading="store.isSubmitting"
            @click="doReturn"
          >
            Return
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Approving ends the approval; say what is being signed off before it happens. -->
    <VDialog
      v-model="approveDialog"
      max-width="460"
    >
      <VCard v-if="quotation">
        <VCardTitle>Approve {{ quotation.quote_number }}?</VCardTitle>
        <VCardText>
          {{ quotation.customer_name }} · {{ quotation.brand_name }} at a
          {{ quotation.discount }}% discount, {{ pricing ? formatIdr(pricing.total_including_tax) : '' }}
          including VAT. The sales owner can then send it to the customer.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            @click="approveDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="success"
            variant="elevated"
            :loading="store.isSubmitting"
            @click="approve"
          >
            Approve
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- A draft has no approval record, so deleting it loses only the draft itself. -->
    <VDialog
      v-model="deleteDialog"
      max-width="440"
    >
      <VCard v-if="quotation">
        <VCardTitle>Delete draft</VCardTitle>
        <VCardText>
          Delete draft "<strong>{{ quotation.quote_number }}</strong>" for
          {{ quotation.customer_name }}? This cannot be undone.
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
            variant="elevated"
            :loading="isDeleting"
            @click="doDelete"
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
  </div>
</template>

<style scoped>
.detail-meta {
  padding-inline-start: 48px;
}

.approval-track {
  display: grid;
  overflow-x: auto;
  padding-block: 16px;
  padding-inline: 16px;
  grid-template-columns: repeat(5, minmax(110px, 1fr));
}

.approval-track__step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-inline: 4px;
  gap: 2px;
  text-align: center;
}

/* The line into each step, drawn from the previous step's dot. */
.approval-track__step::before {
  position: absolute;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  block-size: 2px;
  content: "";
  inline-size: 100%;
  inset-block-start: 12px;
  inset-inline-end: 50%;
}

.approval-track__step--first::before {
  display: none;
}

.approval-track__step--done::before,
.approval-track__step--current::before,
.approval-track__step--returned::before {
  background: rgb(var(--v-theme-success));
}

.approval-track__dot {
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.approval-track__step--skipped {
  opacity: 0.45;
}

.decision-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.decision-kpi {
  display: flex;
  flex-direction: column;
  padding-block: 10px;
  padding-inline: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
}

.detail-dl {
  display: grid;
  margin: 0;
  font-size: 0.875rem;
  gap: 6px 16px;
  grid-template-columns: 130px minmax(0, 1fr);
}

.detail-dl dt {
  opacity: 0.7;
}

.detail-dl dd {
  margin: 0;
}

/* A phone: actions share full-width rows, and the tracker reads top to bottom. */
@media (max-width: 600px) {
  .detail-meta {
    padding-inline-start: 0;
  }

  .detail-actions {
    inline-size: 100%;
  }

  .detail-actions .v-btn {
    flex: 1 1 auto;
  }

  .approval-track {
    gap: 10px;
    grid-template-columns: 1fr;
  }

  .approval-track__step {
    display: grid;
    align-items: center;
    column-gap: 10px;
    grid-template-columns: 26px minmax(0, 1fr);
    text-align: start;
  }

  .approval-track__step::before {
    display: none;
  }

  .approval-track__dot {
    grid-row: span 2;
  }
}
</style>
