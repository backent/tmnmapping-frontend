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

const route = useRoute()
const router = useRouter()
const store = useQuotationStore()

const quotation = computed(() => store.currentItem)

onMounted(() => store.fetchById(Number(route.params.id)).catch(() => null))
onUnmounted(() => store.clearCurrent())

const placement = computed(() => quotation.value?.selections.find(s => s.kind === 'placement'))
const bonus = computed(() => quotation.value?.selections.find(s => s.kind === 'bonus'))

// The template writes money as a left-aligned "IDR" against a right-aligned number,
// grouped with commas. formatIdr renders "Rp 1.700.000", which is the app's
// convention, not this document's.
const amount = (value: number) => new Intl.NumberFormat('en-US').format(value ?? 0)

const formatDate = (value: string) => {
  if (!value)
    return ''

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

// The template sums both lines' durations. It is a display total, not a campaign
// length: placement and bonus run concurrently.
const totalWeeks = computed(() =>
  (placement.value?.weeks ?? 0) + (bonus.value?.weeks ?? 0))

// The template heads the first column with the package name and fills the cell with
// a count over a type ("950 / Apartment"). We do not print a screen count -- see
// QUOTATION_DOCUMENT_ANALYSIS.md §4.2 -- so a building selection reports how many
// buildings it covers, which is a figure we can stand behind.
const columnHead = (kind: 'placement' | 'bonus') => {
  const selection = kind === 'placement' ? placement.value : bonus.value
  if (!selection)
    return kind === 'placement' ? 'Placement' : 'Bonus'

  return selection.mode === 'package'
    ? selection.sales_package_name || 'Package'
    : (kind === 'placement' ? 'Placement' : 'Bonus')
}

const countLine = (kind: 'placement' | 'bonus') => {
  const selection = kind === 'placement' ? placement.value : bonus.value
  if (!selection || selection.mode === 'package')
    return ''

  const n = selection.items.length

  return `${n} building${n === 1 ? '' : 's'}`
}

const typeLine = (kind: 'placement' | 'bonus') => {
  const selection = kind === 'placement' ? placement.value : bonus.value
  if (!selection || selection.mode === 'package')
    return ''

  const types = [...new Set(selection.items.map(i => i.building_type).filter(Boolean))]

  return types.length > 2 ? `${types.slice(0, 2).join(', ')} +${types.length - 2}` : types.join(', ')
}

const needsApproval = computed(() => (quotation.value?.discount ?? 0) > 0)

const print = () => window.print()
</script>

<template>
  <div>
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
      class="qd"
    >
      <!--
        Letterhead. The template carries the TMN mark and the Focus Media Group
        and Sinarmas partner marks; none of those asset files exist in this
        project, so the slot is left for them rather than faked.
      -->
      <header class="qd-head">
        <div class="qd-head__brand">
          <div class="qd-logo-slot" />
          <div>
            <div class="qd-company">
              {{ COMPANY.name }}
            </div>
            <div
              v-for="line in COMPANY.addressLines"
              :key="line"
            >
              {{ line }}
            </div>
            <div>{{ COMPANY.phone }} | {{ COMPANY.email }}</div>
          </div>
        </div>

        <div class="qd-head__partners">
          <span class="qd-muted">Member company of:</span>
          <span class="qd-partner-slot" />
        </div>

        <!-- CHECKER panel, its own bordered box on the template -->
        <div class="qd-checker">
          <div class="qd-checker__bar">
            CHECKER
          </div>
          <div class="qd-checker__body">
            <div class="qd-strong">
              Saving Value
            </div>
            <div class="qd-checker__row">
              <span>IDR</span>
              <span>{{ amount(quotation.pricing.effective_discount_amount) }}</span>
            </div>
            <div class="qd-strong mt-1">
              Total Discount
            </div>
            <div class="qd-checker__pct">
              {{ quotation.pricing.effective_discount_rate.toFixed(2) }}%
            </div>
          </div>
          <div
            v-if="needsApproval"
            class="qd-checker__flag"
          >
            NEED APPROVAL!
          </div>
        </div>
      </header>

      <!-- Title and both parties inside one bordered box -->
      <section class="qd-box qd-parties">
        <div class="qd-title">
          QUOTATION
        </div>

        <table class="qd-kv">
          <tbody>
            <tr>
              <td>Date Prepared:</td>
              <td>{{ formatDate(quotation.created_at) }}</td>
            </tr>
            <tr>
              <td>Validation Date :</td>
              <td>{{ formatDate(quotation.valid_until) }}</td>
            </tr>
            <tr>
              <td>Sales Person:</td>
              <td>{{ quotation.sales_name }}</td>
            </tr>
            <tr>
              <td>Team:</td>
              <td />
            </tr>
            <tr>
              <td>No. HP:</td>
              <td />
            </tr>
            <tr>
              <td>Email:</td>
              <td />
            </tr>
            <tr>
              <td class="qd-strong">
                No. Quotation:
              </td>
              <td class="qd-strong">
                {{ quotation.quote_number }}
              </td>
            </tr>
          </tbody>
        </table>

        <table class="qd-kv qd-kv--right">
          <tbody>
            <tr>
              <td>Attention To:</td>
              <td>{{ quotation.attention_to }}</td>
            </tr>
            <tr>
              <td>Job Title:</td>
              <td>{{ quotation.job_title }}</td>
            </tr>
            <tr>
              <td>Company Name:</td>
              <td>{{ quotation.customer_name }}</td>
            </tr>
            <tr>
              <td>Brand Name:</td>
              <td>{{ quotation.brand_name }}</td>
            </tr>
            <tr>
              <td>Handphone:</td>
              <td>{{ quotation.contact_phone }}</td>
            </tr>
            <tr>
              <td>Email:</td>
              <td>{{ quotation.contact_email }}</td>
            </tr>
            <tr>
              <td class="qd-strong">
                Campaign Plan :
              </td>
              <td class="qd-strong">
                {{ quotation.campaign_year }}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Placement, its own table with a blue header -->
      <table
        v-if="placement"
        class="qd-lines"
      >
        <thead>
          <tr class="qd-lines__head--placement">
            <th>{{ columnHead('placement') }}</th>
            <th>TVC Duration</th>
            <th>Spot/Day/Screen</th>
            <th>Campaign Duration (Weeks)</th>
            <th>Gross Rate / Week</th>
            <th>Total Gross</th>
            <th>Discount</th>
            <th>Total Nett</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="qd-c">
              <div>{{ countLine('placement') }}</div>
              <div>{{ typeLine('placement') }}</div>
            </td>
            <td class="qd-c">
              {{ placement.tvc_duration_seconds }} Secs
            </td>
            <td class="qd-c">
              {{ placement.spots }} Spot
            </td>
            <td class="qd-c">
              {{ placement.weeks }} Weeks
            </td>
            <td class="qd-money">
              <span>IDR</span><span>{{ amount(placement.gross_price_per_week) }}</span>
            </td>
            <td class="qd-money">
              <span>IDR</span><span>{{ amount(placement.gross_price) }}</span>
            </td>
            <td class="qd-c">
              {{ quotation.discount }}%
            </td>
            <td class="qd-money">
              <span>IDR</span><span>{{ amount(quotation.pricing.placement_net) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Bonus, its own table with a peach header, then the shared TOTAL row -->
      <table class="qd-lines qd-lines--bonus">
        <thead v-if="bonus">
          <tr class="qd-lines__head--bonus">
            <th>{{ columnHead('bonus') }}</th>
            <th>TVC Duration</th>
            <th>Spot/Day/Screen</th>
            <th>Campaign Duration (Weeks)</th>
            <th>Gross Rate / Week</th>
            <th>Total Gross</th>
            <th>Discount</th>
            <th>Total Nett</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="bonus">
            <td class="qd-c">
              <div>{{ countLine('bonus') }}</div>
              <div>{{ typeLine('bonus') }}</div>
            </td>
            <td class="qd-c">
              {{ bonus.tvc_duration_seconds }} Secs
            </td>
            <td class="qd-c">
              {{ bonus.spots }} Spot
            </td>
            <td class="qd-c">
              {{ bonus.weeks }} Weeks
            </td>
            <td class="qd-money">
              <span>IDR</span><span>{{ amount(bonus.gross_price_per_week) }}</span>
            </td>
            <td class="qd-money">
              <span>IDR</span><span>{{ amount(bonus.gross_price) }}</span>
            </td>
            <td class="qd-c qd-italic">
              FREE
            </td>
            <td class="qd-c">
              FREE
            </td>
          </tr>
          <tr class="qd-total">
            <td
              class="qd-c qd-strong"
              colspan="3"
            >
              TOTAL
            </td>
            <td class="qd-c qd-hl">
              <strong>{{ totalWeeks }}</strong> Weeks
            </td>
            <td />
            <td class="qd-money qd-strong">
              <span>IDR</span><span>{{ amount(quotation.pricing.total_gross) }}</span>
            </td>
            <td />
            <td class="qd-money qd-strong">
              <span>IDR</span><span>{{ amount(quotation.pricing.total_net) }}</span>
            </td>
          </tr>
        </tbody>
      </table>

      <section class="qd-foot">
        <!-- Terms, payment, invoicing and finance PIC inside one bordered box -->
        <div class="qd-box qd-terms">
          <div class="qd-strong">
            Terms &amp; Conditions :
          </div>
          <ol class="qd-list">
            <li
              v-for="(clause, index) in TERMS_AND_CONDITIONS"
              :key="index"
            >
              {{ clause }}
            </li>
          </ol>

          <div class="qd-terms__split">
            <div>
              <div class="qd-strong">
                Terms Of Payment :
              </div>
              <div
                v-for="(term, index) in PAYMENT_TERMS"
                :key="index"
              >
                {{ term }}
              </div>
              <div>{{ launchDeadlineNote(quotation.campaign_year) }}</div>
            </div>
            <div>
              <div class="qd-strong">
                Documents needed for Invoicing :
              </div>
              <div
                v-for="doc in INVOICING_DOCUMENTS"
                :key="doc"
              >
                {{ doc }}
              </div>
            </div>
          </div>

          <!--
            On the template these are blank lines for finance to complete. We do
            not store them, so they print as the template does: labelled, empty.
          -->
          <div class="qd-strong mt-1">
            PIC Finance Department :
          </div>
          <div>Name :</div>
          <div>Email :</div>
          <div>HP :</div>
        </div>

        <div class="qd-right">
          <table class="qd-totals">
            <tbody>
              <tr>
                <td class="qd-strong">
                  Total Nett
                </td>
                <td>IDR</td>
                <td class="qd-num qd-strong">
                  {{ amount(quotation.pricing.total_net) }}
                </td>
              </tr>
              <tr>
                <td class="qd-strong">
                  VAT
                </td>
                <td>IDR</td>
                <td class="qd-num qd-strong">
                  {{ amount(quotation.pricing.tax) }}
                </td>
              </tr>
              <tr>
                <td class="qd-strong">
                  Total (VAT included)
                </td>
                <td>IDR</td>
                <td class="qd-num qd-strong">
                  {{ amount(quotation.pricing.total_including_tax) }}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="qd-sign">
            <div class="qd-strong">
              Approved by:
            </div>
            <div class="qd-sign__line" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* A4 landscape: 297x210mm, 12mm margins -> 273x186mm of content. */
.qd {
  background: #fff;
  color: #000;
  inline-size: 273mm;
  margin-inline: auto;
  padding: 4mm;
  font-family: Calibri, Carlito, "Segoe UI", sans-serif;
  font-size: 8.5px;
  line-height: 1.3;
}

.qd-muted { color: #444; }
.qd-strong { font-weight: 700; }
.qd-italic { font-style: italic; }
.qd-c { text-align: center; }
.qd-num { text-align: end; }

/* Letterhead */
.qd-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 6mm;
  align-items: start;
  margin-block-end: 2mm;
}

.qd-head__brand { display: flex; gap: 3mm; align-items: flex-start; }
.qd-logo-slot { inline-size: 22mm; block-size: 10mm; }
.qd-company { font-weight: 700; }
.qd-head__partners { display: flex; gap: 2mm; justify-content: flex-end; align-items: center; }
.qd-partner-slot { inline-size: 45mm; block-size: 8mm; }

/* CHECKER */
.qd-checker { inline-size: 52mm; border: 1px solid #000; }
.qd-checker__bar { background: #000; color: #f00; font-weight: 700; text-align: center; font-size: 8px; }
.qd-checker__body { padding: 1mm 1.5mm; }
.qd-checker__row { display: flex; justify-content: space-between; }
.qd-checker__pct { background: #ff0; text-align: center; font-weight: 700; }
.qd-checker__flag {
  background: #f00;
  color: #000;
  font-style: italic;
  font-weight: 700;
  text-align: center;
  padding-block: 0.5mm;
}

/* Party box */
.qd-box { border: 1px solid #000; padding: 2mm; }

.qd-parties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 10mm;
  align-items: start;
  margin-block-end: 3mm;
}

.qd-title { grid-column: 1 / -1; font-size: 15px; font-weight: 700; margin-block-end: 1mm; }
.qd-kv { inline-size: 100%; border-collapse: collapse; }
.qd-kv td { padding: 0.3mm 0; }
.qd-kv td:first-child { inline-size: 45%; text-align: end; padding-inline-end: 2mm; }
.qd-kv--right td:first-child { inline-size: 40%; }

/* Line items */
.qd-lines { inline-size: 100%; border-collapse: collapse; margin-block-end: 2mm; }
.qd-lines th,
.qd-lines td { border: 1px solid #000; padding: 1mm 1.5mm; }
.qd-lines th { text-align: center; font-weight: 700; }
.qd-lines__head--placement th { background: #dae9f8; }
.qd-lines__head--bonus th { background: #fce4d6; }
.qd-lines--bonus { margin-block-end: 3mm; }

/* "IDR" left, amount right, in one cell -- the template's convention */
.qd-money { }
.qd-money > span:first-child { float: inline-start; }
.qd-money > span:last-child { float: inline-end; }
.qd-money::after { content: ""; display: block; clear: both; }

.qd-hl { background: #ff0; }
.qd-total td { font-weight: 700; }

/* Lower half */
.qd-foot { display: grid; grid-template-columns: 1.35fr 1fr; gap: 6mm; align-items: start; }
.qd-list { margin: 0; padding-inline-start: 5mm; }
.qd-terms__split { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-block-start: 1.5mm; }

.qd-totals { inline-size: 100%; border-collapse: collapse; background: #dae9f8; }
.qd-totals td { border: 1px solid #000; padding: 1mm 1.5mm; }
.qd-totals td:first-child { text-align: end; }

.qd-sign { margin-block-start: 25mm; text-align: center; }
.qd-sign__line { border-block-end: 1px solid #000; margin-block-start: 12mm; margin-inline: 8mm; }

@media print {
  .qd { inline-size: auto; padding: 0; }

  .qd,
  .qd * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  :global(html),
  :global(body),
  :global(.v-application),
  :global(.v-application__wrap) { background: #fff !important; }

  .qd-lines tr,
  .qd-kv tr,
  .qd-list li { break-inside: avoid; }

  .qd-head,
  .qd-parties,
  .qd-totals,
  .qd-sign { break-inside: avoid; }

  @page { size: A4 landscape; margin: 12mm; }
}
</style>
