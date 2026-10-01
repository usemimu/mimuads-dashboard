import { z } from 'zod'

/**
 * Billing contracts (wallet, Paystack top-up, transfers, invoices). Wallet +
 * top-up responses are drift-checked (DTOs registered — backend eea3c8a).
 * Invoice + transfer responses are inline objects (no named DTO) → modelled
 * permissively (flagged in IMPLEMENTATION-NOTES).
 */

const TxnSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    amountKobo: z.string(),
    amountNaira: z.number().optional(),
    createdAt: z.string().optional(),
    description: z.string().nullable().optional(),
    // Authoritative money-in/out from the ledger entry (preferred over the
    // amount-sign heuristic). Extra detail fields for the transaction rows.
    direction: z.enum(['credit', 'debit']).optional(),
    formattedAmount: z.string().optional(),
    balanceAfterKobo: z.string().nullable().optional(),
    externalRef: z.string().nullable().optional(),
  })
  .passthrough()

// GET /advertiser/wallet
export const WalletBalanceSchema = z
  .object({
    balanceKobo: z.string(),
    balanceNaira: z.number(),
    formattedBalance: z.string(),
    recentTransactions: z.array(TxnSchema),
  })
  .passthrough()
export type WalletBalance = z.infer<typeof WalletBalanceSchema>

// GET /advertiser/wallet/transactions
export const TransactionHistorySchema = z
  .object({ transactions: z.array(TxnSchema), pagination: z.unknown() })
  .passthrough()

// POST /advertiser/wallet/topup-intent
export const TopupIntentSchema = z.object({
  amountKobo: z.string().regex(/^\d+$/),
  callbackUrl: z.string().optional(),
})
export const TopupIntentResponseSchema = z
  .object({
    topupId: z.string(),
    amountKobo: z.string(),
    surchargeKobo: z.string(),
    formattedSurcharge: z.string(),
    totalChargeKobo: z.string(),
    formattedTotalCharge: z.string(),
    paystack: z.object({
      authorizationUrl: z.string(),
      accessCode: z.string(),
      reference: z.string(),
    }),
    expiresAt: z.string(),
  })
  .passthrough()

// POST /advertiser/wallet/topup/verify
export const VerifyTopupSchema = z.object({ reference: z.string() })
export const VerifyTopupResponseSchema = z
  .object({
    status: z.string(),
    amountKobo: z.string(),
    reference: z.string(),
    paidAt: z.string().optional(),
    newBalance: z.unknown().optional(),
  })
  .passthrough()

// POST /advertiser/wallet/transfers
export const WalletTransferSchema = z.object({
  fromWorkspaceId: z.string().uuid().optional(),
  toWorkspaceId: z.string().uuid().optional(),
  amountKobo: z.string().regex(/^\d+$/),
  idempotencyKey: z.string().min(8).max(128),
  description: z.string().optional(),
})

// Invoices
export const CreateInvoiceSchema = z.object({
  amountKobo: z.string().regex(/^\d+$/),
  workspaceId: z.string().uuid().optional(),
  purpose: z.string().optional(),
})
export const InvoiceSchema = z
  .object({
    id: z.string(),
    invoiceNumber: z.string(),
    subtotalKobo: z.string(),
    vatKobo: z.string(),
    totalKobo: z.string(),
    status: z.string(),
    purpose: z.string().nullable().optional(),
    createdAt: z.string().optional(),
  })
  .passthrough()
export type Invoice = z.infer<typeof InvoiceSchema>
export const InvoiceEnvelopeSchema = z.object({ invoice: InvoiceSchema, payTo: z.unknown() }).passthrough()
export const InvoiceListResponseSchema = z.object({ invoices: z.array(InvoiceSchema) }).passthrough()
