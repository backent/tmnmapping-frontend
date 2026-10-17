<script setup lang="ts">
import { APPROVAL_BANDS, APPROVER_ROLE_LABELS, formatIdrCompact } from '@/types/quotation'
import type { ApprovalHint, Pricing } from '@/types/quotation'

/**
 * The pricing card, folded into a bar for a phone.
 *
 * On a narrow screen the card would sit below the whole form, out of sight while the
 * seller picks buildings. This keeps the total and the approver in view; tapping it
 * opens the full card. The step's actions sit in the default slot, so Next stays in
 * thumb reach.
 */
const props = defineProps<{
  pricing: Pricing | null
  approval: ApprovalHint | null
  loading?: boolean
}>()

defineEmits<{ open: [] }>()

const band = computed(() => APPROVAL_BANDS[props.approval?.band ?? ''] ?? null)
</script>

<template>
  <div class="pricing-bar">
    <button
      type="button"
      class="pricing-bar__summary"
      aria-label="Show full pricing"
      @click="$emit('open')"
    >
      <span class="text-caption text-disabled d-flex align-center gap-1">
        Total incl. VAT
        <VIcon
          icon="ri-arrow-up-s-line"
          size="16"
        />
        <VProgressCircular
          v-if="loading"
          indeterminate
          size="12"
          width="2"
        />
      </span>
      <span class="text-subtitle-1 font-weight-bold">
        {{ pricing ? formatIdrCompact(pricing.total_including_tax) : '—' }}
      </span>
      <span
        v-if="approval"
        class="text-caption d-flex align-center gap-1"
      >
        <VIcon
          icon="ri-circle-fill"
          size="8"
          :color="band?.color"
        />
        {{ APPROVER_ROLE_LABELS[approval.approver_role] ?? approval.approver_role }}
      </span>
    </button>
    <div class="d-flex gap-2">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.pricing-bar {
  position: sticky;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-block: 10px calc(10px + env(safe-area-inset-bottom, 0px));
  padding-inline: 16px;
  margin-inline: -16px;
  background: rgb(var(--v-theme-surface));
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  box-shadow: 0 -4px 14px rgba(0, 0, 0, 8%);
  gap: 12px;
  inset-block-end: 0;
}

.pricing-bar__summary {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-inline-size: 0;
  text-align: start;
}
</style>
