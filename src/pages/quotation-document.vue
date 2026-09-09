<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useQuotationStore } from '@/stores/quotation'
import {
  COMPANY,
  INVOICING_DOCUMENTS,
  PAYMENT_TERMS,
  TERMS_AND_CONDITIONS,
  launchDeadlineNote,
} from '@/config/quotationDocument'
import { formatIdr } from '@/types/quotation'

const route = useRoute()
const router = useRouter()
const store = useQuotationStore()

const quotation = computed(() => store.currentItem)

onMounted(() => store.fetchById(Number(route.params.id)).catch(() => null))
onUnmounted(() => store.clearCurrent())

const placement = computed(() => quotation.value?.selections.find(s => s.kind === 'placement'))
const bonus = computed(() => quotation.value?.selections.find(s => s.kind === 'bonus'))

const formatDate = (value: string) => {
  if (!value)
    return '—'

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

// The document sums both lines' durations, as the source template does. It is a
// display total, not a campaign length: placement and bonus run concurrently.
const totalWeeks = computed(() =>
  (placement.value?.weeks ?? 0) + (bonus.value?.weeks ?? 0))

const selectionLabel = (kind: 'placement' | 'bonus') => {
  const selection = kind === 'placement' ? placement.value : bonus.value
  if (!selection)
    return '—'

  return selection.mode === 'package'
    ? selection.sales_package_name
    : `${selection.items.length} building${selection.items.length === 1 ? '' : 's'}`
}

// The approval flag the source template shows beside the total discount.
const needsApproval = computed(() => (quotation.value?.discount ?? 0) > 0)

const print = () => window.print()
</script>

<template>
  <div>
    <!-- Toolbar. Hidden when printing so the page prints as the document alone. -->
    <div class="d-print-none d-flex align-center gap-2 mb-4">
      <VBtn
        icon
        variant="text"
        @click="router.back()"
      >
        <VIcon icon="ri-arrow-left-s-line" />
      </VBtn>
      <span class="text-h5">Quotation document</span>
      <VSpacer />
      <VBtn
        color="primary"
        :disabled="!quotation"
        @click="print"
      >
        <VIcon
          icon="ri-printer-line"
          class="me-1"
        />
        Print / Save as PDF
      </VBtn>
    </div>

    <VProgressLinear
      v-if="!quotation"
      indeterminate
      class="d-print-none"
    />

    <div
      v-if="quotation"
      class="quotation-doc"
    >
      <!-- Letterhead -->
      <header class="doc-head">
        <div>
          <div class="doc-company">
            {{ COMPANY.name }}
          </div>
          <div
            v-for="line in COMPANY.addressLines"
            :key="line"
            class="doc-muted"
          >
            {{ line }}
          </div>
          <div class="doc-muted">
            {{ COMPANY.phone }} | {{ COMPANY.email }}
          </div>
        </div>
        <div class="doc-head__right">
          <div class="doc-title">
            QUOTATION
          </div>
          <div class="doc-muted">
            Saving Value
          </div>
          <div class="doc-saving">
            {{ formatIdr(quotation.pricing.effective_discount_amount) }}
          </div>
        </div>
      </header>

      <!-- Two-column party block, as on the template -->
      <section class="doc-parties">
        <table class="doc-kv">
          <tbody>
            <tr>
              <td>Date Prepared</td>
              <td>{{ formatDate(quotation.created_at) }}</td>
            </tr>
            <tr>
              <td>Validation Date</td>
              <td>{{ formatDate(quotation.valid_until) }}</td>
            </tr>
            <tr>
              <td>Sales Person</td>
              <td>{{ quotation.sales_name || '—' }}</td>
            </tr>
            <tr>
              <td>No. Quotation</td>
              <td>{{ quotation.quote_number }}</td>
            </tr>
            <tr>
              <td>Campaign Plan</td>
              <td>{{ quotation.campaign_year || '—' }}</td>
            </tr>
          </tbody>
        </table>

        <table class="doc-kv">
          <tbody>
            <tr>
              <td>Attention To</td>
              <td>{{ quotation.attention_to || '—' }}</td>
            </tr>
            <tr>
              <td>Job Title</td>
              <td>{{ quotation.job_title || '—' }}</td>
            </tr>
            <tr>
              <td>Company Name</td>
              <td>{{ quotation.customer_name }}</td>
            </tr>
            <tr>
              <td>Brand Name</td>
              <td>{{ quotation.brand_name }}</td>
            </tr>
            <tr>
              <td>Handphone</td>
              <td>{{ quotation.contact_phone || '—' }}</td>
            </tr>
            <tr>
              <td>Email</td>
              <td>{{ quotation.contact_email || '—' }}</td>
            </tr>
          </tbody>
        </table>

        <div class="doc-discount">
          <div class="doc-muted">
            Total Discount
          </div>
          <div class="doc-discount__value">
            {{ quotation.pricing.effective_discount_rate.toFixed(2) }}%
          </div>
          <div
            v-if="needsApproval"
            class="doc-flag"
          >
            NEED APPROVAL!
          </div>
        </div>
      </section>

      <!-- Line items: one row per selection, exactly the template's two lines -->
      <table class="doc-lines">
        <thead>
          <tr>
            <th />
            <th>TVC Duration</th>
            <th>Spot/Day/Screen</th>
            <th>Campaign Duration (Weeks)</th>
            <th class="num">
              Gross Rate / Week
            </th>
            <th class="num">
              Total Gross
            </th>
            <th class="num">
              Discount
            </th>
            <th class="num">
              Total Nett
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="placement">
            <!--
              The template shows a count here ("950") but nothing labels what it
              counts, and our value is one-per-building, which is wrong for 85% of
              buildings. Not printed until the business says what it should be.
              See backend/docs/QUOTATION_DOCUMENT_ANALYSIS.md §4.2.
            -->
            <td>
              <strong>{{ selectionLabel('placement') }}</strong>
            </td>
            <td>{{ placement.tvc_duration_seconds }} Secs</td>
            <td>{{ placement.spots }} Spot</td>
            <td>{{ placement.weeks }} Weeks</td>
            <td class="num">
              {{ formatIdr(placement.gross_price_per_week) }}
            </td>
            <td class="num">
              {{ formatIdr(placement.gross_price) }}
            </td>
            <td class="num">
              {{ quotation.discount }}%
            </td>
            <td class="num">
              {{ formatIdr(quotation.pricing.placement_net) }}
            </td>
          </tr>

          <tr v-if="bonus">
            <td>
              <strong>Bonus</strong>
              <div class="doc-muted">
                {{ selectionLabel('bonus') }}
              </div>
            </td>
            <td>{{ bonus.tvc_duration_seconds }} Secs</td>
            <td>{{ bonus.spots }} Spot</td>
            <td>{{ bonus.weeks }} Weeks</td>
            <td class="num">
              {{ formatIdr(bonus.gross_price_per_week) }}
            </td>
            <td class="num">
              {{ formatIdr(bonus.gross_price) }}
            </td>
            <td class="num">
              FREE
            </td>
            <td class="num">
              FREE
            </td>
          </tr>

          <tr class="doc-lines__total">
            <td>TOTAL</td>
            <td colspan="2" />
            <td>{{ totalWeeks }} Weeks</td>
            <td />
            <td class="num">
              {{ formatIdr(quotation.pricing.total_gross) }}
            </td>
            <td />
            <td class="num">
              {{ formatIdr(quotation.pricing.total_net) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Terms on the left, money on the right, as on the template -->
      <section class="doc-foot">
        <div>
          <div class="doc-subtitle">
            Terms &amp; Conditions :
          </div>
          <ol class="doc-terms">
            <li
              v-for="(clause, index) in TERMS_AND_CONDITIONS"
              :key="index"
            >
              {{ clause }}
            </li>
          </ol>
        </div>

        <div class="doc-totals">
          <table class="doc-kv">
            <tbody>
              <tr>
                <td>Total Nett</td>
                <td class="num">
                  {{ formatIdr(quotation.pricing.total_net) }}
                </td>
              </tr>
              <tr>
                <td>VAT</td>
                <td class="num">
                  {{ formatIdr(quotation.pricing.tax) }}
                </td>
              </tr>
              <tr class="doc-totals__grand">
                <td>Total (VAT included)</td>
                <td class="num">
                  {{ formatIdr(quotation.pricing.total_including_tax) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="doc-sign">
            <div class="doc-muted">
              Approved by:
            </div>
            <div class="doc-sign__line" />
          </div>
        </div>
      </section>

      <section class="doc-foot">
        <div>
          <div class="doc-subtitle">
            Terms Of Payment :
          </div>
          <ul class="doc-terms">
            <li
              v-for="(term, index) in PAYMENT_TERMS"
              :key="index"
            >
              {{ term }}
            </li>
          </ul>
          <p class="doc-muted">
            {{ launchDeadlineNote(quotation.campaign_year) }}
          </p>
        </div>

        <div>
          <div class="doc-subtitle">
            Documents needed for Invoicing :
          </div>
          <ul class="doc-terms">
            <li
              v-for="doc in INVOICING_DOCUMENTS"
              :key="doc"
            >
              {{ doc }}
            </li>
          </ul>
        </div>
      </section>

      <footer class="doc-muted doc-ref">
        {{ quotation.quote_number }} · version {{ quotation.version }} ·
        priced against rate card {{ quotation.rate_card_version_code || '—' }}
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Sized for A4 so the on-screen preview matches what comes out of the printer. */
.quotation-doc {
  background: #fff;
  color: #000;
  padding: 18mm;
  max-inline-size: 210mm;
  margin-inline: auto;
  font-size: 11px;
  line-height: 1.45;
}

.doc-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-block-end: 2px solid #000;
  padding-block-end: 8px;
}

.doc-company { font-size: 15px; font-weight: 700; letter-spacing: 0.02em; }
.doc-title { font-size: 20px; font-weight: 700; text-align: end; }
.doc-head__right { text-align: end; }
.doc-saving { font-size: 15px; font-weight: 700; }
.doc-muted { color: #555; }

.doc-parties {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 16px;
  margin-block: 12px;
}

.doc-kv { inline-size: 100%; border-collapse: collapse; }
.doc-kv td { padding: 2px 4px; vertical-align: top; }
.doc-kv td:first-child { color: #555; inline-size: 42%; }

.doc-discount { text-align: end; }
.doc-discount__value { font-size: 18px; font-weight: 700; }
.doc-flag { color: #b00020; font-weight: 700; }

.doc-lines { inline-size: 100%; border-collapse: collapse; margin-block: 10px; }
.doc-lines th,
.doc-lines td { border: 1px solid #999; padding: 5px 6px; vertical-align: top; }
.doc-lines th { background: #eee; font-size: 10px; text-align: start; }
.doc-lines .num { text-align: end; white-space: nowrap; }
.doc-lines__total { font-weight: 700; background: #f6f6f6; }

.doc-foot {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
  margin-block-start: 12px;
}

.doc-subtitle { font-weight: 700; margin-block-end: 4px; }
.doc-terms { margin: 0; padding-inline-start: 24px; }
.doc-terms li { margin-block-end: 3px; }

.doc-totals__grand { font-weight: 700; border-block-start: 1px solid #000; }
.doc-sign { margin-block-start: 28px; }
.doc-sign__line { border-block-end: 1px solid #000; block-size: 40px; }
.doc-ref { margin-block-start: 16px; text-align: center; font-size: 9px; }

@media print {
  .quotation-doc { padding: 0; max-inline-size: none; }

  /*
    Chrome ships with "Background graphics" OFF, which would silently drop the table
    header shading, the total row and the NEED APPROVAL flag -- the document would
    print looking unfinished. Force them.
  */
  .quotation-doc,
  .quotation-doc * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /*
    Without these the browser is free to slice through a line item, a clause or the
    totals, which is where the cut words and half-drawn borders come from. The table
    may still break BETWEEN rows -- it has to, it is 1500 buildings long in the
    worst case -- but never through one.
  */
  .doc-lines tr,
  .doc-kv tr,
  .doc-terms li { break-inside: avoid; }

  .doc-head,
  .doc-parties,
  .doc-totals,
  .doc-sign { break-inside: avoid; }

  /* A heading stranded at the foot of a page with its list overleaf. */
  .doc-subtitle { break-after: avoid; }

  /* If the line items do run over, repeat the column headers on the next page. */
  .doc-lines thead { display: table-header-group; }

  /* No single dangling line of a paragraph. */
  .quotation-doc p,
  .doc-terms li {
    orphans: 3;
    widows: 3;
  }

  /*
    The layout's background printed as a grey band under the document, because the
    app wrapper fills the viewport and the document does not. Paper is white.
  */
  :global(html),
  :global(body),
  :global(.v-application),
  :global(.v-application__wrap) { background: #fff !important; }

  @page { size: A4; margin: 12mm; }
}
</style>
