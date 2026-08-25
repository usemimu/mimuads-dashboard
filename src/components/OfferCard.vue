<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import { getOffer, upsertOffer, submitOffer } from '@/api/offers'
import type { OfferCtaType, OfferStatus } from '@/api/contracts/offers'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

const props = defineProps<{ campaignId: string }>()

const qc = useQueryClient()
const toast = useToastStore()

const queryKey = computed(() => ['offer', props.campaignId])
const { data: offer } = useQuery({
  queryKey,
  queryFn: () => getOffer(props.campaignId),
})

// Form state.
const headline = ref('')
const details = ref('')
const ctaType = ref<OfferCtaType>('online')
const ctaUrl = ref('')
const redemptionInstructions = ref('')
const validUntil = ref('')
const redemptionCap = ref<number | undefined>()
const busy = ref(false)

// Hydrate the form once the offer loads.
watch(
  offer,
  (o) => {
    if (!o) return
    headline.value = o.headline
    details.value = o.details ?? ''
    ctaType.value = o.ctaType
    ctaUrl.value = o.ctaUrl ?? ''
    redemptionInstructions.value = o.redemptionInstructions ?? ''
    validUntil.value = o.validUntil ? o.validUntil.slice(0, 10) : ''
    redemptionCap.value = o.redemptionCap ?? undefined
  },
  { immediate: true },
)

const status = computed<OfferStatus | null>(() => offer.value?.status ?? null)
const statusTone = computed(() => {
  switch (status.value) {
    case 'approved':
      return 'success'
    case 'pending_review':
      return 'pending'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
})
const statusLabel = computed(() =>
  status.value ? status.value.replace('_', ' ') : 'not set',
)
const canSubmit = computed(
  () => !!offer.value && (status.value === 'draft' || status.value === 'rejected'),
)

async function save() {
  busy.value = true
  try {
    await upsertOffer(props.campaignId, {
      headline: headline.value.trim(),
      details: details.value.trim() || undefined,
      ctaType: ctaType.value,
      ctaUrl:
        ctaType.value === 'in_store' ? undefined : ctaUrl.value.trim() || undefined,
      redemptionInstructions:
        ctaType.value === 'in_store'
          ? redemptionInstructions.value.trim() || undefined
          : undefined,
      validUntil: validUntil.value
        ? new Date(validUntil.value).toISOString()
        : undefined,
      redemptionCap: redemptionCap.value || undefined,
    })
    await qc.invalidateQueries({ queryKey: queryKey.value })
    toast.success('Offer saved as draft')
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not save the offer')
  } finally {
    busy.value = false
  }
}

async function submit() {
  busy.value = true
  try {
    await submitOffer(props.campaignId)
    await qc.invalidateQueries({ queryKey: queryKey.value })
    toast.success('Offer submitted for review')
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not submit the offer')
  } finally {
    busy.value = false
  }
}

const inputClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-clay-400'
</script>

<template>
  <Card class="mb-5">
    <div class="flex items-center justify-between mb-1">
      <h2 class="font-display text-lg text-neutral-900">Offer</h2>
      <Badge :tone="statusTone">{{ statusLabel }}</Badge>
    </div>
    <p class="text-sm text-neutral-500 mb-4">
      Optional. Shown on the screen's QR page and emailed to opted-in audiences. Goes live
      only after admin approval, while this campaign is running.
    </p>

    <p v-if="status === 'rejected' && offer?.rejectionReason" class="text-sm text-clay-700 bg-clay-50 border border-clay-200 rounded-lg px-3 py-2 mb-4">
      Rejected: {{ offer.rejectionReason }}
    </p>

    <div class="flex flex-col gap-3">
      <label class="block">
        <span class="text-xs font-medium text-neutral-600">Headline</span>
        <input v-model="headline" :class="inputClass" maxlength="140" placeholder="10% off all baby products" />
      </label>

      <label class="block">
        <span class="text-xs font-medium text-neutral-600">Details (optional)</span>
        <textarea v-model="details" :class="inputClass" rows="2" maxlength="2000" placeholder="Valid on purchases over ₦5,000. One per customer." />
      </label>

      <label class="block">
        <span class="text-xs font-medium text-neutral-600">How do people redeem?</span>
        <select v-model="ctaType" :class="inputClass">
          <option value="online">Online link</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="in_store">In-store code</option>
        </select>
      </label>

      <label v-if="ctaType !== 'in_store'" class="block">
        <span class="text-xs font-medium text-neutral-600">Link</span>
        <input v-model="ctaUrl" :class="inputClass" type="url" placeholder="https://…" />
      </label>
      <label v-else class="block">
        <span class="text-xs font-medium text-neutral-600">Redemption instructions</span>
        <input v-model="redemptionInstructions" :class="inputClass" placeholder="Show the code to the cashier" />
      </label>

      <div class="flex gap-3">
        <label class="block flex-1">
          <span class="text-xs font-medium text-neutral-600">Valid until (optional)</span>
          <input v-model="validUntil" :class="inputClass" type="date" />
        </label>
        <label class="block flex-1">
          <span class="text-xs font-medium text-neutral-600">Redemption cap (optional)</span>
          <input v-model.number="redemptionCap" :class="inputClass" type="number" min="1" placeholder="e.g. 500" />
        </label>
      </div>
    </div>

    <div class="flex gap-2 justify-end mt-4">
      <Button size="sm" variant="secondary" :disabled="busy || !headline.trim()" @click="save">Save draft</Button>
      <Button size="sm" :disabled="busy || !canSubmit" @click="submit">Submit for review</Button>
    </div>
  </Card>
</template>
