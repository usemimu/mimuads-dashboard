import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getKycStatus } from '@/api/onboarding'
import { useSession } from '@/stores/session'
import { ctxKey } from '@/lib/ctx-key'

/**
 * Shared KYC status for the active org. `kycComplete` is the milestone the
 * console gates on — it means the operator finished identity verification.
 * `businessApprovalStatus` (ops sign-off) flips later and does NOT gate
 * campaign creation, so pending business approval never blocks the user.
 *
 * One vue-query cache slot (context-scoped) shared by the banner, the
 * verification hub, and the campaign gates — so KYC is fetched once.
 */
export function useKyc() {
  const session = useSession()
  const query = useQuery({
    queryKey: computed(() => ctxKey(session.context, 'kyc', 'status')),
    queryFn: getKycStatus,
    enabled: computed(() => session.hasOrg),
    staleTime: 60_000,
  })

  const kycComplete = computed(() => query.data.value?.kycComplete === true)
  const businessApprovalStatus = computed(
    () => query.data.value?.businessApprovalStatus ?? null,
  )
  const latestVerification = computed(() => query.data.value?.latestVerification ?? null)

  return { ...query, status: query.data, kycComplete, businessApprovalStatus, latestVerification }
}
