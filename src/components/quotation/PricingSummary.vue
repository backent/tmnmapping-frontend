<script setup lang="ts">
import { formatIdr } from '@/types/quotation'
import type { ApprovalHint, Pricing, Selection } from '@/types/quotation'

/**
 * The live pricing ledger, mirroring the reference app's sticky summary aside:
 * the same rows in the same order, an audience block, and an approval strip
 * toned by discount band.
 *
 * Every figure comes from the server. Recomputing them here would create a second
 * source of truth that could disagree with what is actually charged.
 */
const props = defineProps<{
  pricing: Pricing | null
  discount: number
  taxRate: number
  approval: ApprovalHint | null
  sections: Selection[]
  loading?: boolean
}>()

const bandTone = computed(() => {
  switch (props.approval?.band) {
    case 'executive': return 'error'
    case 'elevated': return 'warning'
    default: return 'success'
  }
})

const bandLabel = computed(() => {
  switch (props.approval?.band) {
    case 'executive': return 'Executive approval'
    case 'elevated': return 'Elevated approval'
    default: return 'Standard approval'
  }
})

const roleLabel = (role: string) => ({
  head_of_sales: 'Head of Sales',
  head_of_business_control: 'Head of Business Control',
  ceo: 'CEO',
}[role] ?? role)

const placement = computed(() => props.sections.find(s => s.kind === 'placement'))
const bonus = computed(() => props.sections.find(s => s.kind === 'bonus'))
</script>

<template>
  <VCard
    class="position-sticky"
    style="top: 88px"
  >
    <VCardTitle class="d-flex align-center justify-space-between">
      <span class="text-subtitle-1">Live pricing</span>
      <VProgressCircular
        v-if="loading"
        indeterminate
        size="18"
        width="2"
      />
    </VCardTitle>

    <VCardText v-if="!pricing">
      <div class="text-body-2 text-disabled">
        Choose a placement to see pricing. Rates come from the published rate card.
      </div>
    </VCardText>

    <template v-else>
      <VCardText class="py-2">
        <VTable density="compact">
          <tbody>
            <tr>
              <td class="text-body-2">
                Placement gross
              </td>
              <td class="text-end">
                {{ formatIdr(pricing.placement_gross) }}
              </td>
            </tr>
            <tr>
              <td class="text-body-2">
                Discount ({{ discount }}%)
              </td>
              <td class="text-end text-error">
                − {{ formatIdr(pricing.placement_discount_amount) }}
              </td>
            </tr>
            <tr>
              <td class="text-body-2 font-weight-medium">
                Placement nett
              </td>
              <td class="text-end font-weight-medium">
                {{ formatIdr(pricing.placement_net) }}
              </td>
            </tr>
            <tr>
              <td class="text-body-2">
                Bonus gross
              </td>
              <td class="text-end">
                {{ formatIdr(pricing.bonus_gross) }}
              </td>
            </tr>
            <tr>
              <!-- Bonus is always free. It still counts toward gross, which is what
                   pushes the effective rate above the customer discount. -->
              <td class="text-body-2">
                Bonus nett
              </td>
              <td class="text-end text-success font-weight-medium">
                FREE
              </td>
            </tr>
            <tr>
              <td class="text-body-2">
                Total gross
              </td>
              <td class="text-end">
                {{ formatIdr(pricing.total_gross) }}
              </td>
            </tr>
            <tr>
              <td class="text-body-2 font-weight-medium">
                Total nett
              </td>
              <td class="text-end font-weight-medium">
                {{ formatIdr(pricing.total_net) }}
              </td>
            </tr>
            <tr>
              <td class="text-body-2">
                Effective discount
                <VTooltip
                  activator="parent"
                  location="top"
                  max-width="280"
                >
                  Includes the value of the free bonus, so it reads higher than the
                  customer discount. Analytics only — it does not decide the approver.
                </VTooltip>
              </td>
              <td class="text-end">
                {{ pricing.effective_discount_rate.toFixed(2) }}%
              </td>
            </tr>
            <tr>
              <td class="text-body-2">
                VAT ({{ (taxRate * 100).toFixed(0) }}% of nett)
              </td>
              <td class="text-end">
                {{ formatIdr(pricing.tax) }}
              </td>
            </tr>
            <tr>
              <td class="text-body-1 font-weight-bold">
                Total incl. VAT
              </td>
              <td class="text-end text-body-1 font-weight-bold">
                {{ formatIdr(pricing.total_including_tax) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>

      <VDivider />

      <VCardText
        v-if="placement || bonus"
        class="py-3"
      >
        <div
          v-for="row in [
            { label: 'Placement', selection: placement },
            { label: 'Bonus', selection: bonus },
          ].filter(r => r.selection)"
          :key="row.label"
          class="mb-2"
        >
          <div class="text-caption text-disabled">
            {{ row.label }}
          </div>
          <!--
            screen_count is deliberately not shown. Nothing confirms it is a real
            figure, and in building mode it is derived as one per building, which the
            rate card shows undercounts by 79%. See
            backend/docs/QUOTATION_DOCUMENT_ANALYSIS.md §4.2.
          -->
          <div class="text-body-2">
            {{ row.selection!.traffic.toLocaleString() }} traffic ·
            {{ row.selection!.impressions.toLocaleString() }} impressions
          </div>
        </div>
      </VCardText>

      <VDivider />

      <!-- Approval strip. Label carries the meaning, not colour alone. -->
      <VCardText v-if="approval">
        <VAlert
          :type="approval.resolvable ? 'info' : 'warning'"
          :color="approval.resolvable ? bandTone : undefined"
          variant="tonal"
          density="compact"
        >
          <div class="text-caption">
            {{ bandLabel }}
          </div>
          <div class="font-weight-medium">
            {{ roleLabel(approval.approver_role) }}
            <span v-if="approval.approver_name"> · {{ approval.approver_name }}</span>
          </div>
          <div
            v-if="!approval.resolvable"
            class="text-caption mt-1"
          >
            {{ approval.reason }}
          </div>
        </VAlert>
      </VCardText>
    </template>
  </VCard>
</template>
