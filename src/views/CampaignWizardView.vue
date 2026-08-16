<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import Button from '@/components/ui/Button.vue'
import { useWizard } from '@/stores/wizard'
import { useBasket } from '@/stores/basket'
import { useSession } from '@/stores/session'
import { WIZARD_STEPS, stepValid, buildCreatePayload } from '@/lib/wizard'
import { ObjectiveSchema } from '@/api/contracts/campaigns'
import { getQuote, createCampaign, submitCampaign } from '@/api/campaigns'
import { listCreatives, uploadIntent, putToPresigned, confirmUpload, sha256Hex } from '@/api/creatives'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo, nairaToKobo } from '@/lib/money'
import { isApiError } from '@/api/errors'

const router = useRouter()
const wizard = useWizard()
const basket = useBasket()
const session = useSession()
const s = wizard.state

const objectives = ObjectiveSchema.options
const days = [0, 1, 2, 3, 4, 5, 6]
const hours = Array.from({ length: 24 }, (_, h) => h)

const current = computed(() => WIZARD_STEPS[wizard.step]!)
const canAdvance = computed(() => stepValid(s, current.value))
function toggleIn(arr: number[], v: number) {
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
}
function useBasketScreens() {
  s.isWildcard = false
  s.screenIds = [...basket.ids]
}

// Live quote (budget step) — reactive on the schedule + targeting.
const scheduleReady = computed(() => stepValid(s, 'schedule'))
const { data: quote, isFetching: quoteLoading } = useQuery({
  queryKey: computed(() =>
    ctxKey(session.context, 'quote', JSON.stringify({
      w: s.isWildcard, ids: s.screenIds, sd: s.startDate, ed: s.endDate, h: s.hours, d: s.daysOfWeek,
    })),
  ),
  enabled: scheduleReady,
  queryFn: () =>
    getQuote({
      isWildcard: s.isWildcard,
      screenIds: s.isWildcard ? undefined : s.screenIds,
      startDate: new Date(`${s.startDate}T00:00:00Z`).toISOString(),
      endDate: new Date(`${s.endDate}T00:00:00Z`).toISOString(),
      targetHours: s.hours.length ? s.hours : undefined,
      targetDaysOfWeek: s.daysOfWeek.length ? s.daysOfWeek : undefined,
    }),
})

// Creatives (creative step)
const { data: creatives, refetch: refetchCreatives } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'creatives')),
  queryFn: listCreatives,
})
const uploading = ref(false)
async function onUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  try {
    const intent = await uploadIntent({
      filename: file.name,
      format: file.type.startsWith('video') ? 'video' : 'image',
      sizeBytes: file.size,
    })
    await putToPresigned(intent.presignedUrl, file)
    await confirmUpload(intent.creativeId, await sha256Hex(file))
    await refetchCreatives()
    s.creativeId = intent.creativeId
  } catch (e) {
    error.value = isApiError(e) ? e.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

const submitting = ref(false)
const error = ref<string | null>(null)
async function finish(submit: boolean) {
  error.value = null
  submitting.value = true
  try {
    const campaign = await createCampaign(buildCreatePayload(s))
    if (submit) await submitCampaign(campaign.id)
    wizard.reset()
    router.push(`/campaigns/${campaign.id}`)
  } catch (e) {
    error.value = isApiError(e) ? e.message : 'Something went wrong'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <!-- Stepper -->
    <ol class="mb-8 flex items-center justify-between">
      <li v-for="(st, i) in WIZARD_STEPS" :key="st" class="flex items-center gap-2">
        <span class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
          :class="i <= wizard.step ? 'bg-clay-500 text-white' : 'bg-neutral-200 text-neutral-500'">{{ i + 1 }}</span>
        <span class="hidden text-sm sm:inline" :class="i <= wizard.step ? 'text-neutral-900' : 'text-neutral-400'">
          {{ $t('campaigns.steps.' + st) }}
        </span>
      </li>
    </ol>

    <div class="card p-8">
      <!-- Objective -->
      <div v-if="current === 'objective'" class="space-y-4">
        <label class="block">
          <span class="label">{{ $t('campaigns.name') }}</span>
          <input v-model="s.name" minlength="3" class="input" />
        </label>
        <div class="grid gap-3">
          <button v-for="o in objectives" :key="o" type="button"
            class="rounded-xl border p-4 text-left transition-colors"
            :class="s.objective === o ? 'border-clay-500 bg-clay-50' : 'border-neutral-200 hover:bg-neutral-50'"
            @click="s.objective = o">
            <p class="font-medium capitalize text-neutral-900">{{ $t('campaigns.objectives.' + o) }}</p>
            <p class="text-sm text-neutral-500">{{ $t('campaigns.objectives.' + o + 'Hint') }}</p>
          </button>
        </div>
      </div>

      <!-- Screens -->
      <div v-else-if="current === 'screens'" class="space-y-4">
        <label class="flex items-center gap-2 rounded-xl border p-4"
          :class="s.isWildcard ? 'border-clay-500 bg-clay-50' : 'border-neutral-200'">
          <input v-model="s.isWildcard" type="checkbox" class="rounded border-neutral-300 text-clay-500 focus:ring-clay-400" />
          <span>
            <span class="block font-medium text-neutral-900">{{ $t('campaigns.wildcard') }}</span>
            <span class="block text-sm text-neutral-500">{{ $t('campaigns.wildcardHint') }}</span>
          </span>
        </label>
        <div v-if="!s.isWildcard" class="space-y-2">
          <Button v-if="basket.count" variant="secondary" @click="useBasketScreens">
            {{ $t('campaigns.useBasket', { count: basket.count }) }}
          </Button>
          <p class="text-sm" :class="s.screenIds.length ? 'text-neutral-700' : 'text-neutral-400'">
            {{ s.screenIds.length ? $t('screens.resultCount', { count: s.screenIds.length }) : $t('campaigns.noScreens') }}
          </p>
        </div>
      </div>

      <!-- Schedule -->
      <div v-else-if="current === 'schedule'" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="label">{{ $t('campaigns.startDate') }}</span>
            <input v-model="s.startDate" type="date" class="input" /></label>
          <label class="block"><span class="label">{{ $t('campaigns.endDate') }}</span>
            <input v-model="s.endDate" type="date" class="input" /></label>
        </div>
        <div>
          <p class="label">{{ $t('campaigns.daysOfWeek') }}</p>
          <div class="flex gap-1">
            <button v-for="d in days" :key="d" type="button" class="h-8 w-10 rounded text-xs"
              :class="s.daysOfWeek.includes(d) ? 'bg-clay-500 text-white' : 'bg-neutral-100 text-neutral-600'"
              @click="toggleIn(s.daysOfWeek, d)">{{ ['Su','Mo','Tu','We','Th','Fr','Sa'][d] }}</button>
          </div>
          <p class="mt-1 text-xs text-neutral-400">{{ s.daysOfWeek.length ? '' : $t('campaigns.allDays') }}</p>
        </div>
        <div>
          <p class="label">{{ $t('campaigns.dayparts') }}</p>
          <div class="grid grid-cols-12 gap-1">
            <button v-for="h in hours" :key="h" type="button" class="h-6 rounded text-[10px]"
              :class="s.hours.includes(h) ? 'bg-clay-500 text-white' : 'bg-neutral-100 text-neutral-500'"
              @click="toggleIn(s.hours, h)">{{ h }}</button>
          </div>
          <p class="mt-1 text-xs text-neutral-400">{{ s.hours.length ? '' : $t('campaigns.allHours') }}</p>
        </div>
      </div>

      <!-- Budget + live quote -->
      <div v-else-if="current === 'budget'" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <label class="block"><span class="label">{{ $t('campaigns.totalBudget') }}</span>
            <input v-model.number="s.budgetNaira" type="number" min="1" class="input" /></label>
          <label class="block"><span class="label">{{ $t('campaigns.dailyCap') }}</span>
            <input v-model.number="s.dailyCapNaira" type="number" min="1" class="input" /></label>
        </div>
        <div class="rounded-xl bg-neutral-50 p-4" data-testid="quote">
          <p v-if="quoteLoading" class="text-sm text-neutral-500">{{ $t('campaigns.quoteLoading') }}</p>
          <div v-else-if="quote" class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-neutral-500">{{ $t('campaigns.quoteGross') }}</span><p class="font-mono">{{ formatKobo(quote.grossKobo) }}</p></div>
            <div><span class="text-neutral-500">{{ $t('campaigns.quoteDiscount') }}</span><p class="font-mono">{{ quote.discountPct }}%</p></div>
            <div><span class="text-neutral-500">{{ $t('campaigns.quoteNet') }}</span><p class="font-mono font-semibold text-clay-700">{{ formatKobo(quote.netKobo) }}</p></div>
            <div><span class="text-neutral-500">{{ $t('campaigns.quoteImpressions') }}</span><p class="font-mono">{{ quote.estimatedImpressions.toLocaleString() }}</p></div>
          </div>
        </div>
      </div>

      <!-- Creative -->
      <div v-else-if="current === 'creative'" class="space-y-4">
        <p class="rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800">{{ $t('campaigns.creativePending') }}</p>
        <div v-if="creatives && creatives.creatives.length" class="space-y-2">
          <label v-for="c in creatives.creatives" :key="c.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg border p-3"
            :class="s.creativeId === c.id ? 'border-clay-500 bg-clay-50' : 'border-neutral-200'">
            <input v-model="s.creativeId" type="radio" :value="c.id" name="creative" class="text-clay-500 focus:ring-clay-400" />
            <span class="text-sm text-neutral-900">{{ c.name || c.filename }}</span>
            <span class="ml-auto text-xs capitalize text-neutral-500">{{ c.status.replace(/_/g, ' ') }}</span>
          </label>
        </div>
        <p v-else class="text-sm text-neutral-400">{{ $t('campaigns.noCreatives') }}</p>
        <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-clay-600">
          <input type="file" accept="image/*,video/mp4" class="hidden" @change="onUpload" />
          <span class="hover:underline">{{ uploading ? $t('common.loading') : $t('campaigns.uploadCreative') }}</span>
        </label>
      </div>

      <!-- Review -->
      <div v-else class="space-y-4">
        <h2 class="font-display text-xl font-semibold text-neutral-900">{{ $t('campaigns.reviewTitle') }}</h2>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div><dt class="text-neutral-500">{{ $t('campaigns.name') }}</dt><dd class="text-neutral-900">{{ s.name }}</dd></div>
          <div><dt class="text-neutral-500">{{ $t('campaigns.steps.objective') }}</dt><dd class="capitalize text-neutral-900">{{ s.objective }}</dd></div>
          <div><dt class="text-neutral-500">{{ $t('campaigns.screens') }}</dt><dd class="text-neutral-900">{{ s.isWildcard ? $t('campaigns.wildcard') : $t('screens.resultCount', { count: s.screenIds.length }) }}</dd></div>
          <div><dt class="text-neutral-500">{{ $t('campaigns.budget') }}</dt><dd class="font-mono text-neutral-900">{{ s.budgetNaira ? formatKobo(String(nairaToKobo(s.budgetNaira))) : '—' }}</dd></div>
          <div><dt class="text-neutral-500">{{ $t('campaigns.dates') }}</dt><dd class="text-neutral-900">{{ s.startDate }} → {{ s.endDate }}</dd></div>
          <div v-if="quote"><dt class="text-neutral-500">{{ $t('campaigns.quoteNet') }}</dt><dd class="font-mono text-clay-700">{{ formatKobo(quote.netKobo) }}</dd></div>
        </dl>
        <p v-if="error" role="alert" class="text-sm text-clay-700">{{ error }}</p>
        <div class="flex gap-3">
          <Button variant="outline" :disabled="submitting" @click="finish(false)">{{ $t('campaigns.saveDraft') }}</Button>
          <Button :disabled="submitting || !stepValid(s, 'review')" @click="finish(true)">
            {{ submitting ? $t('campaigns.submitting') : $t('campaigns.submit') }}
          </Button>
        </div>
      </div>

      <!-- Nav -->
      <div v-if="current !== 'review'" class="mt-8 flex justify-between border-t border-neutral-100 pt-6">
        <Button variant="ghost" :disabled="wizard.step === 0" @click="wizard.step--">{{ $t('campaigns.back') }}</Button>
        <Button :disabled="!canAdvance" @click="wizard.step++">{{ $t('campaigns.next') }}</Button>
      </div>
    </div>
  </div>
</template>
