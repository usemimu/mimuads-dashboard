<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { PhDownloadSimple } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
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

    <!-- Wallet card -->
    <Card class="mb-6">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">{{ $t('billing.balance') }}</p>
      <p class="mt-1.5 font-mono text-4xl font-semibold text-neutral-900" data-testid="wallet-balance">
        {{ wallet ? formatKobo(wallet.balanceKobo) : '—' }}
      </p>
    </Card>

    <!-- Tabs -->
    <div class="mb-5 flex gap-1 border-b border-neutral-200">
      <button v-for="t in (['transactions','topup','invoices','transfers'] as const)" :key="t"
        class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
        :class="tab === t ? 'border-clay-500 text-clay-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'"
        @click="tab = t">{{ $t('billing.tab' + t.charAt(0).toUpperCase() + t.slice(1)) }}</button>
    </div>

    <!-- Transactions -->
    <div v-if="tab === 'transactions'">
      <div class="mb-3 flex justify-end">
        <a :href="transactionsCsvUrl()" target="_blank" rel="noopener">
          <Button variant="outline" size="sm"><PhDownloadSimple :size="16" /> {{ $t('billing.exportCsv') }}</Button>
        </a>
      </div>
      <div class="card overflow-hidden">
        <table class="w-full text-sm">
          <tbody>
            <tr v-if="!txns?.transactions.length"><td class="px-4 py-6 text-center text-neutral-400">{{ $t('billing.noTransactions') }}</td></tr>
            <tr v-for="tx in txns?.transactions ?? []" :key="tx.id" class="border-t border-neutral-100">
              <td class="px-4 py-2 capitalize text-neutral-700">{{ tx.type.replace(/_/g, ' ') }}</td>
              <td class="px-4 py-2 text-neutral-500">{{ tx.description ?? '' }}</td>
              <td class="px-4 py-2 text-right font-mono">{{ formatKobo(tx.amountKobo) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
      <div class="card overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-400">
            <tr><th class="px-4 py-2">{{ $t('billing.invoiceNumber') }}</th><th class="px-4 py-2">{{ $t('billing.grandTotal') }}</th><th class="px-4 py-2">{{ $t('billing.status') }}</th><th class="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            <tr v-if="!invoices?.invoices.length"><td colspan="4" class="px-4 py-6 text-center text-neutral-400">{{ $t('billing.noInvoices') }}</td></tr>
            <tr v-for="inv in invoices?.invoices ?? []" :key="inv.id" class="border-t border-neutral-100" data-testid="invoice-row">
              <td class="px-4 py-2 font-mono">{{ inv.invoiceNumber }}</td>
              <td class="px-4 py-2 font-mono">{{ formatKobo(inv.totalKobo) }}</td>
              <td class="px-4 py-2"><Badge tone="pending">{{ inv.status.replace(/_/g, ' ') }}</Badge></td>
              <td class="px-4 py-2 text-right"><a :href="invoicePdfUrl(inv.id)" target="_blank" rel="noopener" class="text-sm text-clay-600 hover:underline">{{ $t('billing.downloadPdf') }}</a></td>
            </tr>
          </tbody>
        </table>
      </div>
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
