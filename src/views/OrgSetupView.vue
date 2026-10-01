<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/AuthCard.vue'
import Button from '@/components/ui/Button.vue'
import SelectMenu from '@/components/ui/SelectMenu.vue'
import { createBusinessProfile, getStates } from '@/api/onboarding'
import { BusinessCategorySchema, BusinessTypeSchema, type NigerianState } from '@/api/contracts/onboarding'
import { useSession } from '@/stores/session'
import { isApiError } from '@/api/errors'
import { useToastStore } from '@/stores/toast'

/**
 * Page 3 — org fork (PRD §4.1). Two cards (advertiser/agency) → org kind. Option A:
 * the console adapts to the backend's required fields (category/state/lga/business
 * type), which the literal PRD omitted. Backend now also accepts displayName +
 * country + approxClients (see the 0055 contract change).
 */
const route = useRoute()
const router = useRouter()
const session = useSession()
const toast = useToastStore()

type Kind = 'advertiser' | 'agency' | null
const kind = ref<Kind>(route.query.src === 'agencies' ? 'agency' : null)

const businessName = ref('')
const displayName = ref('')
const category = ref('')
const businessType = ref('') // advertiser picks; agency forces 'agency'
const stateName = ref('')
const lga = ref('')
const approxClients = ref<number | null>(null)
const submitting = ref(false)

const states = ref<NigerianState[]>([])
onMounted(async () => {
  try {
    states.value = await getStates()
  } catch {
    /* selects stay empty; user can retry */
  }
})

const categories = BusinessCategorySchema.options
// Advertiser business types exclude 'agency' (that's the other card).
const advertiserTypes = BusinessTypeSchema.options.filter((t) => t !== 'agency')
const lgasForState = computed(() => states.value.find((s) => s.name === stateName.value)?.lgas ?? [])
const prettify = (v: string) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

// Dropdown options for the styled SelectMenu (value + prettified label).
const categoryOptions = categories.map((c) => ({ value: c as string, label: prettify(c) }))
const typeOptions = advertiserTypes.map((t) => ({ value: t as string, label: prettify(t) }))
const stateOptions = computed(() => states.value.map((s) => ({ value: s.name, label: s.name })))

function selectKind(k: Kind) {
  kind.value = k
  businessType.value = k === 'agency' ? 'agency' : ''
}

async function onSubmit() {
  submitting.value = true
  try {
    await createBusinessProfile({
      businessName: businessName.value,
      displayName: displayName.value || undefined,
      country: 'NG',
      businessCategory: category.value as never,
      state: stateName.value,
      lga: lga.value,
      businessType: businessType.value as never,
      approxClients: kind.value === 'agency' && approxClients.value ? approxClients.value : undefined,
    })
    // The pre-org token has org=null; refresh to pick up org/role/tier claims.
    await session.refreshSession()
    router.replace('/dashboard')
  } catch (e) {
    toast.error(isApiError(e) ? e.message : 'Could not create organization.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthCard :step="2">
    <h2 class="mb-4 font-display text-2xl font-semibold text-neutral-900">{{ $t('org.title') }}</h2>

    <!-- The fork: two selectable cards -->
    <div class="mb-5 grid gap-3">
      <button
        type="button"
        class="rounded-xl border p-4 text-left transition-colors"
        :class="kind === 'advertiser' ? 'border-clay-500 bg-clay-50' : 'border-neutral-200 hover:bg-neutral-50'"
        @click="selectKind('advertiser')"
      >
        <p class="font-medium text-neutral-900">{{ $t('org.advertiserCard') }}</p>
        <p class="text-sm text-neutral-500">{{ $t('org.advertiserHint') }}</p>
      </button>
      <button
        type="button"
        class="rounded-xl border p-4 text-left transition-colors"
        :class="kind === 'agency' ? 'border-clay-500 bg-clay-50' : 'border-neutral-200 hover:bg-neutral-50'"
        @click="selectKind('agency')"
      >
        <p class="font-medium text-neutral-900">{{ $t('org.agencyCard') }}</p>
        <p class="text-sm text-neutral-500">{{ $t('org.agencyHint') }}</p>
      </button>
    </div>

    <form v-if="kind" class="space-y-4" @submit.prevent="onSubmit">
      <label class="block">
        <span class="label">{{
          kind === 'agency' ? $t('org.agencyName') : $t('org.businessName')
        }}</span>
        <input
          v-model="businessName"
          required
          minlength="2"
          :aria-label="kind === 'agency' ? $t('org.agencyName') : $t('org.businessName')"
          class="input"
        />
      </label>

      <label class="block">
        <span class="label">{{ $t('org.displayName') }} <span class="font-normal text-neutral-400">· {{ $t('signup.positionOptional') }}</span></span>
        <input v-model="displayName" class="input" />
      </label>

      <label class="block">
        <span class="label">{{ $t('org.category') }}</span>
        <SelectMenu v-model="category" :options="categoryOptions" :placeholder="$t('org.category')" :aria-label="$t('org.category')" />
      </label>

      <label v-if="kind === 'advertiser'" class="block">
        <span class="label">{{ $t('org.businessType') }}</span>
        <SelectMenu v-model="businessType" :options="typeOptions" :placeholder="$t('org.businessType')" :aria-label="$t('org.businessType')" />
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="label">{{ $t('org.state') }}</span>
          <SelectMenu v-model="stateName" :options="stateOptions" :placeholder="$t('org.state')" :aria-label="$t('org.state')" />
        </label>
        <label class="block">
          <span class="label">{{ $t('org.lga') }}</span>
          <SelectMenu v-model="lga" :options="lgasForState" :placeholder="$t('org.lga')" :aria-label="$t('org.lga')" :disabled="!stateName" />
        </label>
      </div>

      <label v-if="kind === 'agency'" class="block">
        <span class="label">{{ $t('org.approxClients') }} <span class="font-normal text-neutral-400">· {{ $t('signup.positionOptional') }}</span></span>
        <input v-model.number="approxClients" type="number" min="1" class="input" />
      </label>

      <p v-if="kind === 'agency'" class="rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-800">
        {{ $t('org.agencyPendingNote') }}
      </p>

      <Button type="submit" size="lg" class="w-full" :disabled="submitting">
        {{ submitting ? $t('org.creating') : kind === 'agency' ? $t('org.createAgency') : $t('org.createAdvertiser') }}
      </Button>
    </form>

    <template #footer>
      <button type="button" class="text-neutral-500 hover:underline" @click="session.logout()">
        {{ $t('auth.signOut') }}
      </button>
    </template>
  </AuthCard>
</template>
