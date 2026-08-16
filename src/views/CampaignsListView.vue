<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { PhPlus, PhMegaphone } from '@phosphor-icons/vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { listCampaigns, pauseCampaign, resumeCampaign } from '@/api/campaigns'
import { useSession } from '@/stores/session'
import { useWizard } from '@/stores/wizard'
import { ctxKey } from '@/lib/ctx-key'
import { formatKobo } from '@/lib/money'
import { statusTone, statusLabel } from '@/lib/status'

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
    <PageHeader :title="$t('campaigns.title')">
      <template #actions>
        <Button v-if="session.canSubmitCampaign" @click="startWizard">
          <PhPlus :size="16" /> {{ $t('campaigns.newCampaign') }}
        </Button>
      </template>
    </PageHeader>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <select
        v-model="statusFilter"
        :aria-label="$t('campaigns.status')"
        class="select max-w-[13rem] text-sm"
      >
        <option value="">{{ $t('screens.allVenues') }}</option>
        <option value="draft">Draft</option>
        <option value="pending_vetting">In review</option>
        <option value="active">Live</option>
        <option value="paused">Paused</option>
        <option value="completed">Ended</option>
      </select>
      <template v-if="selected.size && session.canMutate">
        <span class="text-sm text-neutral-500">{{ selected.size }} selected</span>
        <Button size="sm" variant="secondary" @click="bulk('pause')">{{ $t('campaigns.bulkPause') }}</Button>
        <Button size="sm" variant="secondary" @click="bulk('resume')">{{ $t('campaigns.bulkResume') }}</Button>
      </template>
    </div>

    <Card padding="none" class="overflow-hidden">
      <table class="w-full text-sm">
        <thead class="text-left text-[11px] uppercase tracking-wider text-neutral-400">
          <tr class="border-b border-neutral-100">
            <th class="w-10 px-5 py-3"></th>
            <th class="px-5 py-3 font-semibold">{{ $t('campaigns.name') }}</th>
            <th class="px-5 py-3 font-semibold">{{ $t('campaigns.status') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('campaigns.budget') }}</th>
            <th class="px-5 py-3 text-right font-semibold">{{ $t('campaigns.spent') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="5" class="px-5 py-10 text-center text-neutral-400">{{ $t('common.loading') }}</td>
          </tr>
          <tr v-else-if="!campaigns.length">
            <td colspan="5" class="p-0">
              <EmptyState :title="$t('campaigns.empty')">
                <template #icon><PhMegaphone :size="24" /></template>
                <template v-if="session.canSubmitCampaign" #actions>
                  <Button @click="startWizard"><PhPlus :size="16" /> {{ $t('campaigns.newCampaign') }}</Button>
                </template>
              </EmptyState>
            </td>
          </tr>
          <tr
            v-for="c in campaigns"
            :key="c.id"
            class="border-t border-neutral-100 transition-colors hover:bg-neutral-50/70"
          >
            <td class="px-5 py-3">
              <input
                v-if="session.canMutate"
                type="checkbox"
                :checked="selected.has(c.id)"
                class="rounded border-neutral-300 text-clay-500 focus:ring-clay-400"
                @change="toggle(c.id)"
              />
            </td>
            <td class="px-5 py-3">
              <RouterLink :to="`/campaigns/${c.id}`" class="font-medium text-neutral-900 hover:text-clay-600">
                {{ c.name }}
              </RouterLink>
            </td>
            <td class="px-5 py-3">
              <Badge :tone="statusTone(c.status)">{{ statusLabel(c.status) }}</Badge>
            </td>
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ formatKobo(c.budgetKobo) }}</td>
            <td class="px-5 py-3 text-right font-mono text-neutral-700">{{ formatKobo(c.spentKobo) }}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  </div>
</template>
