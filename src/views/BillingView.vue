<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { PhDownloadSimple, PhArrowDownLeft, PhArrowUpRight, PhPlus, PhReceipt, PhWarningCircle, PhFileText } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import Tabs from '@/components/ui/Tabs.vue'
import { useSession } from '@/stores/session'
import { useToastStore } from '@/stores/toast'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo, nairaToKobo } from '@/lib/money'
import { isApiError } from '@/api/errors'
import {
  getWallet, getTransactions, transactionsCsvUrl,
  topupIntent, verifyTopup, createInvoice, listInvoices, invoicePdfUrl, transfer,
} from '@/api/billing'
import { listWorkspaces } from '@/api/org'

const session = useSession()
const route = useRoute()
const router = useRouter()
const qc = useQueryClient()
const toast = useToastStore()
const { t } = useI18n()
const tab = ref<'transactions' | 'topup' | 'transfers' | 'invoices'>('transactions')

const { data: wallet } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'wallet')),
  queryFn: getWallet,
})
const { data: txns } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'wallet', 'txns')),
  queryFn: getTransactions,
})
const { data: invoices } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'invoices')),
  queryFn: listInvoices,
})

// ── Top-up (Paystack) ──
const topupNaira = ref<number | null>(null)
const topupBusy = ref(false)
const topupState = ref<'idle' | 'pending' | 'success' | 'failed'>('idle')
async function startTopup() {
  if (!topupNaira.value || topupNaira.value <= 0) return
  topupBusy.value = true
  try {
    const intent = await topupIntent(
      String(nairaToKobo(topupNaira.value)),
      `${window.location.origin}/billing`,
    )
    const url = intent.paystack?.authorizationUrl
    if (url) window.location.href = url
    else toast.error('Paystack did not return a checkout URL.')
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Top-up failed')
  } finally {
    topupBusy.value = false
  }
}
// Paystack callback → verify.
onMounted(async () => {
  const reference = route.query.reference as string | undefined
  if (!reference) return
  tab.value = 'topup'
  topupState.value = 'pending'
  try {
    const res = await verifyTopup(reference)
    const ok = res.status === 'success' || res.status === 'completed'
    topupState.value = ok ? 'success' : 'failed'
    if (ok) toast.success('Top-up successful — wallet updated.')
    else toast.error('Top-up could not be verified.')
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'wallet') })
  } catch {
    topupState.value = 'failed'
    toast.error('Top-up could not be verified.')
  } finally {
    router.replace('/billing')
  }
})

// ── Invoice request ──
const invNaira = ref<number | null>(null)
const invPurpose = ref('')
const invBusy = ref(false)
async function requestInvoice() {
  if (!invNaira.value || invNaira.value <= 0) return
  invBusy.value = true
  try {
    await createInvoice(String(nairaToKobo(invNaira.value)), invPurpose.value || undefined)
    invNaira.value = null
    invPurpose.value = ''
    toast.success('Invoice requested.')
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'invoices') })
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not request invoice')
  } finally {
    invBusy.value = false
  }
}

const canBill = computed(() => session.canManageBilling)

// Low balance threshold mirrors the dashboard nudge (₦5,000.00).
const lowBalance = computed(() => (wallet.value ? Number(wallet.value.balanceKobo) < 500_000_00 : false))

const billingTabs = computed(() =>
  (['transactions', 'topup', 'invoices', 'transfers'] as const)
    .filter((name) => name !== 'transfers' || session.context.tier === 'agency')
    .map((name) => ({ value: name, label: tabLabel(name) })),
)
function tabLabel(name: string): string {
  return t('billing.tab' + name.charAt(0).toUpperCase() + name.slice(1))
}

// Credits (top-ups, inbound transfers) vs debits (spend, outbound). Fall back
// to the amount's sign when the type vocabulary doesn't make it obvious.
function isCredit(tx: { type: string; amountKobo: string }): boolean {
  const n = Number(tx.amountKobo)
  if (Number.isFinite(n) && n !== 0) return n > 0
  return /topup|credit|refund|transfer_in|deposit|fund/i.test(tx.type)
}
function fmtDate(d?: string): string {
  if (!d) return ''
  const t = Date.parse(d)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Transfers (finance/admin) ──
const { data: workspaces } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'ws-list')),
  queryFn: listWorkspaces,
  enabled: computed(() => session.context.tier === 'agency'),
})
const tFrom = ref('') // '' = org master
const tTo = ref('')
const tNaira = ref<number | null>(null)
const tBusy = ref(false)
const tDone = ref(false)
async function doTransfer() {
  if (!tNaira.value || tNaira.value <= 0 || tFrom.value === tTo.value) return
  tBusy.value = true
  tDone.value = false
  try {
    await transfer({
      fromWorkspaceId: tFrom.value || undefined,
      toWorkspaceId: tTo.value || undefined,
      amountKobo: String(nairaToKobo(tNaira.value)),
      idempotencyKey: 'transfer-' + Date.now(),
    })
    tDone.value = true
    tNaira.value = null
    toast.success('Transfer complete.')
    qc.invalidateQueries({ queryKey: ctxKey(session.context, 'wallet') })
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Transfer failed')
  } finally {
    tBusy.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader :title="$t('billing.title')" :subtitle="$t('billing.subtitle')" />

    <!-- Wallet summary card -->
    <Card class="mb-6 overflow-hidden" padding="none">
      <div class="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p class="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {{ $t('billing.balance') }}
          </p>
          <p class="mt-1.5 font-mono text-[clamp(2rem,8cqi,2.75rem)] font-semibold leading-none text-neutral-900" data-testid="wallet-balance">
            {{ wallet ? formatKobo(wallet.balanceKobo) : '—' }}
          </p>
          <p
            v-if="lowBalance"
            class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-gold-50 px-2.5 py-1 text-xs font-medium text-gold-800"
          >
            <PhWarningCircle :size="14" weight="fill" class="text-gold-500" /> {{ $t('dashboard.lowBalance') }}
          </p>
        </div>
        <div v-if="canBill" class="flex shrink-0 gap-2">
          <Button @click="tab = 'topup'"><PhPlus :size="16" weight="bold" /> {{ $t('billing.topupTitle') }}</Button>
          <a :href="transactionsCsvUrl()" target="_blank" rel="noopener">
            <Button variant="outline"><PhDownloadSimple :size="16" /> {{ $t('billing.exportCsv') }}</Button>
          </a>
        </div>
      </div>
    </Card>

    <!-- Tabs -->
    <div class="mb-5">
      <Tabs v-model="tab" :tabs="billingTabs" />
    </div>

    <!-- Transactions -->
    <div v-if="tab === 'transactions'">
      <Card v-if="txns?.transactions.length" padding="none" class="overflow-hidden">
        <ul role="list" class="divide-y divide-line">
          <li v-for="tx in txns.transactions" :key="tx.id" class="flex items-center gap-4 px-4 py-3.5">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              :class="isCredit(tx) ? 'bg-moss-50 text-moss-600' : 'bg-neutral-100 text-neutral-500'"
            >
              <PhArrowDownLeft v-if="isCredit(tx)" :size="16" weight="bold" />
              <PhArrowUpRight v-else :size="16" weight="bold" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium capitalize text-neutral-900">{{ tx.type.replace(/_/g, ' ') }}</p>
              <p class="truncate text-xs text-neutral-500">{{ tx.description || fmtDate(tx.createdAt) }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="font-mono text-sm font-semibold" :class="isCredit(tx) ? 'text-moss-600' : 'text-neutral-900'">
                {{ isCredit(tx) ? '+' : '−' }}{{ formatKobo(String(Math.abs(Number(tx.amountKobo) || 0))) }}
              </p>
              <p class="text-[11px] text-neutral-400">{{ fmtDate(tx.createdAt) }}</p>
            </div>
          </li>
        </ul>
      </Card>
      <Card v-else padding="none">
        <EmptyState :title="$t('billing.noTransactions')">
          <template #icon><PhReceipt :size="24" /></template>
        </EmptyState>
      </Card>
    </div>

    <!-- Top up -->
    <div v-else-if="tab === 'topup'" class="max-w-md">
      <p v-if="topupState === 'pending'" class="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600">{{ $t('billing.topupPending') }}</p>
      <p v-else-if="topupState === 'success'" class="rounded-lg bg-moss-50 px-4 py-3 text-sm text-moss-700">{{ $t('billing.topupSuccess') }}</p>
      <p v-else-if="topupState === 'failed'" class="rounded-lg bg-clay-50 px-4 py-3 text-sm text-clay-700">{{ $t('billing.topupFailed') }}</p>
      <div v-if="canBill" class="card mt-4 space-y-3 p-5">
        <h2 class="font-medium text-neutral-900">{{ $t('billing.topupTitle') }}</h2>
        <label class="block"><span class="label">{{ $t('billing.amount') }}</span>
          <input v-model.number="topupNaira" type="number" min="1" class="input" /></label>
        <p class="text-xs text-neutral-400">{{ $t('billing.topupHint') }}</p>
        <Button class="w-full" :disabled="topupBusy" @click="startTopup">{{ $t('billing.continue') }}</Button>
      </div>
    </div>

    <!-- Invoices -->
    <div v-else-if="tab === 'invoices'" class="space-y-6">
      <div v-if="canBill" class="card max-w-md space-y-3 p-5">
        <h2 class="font-medium text-neutral-900">{{ $t('billing.invoiceRequest') }}</h2>
        <label class="block"><span class="label">{{ $t('billing.amount') }}</span>
          <input v-model.number="invNaira" type="number" min="1" class="input" /></label>
        <label class="block"><span class="label">{{ $t('billing.purpose') }}</span>
          <input v-model="invPurpose" class="input" /></label>
        <Button :disabled="invBusy" @click="requestInvoice">{{ $t('billing.requestInvoice') }}</Button>
      </div>
      <Card v-if="invoices?.invoices.length" padding="none" class="overflow-hidden">
        <table class="w-full text-sm">
          <thead class="text-left text-[11px] uppercase tracking-wider text-neutral-400">
            <tr class="border-b border-line"><th class="px-5 py-3 font-semibold">{{ $t('billing.invoiceNumber') }}</th><th class="px-5 py-3 font-semibold">{{ $t('billing.grandTotal') }}</th><th class="px-5 py-3 font-semibold">{{ $t('billing.status') }}</th><th class="px-5 py-3"></th></tr>
          </thead>
          <tbody>
            <tr v-for="inv in invoices.invoices" :key="inv.id" class="border-t border-line hover:bg-neutral-50/70" data-testid="invoice-row">
              <td class="px-5 py-3 font-mono text-neutral-900">{{ inv.invoiceNumber }}</td>
              <td class="px-5 py-3 font-mono text-neutral-700">{{ formatKobo(inv.totalKobo) }}</td>
              <td class="px-5 py-3"><Badge tone="pending">{{ inv.status.replace(/_/g, ' ') }}</Badge></td>
              <td class="px-5 py-3 text-right"><a :href="invoicePdfUrl(inv.id)" target="_blank" rel="noopener" class="text-sm font-medium text-clay-600 hover:underline">{{ $t('billing.downloadPdf') }}</a></td>
            </tr>
          </tbody>
        </table>
      </Card>
      <Card v-else padding="none">
        <EmptyState :title="$t('billing.noInvoices')">
          <template #icon><PhFileText :size="24" /></template>
        </EmptyState>
      </Card>
    </div>

    <!-- Transfers -->
    <div v-else class="card max-w-md space-y-3 p-5">
      <h2 class="font-medium text-neutral-900">{{ $t('billing.transfersTitle') }}</h2>
      <p v-if="!canBill" class="text-sm text-neutral-400">{{ $t('billing.transferReadonly') }}</p>
      <template v-else>
        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="label">{{ $t('billing.transferFrom') }}</span>
            <select v-model="tFrom" :aria-label="$t('billing.transferFrom')" class="select text-sm">
              <option value="">{{ $t('billing.orgMaster') }}</option>
              <option v-for="w in workspaces?.workspaces ?? []" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select></label>
          <label class="block"><span class="label">{{ $t('billing.transferTo') }}</span>
            <select v-model="tTo" :aria-label="$t('billing.transferTo')" class="select text-sm">
              <option value="">{{ $t('billing.orgMaster') }}</option>
              <option v-for="w in workspaces?.workspaces ?? []" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select></label>
        </div>
        <label class="block"><span class="label">{{ $t('billing.amount') }}</span>
          <input v-model.number="tNaira" type="number" min="1" class="input" /></label>
        <p v-if="tDone" class="text-sm text-moss-600">{{ $t('billing.transferDone') }}</p>
        <Button :disabled="tBusy || tFrom === tTo" @click="doTransfer">{{ $t('billing.doTransfer') }}</Button>
      </template>
    </div>
  </div>
</template>
