<script setup lang="ts">
import MimuIcon from '@/components/ui/MimuIcon.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { PhDownloadSimple, PhArrowDownLeft, PhArrowUpRight, PhPlus, PhReceipt, PhWarningCircle, PhFileText, PhCaretDown, PhArrowsLeftRight, PhArrowCounterClockwise, PhMegaphone } from '@phosphor-icons/vue'
import type { Component } from 'vue'
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

// Which transaction row is expanded to show its full detail.
const expandedTx = ref<string | null>(null)

type Txn = {
  id: string
  type: string
  amountKobo: string
  direction?: 'credit' | 'debit'
  description?: string | null
  createdAt?: string
  balanceAfterKobo?: string | null
  externalRef?: string | null
}

// Prefer the ledger's authoritative direction; fall back to the amount sign /
// type vocabulary for older payloads.
function isCredit(tx: Txn): boolean {
  if (tx.direction) return tx.direction === 'credit'
  const n = Number(tx.amountKobo)
  if (Number.isFinite(n) && n !== 0) return n > 0
  return /topup|credit|refund|transfer_in|deposit|fund/i.test(tx.type)
}
// A representative icon per transaction type.
function txIcon(tx: Txn): Component {
  const t = tx.type.toLowerCase()
  if (/topup|deposit|fund/.test(t)) return PhPlus
  if (/refund/.test(t)) return PhArrowCounterClockwise
  if (/transfer/.test(t)) return PhArrowsLeftRight
  if (/charge|spend|play|debit/.test(t)) return PhMegaphone
  return isCredit(tx) ? PhArrowDownLeft : PhArrowUpRight
}
function txTitle(tx: Txn): string {
  return tx.type.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}
function absKobo(tx: Txn): string {
  return String(Math.abs(Number(tx.amountKobo) || 0))
}
function fmtDate(d?: string): string {
  if (!d) return ''
  const t = Date.parse(d)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(d?: string): string {
  if (!d) return ''
  const t = Date.parse(d)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
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
        <div class="flex items-start gap-4">
          <MimuIcon name="wallet" variant="sticker" :size="104" class="shrink-0" />
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {{ $t('billing.balance') }}
            </p>
            <p class="mt-1 font-display text-[clamp(2rem,8cqi,2.75rem)] font-semibold leading-none tracking-tight text-neutral-900" data-testid="wallet-balance">
              {{ wallet ? formatKobo(wallet.balanceKobo) : '—' }}
            </p>
            <p
              v-if="lowBalance"
              class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold-500/10 px-2.5 py-1 text-xs font-medium text-gold-800"
            >
              <PhWarningCircle :size="14" weight="fill" class="text-gold-500" /> {{ $t('dashboard.lowBalance') }}
            </p>
          </div>
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
          <li v-for="tx in (txns.transactions as Txn[])" :key="tx.id">
            <button
              type="button"
              class="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-sunken/60"
              @click="expandedTx = expandedTx === tx.id ? null : tx.id"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                :class="isCredit(tx) ? 'bg-moss-500/10 text-moss-600' : 'bg-clay-500/10 text-clay-600'"
              >
                <component :is="txIcon(tx)" :size="18" weight="bold" />
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-neutral-900">{{ txTitle(tx) }}</p>
                <p class="truncate text-xs text-neutral-500">{{ tx.description || fmtDateTime(tx.createdAt) }}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="font-display text-sm font-semibold" :class="isCredit(tx) ? 'text-moss-600' : 'text-neutral-900'">
                  {{ isCredit(tx) ? '+' : '−' }}{{ formatKobo(absKobo(tx)) }}
                </p>
                <p v-if="tx.balanceAfterKobo" class="font-display text-[11px] text-neutral-400">
                  {{ $t('billing.balAfter') }} {{ formatKobo(tx.balanceAfterKobo) }}
                </p>
                <p v-else class="text-[11px] text-neutral-400">{{ fmtDate(tx.createdAt) }}</p>
              </div>
              <PhCaretDown
                :size="14"
                class="shrink-0 text-neutral-300 transition-transform"
                :class="expandedTx === tx.id ? 'rotate-180' : ''"
              />
            </button>

            <!-- Expanded detail (bank-statement style) -->
            <div v-if="expandedTx === tx.id" class="border-t border-line bg-surface-sunken/60 px-4 py-3.5">
              <dl class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div>
                  <dt class="text-neutral-400">{{ $t('billing.txDate') }}</dt>
                  <dd class="mt-0.5 text-neutral-800">{{ fmtDateTime(tx.createdAt) }}</dd>
                </div>
                <div>
                  <dt class="text-neutral-400">{{ $t('billing.txType') }}</dt>
                  <dd class="mt-0.5">
                    <Badge :tone="isCredit(tx) ? 'success' : 'neutral'" size="sm">{{ isCredit(tx) ? $t('billing.moneyIn') : $t('billing.moneyOut') }}</Badge>
                  </dd>
                </div>
                <div>
                  <dt class="text-neutral-400">{{ $t('billing.amount') }}</dt>
                  <dd class="mt-0.5 font-display text-[13px] font-medium text-neutral-800">{{ isCredit(tx) ? '+' : '−' }}{{ formatKobo(absKobo(tx)) }}</dd>
                </div>
                <div v-if="tx.balanceAfterKobo">
                  <dt class="text-neutral-400">{{ $t('billing.balanceAfter') }}</dt>
                  <dd class="mt-0.5 font-display text-[13px] font-medium text-neutral-800">{{ formatKobo(tx.balanceAfterKobo) }}</dd>
                </div>
                <div v-if="tx.externalRef" class="col-span-2">
                  <dt class="text-neutral-400">{{ $t('billing.txReference') }}</dt>
                  <dd class="mt-0.5 break-all text-neutral-800">{{ tx.externalRef }}</dd>
                </div>
                <div class="col-span-2">
                  <dt class="text-neutral-400">{{ $t('billing.txId') }}</dt>
                  <dd class="mt-0.5 break-all text-[11px] text-neutral-500">{{ tx.id }}</dd>
                </div>
              </dl>
            </div>
          </li>
        </ul>
      </Card>
      <Card v-else padding="none">
        <EmptyState sticker="coins" :title="$t('billing.noTransactions')">
          <template #icon><PhReceipt :size="24" /></template>
        </EmptyState>
      </Card>
    </div>

    <!-- Top up -->
    <div v-else-if="tab === 'topup'" class="max-w-md space-y-4">
      <p v-if="topupState === 'pending'" class="rounded-xl border border-line bg-surface-sunken px-4 py-3 text-sm text-neutral-600">{{ $t('billing.topupPending') }}</p>
      <p v-else-if="topupState === 'success'" class="rounded-xl border border-moss-200/60 bg-moss-500/10 px-4 py-3 text-sm text-moss-700">{{ $t('billing.topupSuccess') }}</p>
      <p v-else-if="topupState === 'failed'" class="rounded-xl border border-clay-200/60 bg-clay-500/10 px-4 py-3 text-sm text-clay-700">{{ $t('billing.topupFailed') }}</p>
      <Card v-if="canBill" class="space-y-3.5">
        <div class="flex items-center gap-2.5">
          <MimuIcon name="top-up" variant="sticker" :size="68" class="shrink-0" />
          <h2 class="font-body text-[15px] font-semibold text-neutral-900">{{ $t('billing.topupTitle') }}</h2>
        </div>
        <label class="block"><span class="label">{{ $t('billing.amount') }}</span>
          <input v-model.number="topupNaira" type="number" min="1" class="input" /></label>
        <p class="text-xs text-neutral-400">{{ $t('billing.topupHint') }}</p>
        <Button class="w-full" :disabled="topupBusy" @click="startTopup">{{ $t('billing.continue') }}</Button>
      </Card>
    </div>

    <!-- Invoices -->
    <div v-else-if="tab === 'invoices'" class="grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
      <!-- Request form -->
      <Card v-if="canBill" class="space-y-3.5 lg:sticky lg:top-4">
        <div class="flex items-center gap-2.5">
          <MimuIcon name="receipt" variant="sticker" :size="68" class="shrink-0" />
          <h2 class="font-body text-[15px] font-semibold text-neutral-900">{{ $t('billing.invoiceRequest') }}</h2>
        </div>
        <label class="block"><span class="label">{{ $t('billing.amount') }}</span>
          <input v-model.number="invNaira" type="number" min="1" class="input" /></label>
        <label class="block"><span class="label">{{ $t('billing.purpose') }}</span>
          <input v-model="invPurpose" class="input" /></label>
        <Button :disabled="invBusy" @click="requestInvoice">{{ $t('billing.requestInvoice') }}</Button>
      </Card>

      <!-- Invoice list -->
      <div :class="!canBill ? 'lg:col-span-2' : ''">
        <Card v-if="invoices?.invoices.length" padding="none" class="overflow-hidden">
          <table class="w-full text-sm">
            <thead class="text-left text-[11px] uppercase tracking-wider text-neutral-400">
              <tr class="border-b border-line">
                <th class="px-5 py-3 font-semibold">{{ $t('billing.invoiceNumber') }}</th>
                <th class="px-5 py-3 font-semibold">{{ $t('billing.grandTotal') }}</th>
                <th class="px-5 py-3 font-semibold">{{ $t('billing.status') }}</th>
                <th class="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inv in invoices.invoices" :key="inv.id" class="border-t border-line transition-colors hover:bg-surface-sunken/60" data-testid="invoice-row">
                <td class="px-5 py-3 font-display text-[13px] font-medium text-neutral-900">{{ inv.invoiceNumber }}</td>
                <td class="px-5 py-3 font-display text-[13px] font-medium text-neutral-700">{{ formatKobo(inv.totalKobo) }}</td>
                <td class="px-5 py-3"><Badge tone="pending">{{ inv.status.replace(/_/g, ' ') }}</Badge></td>
                <td class="px-5 py-3 text-right"><a :href="invoicePdfUrl(inv.id)" target="_blank" rel="noopener" class="text-sm font-medium text-clay-600 hover:underline">{{ $t('billing.downloadPdf') }}</a></td>
              </tr>
            </tbody>
          </table>
        </Card>
        <Card v-else padding="none">
          <EmptyState sticker="receipt" :title="$t('billing.noInvoices')">
            <template #icon><PhFileText :size="24" /></template>
          </EmptyState>
        </Card>
      </div>
    </div>

    <!-- Transfers -->
    <Card v-else class="max-w-md space-y-3.5">
      <div class="flex items-center gap-2.5">
        <MimuIcon name="cash-stack" variant="sticker" :size="68" class="shrink-0" />
        <h2 class="font-body text-[15px] font-semibold text-neutral-900">{{ $t('billing.transfersTitle') }}</h2>
      </div>
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
    </Card>
  </div>
</template>
