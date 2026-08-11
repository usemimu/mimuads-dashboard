<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { PhPlus } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import { listCampaigns, pauseCampaign, resumeCampaign } from '@/api/campaigns'
import { useSession } from '@/stores/session'
import { useWizard } from '@/stores/wizard'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'

const router = useRouter()
const session = useSession()
const wizard = useWizard()
const qc = useQueryClient()

const statusFilter = ref('')
const selected = ref<Set<string>>(new Set())

const { data, isLoading } = useQuery({
  queryKey: computed(() => ctxKey(session.context, 'campaigns', statusFilter.value || 'all')),
  queryFn: () => listCampaigns(statusFilter.value ? { status: statusFilter.value } : {}),
})
const campaigns = computed(() => data.value?.campaigns ?? [])

const STATUS_PILL: Record<string, string> = {
  draft: 'bg-neutral-100 text-neutral-600',
  pending_vetting: 'bg-gold-100 text-gold-800',
  pending_payment: 'bg-gold-100 text-gold-800',
  active: 'bg-moss-100 text-moss-700',
  paused: 'bg-neutral-200 text-neutral-700',
  completed: 'bg-neutral-100 text-neutral-500',
  rejected: 'bg-clay-100 text-clay-700',
  suspended: 'bg-clay-100 text-clay-700',
}

function toggle(id: string) {
  if (selected.value.has(id)) selected.value.delete(id)
  else selected.value.add(id)
  selected.value = new Set(selected.value)
}
async function bulk(action: 'pause' | 'resume') {
  const fn = action === 'pause' ? pauseCampaign : resumeCampaign
  await Promise.allSettled([...selected.value].map((id) => fn(id)))
  selected.value = new Set()
  qc.invalidateQueries({ queryKey: ctxKey(session.context, 'campaigns') })
}
function startWizard() {
  wizard.reset()
  router.push('/campaigns/new')
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-3xl font-semibold text-neutral-900">{{ $t('campaigns.title') }}</h1>
      <Button v-if="session.canSubmitCampaign" @click="startWizard"><PhPlus :size="16" /> {{ $t('campaigns.newCampaign') }}</Button>
    </div>

    <div class="mb-4 flex items-center gap-3">
      <select v-model="statusFilter" :aria-label="$t('campaigns.status')" class="rounded-lg border-neutral-300 text-sm focus:border-clay-400 focus:ring-clay-400">
        <option value="">{{ $t('screens.allVenues') }}</option>
        <option value="draft">draft</option>
        <option value="pending_vetting">pending_vetting</option>
        <option value="active">active</option>
        <option value="paused">paused</option>
        <option value="completed">completed</option>
      </select>
      <template v-if="selected.size && session.canMutate">
        <Button size="sm" variant="secondary" @click="bulk('pause')">{{ $t('campaigns.bulkPause') }}</Button>
        <Button size="sm" variant="secondary" @click="bulk('resume')">{{ $t('campaigns.bulkResume') }}</Button>
      </template>
    </div>

    <div class="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <table class="w-full text-sm">
        <thead class="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-400">
          <tr>
            <th class="w-8 px-4 py-2"></th>
            <th class="px-4 py-2">{{ $t('campaigns.name') }}</th>
            <th class="px-4 py-2">{{ $t('campaigns.status') }}</th>
            <th class="px-4 py-2">{{ $t('campaigns.budget') }}</th>
            <th class="px-4 py-2">{{ $t('campaigns.spent') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading"><td colspan="5" class="px-4 py-6 text-center text-neutral-400">{{ $t('common.loading') }}</td></tr>
          <tr v-else-if="!campaigns.length"><td colspan="5" class="px-4 py-6 text-center text-neutral-400">{{ $t('campaigns.empty') }}</td></tr>
          <tr v-for="c in campaigns" :key="c.id" class="border-t border-neutral-100 hover:bg-neutral-50">
            <td class="px-4 py-2">
              <input v-if="session.canMutate" type="checkbox" :checked="selected.has(c.id)" class="rounded border-neutral-300 text-clay-500 focus:ring-clay-400" @change="toggle(c.id)" />
            </td>
            <td class="px-4 py-2">
              <RouterLink :to="`/campaigns/${c.id}`" class="font-medium text-neutral-900 hover:text-clay-600">{{ c.name }}</RouterLink>
            </td>
            <td class="px-4 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="STATUS_PILL[c.status] ?? 'bg-neutral-100'">{{ c.status.replace(/_/g, ' ') }}</span>
            </td>
            <td class="px-4 py-2 font-mono">{{ formatKobo(c.budgetKobo) }}</td>
            <td class="px-4 py-2 font-mono">{{ formatKobo(c.spentKobo) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
