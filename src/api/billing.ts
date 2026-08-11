import { env } from '@/env'
import { api } from './client'
import {
  WalletBalanceSchema,
  TransactionHistorySchema,
  TopupIntentSchema,
  TopupIntentResponseSchema,
  VerifyTopupSchema,
  VerifyTopupResponseSchema,
  WalletTransferSchema,
  CreateInvoiceSchema,
  InvoiceEnvelopeSchema,
  InvoiceListResponseSchema,
} from './contracts/billing'

export function getWallet() {
  return api.get('/advertiser/wallet', WalletBalanceSchema)
}
export function getTransactions() {
  return api.get('/advertiser/wallet/transactions', TransactionHistorySchema)
}
/** Direct URL for the CSV export (opened in a new tab; Bearer not attached — the
 *  cookie session authorizes it). */
export function transactionsCsvUrl(): string {
  return `${env.apiBaseUrl}/advertiser/wallet/transactions/export/csv`
}

// Paystack top-up
export function topupIntent(amountKobo: string, callbackUrl: string) {
  return api.post(
    '/advertiser/wallet/topup-intent',
    TopupIntentSchema.parse({ amountKobo, callbackUrl }),
    TopupIntentResponseSchema,
  )
}
export function verifyTopup(reference: string) {
  return api.post(
    '/advertiser/wallet/topup/verify',
    VerifyTopupSchema.parse({ reference }),
    VerifyTopupResponseSchema,
  )
}

// Transfers (finance/admin) — needs the list-workspaces endpoint to populate; wired here.
export function transfer(input: {
  fromWorkspaceId?: string
  toWorkspaceId?: string
  amountKobo: string
  idempotencyKey: string
  description?: string
}) {
  return api.post('/advertiser/wallet/transfers', WalletTransferSchema.parse(input))
}

// Invoices
export function createInvoice(amountKobo: string, purpose?: string, workspaceId?: string) {
  return api.post(
    '/advertiser/billing/invoices',
    CreateInvoiceSchema.parse({ amountKobo, purpose, workspaceId }),
    InvoiceEnvelopeSchema,
  )
}
export function listInvoices() {
  return api.get('/advertiser/billing/invoices', InvoiceListResponseSchema)
}
export function getInvoice(id: string) {
  return api.get(`/advertiser/billing/invoices/${id}`, InvoiceEnvelopeSchema)
}
export function invoicePdfUrl(id: string): string {
  return `${env.apiBaseUrl}/advertiser/billing/invoices/${id}/pdf`
}
