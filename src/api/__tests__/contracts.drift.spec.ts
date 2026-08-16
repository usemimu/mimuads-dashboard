import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import snapshot from '../contracts/openapi.snapshot.json'
import {
  PasswordLoginSchema,
  AuthTokensResponseSchema,
  RequestOtpSchema,
  RequestOtpResponseSchema,
  VerifyOtpSchema,
  RefreshTokenResponseSchema,
  SwitchOrgSchema,
  SwitchWorkspaceSchema,
  SwitchContextResponseSchema,
} from '../contracts/auth'
import {
  CreateBusinessProfileSchema,
  BusinessProfileResponseSchema,
  UpdateBusinessProfileSchema,
} from '../contracts/onboarding'
import {
  ChangePasswordSchema,
  DeleteAccountSchema,
  ProfileImageUploadSchema,
  ConfirmProfileImageSchema,
} from '../contracts/profile'
import {
  CreateCampaignSchema,
  TopUpSchema,
  ExtendSchema,
  CampaignSchema,
  CampaignListResponseSchema,
  SubmitCampaignResponseSchema,
  QuoteResponseSchema,
} from '../contracts/campaigns'
import {
  UploadIntentSchema,
  UploadIntentResponseSchema,
  CreativeStatusResponseSchema,
} from '../contracts/creatives'
import {
  WalletBalanceSchema,
  TransactionHistorySchema,
  TopupIntentSchema,
  TopupIntentResponseSchema,
  VerifyTopupSchema,
  VerifyTopupResponseSchema,
  WalletTransferSchema,
  CreateInvoiceSchema,
} from '../contracts/billing'
import {
  CreateWorkspaceSchema,
  MyOrgsResponseSchema,
  WorkspacesResponseSchema,
} from '../contracts/org'

/**
 * Contract drift guard. The console owns its zod contracts (separate repo, no
 * shared package) — this test asserts they still match the backend's live
 * /openapi.json (committed as openapi.snapshot.json, refreshed via
 * `pnpm contracts:sync`). Regenerate the snapshot when the backend legitimately
 * changes a shape; a failure here means the console and API have drifted.
 */

type OpenApiSchema = { properties?: Record<string, unknown>; required?: string[] }
const components = (snapshot as { components?: { schemas?: Record<string, OpenApiSchema> } })
  .components?.schemas as Record<string, OpenApiSchema>

function consoleKeys(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape)
}
function apiComponent(name: string): OpenApiSchema {
  const c = components[name]
  if (!c) throw new Error(`OpenAPI component "${name}" not found in snapshot`)
  return c
}

/** Request: console must send only known fields AND all backend-required fields. */
const REQUESTS: Array<[string, z.ZodObject<z.ZodRawShape>]> = [
  ['PasswordLoginDto', PasswordLoginSchema],
  ['RequestOTPDto', RequestOtpSchema],
  ['VerifyOTPDto', VerifyOtpSchema],
  ['SwitchOrgDto', SwitchOrgSchema],
  ['SwitchWorkspaceDto', SwitchWorkspaceSchema],
  ['CreateBusinessProfileDto', CreateBusinessProfileSchema],
  ['CreateCampaignRequestDto', CreateCampaignSchema],
  ['TopUpCampaignRequestDto', TopUpSchema],
  ['ExtendCampaignRequestDto', ExtendSchema],
  ['UploadIntentRequestDto', UploadIntentSchema],
  ['TopupIntentRequestDto', TopupIntentSchema],
  ['VerifyTopupRequestDto', VerifyTopupSchema],
  ['WalletTransferDto', WalletTransferSchema],
  ['CreateInvoiceDto', CreateInvoiceSchema],
  ['CreateWorkspaceDto', CreateWorkspaceSchema],
  ['UpdateBusinessProfileDto', UpdateBusinessProfileSchema],
  ['ChangePasswordDto', ChangePasswordSchema],
  ['DeleteAccountDto', DeleteAccountSchema],
  ['ProfileImageUploadDto', ProfileImageUploadSchema],
  ['ConfirmProfileImageDto', ConfirmProfileImageSchema],
]

/** Response: everything the console reads must still be present on the API shape. */
const RESPONSES: Array<[string, z.ZodObject<z.ZodRawShape>]> = [
  ['VerifyOTPResponseDto', AuthTokensResponseSchema],
  ['RequestOTPResponseDto', RequestOtpResponseSchema],
  ['RefreshTokenResponseDto', RefreshTokenResponseSchema],
  ['SwitchContextResponseDto', SwitchContextResponseSchema],
  ['BusinessProfileResponseDto', BusinessProfileResponseSchema],
  ['CampaignResponseDto', CampaignSchema],
  ['CampaignListResponseDto', CampaignListResponseSchema],
  ['SubmitCampaignResponseDto', SubmitCampaignResponseSchema],
  ['PricingQuoteResponseDto', QuoteResponseSchema],
  ['UploadIntentResponseDto', UploadIntentResponseSchema],
  ['CreativeStatusResponseDto', CreativeStatusResponseSchema],
  ['WalletBalanceResponseDto', WalletBalanceSchema],
  ['TransactionHistoryResponseDto', TransactionHistorySchema],
  ['TopupIntentResponseDto', TopupIntentResponseSchema],
  ['VerifyTopupResponseDto', VerifyTopupResponseSchema],
  ['MyOrgsResponseDto', MyOrgsResponseSchema],
  ['WorkspacesResponseDto', WorkspacesResponseSchema],
]

describe('console contracts ↔ backend /openapi.json (no drift)', () => {
  it.each(REQUESTS)('request %s aligns', (name, schema) => {
    const api = apiComponent(name)
    const apiKeys = Object.keys(api.properties ?? {})
    const cKeys = consoleKeys(schema)
    expect(
      cKeys.filter((k) => !apiKeys.includes(k)),
      `${name}: console sends fields the API doesn't declare`,
    ).toEqual([])
    expect(
      (api.required ?? []).filter((k) => !cKeys.includes(k)),
      `${name}: console omits API-required fields`,
    ).toEqual([])
  })

  it.each(RESPONSES)('response %s aligns', (name, schema) => {
    const api = apiComponent(name)
    const apiKeys = Object.keys(api.properties ?? {})
    expect(
      consoleKeys(schema).filter((k) => !apiKeys.includes(k)),
      `${name}: console expects fields the API no longer returns`,
    ).toEqual([])
  })
})
