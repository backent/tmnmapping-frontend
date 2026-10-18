<script setup lang="ts">
import { APPROVAL_BANDS, APPROVER_ROLE_LABELS, formatIdr } from '@/types/quotation'
import { formatVatPercent } from '@/utils/vat'
import type { ApprovalHint, Pricing, Selection } from '@/types/quotation'

/**
 * The pricing ledger beside the wizard and the detail page.
 *
 * The figure the customer pays leads, then the lines that make it up, grouped so it
 * is clear the discount applies to Placement only and Bonus is free. The approval
 * block names the band and its range in words, so the colour is never the only
 * signal.
 *
 * Every figure comes from the server. Recomputing them here would create a second
 * source of truth that could disagree with what is actually charged.
 */
const props = withDefaults(defineProps<{
  pricing: Pricing | null
  discount: number
  taxRate: number
  approval: ApprovalHint | null
  sections: Selection[]
  loading?: boolean

  /** The figures come from a preview, not from a submit, so they may still change. */
  estimate?: boolean

  /** Stick below the app bar while the page scrolls. Off inside a bottom sheet. */
  sticky?: boolean
}>(), { sticky: true })

const band = computed(() => APPROVAL_BANDS[props.approval?.band ?? ''] ?? null)

const roleLabel = (role: string) => APPROVER_ROLE_LABELS[role] ?? role

// What each line holds, under its heading: "42 buildings" or the package name.
const describe = (kind: 'placement' | 'bonus') => {
  const section = props.sections.find(s => s.kind === kind)
  if (!section)
    return ''
  if (section.mode === 'package')
    return section.sales_package_name

  const n = section.items.length

  return `${n} building${n === 1 ? '' : 's'}`
}

const hasBonus = computed(() =>
  !!props.pricing?.bonus_gross || props.sections.some(s => s.kind === 'bonus'))
</script>

<template>
  <VCard
    :class="{ 'position-sticky': sticky }"
    :style="sticky ? 'top: 88px' : undefined"
  >
    <VCardTitle class="d-flex align-center">
      <span class="text-subtitle-1">Pricing</span>
      <VChip
        v-if="estimate && pricing"
        size="small"
        variant="tonal"
        color="secondary"
        class="ms-2"
      >
        Estimate
      </VChip>
      <VSpacer />
      <VProgressCircular
        v-if="loading"
        indeterminate
        size="18"
        width="2"
      />
    </VCardTitle>

    <VCardText v-if="!pricing">
      <div class="text-body-2 text-disabled">
        Choose a placement to see pricing. Rates come from the published prices.
      </div>
    </VCardText>

    <template v-else>
      <!-- What the customer pays, first. -->
      <VCardText class="pb-3">
        <div class="text-caption text-disabled">
          Total incl. VAT {{ formatVatPercent(taxRate) }}%
        </div>
        <div class="text-h5 font-weight-bold pricing-num">
          {{ formatIdr(pricing.total_including_tax) }}
        </div>
        <div
          v-if="estimate"
          class="text-caption text-disabled"
        >
          Priced at today's rates. The final figures are set when it is submitted.
        </div>
      </VCardText>

      <VDivider />

      <VCardText class="py-3">
        <div class="pricing-group-head">
          Placement
          <span
            v-if="describe('placement')"
            class="text-none"
          >· {{ describe('placement') }}</span>
        </div>
        <div class="pricing-line">
          <span>Gross</span>
          <span>{{ formatIdr(pricing.placement_gross) }}</span>
        </div>
        <div class="pricing-line">
          <span>Discount {{ discount }}%</span>
          <span class="text-error">− {{ formatIdr(pricing.placement_discount_amount) }}</span>
        </div>
        <div class="pricing-line font-weight-medium">
          <span>Nett</span>
          <span>{{ formatIdr(pricing.placement_net) }}</span>
        </div>
      </VCardText>

      <template v-if="hasBonus">
        <VDivider />
        <VCardText class="py-3">
          <!--
            Bonus is always free. It still counts toward gross, which is what
            pushes the effective rate above the customer discount.
          -->
          <div class="pricing-group-head">
            Bonus
            <span
              v-if="describe('bonus')"
              class="text-none"
            >· {{ describe('bonus') }}</span>
          </div>
          <div class="pricing-line">
            <span>Gross</span>
            <span>{{ formatIdr(pricing.bonus_gross) }}</span>
          </div>
          <div class="pricing-line font-weight-medium">
            <span>Nett</span>
            <span class="text-success">FREE</span>
          </div>
        </VCardText>
      </template>

      <VDivider />

      <VCardText class="py-3">
        <div class="pricing-group-head">
          Totals
        </div>
        <div class="pricing-line">
          <span>Total gross</span>
          <span>{{ formatIdr(pricing.total_gross) }}</span>
        </div>
        <div class="pricing-line font-weight-medium">
          <span>Total nett</span>
          <span>{{ formatIdr(pricing.total_net) }}</span>
        </div>
        <div class="pricing-line">
          <span>VAT {{ formatVatPercent(taxRate) }}% of nett</span>
          <span>{{ formatIdr(pricing.tax) }}</span>
        </div>
        <div class="pricing-line text-disabled">
          <span>
            Effective discount
            <VIcon
              icon="ri-information-line"
              size="14"
            />
            <VTooltip
              activator="parent"
              location="top"
              max-width="280"
            >
              Includes the value of the free bonus, so it reads higher than the
              customer discount. Analytics only — it does not decide the approver.
            </VTooltip>
          </span>
          <span>{{ pricing.effective_discount_rate.toFixed(2) }}%</span>
        </div>
      </VCardText>

      <!-- Approval block. The band's name and range carry the meaning, not the tint. -->
      <VCardText
        v-if="approval"
        class="pt-0"
      >
        <VAlert
          :type="approval.resolvable ? 'info' : 'warning'"
          :color="approval.resolvable ? band?.color : undefined"
          variant="tonal"
          density="compact"
        >
          <div
            v-if="band"
            class="text-caption"
          >
            {{ band.label }} · {{ band.range }}
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

<style scoped>
.pricing-group-head {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  margin-block-end: 4px;
  opacity: 0.7;
  text-transform: uppercase;
}

.pricing-group-head .text-none {
  letter-spacing: normal;
  text-transform: none;
}

.pricing-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  gap: 12px;
  line-height: 1.9;
}

.pricing-num {
  font-variant-numeric: tabular-nums;
}
</style>
